export {};

import type { AdbDeviceEvent, AdbDeviceInfo, AdbErrorPayload, AdbHealth } from '../main/adb/types';

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
      };
      adb: AdbApi;
    };
  }
}
