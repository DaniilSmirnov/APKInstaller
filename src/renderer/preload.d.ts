export {};

import type { AdbDeviceEvent, AdbDeviceInfo, AdbErrorPayload, AdbHealth } from '../main/adb/types';
import type { DeviceChange, DeviceInfo, PackageInfo } from './types';

type AdbApi = {
  health: () => Promise<AdbHealth>;
  listDevices: () => Promise<AdbDeviceInfo[]>;
  install: (serial: string, apkPath: string) => Promise<{ success: true }>;
  uninstall: (serial: string, packageName: string) => Promise<{ success: true }>;
  getVersionCode: (serial: string, packageName: string) => Promise<string | null>;
  onDeviceEvent: (listener: (event: AdbDeviceEvent) => void) => () => void;
  onError: (listener: (event: AdbErrorPayload) => void) => () => void;
};

declare global {
  interface Window {
    electron: {
      app: {
        getVersion: () => Promise<string>;
        selectApk: () => Promise<string | null>;
        getDroppedApkPath: (file: File) => string;
      };
      adb: AdbApi;
      devices: {
        list: () => Promise<DeviceInfo[]>;
        startTracking: () => Promise<void>;
        stopTracking: () => Promise<void>;
        install: (serial: string, apkPath: string, packageName?: string) => Promise<{ success: true }>;
        uninstall: (serial: string, packageName: string) => Promise<{ success: true }>;
        getPackageInfo: (serial: string, packageName: string) => Promise<PackageInfo | null>;
        onChange: (listener: (change: DeviceChange) => void) => () => void;
      };
    };
  }
}
