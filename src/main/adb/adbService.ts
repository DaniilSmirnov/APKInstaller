import fs from 'node:fs/promises';
import path from 'node:path';
import Adb from '@devicefarmer/adbkit';
import { AdbServiceError, AdbServiceOptions, AdbDeviceEvent, AdbDeviceInfo, AdbHealth } from './types';
import type { AdbDeviceClient, AdbDeviceTracker, AdbServiceClient } from './types';

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_INSTALL_TIMEOUT_MS = 120_000;
const DEFAULT_UNINSTALL_TIMEOUT_MS = 30_000;
const PACKAGE_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/;

const asMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const withTimeout = async <T>(
  operation: string,
  task: Promise<T>,
  timeoutMs: number,
): Promise<T> => {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new AdbServiceError({
            code: 'ADB_TIMEOUT',
            message: `ADB operation timed out: ${operation}`,
            operation,
          }));
        }, timeoutMs);
      }),
    ]);
  } catch (error) {
    if (error instanceof AdbServiceError) throw error;
    throw new AdbServiceError({
      code: 'OPERATION_FAILED',
      message: `ADB operation failed: ${operation}`,
      operation,
      cause: asMessage(error),
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const normalizeStatus = (status: string): AdbDeviceInfo['status'] => {
  if (status === 'offline') return 'offline';
  if (status === 'unauthorized') return 'unauthorized';
  if (status === 'emulator') return 'emulator';
  if (status === 'device') return 'device';
  return 'unknown';
};

const parseVersionCode = (output: string): string | null => {
  const match = output.match(/versionCode=(\d+(?:\.\d+)?)/);
  return match?.[1] ?? null;
};

export class AdbService {
  private readonly client: AdbServiceClient;
  private readonly operationTimeoutMs: number;
  private readonly installTimeoutMs: number;
  private readonly uninstallTimeoutMs: number;
  private tracker: AdbDeviceTracker | null = null;

  constructor(options: AdbServiceOptions = {}) {
    this.client = options.client ?? (Adb.createClient({
      host: '127.0.0.1',
      port: 5037,
      timeout: options.operationTimeoutMs ?? DEFAULT_TIMEOUT_MS,
    }) as unknown as AdbServiceClient);
    this.operationTimeoutMs = options.operationTimeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.installTimeoutMs = options.installTimeoutMs ?? DEFAULT_INSTALL_TIMEOUT_MS;
    this.uninstallTimeoutMs = options.uninstallTimeoutMs ?? DEFAULT_UNINSTALL_TIMEOUT_MS;
  }

  async health(): Promise<AdbHealth> {
    try {
      const version = await withTimeout('health', this.client.version(), this.operationTimeoutMs);
      return { connected: true, version: this.stringifyVersion(version) };
    } catch (error) {
      if (error instanceof AdbServiceError && error.code === 'ADB_TIMEOUT') throw error;
      throw new AdbServiceError({
        code: 'ADB_UNAVAILABLE',
        message: 'ADB server is unavailable',
        operation: 'health',
        cause: asMessage(error),
      });
    }
  }

  async listDevices(): Promise<AdbDeviceInfo[]> {
    let devices: Array<{ id: string; type: string }>;
    try {
      devices = await withTimeout('listDevices', this.client.listDevices(), this.operationTimeoutMs);
    } catch (error) {
      if (error instanceof AdbServiceError) throw error;
      throw new AdbServiceError({
        code: 'ADB_UNAVAILABLE',
        message: 'Unable to list Android devices',
        operation: 'listDevices',
        cause: asMessage(error),
      });
    }

    return Promise.all(devices.map(async (device) => {
      const info: AdbDeviceInfo = {
        serial: device.id,
        status: normalizeStatus(device.type),
        rawStatus: device.type,
        manufacturer: null,
        model: null,
        androidVersion: null,
      };
      if (info.status !== 'device' && info.status !== 'emulator') return info;

      try {
        const properties = await this.getProperties(device.id);
        return {
          ...info,
          manufacturer: properties['ro.product.manufacturer'] || null,
          model: properties['ro.product.model'] || null,
          androidVersion: properties['ro.build.version.release'] || null,
        };
      } catch {
        return info;
      }
    }));
  }

  async getProperties(serial: string): Promise<Record<string, string>> {
    const device = this.getDevice(serial, 'getProperties');
    return withTimeout('getProperties', device.getProperties(), this.operationTimeoutMs);
  }

  async install(serial: string, apkPath: string, _packageName?: string): Promise<void> {
    if (!path.isAbsolute(apkPath) || !apkPath.trim() || path.extname(apkPath).toLowerCase() !== '.apk') {
      throw new AdbServiceError({ code: 'INVALID_INPUT', message: 'APK path must be an absolute .apk file path', operation: 'install' });
    }
    const resolvedPath = path.resolve(apkPath);
    try {
      const file = await fs.stat(resolvedPath);
      if (!file.isFile() || file.size === 0) throw new Error('APK path is not a non-empty file');
      await fs.access(resolvedPath, fs.constants.R_OK);
    } catch (error) {
      throw new AdbServiceError({
        code: 'APK_NOT_FOUND',
        message: 'APK file does not exist, is empty, or is not readable',
        operation: 'install',
        cause: asMessage(error),
      });
    }
    await this.assertReady(serial, 'install');
    const device = this.getDevice(serial, 'install');
    await withTimeout('install', device.install(resolvedPath), this.installTimeoutMs);
  }

  async uninstall(serial: string, packageName: string): Promise<void> {
    this.validatePackageName(packageName, 'uninstall');
    await this.assertReady(serial, 'uninstall');
    const device = this.getDevice(serial, 'uninstall');
    await withTimeout('uninstall', device.uninstall(packageName), this.uninstallTimeoutMs);
  }

  async getVersionCode(serial: string, packageName: string): Promise<string | null> {
    this.validatePackageName(packageName, 'getVersionCode');
    await this.assertReady(serial, 'getVersionCode');
    const device = this.getDevice(serial, 'getVersionCode');
    const stream = await withTimeout('getVersionCode', device.shell(`dumpsys package ${packageName}`), this.operationTimeoutMs);
    const output = await withTimeout('getVersionCode.read', this.readStream(stream), this.operationTimeoutMs);
    return parseVersionCode(output);
  }

  async runShell(serial: string, command: string): Promise<string> {
    await this.assertReady(serial, 'shell');
    const stream = await withTimeout('shell', this.getDevice(serial, 'shell').shell(command), this.operationTimeoutMs);
    return withTimeout('shell.read', this.readStream(stream), this.operationTimeoutMs);
  }

  async startTracking(onEvent: (event: AdbDeviceEvent) => void, onError: (error: AdbServiceError) => void): Promise<void> {
    if (this.tracker) return;
    try {
      const tracker = await withTimeout('trackDevices', this.client.trackDevices(), this.operationTimeoutMs);
      this.tracker = tracker;
      tracker.on('add', (device) => void this.emitDeviceEvent('add', device, onEvent));
      tracker.on('remove', (device) => void this.emitDeviceEvent('remove', device, onEvent));
      tracker.on('change', (device) => void this.emitDeviceEvent('change', device, onEvent));
      tracker.on('error', (error) => onError(this.normalizeError(error, 'trackDevices')));
      tracker.on('end', () => { this.tracker = null; });
    } catch (error) {
      onError(this.normalizeError(error, 'trackDevices'));
    }
  }

  stopTracking(): void {
    this.tracker?.removeAllListeners().end();
    this.tracker = null;
  }

  private async emitDeviceEvent(type: AdbDeviceEvent['type'], device: { id: string; type: string }, onEvent: (event: AdbDeviceEvent) => void): Promise<void> {
    const info = (await this.listDevices()).find((item) => item.serial === device.id) ?? {
      serial: device.id,
      status: normalizeStatus(device.type),
      rawStatus: device.type,
      manufacturer: null,
      model: null,
      androidVersion: null,
    };
    onEvent({ type, device: info });
  }

  private getDevice(serial: string, operation: string): AdbDeviceClient {
    if (!serial.trim()) throw this.invalidInput(operation, 'Device serial is required');
    return this.client.getDevice(serial);
  }

  private async assertReady(serial: string, operation: string): Promise<void> {
    const device = (await this.listDevices()).find((item) => item.serial === serial);
    if (!device) throw new AdbServiceError({ code: 'DEVICE_NOT_FOUND', message: 'Android device is not connected', operation });
    if (device.status !== 'device' && device.status !== 'emulator') {
      throw new AdbServiceError({ code: 'DEVICE_NOT_FOUND', message: 'Android device is not ready', operation });
    }
  }

  private validatePackageName(packageName: string, operation: string): void {
    if (!PACKAGE_NAME_PATTERN.test(packageName)) throw this.invalidInput(operation, 'Invalid Android package name');
  }

  private invalidInput(operation: string, message: string): AdbServiceError {
    return new AdbServiceError({ code: 'INVALID_INPUT', message, operation });
  }

  private normalizeError(error: unknown, operation: string): AdbServiceError {
    if (error instanceof AdbServiceError) return error;
    return new AdbServiceError({ code: 'ADB_UNAVAILABLE', message: `ADB operation failed: ${operation}`, operation, cause: asMessage(error) });
  }

  private async readStream(stream: NodeJS.ReadableStream): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer | string>) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks).toString('utf8');
  }

  private stringifyVersion(version: unknown): string {
    if (typeof version === 'string') return version;
    if (version && typeof version === 'object' && 'version' in version) return String(version.version);
    return String(version);
  }
}

export { parseVersionCode };
