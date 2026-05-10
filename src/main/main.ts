import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { LcuConnector } from './api/lcu/LcuConnector';
import { SettingsRepository } from './database/repositories/SettingsRepository';

let mainWindow: BrowserWindow | null = null;
const lcuConnector = new LcuConnector();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    transparent: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.argv.includes('--watch') || process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  ipcMain.handle('ping', () => 'Pong desde el proceso Main (Electron)!');
  ipcMain.handle('get-lcu-status', () => lcuConnector.isConnected ? 'connected' : 'disconnected');
  ipcMain.handle('db:get-settings', async () => await SettingsRepository.getSettings());
  ipcMain.handle('db:update-settings', async (_event, settings) => await SettingsRepository.updateSettings(settings));

  createWindow();

  lcuConnector.on('connect', () => {
    if (mainWindow) mainWindow.webContents.send('lcu-status', 'connected');
  });

  lcuConnector.on('disconnect', () => {
    if (mainWindow) mainWindow.webContents.send('lcu-status', 'disconnected');
  });

  lcuConnector.start();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  lcuConnector.stop();
  if (process.platform !== 'darwin') app.quit();
});
