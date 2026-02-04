/**
 * Export Theme Configuration
 * Single source of truth for colors used in document exports.
 */

export const EXPORT_COLORS = {
  headings: {
    h1: '#000000',  // Black
    h2: '#000000',  // Black
    h3: '#000000',  // Black
  },
  text: {
    primary: '#000000',
    secondary: '#4B5563',
  },
  table: {
    headerBg: '#F3F4F6',
    headerText: '#000000',
    border: '#E5E7EB',
  },
} as const;

// Helper for docx library (needs color without #)
export const stripHash = (color: string) => color.replace('#', '');
