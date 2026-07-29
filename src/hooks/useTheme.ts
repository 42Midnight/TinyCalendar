import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode } from '../types';

const THEME_KEY = 'tinycalendar-theme';

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function getStoredTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system';
}

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  const effective = mode === 'system' ? getSystemTheme() : mode;
  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function useTheme() {
  const [mode, setModeState] = useState<ThemeMode>(getStoredTheme);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem(THEME_KEY, newMode);
    applyTheme(newMode);
  }, []);

  // Apply on mount
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  // Listen for system theme changes
  useEffect(() => {
    if (mode !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  return {
    theme: mode,
    setTheme: setMode,
    effectiveTheme: mode === 'system' ? getSystemTheme() : mode,
  };
}
