import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import { registerAdbIpc, startAdbTracking, stopAdbTracking } from './adb/ipc';
import { registerAndroidIpc } from './android/ipc';
import { createSettingsStore } from './settings';

let mainWindow: BrowserWindow | null = null;

ipcMain.handle('app:get-version', () => app.getVersion());
ipcMain.handle('dialog:open-apk', async (event) => {
  const owner = BrowserWindow.fromWebContents(event.sender) ?? undefined;
  const result = owner
    ? await dialog.showOpenDialog(owner, { properties: ['openFile'], filters: [{ name: 'Android package', extensions: ['apk'] }] })
    : await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Android package', extensions: ['apk'] }] });
  return result.canceled ? null : result.filePaths[0] ?? null;
});
registerAdbIpc();
registerAndroidIpc();

let settingsStore: ReturnType<typeof createSettingsStore>;
const getSettings = (): ReturnType<typeof createSettingsStore> => {
  if (!settingsStore) settingsStore = createSettingsStore(app.getPath('userData'));
  return settingsStore;
};
ipcMain.handle('settings:get', () => { const store = getSettings(); return ({ schemaVersion: 1, packages: store.get('packages'), selectedPackage: store.get('selectedPackage'), lastSelectedSerial: store.get('lastSelectedSerial') }); });
ipcMain.handle('settings:set', (_event, value: unknown) => {
  if (!value || typeof value !== 'object') throw new Error('Invalid settings');
  const input = value as { packages?: unknown; selectedPackage?: unknown; lastSelectedSerial?: unknown };
  if (!Array.isArray(input.packages) || input.packages.some((item) => typeof item !== 'string')) throw new Error('Invalid settings packages');
  const store = getSettings();
  store.set('packages', input.packages);
  if (typeof input.selectedPackage === 'string') store.set('selectedPackage', input.selectedPackage);
  if (typeof input.lastSelectedSerial === 'string') store.set('lastSelectedSerial', input.lastSelectedSerial);
  return { schemaVersion: 1, packages: store.get('packages'), selectedPackage: store.get('selectedPackage'), lastSelectedSerial: store.get('lastSelectedSerial') };
});

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 760,
    minHeight: 520,
    title: 'APKInstaller',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  void mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.whenReady().then(() => {
  createWindow();
  startAdbTracking();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopAdbTracking();
  if (process.platform !== 'darwin') app.quit();
});
