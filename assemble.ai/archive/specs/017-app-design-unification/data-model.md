# Data Model: Application Design System Unification

**Feature**: 017-app-design-unification
**Date**: 2024-12-19

## Overview

This feature is primarily CSS/styling focused and does not introduce database entities. The "data model" for this feature comprises:

1. **Design Token Structure** - CSS custom property definitions
2. **Theme Configuration** - Light/dark theme value mappings
3. **Theme State** - Client-side storage schema

---

## 1. Design Token Structure

### Tier 1: Primitive Tokens (Raw Values)

```css
/* Primary Brand Colors (Pop Colors) */
--primitive-green: #00C27A;
--primitive-green-light: #B4F5C8;
--primitive-green-lighter: #E8FDF0;
--primitive-green-dark: #00A366;
--primitive-green-on-dark: #00D68A;

--primitive-yellow: #FFD93D;
--primitive-yellow-light: #FFF9E6;
--primitive-yellow-dark: #E6C235;
--primitive-yellow-on-dark: #FFE066;

--primitive-coral: #FF6B6B;
--primitive-coral-light: #FFEEEE;
--primitive-coral-dark: #E55555;
--primitive-coral-on-dark: #FF8585;

--primitive-teal: #4ECDC4;
--primitive-teal-light: #E6FAF8;
--primitive-teal-dark: #3DB8AF;
--primitive-teal-on-dark: #6EDED6;

/* Neutral Scale */
--primitive-white: #FFFFFF;
--primitive-black: #000000;
--primitive-gray-50: #FAFAFA;
--primitive-gray-100: #F5F5F5;
--primitive-gray-200: #E5E5E5;
--primitive-gray-300: #D4D4D4;
--primitive-gray-400: #A3A3A3;
--primitive-gray-500: #737373;
--primitive-gray-600: #525252;
--primitive-gray-700: #404040;
--primitive-gray-800: #262626;
--primitive-gray-900: #171717;
--primitive-gray-950: #0A0A0A;
```

### Tier 2: Semantic Tokens (Theme-Aware)

These tokens resolve differently based on `data-theme` attribute.

```typescript
interface SemanticTokens {
  // Backgrounds
  'color-bg-primary': string;      // Main page background
  'color-bg-secondary': string;    // Cards, elevated surfaces
  'color-bg-tertiary': string;     // Subtle backgrounds, hover states
  'color-bg-inverse': string;      // Inverted background for contrast

  // Text
  'color-text-primary': string;    // Headings, primary content
  'color-text-secondary': string;  // Body text, descriptions
  'color-text-muted': string;      // Labels, hints, metadata
  'color-text-inverse': string;    // Text on inverse backgrounds

  // Borders
  'color-border': string;          // Default borders
  'color-border-subtle': string;   // Subtle separators
  'color-border-strong': string;   // Emphasized borders

  // Accent Colors (same in both themes, with adjustments)
  'color-accent-green': string;
  'color-accent-yellow': string;
  'color-accent-coral': string;
  'color-accent-teal': string;

  // Accent Tints (background tints for each accent)
  'color-accent-green-tint': string;
  'color-accent-yellow-tint': string;
  'color-accent-coral-tint': string;
  'color-accent-teal-tint': string;

  // Semantic States
  'color-success': string;         // Maps to green
  'color-warning': string;         // Maps to yellow
  'color-error': string;           // Maps to coral
  'color-info': string;            // Maps to teal
}
```

### Tier 3: Component Tokens (Optional)

Component-specific tokens that reference semantic tokens.

```typescript
interface ComponentTokens {
  // Buttons
  'button-primary-bg': string;
  'button-primary-text': string;
  'button-primary-hover': string;
  'button-secondary-bg': string;
  'button-secondary-text': string;

  // Cards
  'card-bg': string;
  'card-border': string;
  'card-shadow': string;

  // Inputs
  'input-bg': string;
  'input-border': string;
  'input-focus-ring': string;

  // Tabs
  'tab-active-indicator': string;
  'tab-inactive-text': string;
}
```

---

## 2. Theme Value Mappings

### Light Theme

```css
[data-theme="light"], :root {
  /* Backgrounds */
  --color-bg-primary: var(--primitive-white);
  --color-bg-secondary: var(--primitive-gray-50);
  --color-bg-tertiary: var(--primitive-gray-100);
  --color-bg-inverse: var(--primitive-gray-900);

  /* Text */
  --color-text-primary: var(--primitive-gray-900);
  --color-text-secondary: var(--primitive-gray-600);
  --color-text-muted: var(--primitive-gray-500);
  --color-text-inverse: var(--primitive-white);

  /* Borders */
  --color-border: var(--primitive-gray-200);
  --color-border-subtle: var(--primitive-gray-100);
  --color-border-strong: var(--primitive-gray-300);

  /* Accents (base values for light) */
  --color-accent-green: var(--primitive-green);
  --color-accent-yellow: var(--primitive-yellow);
  --color-accent-coral: var(--primitive-coral);
  --color-accent-teal: var(--primitive-teal);

  /* Accent Tints (light backgrounds) */
  --color-accent-green-tint: var(--primitive-green-lighter);
  --color-accent-yellow-tint: var(--primitive-yellow-light);
  --color-accent-coral-tint: var(--primitive-coral-light);
  --color-accent-teal-tint: var(--primitive-teal-light);

  /* Semantic States */
  --color-success: var(--primitive-green);
  --color-warning: var(--primitive-yellow);
  --color-error: var(--primitive-coral);
  --color-info: var(--primitive-teal);
}
```

### Dark Theme

```css
[data-theme="dark"] {
  /* Backgrounds */
  --color-bg-primary: var(--primitive-gray-950);
  --color-bg-secondary: var(--primitive-gray-900);
  --color-bg-tertiary: var(--primitive-gray-800);
  --color-bg-inverse: var(--primitive-white);

  /* Text */
  --color-text-primary: var(--primitive-white);
  --color-text-secondary: var(--primitive-gray-200);
  --color-text-muted: var(--primitive-gray-400);
  --color-text-inverse: var(--primitive-gray-900);

  /* Borders */
  --color-border: var(--primitive-gray-700);
  --color-border-subtle: var(--primitive-gray-800);
  --color-border-strong: var(--primitive-gray-600);

  /* Accents (brighter for dark mode) */
  --color-accent-green: var(--primitive-green-on-dark);
  --color-accent-yellow: var(--primitive-yellow-on-dark);
  --color-accent-coral: var(--primitive-coral-on-dark);
  --color-accent-teal: var(--primitive-teal-on-dark);

  /* Accent Tints (dark backgrounds) */
  --color-accent-green-tint: #0D2818;
  --color-accent-yellow-tint: #2A2510;
  --color-accent-coral-tint: #2A1515;
  --color-accent-teal-tint: #0D2625;

  /* Semantic States */
  --color-success: var(--primitive-green-on-dark);
  --color-warning: var(--primitive-yellow-on-dark);
  --color-error: var(--primitive-coral-on-dark);
  --color-info: var(--primitive-teal-on-dark);
}
```

---

## 3. Theme State Schema

### localStorage Schema

```typescript
interface ThemeStorage {
  key: 'theme';
  value: 'light' | 'dark';
  default: 'light';  // If no value and no system preference
}
```

### Theme Detection Priority

1. **localStorage value** (user explicit choice)
2. **System preference** (`prefers-color-scheme` media query)
3. **Default** (`light`)

### Theme Toggle State

```typescript
interface ThemeState {
  current: 'light' | 'dark';
  source: 'user' | 'system' | 'default';
}
```

---

## 4. Section Color Mapping

Each major application section has an associated accent color.

```typescript
interface SectionColorMapping {
  planning: 'green';
  procurement: 'teal';
  documents: 'yellow';
  costPlanning: 'coral';
}

const sectionColors: Record<string, string> = {
  planning: 'var(--color-accent-green)',
  procurement: 'var(--color-accent-teal)',
  documents: 'var(--color-accent-yellow)',
  costPlanning: 'var(--color-accent-coral)',
};

const sectionTints: Record<string, string> = {
  planning: 'var(--color-accent-green-tint)',
  procurement: 'var(--color-accent-teal-tint)',
  documents: 'var(--color-accent-yellow-tint)',
  costPlanning: 'var(--color-accent-coral-tint)',
};
```

---

## 5. Typography Tokens

```css
:root {
  /* Font Families */
  --font-body: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-heading: 'Spectral', Georgia, serif;
  --font-mono: 'JetBrains Mono', Consolas, monospace;

  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */

  /* Font Weights */
  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Line Heights */
  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;
}
```

---

## 6. Spacing & Radius Tokens

```css
:root {
  /* Border Radius */
  --radius-sm: 4px;
  --radius: 8px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  --radius-full: 100px;

  /* Shadows (theme-aware) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
}

[data-theme="dark"] {
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
}
```

---

## Entity Relationship (Conceptual)

```
┌─────────────────────┐
│   Theme Storage     │
│   (localStorage)    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Theme Provider    │
│   (React Context)   │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  data-theme attr    │
│  (on <html>)        │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  CSS Custom Props   │
│  (Semantic Tokens)  │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  UI Components      │
│  (Consume Tokens)   │
└─────────────────────┘
```
