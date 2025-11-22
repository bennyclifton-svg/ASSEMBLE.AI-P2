/**
 * VS Code Dark Theme Color Palette
 * Consistent colors used across the application
 */

export const THEME = {
  bg: {
    primary: '#1e1e1e',      // Main dark background (panels, cards)
    secondary: '#252526',    // Secondary background (header, center panel)
    hover: '#2a2d2e',        // Hover state background
    selected: '#37373d',     // Selected item background
  },
  border: {
    default: '#3e3e42',      // Default border color
    hover: '#0e639c',        // Hover/focus border color
  },
  text: {
    primary: '#cccccc',      // Primary text color
    secondary: '#858585',    // Muted/secondary text
    placeholder: '#858585',  // Placeholder text
  },
  accent: {
    primary: '#0e639c',      // Primary blue accent (VS Code blue)
    primaryHover: '#1177bb', // Hover state for primary accent
    file: '#519aba',         // File icon color
    folder: '#dcb67a',       // Folder icon color
  },
  status: {
    success: '#4ec9b0',      // Success/positive
    error: '#f48771',        // Error/negative
    warning: '#dcdcaa',      // Warning
  },
  scrollbar: {
    track: '#1e1e1e',        // Scrollbar track background
    thumb: '#3e3e42',        // Scrollbar thumb color
    thumbHover: '#4e4e52',   // Scrollbar thumb hover
  },
} as const;

export type ThemeColors = typeof THEME;
