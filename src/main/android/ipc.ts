import { ipcMain } from 'electron';
import { AdbServiceError } from '../adb/types';
import { AndroidService } from './service';
import { adbService } from '../adb/ipc';

export const androidService = new AndroidService(adbService);
const error = (e: unknown): never => { throw (e instanceof AdbServiceError ? e.toJSON() : { code: 'OPERATION_FAILED', message: e instanceof Error ? e.message : 'Android operation failed', operation: 'android' }); };
export const registerAndroidIpc = (): void => {
  ipcMain.handle('android:get-permissions', async (_e, serial: unknown, pkg: unknown) => { try { return await androidService.getPermissions(String(serial ?? ''), String(pkg ?? '')); } catch (e) { return error(e); } });
  ipcMain.handle('android:set-permission', async (_e, serial: unknown, pkg: unknown, permission: unknown, granted: unknown) => { try { await androidService.setPermission(String(serial ?? ''), String(pkg ?? ''), String(permission ?? ''), Boolean(granted)); return { success: true }; } catch (e) { return error(e); } });
  ipcMain.handle('android:get-display', async (_e, serial: unknown) => { try { return await androidService.getDisplaySettings(String(serial ?? '')); } catch (e) { return error(e); } });
  ipcMain.handle('android:set-density', async (_e, serial: unknown, density: unknown) => { try { return await androidService.setDensity(String(serial ?? ''), density == null ? null : Number(density)); } catch (e) { return error(e); } });
  ipcMain.handle('android:set-resolution', async (_e, serial: unknown, width: unknown, height: unknown) => { try { return await androidService.setResolution(String(serial ?? ''), width == null ? null : Number(width), height == null ? undefined : Number(height)); } catch (e) { return error(e); } });
};
