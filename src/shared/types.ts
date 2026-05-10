export interface ElectronAPI {
  ping: () => Promise<string>;
  getLcuStatus: () => Promise<'connected' | 'disconnected'>;
  getSettings: () => Promise<any>;
  updateSettings: (settings: any) => Promise<any>;
  onLcuStatusChange: (callback: (status: 'connected' | 'disconnected') => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
