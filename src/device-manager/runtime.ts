import type {
  DeviceManagerApkFile,
  DeviceManagerBackend,
  DeviceManagerDevice,
  DeviceManagerDeviceChange,
  DeviceManagerError,
  DeviceManagerPackageInfo,
} from './contract';

export type DeviceManagerRuntime = DeviceManagerBackend & {
  selectApk: () => Promise<DeviceManagerApkFile | null>;
};

type NativeBridgeWindow = Window & {
  webkit?: { messageHandlers?: { deviceManager?: { postMessage: (message: string) => void } } };
  __deviceManagerResolve?: (message: string) => void;
};

const encodePayload = (payload: unknown): string | undefined => {
  if (payload === undefined) return undefined;
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const decodePayload = <T>(payload?: string): T | undefined => {
  if (!payload) return undefined;
  const binary = atob(payload);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
};

const createNativeRuntime = (target: NativeBridgeWindow): DeviceManagerRuntime | null => {
  const handler = target.webkit?.messageHandlers?.deviceManager;
  if (!handler) return null;
  const pending = new Map<string, { resolve: (value: unknown) => void; reject: (error: Error) => void }>();
  let knownDevices: DeviceManagerDevice[] = [];
  target.__deviceManagerResolve = (message) => {
    const response = JSON.parse(message) as { id: string; ok: boolean; payload?: string; error?: string };
    const request = pending.get(response.id);
    if (!request) return;
    pending.delete(response.id);
    if (!response.ok) request.reject(new Error(response.error ?? 'DeviceManager operation failed'));
    else request.resolve(decodePayload(response.payload));
  };
  const listDevices = async (): Promise<DeviceManagerDevice[]> => {
    knownDevices = await request<DeviceManagerDevice[]>('devices.list');
    return knownDevices;
  };
  const deviceFor = (deviceId: string): DeviceManagerDevice => knownDevices.find((device) => device.id === deviceId) ?? {
    id: deviceId, serial: deviceId, status: 'unknown', transport: 'wifi-pairing', model: null, manufacturer: null, androidVersion: null, sdkVersion: null, host: deviceId, port: 5555,
  };
  const onDeviceChange = (listener: (change: DeviceManagerDeviceChange) => void): (() => void) => {
    let previous = [...knownDevices];
    const timer = window.setInterval(() => {
      void listDevices().then((next) => {
        const oldByID = new Map(previous.map((device) => [device.id, device]));
        const nextByID = new Map(next.map((device) => [device.id, device]));
        previous.filter((device) => !nextByID.has(device.id)).forEach((device) => listener({ type: 'removed', device }));
        next.forEach((device) => {
          const old = oldByID.get(device.id);
          if (!old) listener({ type: 'added', device });
          else if (JSON.stringify(old) !== JSON.stringify(device)) listener({ type: 'changed', device });
        });
        previous = next;
      }).catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  };
  const request = <T>(method: string, payload?: unknown): Promise<T> => new Promise((resolve, reject) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    pending.set(id, { resolve: (value) => resolve(value as T), reject });
    handler.postMessage(JSON.stringify({ id, method, payload: encodePayload(payload) }));
  });
  return {
    listDevices,
    selectApk: () => request<DeviceManagerApkFile>('file.select'),
    install: (deviceId, apk) => request<void>('device.install', { device: deviceFor(deviceId), fileURL: apk.nativeToken ?? apk.id }),
    uninstall: (deviceId, packageName) => request<void>('device.uninstall', { device: deviceFor(deviceId), packageName }),
    getPackageInfo: async () => null,
    onDeviceChange,
    onError: () => () => undefined,
  };
};

const createDesktopRuntime = (target: Window): DeviceManagerRuntime => ({
  listDevices: () => target.deviceManager.listDevices(),
  selectApk: () => target.deviceManager.selectApk(),
  install: (deviceId, apk) => target.deviceManager.install(deviceId, apk).then(() => undefined),
  uninstall: (deviceId, packageName) => target.deviceManager.uninstall(deviceId, packageName).then(() => undefined),
  getPackageInfo: (deviceId, packageName) => target.deviceManager.getPackageInfo(deviceId, packageName),
  onDeviceChange: (listener: (change: DeviceManagerDeviceChange) => void) => target.deviceManager.onDeviceChange(listener),
  onError: (listener: (error: DeviceManagerError) => void) => target.deviceManager.onError(listener),
});

const createLegacyRuntime = (target: Window): DeviceManagerRuntime => ({
  listDevices: async () => target.electron.devices.list() as unknown as DeviceManagerDevice[],
  selectApk: async () => {
    const token = await target.electron.app.selectApk();
    return token ? { id: token, name: token.split(/[\\/]/).pop() ?? 'app.apk', size: 0, nativeToken: token } : null;
  },
  install: (deviceId, apk) => target.electron.devices.install(deviceId, apk.nativeToken ?? apk.id).then(() => undefined),
  uninstall: (deviceId, packageName) => target.electron.devices.uninstall(deviceId, packageName).then(() => undefined),
  getPackageInfo: (deviceId, packageName) => target.electron.devices.getPackageInfo(deviceId, packageName) as Promise<DeviceManagerPackageInfo | null>,
  onDeviceChange: (listener) => target.electron.devices.onChange(listener as never),
  onError: (listener) => target.electron.adb.onError(listener as never),
});

export const createDeviceManagerRuntime = (target: Window = window): DeviceManagerRuntime =>
  createNativeRuntime(target as NativeBridgeWindow) ??
  (target.deviceManager ? createDesktopRuntime(target) : createLegacyRuntime(target));
