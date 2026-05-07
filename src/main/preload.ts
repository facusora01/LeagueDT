import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
});
