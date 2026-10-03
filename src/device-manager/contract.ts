export type DeviceManagerTransport = 'adb-tcp' | 'adb-tls' | 'wifi-pairing';
export type DeviceManagerDeviceStatus = 'device' | 'emulator' | 'offline' | 'unauthorized' | 'unknown';

export interface DeviceManagerDevice {
  id: string;
  serial: string;
  status: DeviceManagerDeviceStatus;
  transport: DeviceManagerTransport;
  model: string | null;
  manufacturer: string | null;
  androidVersion: string | null;
  sdkVersion: number | null;
}

export interface DeviceManagerApkFile {
  id: string;
  name: string;
  size: number;
  nativeToken?: string;
}

export interface DeviceManagerPackageInfo {
  packageName: string;
  versionName: string | null;
  versionCode: number | null;
}

export interface DeviceManagerError {
  code: 'UNAVAILABLE' | 'TIMEOUT' | 'NOT_FOUND' | 'INVALID_INPUT' | 'PERMISSION_DENIED' | 'UNSUPPORTED' | 'OPERATION_FAILED';
  message: string;
  operation: string;
  cause?: string;
}

export type DeviceManagerDeviceChange = {
  type: 'added' | 'removed' | 'changed';
  device: DeviceManagerDevice;
};

export interface DeviceManagerBackend {
  listDevices(): Promise<DeviceManagerDevice[]>;
  install(deviceId: string, apk: DeviceManagerApkFile): Promise<void>;
  uninstall(deviceId: string, packageName: string): Promise<void>;
  getPackageInfo(deviceId: string, packageName: string): Promise<DeviceManagerPackageInfo | null>;
  onDeviceChange(listener: (change: DeviceManagerDeviceChange) => void): () => void;
  onError(listener: (error: DeviceManagerError) => void): () => void;
}
