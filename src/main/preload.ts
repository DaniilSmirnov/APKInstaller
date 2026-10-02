import { contextBridge, ipcRenderer } from 'electron';
import type { AdbDeviceEvent, AdbDeviceInfo, AdbErrorPayload, AdbHealth } from './adb/types';

type DeviceEventListener = (event: unknown) => void;
const renderer = ipcRenderer;

const electronApi = {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
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
};

contextBridge.exposeInMainWorld('electron', electronApi);
