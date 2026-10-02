import { contextBridge, ipcRenderer } from 'electron';

const electronApi = {
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:get-version'),
  },
};

contextBridge.exposeInMainWorld('electron', electronApi);
