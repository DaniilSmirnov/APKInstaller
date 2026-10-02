import { AdbService } from '../adb/adbService';
import type { AndroidPermission, DisplaySettings } from './types';

const PERMISSION = /^android\.permission\.[A-Z0-9_]+$/;
const dimension = /^(\d{2,5})x(\d{2,5})$/;
const parseSize = (text: string): { width: number; height: number } | null => {
  const match = text.match(/(?:Override|Physical) size:\s*(\d+)x(\d+)/i);
  return match ? { width: Number(match[1]), height: Number(match[2]) } : null;
};

export class AndroidService {
  constructor(private readonly adb: AdbService) {}

  async getPermissions(serial: string, packageName: string): Promise<AndroidPermission[]> {
    const output = await this.adb.runShell(serial, `dumpsys package ${packageName}`);
    return [...new Set([...output.matchAll(/android\.permission\.[A-Z0-9_]+/g)].map((match) => match[0]))].map((permission) => ({ permission, state: output.includes(`${permission}: granted=true`) ? 'granted' : 'denied' }));
  }

  async setPermission(serial: string, packageName: string, permission: string, granted: boolean): Promise<void> {
    if (!PERMISSION.test(permission)) throw new Error('Invalid Android permission');
    await this.adb.runShell(serial, `${granted ? 'pm grant' : 'pm revoke'} ${packageName} ${permission}`);
    await this.getPermissions(serial, packageName);
  }

  async getDisplaySettings(serial: string): Promise<DisplaySettings> {
    const [density, size] = await Promise.all([this.adb.runShell(serial, 'wm density'), this.adb.runShell(serial, 'wm size')]);
    const physicalDensity = density.match(/Physical density:\s*(\d+)/i)?.[1];
    const overrideDensity = density.match(/Override density:\s*(\d+)/i)?.[1];
    return { physicalDensity: physicalDensity ? Number(physicalDensity) : null, overrideDensity: overrideDensity ? Number(overrideDensity) : null, physicalSize: parseSize(size), overrideSize: parseSize(size) };
  }

  async setDensity(serial: string, density: number | null): Promise<DisplaySettings> {
    if (density !== null && (!Number.isInteger(density) || density < 50 || density > 1000)) throw new Error('Density must be an integer from 50 to 1000');
    await this.adb.runShell(serial, density === null ? 'wm density reset' : `wm density ${density}`);
    return this.getDisplaySettings(serial);
  }

  async setResolution(serial: string, width: number | null, height?: number): Promise<DisplaySettings> {
    if (width === null) { await this.adb.runShell(serial, 'wm size reset'); return this.getDisplaySettings(serial); }
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 100 || width > 10000 || height! < 100 || height! > 10000) throw new Error('Resolution is out of range');
    const value = `${width}x${height}`;
    if (!dimension.test(value)) throw new Error('Invalid resolution');
    await this.adb.runShell(serial, `wm size ${value}`);
    return this.getDisplaySettings(serial);
  }
}
