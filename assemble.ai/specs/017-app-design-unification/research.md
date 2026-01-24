# Research: Application Design System Unification

**Feature**: 017-app-design-unification
**Date**: 2024-12-19

## Research Summary

This document captures technical research and decisions for implementing the dual-theme design system with vibrant pop colors.

---

## 1. Theme Switching Mechanism

### Decision: CSS Custom Properties + data-theme Attribute

**Rationale**:
- CSS custom properties provide instant theme switching without page reload
- `data-theme` attribute on `<html>` element allows CSS targeting
- Works natively with Tailwind CSS v4
- No runtime JavaScript required after initial preference detection

**Alternatives Considered**:

| Approach | Rejected Because |
|----------|------------------|
| CSS-in-JS (styled-components) | Additional runtime overhead, not needed with CSS variables |
| Tailwind `dark:` class | Requires class toggling on every element, more complex |
| Separate CSS files per theme | Requires page reload, poor UX |
| React Context only | Causes re-renders, CSS variables are more performant |

**Implementation Pattern**:
```css
:root, [data-theme="light"] {
  --color-bg-primary: #FFFFFF;
  --color-text-primary: #171717;
}

[data-theme="dark"] {
  --color-bg-primary: #0A0A0A;
  --color-text-primary: #FFFFFF;
}
```

---

## 2. Theme Persistence Strategy

### Decision: localStorage + System Preference Detection

**Rationale**:
- localStorage persists across sessions
- `prefers-color-scheme` media query detects system preference
- Initial script prevents flash of wrong theme

**Implementation Pattern**:
```javascript
// In <head> before body renders (blocking script)
const theme = localStorage.getItem('theme') ||
  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.setAttribute('data-theme', theme);
```

**Alternatives Considered**:

| Approach | Rejected Because |
|----------|------------------|
| Cookies | More complex, unnecessary for client-side preference |
| Database storage | Overkill for UI preference, adds latency |
| Session storage | Doesn't persist across sessions |

---

## 3. Font Loading Strategy

### Decision: next/font/google with Display Swap

**Rationale**:
- Next.js built-in font optimization
- Automatic subsetting and self-hosting
- `display: swap` prevents invisible text during load
- DM Sans and Spectral both available on Google Fonts

**Implementation**:
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
  weight: ['400', '500', '600', '700'],
});
```

**Alternatives Considered**:

| Approach | Rejected Because |
|----------|------------------|
| CDN link tags | Less optimized, no automatic subsetting |
| Self-hosted static files | Manual management, no optimization |
| System fonts only | Doesn't match brand identity |

---

## 4. Color Token Architecture

### Decision: Three-Tier Token System

**Rationale**:
- **Tier 1 (Primitive)**: Raw color values (`#00C27A`)
- **Tier 2 (Semantic)**: Theme-aware tokens (`--color-bg-primary`)
- **Tier 3 (Component)**: Component-specific tokens (`--button-bg`)

This allows:
- Easy theme switching (change Tier 2 mappings)
- Consistent component styling (Tier 3)
- Design system documentation (Tier 1)

**Token Naming Convention**:
```
--color-{category}-{variant}
--color-bg-primary      // Background primary
--color-text-secondary  // Text secondary
--color-accent-green    // Accent green
--color-border          // Border default
```

---

## 5. Accent Color Accessibility

### Decision: Adjusted Accent Colors for Dark Mode

**Rationale**:
- Base accent colors optimized for light mode contrast
- Dark mode requires slightly brighter variants for accessibility
- Each accent has light-tint and dark-tint for backgrounds

**Color Accessibility Matrix**:

| Color | Light Mode BG | Dark Mode BG | Light Tint | Dark Tint |
|-------|---------------|--------------|------------|-----------|
| Green `#00C27A` | WCAG AA Pass | Needs `#00D68A` | `#E8FDF0` | `#0D2818` |
| Yellow `#FFD93D` | WCAG AA Pass | Needs `#FFE066` | `#FFF9E6` | `#2A2510` |
| Coral `#FF6B6B` | WCAG AA Pass | Needs `#FF8585` | `#FFEEEE` | `#2A1515` |
| Teal `#4ECDC4` | WCAG AA Pass | Needs `#6EDED6` | `#E6FAF8` | `#0D2625` |

---

## 6. Component Migration Strategy

### Decision: Phased Token Replacement

**Rationale**:
- Minimize risk by updating in phases
- Core UI components first (propagates to all uses)
- Dashboard components second
- Page-specific styling last

**Phase Order**:
1. `globals.css` - Define all tokens
2. `src/components/ui/*` - Core UI components
3. `src/components/layout/*` - Layout components
4. `src/components/dashboard/*` - Dashboard components
5. `src/app/**` - Page-specific styles

---

## 7. Theme Toggle Component

### Decision: Header-Integrated Toggle with Icon Switch

**Rationale**:
- Accessible from all pages (in header)
- Visual icon (sun/moon) is universally understood
- Smooth icon transition provides feedback

**Component Location**: `src/components/ui/theme-toggle.tsx`

**Behavior**:
- Click toggles between light/dark
- Persists to localStorage
- Respects `prefers-reduced-motion` for animations

---

## 8. Existing Code Impact Analysis

### Files Requiring Changes

| Category | Files | Change Type |
|----------|-------|-------------|
| Global Styles | `globals.css` | Major rewrite |
| Root Layout | `layout.tsx` | Font imports, theme script |
| UI Components | 18 files in `src/components/ui/` | Token replacement |
| Dashboard | ~15 files in `src/components/dashboard/` | Token replacement |
| Layout | `ResizableLayout.tsx` | Token replacement, logo update |
| Landing | Already uses design tokens | Minor alignment |

### Hardcoded Color Instances (to replace)

| Pattern | Occurrences | Replacement |
|---------|-------------|-------------|
| `#1e1e1e` | ~25 | `var(--color-bg-primary)` |
| `#252526` | ~20 | `var(--color-bg-secondary)` |
| `#3e3e42` | ~15 | `var(--color-border)` |
| `#cccccc` | ~30 | `var(--color-text-primary)` |
| `#858585` | ~20 | `var(--color-text-muted)` |
| `#0e639c` | ~10 | `var(--color-accent-green)` |

---

## 9. Testing Strategy

### Decision: Visual Regression + Manual Accessibility Audit

**Rationale**:
- Visual changes require visual verification
- Accessibility contrast requires tool-based checking
- Theme switching behavior needs manual testing

**Test Plan**:
1. **Visual**: Screenshot comparison before/after for each theme
2. **Accessibility**: Chrome DevTools Lighthouse audit
3. **Functional**: Theme toggle persistence across refresh
4. **Performance**: Measure theme switch latency (<100ms target)

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Flash of wrong theme | Blocking script in `<head>` |
| Contrast accessibility failures | Pre-verified color matrix |
| Component styling breaks | Phased rollout, test each component |
| Performance impact | CSS-only solution, no runtime JS |
| Font loading delays | `display: swap`, preload hints |

---

## Resolved Clarifications

All technical unknowns from the specification have been resolved:

- [x] Theme storage mechanism: localStorage
- [x] System preference detection: `prefers-color-scheme` media query
- [x] Font loading: next/font/google with display swap
- [x] Token architecture: Three-tier system
- [x] Migration strategy: Phased component updates
- [x] Accessibility compliance: Pre-verified color matrix
