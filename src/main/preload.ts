import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron';
import type { AdbDeviceEvent, AdbDeviceInfo, AdbErrorPayload, AdbHealth } from './adb/types';
import type { AndroidPermission, DisplaySettings } from './android/types';
import type { DeviceManagerApkFile } from '../device-manager/contract';

type DeviceEventListener = (event: unknown) => void;
const renderer = ipcRenderer;

const electronApi = {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
    selectApk: (): Promise<string | null> => ipcRenderer.invoke('dialog:open-apk'),
    getDroppedApkPath: (file: File): string => webUtils.getPathForFile(file),
  },
  adb: {
    health: (): Promise<AdbHealth> => ipcRenderer.invoke('adb:health'),
    listDevices: (): Promise<AdbDeviceInfo[]> => ipcRenderer.invoke('adb:list-devices'),
    install: (serial: string, apkPath: string, packageName?: string): Promise<{ success: true }> => packageName ? ipcRenderer.invoke('adb:install', serial, apkPath, packageName) : ipcRenderer.invoke('adb:install', serial, apkPath),
    uninstall: (serial: string, packageName: string): Promise<{ success: true }> => ipcRenderer.invoke('adb:uninstall', serial, packageName),
    getVersionCode: (serial: string, packageName: string): Promise<string | null> => ipcRenderer.invoke('adb:version-code', serial, packageName),
    onDeviceEvent: (listener: DeviceEventListener): (() => void) => {
          const handler = (_event: Electron.IpcRendererEvent, payload: AdbDeviceEvent): void => listener(payload);
          renderer.on('adb:device-event', handler);
          return () => renderer.removeListener('adb:device-event', handler);
    },
    onError: (listener: DeviceEventListener): (() => void) => {
          const handler = (_event: Electron.IpcRendererEvent, payload: AdbErrorPayload): void => listener(payload);
          renderer.on('adb:error', handler);
          return () => renderer.removeListener('adb:error', handler);
    },
  },
  devices: {
    list: (): Promise<AdbDeviceInfo[]> => ipcRenderer.invoke('adb:list-devices'),
    install: (serial: string, apkPath: string, packageName?: string): Promise<{ success: true }> => packageName ? ipcRenderer.invoke('adb:install', serial, apkPath, packageName) : ipcRenderer.invoke('adb:install', serial, apkPath),
    uninstall: (serial: string, packageName: string): Promise<{ success: true }> => ipcRenderer.invoke('adb:uninstall', serial, packageName),
    getPackageInfo: async (serial: string, packageName: string): Promise<{ packageName: string; versionName: string | null; versionCode: number | null } | null> => {
      const value = await ipcRenderer.invoke('adb:version-code', serial, packageName) as string | null;
      return value === null ? null : { packageName, versionName: null, versionCode: Number(value) };
    },
    onChange: (listener: (change: { type: 'added' | 'removed' | 'changed'; device: AdbDeviceInfo }) => void): (() => void) => {
      const handler = (_event: IpcRendererEvent, event: AdbDeviceEvent): void => {
        const type = event.type === 'add' ? 'added' : event.type === 'remove' ? 'removed' : 'changed';
        listener({ type, device: event.device });
      };
      renderer.on('adb:device-event', handler);
      return () => renderer.removeListener('adb:device-event', handler);
    },
  },
  android: {
    getPermissions: (serial: string, packageName: string): Promise<AndroidPermission[]> => ipcRenderer.invoke('android:get-permissions', serial, packageName),
    setPermission: (serial: string, packageName: string, permission: string, granted: boolean): Promise<{ success: true }> => ipcRenderer.invoke('android:set-permission', serial, packageName, permission, granted),
    getDisplaySettings: (serial: string): Promise<DisplaySettings> => ipcRenderer.invoke('android:get-display', serial),
    setDensity: (serial: string, density: number | null): Promise<DisplaySettings> => ipcRenderer.invoke('android:set-density', serial, density),
    setResolution: (serial: string, width: number | null, height?: number): Promise<DisplaySettings> => ipcRenderer.invoke('android:set-resolution', serial, width, height),
  },
  settings: {
    get: (): Promise<{ schemaVersion: 1; packages: string[]; selectedPackage?: string; lastSelectedSerial?: string }> => ipcRenderer.invoke('settings:get'),
    set: (value: { packages: string[]; selectedPackage?: string; lastSelectedSerial?: string }): Promise<{ schemaVersion: 1; packages: string[]; selectedPackage?: string; lastSelectedSerial?: string }> => ipcRenderer.invoke('settings:set', value),
  },
};

const deviceManagerApi = {
  listDevices: (): Promise<unknown[]> => electronApi.devices.list(),
  selectApk: async (): Promise<DeviceManagerApkFile | null> => {
    const nativeToken = await electronApi.app.selectApk();
    if (!nativeToken) return null;
    return { id: nativeToken, name: nativeToken.split(/[\\/]/).pop() ?? 'app.apk', size: 0, nativeToken };
  },
  install: (deviceId: string, apk: DeviceManagerApkFile): Promise<{ success: true }> =>
    electronApi.devices.install(deviceId, apk.nativeToken ?? apk.id),
  uninstall: (deviceId: string, packageName: string): Promise<{ success: true }> =>
    electronApi.devices.uninstall(deviceId, packageName),
  getPackageInfo: (deviceId: string, packageName: string) =>
    electronApi.devices.getPackageInfo(deviceId, packageName),
  onDeviceChange: (listener: DeviceEventListener): (() => void) =>
    electronApi.devices.onChange(listener as (change: { type: 'added' | 'removed' | 'changed'; device: AdbDeviceInfo }) => void),
  onError: (listener: DeviceEventListener): (() => void) => electronApi.adb.onError(listener),
};
contextBridge.exposeInMainWorld('electron', electronApi);
contextBridge.exposeInMainWorld('deviceManager', deviceManagerApi);
