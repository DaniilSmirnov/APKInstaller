import type {
  DeviceManagerApkFile,
  DeviceManagerBackend,
  DeviceManagerDevice,
  DeviceManagerDeviceChange,
  DeviceManagerError,
  DeviceManagerPackageInfo,
} from '../../device-manager/contract';

type LegacyElectronApi = {
  devices: {
    list: () => Promise<DeviceManagerDevice[]>;
    install: (serial: string, apkPath: string, packageName?: string) => Promise<{ success: true }>;
    uninstall: (serial: string, packageName: string) => Promise<{ success: true }>;
    getPackageInfo: (serial: string, packageName: string) => Promise<DeviceManagerPackageInfo | null>;
    onChange: (listener: (change: DeviceManagerDeviceChange) => void) => () => void;
  };
  adb: {
    onError: (listener: (error: DeviceManagerError) => void) => () => void;
  };
};

export type DeviceManagerFileProvider = (file: DeviceManagerApkFile) => Promise<string>;

export const createDeviceManagerBackend = (
  api: LegacyElectronApi,
  resolveFile: DeviceManagerFileProvider,
): DeviceManagerBackend => ({
  listDevices: () => api.devices.list(),
  install: async (deviceId, apk) => {
    const path = await resolveFile(apk);
    await api.devices.install(deviceId, path);
  },
  uninstall: async (deviceId, packageName) => {
    await api.devices.uninstall(deviceId, packageName);
  },
  getPackageInfo: (deviceId, packageName) => api.devices.getPackageInfo(deviceId, packageName),
  onDeviceChange: (listener) => api.devices.onChange(listener),
  onError: (listener) => api.adb.onError(listener),
});
