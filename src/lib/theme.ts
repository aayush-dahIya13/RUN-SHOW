'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'runshow-theme';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readStoredTheme(): Theme | null {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

const listeners = new Set<() => void>();

function applyTheme(theme: Theme) {
  const resolvedTheme = theme === 'system' ? getSystemTheme() : theme;
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  listeners.forEach(listener => listener());
}

function getSnapshot(): Theme {
  const stored = document.documentElement.dataset.theme;
  if (stored === 'dark' || stored === 'light' || stored === 'system') return stored as Theme;
  return 'light';
}

function getServerSnapshot(): Theme {
  return 'system';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const handleSystemThemeChange = () => {
    if (!readStoredTheme()) applyTheme(getSystemTheme());
  };
  media.addEventListener('change', handleSystemThemeChange);
  return () => {
    listeners.delete(listener);
    media.removeEventListener('change', handleSystemThemeChange);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setTheme = useCallback((nextTheme: Theme) => {
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [setTheme, theme]);

  return {
    theme,
    toggleTheme,
    setTheme,
  };
}

