import { Readable } from 'node:stream';
import { AndroidService } from '../main/android/service';
import type { AdbService } from '../main/adb/adbService';

describe('AndroidService', () => {
  it('uses typed density and resolution commands', async () => {
    const runShell = jest.fn()
      .mockResolvedValueOnce('Physical density: 420\nOverride density: 400\n')
      .mockResolvedValueOnce('Physical size: 1080x1920\nOverride size: 720x1280\n')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('Physical density: 420\n')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('Physical size: 1080x1920\n')
      .mockResolvedValueOnce('')
      .mockResolvedValueOnce('Physical density: 420\n')
      .mockResolvedValueOnce('Physical size: 1080x1920\n');
    const service = new AndroidService({ runShell } as unknown as AdbService);
    await expect(service.getDisplaySettings('serial')).resolves.toMatchObject({ physicalDensity: 420, overrideDensity: 400 });
    await service.setDensity('serial', null);
    await service.setResolution('serial', null);
    expect(runShell).toHaveBeenNthCalledWith(3, 'serial', 'wm density reset');
    expect(runShell).toHaveBeenNthCalledWith(6, 'serial', 'wm size reset');
  });

  it('rejects invalid permission and display inputs before ADB', async () => {
    const runShell = jest.fn().mockResolvedValue(Readable.from(['']));
    const service = new AndroidService({ runShell } as unknown as AdbService);
    await expect(service.setPermission('serial', 'com.example.app', 'rm -rf /', true)).rejects.toThrow('Invalid Android permission');
    await expect(service.setDensity('serial', 1)).rejects.toThrow('Density must be an integer');
    await expect(service.setResolution('serial', 1, 2)).rejects.toThrow('Resolution is out of range');
    expect(runShell).not.toHaveBeenCalled();
  });
});
