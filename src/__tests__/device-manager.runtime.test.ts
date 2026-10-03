import { createDeviceManagerRuntime } from '../device-manager/runtime';

describe('DeviceManager native runtime', () => {
  it('uses the WKWebView JSON bridge and decodes base64 payloads', async () => {
    let posted = '';
    const target = window as unknown as {
      webkit: { messageHandlers: { deviceManager: { postMessage: (message: string) => void } } };
      __deviceManagerResolve?: (message: string) => void;
    };
    target.webkit = { messageHandlers: { deviceManager: { postMessage: (message) => { posted = message; } } } };
    const runtime = createDeviceManagerRuntime(window);
    const pending = runtime.listDevices();
    await Promise.resolve();
    const request = JSON.parse(posted) as { id: string; method: string };
    expect(request.method).toBe('devices.list');
    const devices = [{ id: 'serial', serial: 'serial', status: 'device', transport: 'adb-tcp', model: null, manufacturer: null, androidVersion: null, sdkVersion: null }];
    const encoded = btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(devices))));
    target.__deviceManagerResolve?.(JSON.stringify({ id: request.id, ok: true, payload: encoded }));
    await expect(pending).resolves.toEqual(devices);
  });

  it('normalizes the legacy Electron device shape and keeps drag-and-drop paths', async () => {
    delete (window as unknown as { webkit?: unknown }).webkit;
    const electron = {
      app: { selectApk: jest.fn(), getDroppedApkPath: jest.fn().mockReturnValue('/tmp/release.apk') },
      devices: {
        list: jest.fn().mockResolvedValue([{ serial: 'serial', status: 'device', rawStatus: 'device', model: 'Pixel', manufacturer: 'Google', androidVersion: '14', sdkVersion: 34 }]),
        install: jest.fn().mockResolvedValue(undefined),
        uninstall: jest.fn().mockResolvedValue(undefined),
        getPackageInfo: jest.fn().mockResolvedValue(null),
        onChange: jest.fn().mockReturnValue(jest.fn()),
      },
      adb: { onError: jest.fn().mockReturnValue(jest.fn()) },
    };
    window.electron = electron as never;
    const runtime = createDeviceManagerRuntime(window);
    await expect(runtime.listDevices()).resolves.toEqual([expect.objectContaining({ id: 'serial', serial: 'serial', transport: 'adb-tcp' })]);
    expect(runtime.resolveDroppedApk({ name: 'release.apk', size: 42 } as File)).toEqual(expect.objectContaining({ nativeToken: '/tmp/release.apk', size: 42 }));
  });
});
