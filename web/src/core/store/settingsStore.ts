import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  language: 'zh' | 'en';
  autoScroll: boolean;
  showTimestamp: boolean;
  fontSize: 'small' | 'medium' | 'large';
  enableNotifications: boolean;
  enableSounds: boolean;
}

interface SettingsStore {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  theme: 'system',
  language: 'zh',
  autoScroll: true,
  showTimestamp: false,
  fontSize: 'medium',
  enableNotifications: true,
  enableSounds: false
};

export const useSettingsStore = create<SettingsStore>()(persist(
  (set, _get) => ({
    settings: defaultSettings,
    
    updateSettings: (updates: Partial<Settings>) => {
      set((state) => ({
        settings: { ...state.settings, ...updates }
      }));
    },
    
    resetSettings: () => {
      set({ settings: defaultSettings });
    }
  }),
  {
    name: 'settings-store'
  }
));