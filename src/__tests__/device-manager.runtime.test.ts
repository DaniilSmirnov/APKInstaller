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
});
