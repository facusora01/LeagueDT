import type { ElectronAPI } from '../../shared/types';

// Single typed accessor for the preload-exposed bridge.
export const api: ElectronAPI = window.electronAPI;

export const hasApi = typeof window !== 'undefined' && !!window.electronAPI;
