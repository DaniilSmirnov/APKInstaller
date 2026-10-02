import type { AdbDeviceInfo } from '../main/adb/types';

export type DeviceInfo = AdbDeviceInfo & { sdkVersion?: number | null };
export type DeviceChange = {
  type: 'added' | 'removed' | 'changed';
  device: DeviceInfo;
};
export interface PackageInfo {
  packageName: string;
  versionName: string | null;
  versionCode: number | null;
}

export interface OperationMessage {
  tone: 'success' | 'error' | 'info';
  text: string;
}
