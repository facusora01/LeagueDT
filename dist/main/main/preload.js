"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    ping: () => electron_1.ipcRenderer.invoke('ping'),
    getLcuStatus: () => electron_1.ipcRenderer.invoke('get-lcu-status'),
    getSettings: () => electron_1.ipcRenderer.invoke('db:get-settings'),
    updateSettings: (settings) => electron_1.ipcRenderer.invoke('db:update-settings', settings),
    onLcuStatusChange: (callback) => {
        electron_1.ipcRenderer.on('lcu-status', (_event, status) => callback(status));
    }
});
