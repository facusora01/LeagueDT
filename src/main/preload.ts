import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  getLcuStatus: () => ipcRenderer.invoke('get-lcu-status'),
  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  updateSettings: (settings: any) => ipcRenderer.invoke('db:update-settings', settings),
  onLcuStatusChange: (callback: (status: 'connected' | 'disconnected') => void) => {
    ipcRenderer.on('lcu-status', (_event, status) => callback(status));
  }
});
