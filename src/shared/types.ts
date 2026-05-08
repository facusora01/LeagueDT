export interface ElectronAPI {
  ping: () => Promise<string>;
  getLcuStatus: () => Promise<'connected' | 'disconnected'>;
  onLcuStatusChange: (callback: (status: 'connected' | 'disconnected') => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
