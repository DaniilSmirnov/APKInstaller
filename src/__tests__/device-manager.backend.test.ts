import { createDeviceManagerBackend } from '../renderer/device-manager/backend';

describe('DeviceManager backend contract', () => {
  it('maps an APK token to the desktop bridge', async () => {
    const api = {
      devices: {
        list: jest.fn().mockResolvedValue([{ id: 'emulator', serial: 'emulator', status: 'device', transport: 'adb-tcp', model: null, manufacturer: null, androidVersion: null, sdkVersion: null }]),
        install: jest.fn().mockResolvedValue({ success: true }),
        uninstall: jest.fn().mockResolvedValue({ success: true }),
        getPackageInfo: jest.fn().mockResolvedValue(null),
        onChange: jest.fn().mockReturnValue(jest.fn()),
      },
      adb: { onError: jest.fn().mockReturnValue(jest.fn()) },
    };
    const backend = createDeviceManagerBackend(api, async () => '/tmp/app.apk');
    await expect(backend.listDevices()).resolves.toHaveLength(1);
    await backend.install('emulator', { id: 'file-1', name: 'app.apk', size: 10, nativeToken: 'file-1' });
    expect(api.devices.install).toHaveBeenCalledWith('emulator', '/tmp/app.apk');
  });

  it('preserves subscriptions for device and error events', () => {
    const unsubscribe = jest.fn();
    const api = {
      devices: { list: jest.fn(), install: jest.fn(), uninstall: jest.fn(), getPackageInfo: jest.fn(), onChange: jest.fn().mockReturnValue(unsubscribe) },
      adb: { onError: jest.fn().mockReturnValue(unsubscribe) },
    };
    const backend = createDeviceManagerBackend(api, async () => '/tmp/app.apk');
    expect(backend.onDeviceChange(jest.fn())).toBe(unsubscribe);
    expect(backend.onError(jest.fn())).toBe(unsubscribe);
  });
});
