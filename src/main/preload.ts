import { contextBridge, ipcRenderer, webUtils, type IpcRendererEvent } from 'electron';
import type { AdbDeviceEvent, AdbDeviceInfo, AdbErrorPayload, AdbHealth } from './adb/types';

type DeviceEventListener = (event: unknown) => void;
const renderer = ipcRenderer;

const electronApi = {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
    selectApk: (): Promise<string | null> => ipcRenderer.invoke('dialog:open-apk'),
    getDroppedApkPath: (file: File): string => webUtils.getPathForFile(file),
  },
  adb: {
    health: (): Promise<AdbHealth> => ipcRenderer.invoke('adb:health'),
    listDevices: (): Promise<AdbDeviceInfo[]> => ipcRenderer.invoke('adb:list-devices'),
    install: (serial: string, apkPath: string): Promise<{ success: true }> => ipcRenderer.invoke('adb:install', serial, apkPath),
    uninstall: (serial: string, packageName: string): Promise<{ success: true }> => ipcRenderer.invoke('adb:uninstall', serial, packageName),
    getVersionCode: (serial: string, packageName: string): Promise<string | null> => ipcRenderer.invoke('adb:version-code', serial, packageName),
    onDeviceEvent: (listener: DeviceEventListener): (() => void) => {
          const handler = (_event: Electron.IpcRendererEvent, payload: AdbDeviceEvent): void => listener(payload);
          renderer.on('adb:device-event', handler);
          return () => renderer.removeListener('adb:device-event', handler);
    },
    onError: (listener: DeviceEventListener): (() => void) => {
          const handler = (_event: Electron.IpcRendererEvent, payload: AdbErrorPayload): void => listener(payload);
          renderer.on('adb:error', handler);
          return () => renderer.removeListener('adb:error', handler);
    },
  },
  devices: {
    list: (): Promise<AdbDeviceInfo[]> => ipcRenderer.invoke('adb:list-devices'),
    startTracking: async (): Promise<void> => undefined,
    stopTracking: async (): Promise<void> => undefined,
    install: (serial: string, apkPath: string): Promise<{ success: true }> => ipcRenderer.invoke('adb:install', serial, apkPath),
    uninstall: (serial: string, packageName: string): Promise<{ success: true }> => ipcRenderer.invoke('adb:uninstall', serial, packageName),
    getPackageInfo: async (serial: string, packageName: string): Promise<{ packageName: string; versionName: string | null; versionCode: number | null } | null> => {
      const value = await ipcRenderer.invoke('adb:version-code', serial, packageName) as string | null;
      return value === null ? null : { packageName, versionName: null, versionCode: Number(value) };
    },
    onChange: (listener: (change: { type: 'added' | 'removed' | 'changed'; device: AdbDeviceInfo }) => void): (() => void) => {
      const handler = (_event: IpcRendererEvent, event: AdbDeviceEvent): void => {
        const type = event.type === 'add' ? 'added' : event.type === 'remove' ? 'removed' : 'changed';
        listener({ type, device: event.device });
      };
      renderer.on('adb:device-event', handler);
      return () => renderer.removeListener('adb:device-event', handler);
    },
  },
};

contextBridge.exposeInMainWorld('electron', electronApi);
