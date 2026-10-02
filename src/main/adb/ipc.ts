import { BrowserWindow, ipcMain } from 'electron';
import { AdbService } from './adbService';
import { AdbServiceError } from './types';

export const adbService = new AdbService();

const serializeError = (error: unknown): never => {
  if (error instanceof AdbServiceError) throw error.toJSON();
  throw new AdbServiceError({ code: 'OPERATION_FAILED', message: 'ADB operation failed', operation: 'ipc' }).toJSON();
};

export const registerAdbIpc = (): void => {
  ipcMain.handle('adb:health', async () => {
    try { return await adbService.health(); } catch (error) { return serializeError(error); }
  });
  ipcMain.handle('adb:list-devices', async () => {
    try { return await adbService.listDevices(); } catch (error) { return serializeError(error); }
  });
  ipcMain.handle('adb:install', async (_event, serial: unknown, apkPath: unknown, packageName: unknown) => {
    try { await adbService.install(String(serial ?? ''), String(apkPath ?? ''), packageName == null ? undefined : String(packageName)); return { success: true }; } catch (error) { return serializeError(error); }
  });
  ipcMain.handle('adb:uninstall', async (_event, serial: unknown, packageName: unknown) => {
    try { await adbService.uninstall(String(serial ?? ''), String(packageName ?? '')); return { success: true }; } catch (error) { return serializeError(error); }
  });
  ipcMain.handle('adb:version-code', async (_event, serial: unknown, packageName: unknown) => {
    try { return await adbService.getVersionCode(String(serial ?? ''), String(packageName ?? '')); } catch (error) { return serializeError(error); }
  });
};

export const startAdbTracking = (): void => {
  void adbService.startTracking(
    (event) => BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) window.webContents.send('adb:device-event', event);
    }),
    (error) => BrowserWindow.getAllWindows().forEach((window) => {
      if (!window.isDestroyed()) window.webContents.send('adb:error', error.toJSON());
    }),
  );
};

export const stopAdbTracking = (): void => adbService.stopTracking();
