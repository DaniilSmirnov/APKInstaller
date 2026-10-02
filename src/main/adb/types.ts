export type AdbDeviceStatus = 'device' | 'emulator' | 'offline' | 'unauthorized' | 'unknown';

export interface AdbDeviceInfo {
  serial: string;
  status: AdbDeviceStatus;
  rawStatus: string;
  manufacturer: string | null;
  model: string | null;
  androidVersion: string | null;
  sdkVersion?: number | null;
}

export type AdbDeviceEventType = 'add' | 'remove' | 'change' | 'end';

export interface AdbDeviceEvent {
  type: AdbDeviceEventType;
  device: AdbDeviceInfo;
}

export interface AdbHealth {
  connected: boolean;
  version: string | null;
}

export type AdbErrorCode =
  | 'ADB_UNAVAILABLE'
  | 'ADB_TIMEOUT'
  | 'DEVICE_NOT_FOUND'
  | 'INVALID_INPUT'
  | 'APK_NOT_FOUND'
  | 'OPERATION_FAILED';

export interface AdbErrorPayload {
  code: AdbErrorCode;
  message: string;
  operation: string;
  cause?: string;
}

export class AdbServiceError extends Error {
  readonly code: AdbErrorCode;
  readonly operation: string;
  readonly causeMessage?: string;

  constructor(payload: AdbErrorPayload) {
    super(payload.message);
    this.name = 'AdbServiceError';
    this.code = payload.code;
    this.operation = payload.operation;
    this.causeMessage = payload.cause;
  }

  toJSON(): AdbErrorPayload {
    return {
      code: this.code,
      message: this.message,
      operation: this.operation,
    };
  }
}

export interface AdbServiceClient {
  version(): Promise<unknown>;
  listDevices(): Promise<Array<{ id: string; type: string }>>;
  trackDevices(): Promise<AdbDeviceTracker>;
  getDevice(serial: string): AdbDeviceClient;
}

export interface AdbDeviceClient {
  getProperties(): Promise<Record<string, string>>;
  install(apkPath: string): Promise<boolean>;
  uninstall(packageName: string): Promise<boolean>;
  shell(command: string): Promise<NodeJS.ReadableStream>;
}

export interface AdbDeviceTracker {
  on(event: 'add' | 'remove' | 'change', listener: (device: { id: string; type: string }) => void): this;
  on(event: 'error', listener: (error: unknown) => void): this;
  on(event: 'end', listener: () => void): this;
  removeAllListeners(): this;
  end(): this;
}

export interface AdbServiceOptions {
  client?: AdbServiceClient;
  operationTimeoutMs?: number;
  installTimeoutMs?: number;
  uninstallTimeoutMs?: number;
}
