# Quickstart: Application Design System Unification

**Feature**: 017-app-design-unification
**Date**: 2024-12-19

## Overview

This guide provides step-by-step instructions for implementing the unified design system with light/dark theme support and vibrant pop colors.

---

## Prerequisites

- Node.js 18+
- Existing assemble.ai development environment
- Understanding of CSS custom properties
- Familiarity with Tailwind CSS

---

## Implementation Phases

### Phase 1: Foundation (globals.css + Fonts)

**Time Estimate**: Core styling foundation

**Files to Modify**:
- `src/app/globals.css`
- `src/app/layout.tsx`

**Steps**:

1. **Add Google Fonts** to `layout.tsx`:
```typescript
import { DM_Sans, Spectral } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const spectral = Spectral({
  subsets: ['latin'],
  variable: '--font-spectral',
  display: 'swap',
  weight: ['400', '600'],
});
```

2. **Replace globals.css** with design tokens (see `data-model.md` for full token list)

3. **Add theme initialization script** to prevent flash:
```typescript
// Add to layout.tsx <head>
<script dangerouslySetInnerHTML={{
  __html: `
    (function() {
      const theme = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      document.documentElement.setAttribute('data-theme', theme);
    })();
  `
}} />
```

---

### Phase 2: Theme Toggle Component

**Files to Create**:
- `src/components/ui/theme-toggle.tsx`
- `src/lib/hooks/use-theme.ts`

**Theme Hook**:
```typescript
// src/lib/hooks/use-theme.ts
'use client';

import { useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    const system = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(stored || system);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return { theme, toggleTheme };
}
```

**Toggle Component**:
```typescript
// src/components/ui/theme-toggle.tsx
'use client';

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/hooks/use-theme';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-[var(--color-text-secondary)]" />
      ) : (
        <Sun className="w-5 h-5 text-[var(--color-text-secondary)]" />
      )}
    </button>
  );
}
```

---

### Phase 3: UI Component Updates

**Files to Modify**:
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/tabs.tsx`
- (all other UI components)

**Pattern - Replace hardcoded colors with tokens**:

Before:
```tsx
className="bg-[#1e1e1e] text-[#cccccc] border-[#3e3e42]"
```

After:
```tsx
className="bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] border-[var(--color-border)]"
```

**Button Variants Example**:
```tsx
const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-lg font-semibold transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--color-accent-green)] text-white hover:opacity-90',
        secondary: 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)] hover:bg-[var(--color-border)]',
        danger: 'bg-[var(--color-accent-coral)] text-white hover:opacity-90',
        warning: 'bg-[var(--color-accent-yellow)] text-[var(--color-text-inverse)] hover:opacity-90',
        ghost: 'bg-transparent hover:bg-[var(--color-bg-tertiary)]',
      },
    },
  }
);
```

---

### Phase 4: Dashboard Component Updates

**Files to Modify**:
- `src/components/layout/ResizableLayout.tsx`
- `src/components/dashboard/PlanningCard.tsx`
- `src/components/dashboard/ProcurementCard.tsx`
- `src/components/dashboard/DocumentCard.tsx`
- (all dashboard components)

**Section Color Coding Pattern**:
```tsx
// Planning section (green accent)
<div className="border-l-4 border-[var(--color-accent-green)]">

// Procurement section (teal accent)
<div className="border-l-4 border-[var(--color-accent-teal)]">

// Documents section (yellow accent)
<div className="border-l-4 border-[var(--color-accent-yellow)]">

// Cost Planning section (coral accent)
<div className="border-l-4 border-[var(--color-accent-coral)]">
```

---

### Phase 5: Logo Update

**Files to Modify**:
- `src/components/layout/ResizableLayout.tsx`
- `src/components/landing/NavBar.tsx` (if needed)

**Logo Component**:
```tsx
function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-6', md: 'h-8', lg: 'h-10' };
  const barWidth = { sm: 'w-1', md: 'w-1.5', lg: 'w-2' };

  return (
    <div className={`flex gap-0.5 ${sizes[size]}`}>
      <div className={`${barWidth[size]} rounded-full bg-[var(--primitive-green)]`} />
      <div className={`${barWidth[size]} rounded-full bg-[var(--primitive-yellow)]`} />
      <div className={`${barWidth[size]} rounded-full bg-[var(--primitive-coral)]`} />
      <div className={`${barWidth[size]} rounded-full bg-[var(--primitive-teal)]`} />
    </div>
  );
}
```

---

## Testing Checklist

### Visual Testing

- [ ] Light mode displays correctly on all pages
- [ ] Dark mode displays correctly on all pages
- [ ] Theme toggle switches smoothly
- [ ] All four pop colors are visible in both themes
- [ ] Section color coding is consistent
- [ ] Logo displays correctly in both themes

### Functional Testing

- [ ] Theme preference persists after refresh
- [ ] Theme preference persists after closing browser
- [ ] System preference is respected on first visit
- [ ] Theme toggle updates UI instantly (<100ms)
- [ ] No flash of wrong theme on page load

### Accessibility Testing

- [ ] All text meets WCAG AA contrast (4.5:1)
- [ ] Focus indicators visible in both themes
- [ ] Screen reader announces theme toggle
- [ ] Reduced motion preference respected

---

## Color Reference Card

| Color | Light Mode | Dark Mode | Usage |
|-------|------------|-----------|-------|
| Green | `#00C27A` | `#00D68A` | Success, Primary CTA, Planning |
| Yellow | `#FFD93D` | `#FFE066` | Warning, Pending, Documents |
| Coral | `#FF6B6B` | `#FF8585` | Error, Alert, Cost Planning |
| Teal | `#4ECDC4` | `#6EDED6` | Info, Secondary, Procurement |

---

## Troubleshooting

### Flash of Wrong Theme
- Ensure blocking script is in `<head>`, not `<body>`
- Check that script runs before any CSS loads

### Colors Not Updating
- Verify `data-theme` attribute is on `<html>` element
- Check CSS custom properties are defined for both themes
- Ensure components use `var(--token)` syntax

### Fonts Not Loading
- Check Google Fonts import in layout.tsx
- Verify font variables are applied to body
- Check network tab for font loading errors

---

## File Checklist

### New Files
- [ ] `src/lib/hooks/use-theme.ts`
- [ ] `src/components/ui/theme-toggle.tsx`

### Modified Files
- [ ] `src/app/globals.css` - Complete rewrite
- [ ] `src/app/layout.tsx` - Fonts + theme script
- [ ] `src/components/ui/button.tsx`
- [ ] `src/components/ui/card.tsx`
- [ ] `src/components/ui/input.tsx`
- [ ] `src/components/ui/tabs.tsx`
- [ ] `src/components/ui/checkbox.tsx`
- [ ] `src/components/ui/switch.tsx`
- [ ] `src/components/ui/dialog.tsx`
- [ ] `src/components/ui/toast.tsx`
- [ ] `src/components/ui/skeleton.tsx`
- [ ] `src/components/layout/ResizableLayout.tsx`
- [ ] `src/components/dashboard/PlanningCard.tsx`
- [ ] `src/components/dashboard/ProcurementCard.tsx`
- [ ] `src/components/dashboard/DocumentCard.tsx`
- [ ] `src/components/dashboard/planning/*.tsx`
- [ ] `src/app/projects/[projectId]/page.tsx`
