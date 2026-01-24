'use client';

import { useCallback, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'precision' | 'precision-light';

interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
  systemTheme: 'light' | 'dark';
  isPrecision: boolean;
  isDark: boolean;
}

const THEME_KEY = 'theme';
const VALID_THEMES: Theme[] = ['light', 'dark', 'precision', 'precision-light'];

/**
 * Custom hook for managing theme state with support for:
 * - light: Standard light theme
 * - dark: Standard dark theme  
 * - precision: Architectural dark theme (copper on slate)
 * - precision-light: Architectural light theme (copper on cream)
 * 
 * Persists theme preference to localStorage and syncs with document attribute.
 */
export function useTheme(): UseThemeReturn {
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
      // localStorage not available
    }
  }, [theme, mounted]);

  // Set a specific theme
  const setTheme = useCallback((newTheme: Theme) => {
    if (VALID_THEMES.includes(newTheme)) {
      setThemeState(newTheme);
    }
  }, []);

  // Toggle between light and dark (or precision-light and precision)
  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      switch (current) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'light';
        case 'precision':
          return 'precision-light';
        case 'precision-light':
          return 'precision';
        default:
          return 'light';
      }
    });
  }, []);

  // Cycle through all themes: light → dark → precision-light → precision → light
  const cycleTheme = useCallback(() => {
    setThemeState((current) => {
      switch (current) {
        case 'light':
          return 'dark';
        case 'dark':
          return 'precision-light';
        case 'precision-light':
          return 'precision';
        case 'precision':
          return 'light';
        default:
          return 'light';
      }
    });
  }, []);

  const isPrecision = theme === 'precision' || theme === 'precision-light';
  const isDark = theme === 'dark' || theme === 'precision';

  return {
    theme,
    setTheme,
    toggleTheme,
    cycleTheme,
    systemTheme,
    isPrecision,
    isDark,
  };
}

/**
 * Check if current theme is a precision variant
 */
export function usePrecisionTheme(): boolean {
  const { isPrecision } = useTheme();
  return isPrecision;
}

/**
 * Check if current theme is dark
 */
export function useDarkTheme(): boolean {
  const { isDark } = useTheme();
  return isDark;
}
