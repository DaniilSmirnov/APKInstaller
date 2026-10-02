export {};

import type { AdbDeviceEvent, AdbDeviceInfo, AdbErrorPayload, AdbHealth } from '../main/adb/types';
import type { DeviceChange, DeviceInfo, PackageInfo } from './types';
import type { AndroidPermission, DisplaySettings } from '../main/android/types';

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
        install: (serial: string, apkPath: string, packageName?: string) => Promise<{ success: true }>;
        uninstall: (serial: string, packageName: string) => Promise<{ success: true }>;
        getPackageInfo: (serial: string, packageName: string) => Promise<PackageInfo | null>;
        onChange: (listener: (change: DeviceChange) => void) => () => void;
      };
      android: {
        getPermissions: (serial: string, packageName: string) => Promise<AndroidPermission[]>;
        setPermission: (serial: string, packageName: string, permission: string, granted: boolean) => Promise<{ success: true }>;
        getDisplaySettings: (serial: string) => Promise<DisplaySettings>;
        setDensity: (serial: string, density: number | null) => Promise<DisplaySettings>;
        setResolution: (serial: string, width: number | null, height?: number) => Promise<DisplaySettings>;
      };
      settings: {
        get: () => Promise<{ schemaVersion: 1; packages: string[]; selectedPackage?: string; lastSelectedSerial?: string }>;
        set: (value: { packages: string[]; selectedPackage?: string; lastSelectedSerial?: string }) => Promise<{ schemaVersion: 1; packages: string[]; selectedPackage?: string; lastSelectedSerial?: string }>;
      };
    };
  }
}
