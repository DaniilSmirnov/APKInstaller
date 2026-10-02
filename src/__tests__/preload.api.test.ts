/* eslint-disable no-unused-vars */
const invoke = jest.fn<Promise<unknown>, [string, ...unknown[]]>();
const exposeInMainWorld = jest.fn<void, [string, unknown]>();

jest.mock('electron', () => ({
  contextBridge: { exposeInMainWorld },
  webUtils: { getPathForFile: jest.fn() },
  ipcRenderer: { invoke, on: jest.fn(), removeListener: jest.fn() },
}));

describe('preload API', () => {
  beforeEach(() => {
    jest.resetModules();
    invoke.mockReset();
    exposeInMainWorld.mockReset();
  });

  it('exposes the typed electron bridge under one global name', async () => {
    await import('../main/preload');

    expect(exposeInMainWorld).toHaveBeenCalledTimes(1);
    expect(exposeInMainWorld.mock.calls[0]?.[0]).toBe('electron');
    expect(exposeInMainWorld.mock.calls[0]?.[1]).toBeDefined();
  });

  it('does not expose generic IPC methods', async () => {
    await import('../main/preload');

    const api = exposeInMainWorld.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(api).not.toHaveProperty('send');
    expect(api).not.toHaveProperty('invoke');
    expect(api).not.toHaveProperty('on');
  });

  it('routes device operations through fixed IPC channels', async () => {
    await import('../main/preload');

    const api = exposeInMainWorld.mock.calls[0]?.[1] as {
      devices: {
        list: () => Promise<unknown>;
        install: (...args: [string, string, string]) => Promise<unknown>;
        uninstall: (...args: [string, string]) => Promise<unknown>;
      };
    };

    expect(api.devices).toBeDefined();
    api.devices.list();
    api.devices.install('emulator-5554', '/tmp/app.apk', 'com.example.app');
    api.devices.uninstall('emulator-5554', 'com.example.app');

    expect(invoke).toHaveBeenNthCalledWith(1, 'adb:list-devices');
    expect(invoke).toHaveBeenNthCalledWith(
      2,
      'adb:install',
      'emulator-5554',
      '/tmp/app.apk',
      'com.example.app',
    );
    expect(invoke).toHaveBeenNthCalledWith(3, 'adb:uninstall', 'emulator-5554', 'com.example.app');
  });

  it('routes APK picking through the fixed dialog channel', async () => {
    await import('../main/preload');
    const api = exposeInMainWorld.mock.calls[0]?.[1] as {
      app: { selectApk: () => Promise<unknown> };
    };

    api.app.selectApk();
    expect(invoke).toHaveBeenCalledWith('dialog:open-apk');
  });
});
