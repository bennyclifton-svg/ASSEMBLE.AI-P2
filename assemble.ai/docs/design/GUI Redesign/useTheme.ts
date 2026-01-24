'use client';

import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'precision';

interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemTheme: 'light' | 'dark';
}

const THEME_KEY = 'theme';
const VALID_THEMES: Theme[] = ['light', 'dark', 'precision'];

/**
 * Custom hook for managing theme state with support for light, dark, and precision themes.
 * Persists theme preference to localStorage and syncs with document attribute.
 */
export function useTheme(): UseThemeReturn {
  // Initialize with a default, will be updated on mount
  const [theme, setThemeState] = useState<Theme>('light');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  // Read initial theme and system preference on mount
  useEffect(() => {
    setMounted(true);

    // Get system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    // Listen for system preference changes
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handleChange);

    // Get stored theme
    try {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored && VALID_THEMES.includes(stored)) {
        setThemeState(stored);
      } else {
        // Default to system preference
        setThemeState(mediaQuery.matches ? 'dark' : 'light');
      }
    } catch {
      // localStorage not available, use system preference
      setThemeState(mediaQuery.matches ? 'dark' : 'light');
    }

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Apply theme to document when it changes
  useEffect(() => {
    if (!mounted) return;

    document.documentElement.setAttribute('data-theme', theme);
    
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // localStorage not available, theme will still work for current session
    }
  }, [theme, mounted]);

  // Set a specific theme
  const setTheme = useCallback((newTheme: Theme) => {
    if (VALID_THEMES.includes(newTheme)) {
      setThemeState(newTheme);
    }
  }, []);

  // Cycle through themes: light → dark → precision → light
  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      switch (current) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'precision';
        case 'precision':
          return 'light';
        default:
          return 'light';
      }
    });
  }, []);

  return {
    theme,
    setTheme,
    toggleTheme,
    systemTheme,
  };
}

/**
 * Utility to check if we're in precision theme
 */
export function usePrecisionTheme(): boolean {
  const { theme } = useTheme();
  return theme === 'precision';
}
