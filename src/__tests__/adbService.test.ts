import { Readable } from 'node:stream';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { AdbService, parseVersionCode } from '../main/adb/adbService';
import type { AdbServiceClient, AdbDeviceClient } from '../main/adb/types';

const deviceClient = (overrides: Partial<AdbDeviceClient> = {}): AdbDeviceClient => ({
  getProperties: async () => ({
    'ro.product.manufacturer': 'Google',
    'ro.product.model': 'Pixel',
    'ro.build.version.release': '14',
  }),
  install: async () => true,
  uninstall: async () => true,
  shell: async () => Readable.from(['versionCode=123\n']),
  ...overrides,
});

const client = (device: AdbDeviceClient = deviceClient()): AdbServiceClient => ({
  version: async () => ({ version: '41.0.2' }),
  listDevices: async () => [{ id: 'serial-1', type: 'device' }],
  trackDevices: async () => ({
    on: jest.fn().mockReturnThis(),
    removeAllListeners: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  }),
  getDevice: () => device,
});

describe('AdbService', () => {
  const apkPath = path.join(os.tmpdir(), 'apkinstaller-test.apk');

  beforeAll(async () => { await fs.writeFile(apkPath, 'fake apk'); });
  afterAll(async () => { await fs.rm(apkPath, { force: true }); });

  it('normalizes health and device information', async () => {
    const service = new AdbService({ client: client() });

    await expect(service.health()).resolves.toEqual({ connected: true, version: '41.0.2' });
    await expect(service.listDevices()).resolves.toEqual([{
      serial: 'serial-1',
      status: 'device',
      rawStatus: 'device',
      manufacturer: 'Google',
      model: 'Pixel',
      androidVersion: '14',
    }]);
  });

  it('delegates install, uninstall and versionCode operations', async () => {
    const install = jest.fn(async () => true);
    const uninstall = jest.fn(async () => true);
    const service = new AdbService({
      client: client(deviceClient({ install, uninstall })),
    });

    await expect(service.uninstall('serial-1', 'com.example.app')).resolves.toBeUndefined();
    await expect(service.getVersionCode('serial-1', 'com.example.app')).resolves.toBe('123');
    await expect(service.install('serial-1', apkPath)).resolves.toBeUndefined();
    expect(uninstall).toHaveBeenCalledWith('com.example.app');
    expect(install).toHaveBeenCalledWith(apkPath);
  });

  it('rejects invalid package names before contacting ADB', async () => {
    const getDevice = jest.fn(() => deviceClient());
    const service = new AdbService({ client: { ...client(), getDevice } });

    await expect(service.uninstall('serial-1', 'not a package')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(getDevice).not.toHaveBeenCalled();
  });

  it.each([
    ['offline', 'offline'],
    ['unauthorized', 'unauthorized'],
    ['mystery', 'unknown'],
  ] as const)('preserves non-ready status %s', async (rawStatus, status) => {
    const service = new AdbService({
      client: { ...client(), listDevices: async () => [{ id: 'serial-1', type: rawStatus }] },
    });
    await expect(service.listDevices()).resolves.toEqual([{
      serial: 'serial-1', status, rawStatus, manufacturer: null, model: null, androidVersion: null,
    }]);
  });

  it('starts tracking only once and stops the tracker', async () => {
    const tracker = {
      on: jest.fn().mockReturnThis(),
      removeAllListeners: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
    };
    const trackDevices = jest.fn(async () => tracker);
    const service = new AdbService({ client: { ...client(), trackDevices } });
    const onEvent = jest.fn();
    const onError = jest.fn();

    await service.startTracking(onEvent, onError);
    await service.startTracking(onEvent, onError);
    service.stopTracking();

    expect(trackDevices).toHaveBeenCalledTimes(1);
    expect(tracker.removeAllListeners).toHaveBeenCalledTimes(1);
    expect(tracker.end).toHaveBeenCalledTimes(1);
  });

  it('rejects relative, empty and non-apk paths before contacting ADB', async () => {
    const getDevice = jest.fn(() => deviceClient());
    const service = new AdbService({ client: { ...client(), getDevice } });

    await expect(service.install('serial-1', 'relative.apk')).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    await expect(service.install('serial-1', path.join(os.tmpdir(), 'missing.txt'))).rejects.toMatchObject({ code: 'INVALID_INPUT' });
    expect(getDevice).not.toHaveBeenCalled();
  });
});

describe('parseVersionCode', () => {
  it('parses versionCode from dumpsys output', () => {
    expect(parseVersionCode('packageName versionCode=12 minSdk=28')).toBe('12');
    expect(parseVersionCode('no version')).toBeNull();
  });
});
