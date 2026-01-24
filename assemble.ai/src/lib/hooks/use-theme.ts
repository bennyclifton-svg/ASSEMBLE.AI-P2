'use client';

import { useCallback, useEffect, useState } from 'react';

export type Theme = 'precision' | 'precision-light';

interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemTheme: 'light' | 'dark';
  isPrecisionLight: boolean;
  isDark: boolean;
  isLoaded: boolean;
}

const THEME_KEY = 'theme';
const VALID_THEMES: Theme[] = ['precision', 'precision-light'];

/**
 * Custom hook for managing TESSERA's Architectural Precision themes.
 * Supports two theme variants:
 * - precision: Dark slate with copper accents (default)
 * - precision-light: Warm cream with copper accents
 *
 * Persists theme preference to localStorage and syncs with document attribute.
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>('precision');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark');
  const [isLoaded, setIsLoaded] = useState(false);

  // Read initial theme and system preference on mount
  useEffect(() => {
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
        // Default to precision (dark) regardless of system preference
        setThemeState('precision');
      }
    } catch {
      setThemeState('precision');
    }

    setIsLoaded(true);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  // Apply theme to document when it changes
  useEffect(() => {
    if (!isLoaded) return;

    document.documentElement.setAttribute('data-theme', theme);

    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // localStorage not available
    }
  }, [theme, isLoaded]);

  // Set a specific theme
  const setTheme = useCallback((newTheme: Theme) => {
    if (VALID_THEMES.includes(newTheme)) {
      setThemeState(newTheme);
    }
  }, []);

  // Toggle between precision and precision-light
  const toggleTheme = useCallback(() => {
    setThemeState((current) => {
      return current === 'precision' ? 'precision-light' : 'precision';
    });
  }, []);

  const isPrecisionLight = theme === 'precision-light';
  const isDark = theme === 'precision'; // precision is dark, precision-light is light

  return {
    theme,
    setTheme,
    toggleTheme,
    systemTheme,
    isPrecisionLight,
    isDark,
    isLoaded,
  };
}

/**
 * Check if current theme is precision-light variant
 */
export function usePrecisionLight(): boolean {
  const { isPrecisionLight } = useTheme();
  return isPrecisionLight;
}

/**
 * Check if current theme is dark (precision)
 */
export function useDarkTheme(): boolean {
  const { isDark } = useTheme();
  return isDark;
}
