import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface HolidayInfo {
  id: string;
  name: string;
  enabled: boolean;
}

export interface AppSettings {
  font_size: string;
  show_lunar: boolean;
  show_holidays: boolean;
  global_shortcut: string;
  holidays: HolidayInfo[];
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    font_size: 'medium',
    show_lunar: false,
    show_holidays: false,
    global_shortcut: 'Ctrl+Shift+C',
    holidays: [],
  });
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const s = await invoke<AppSettings>('get_settings');
      if (s && typeof s === 'object') {
        setSettings(s);
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  const updateSetting = useCallback(async (key: string, value: string) => {
    try {
      await invoke('update_setting', { key, value });
      // Reload all settings to ensure consistency
      const s = await invoke<AppSettings>('get_settings');
      if (s) setSettings(s);
    } catch (err) {
      console.error('Failed to update setting:', err);
    }
  }, []);

  const toggleHoliday = useCallback(async (holidayId: string, enabled: boolean) => {
    try {
      await invoke('update_holiday_toggle', { holidayId, enabled });
      const s = await invoke<AppSettings>('get_settings');
      if (s) setSettings(s);
    } catch (err) {
      console.error('Failed to toggle holiday:', err);
    }
  }, []);

  return { settings, loading, updateSetting, toggleHoliday, reloadSettings: loadSettings };
}
