# Theme System Reference Guide

## Four-Theme Architecture

Assemble.ai now supports four distinct themes:

| Theme | ID | Description |
|-------|-----|-------------|
| **Light** | `light` | Standard professional light theme |
| **Dark** | `dark` | Standard professional dark theme |
| **Precision Light** | `precision-light` | Architectural warm light (cream + copper) |
| **Precision Dark** | `precision` | Architectural dark (slate + copper) |

---

## Color Token Comparison

### Background Colors

| Token | Light | Dark | Precision Light | Precision Dark |
|-------|-------|------|-----------------|----------------|
| `--color-bg-primary` | `#FFFFFF` | `#0A0A0A` | `#FAF8F5` | `#1A1D21` |
| `--color-bg-secondary` | `#FAFAFA` | `#171717` | `#F5F2ED` | `#141618` |
| `--color-bg-tertiary` | `#F5F5F5` | `#262626` | `#EBE7E0` | `#22262B` |
| `--color-bg-elevated` | `#FFFFFF` | `#171717` | `#FFFFFF` | `rgba(26,29,33,0.7)` |

### Text Colors

| Token | Light | Dark | Precision Light | Precision Dark |
|-------|-------|------|-----------------|----------------|
| `--color-text-primary` | `#171717` | `#FFFFFF` | `#2A2520` | `#E8E6E3` |
| `--color-text-secondary` | `#525252` | `#E5E5E5` | `#5C554C` | `#9CA3AF` |
| `--color-text-muted` | `#737373` | `#A3A3A3` | `#8A8279` | `#6B7280` |

### Primary Accent

| Token | Light | Dark | Precision Light | Precision Dark |
|-------|-------|------|-----------------|----------------|
| `--color-accent-primary` | `#00C27A` | `#00D68A` | `#B8895A` | `#D4A574` |
| `--primary` | Green | Green | Copper Dark | Copper |
| `--ring` | Green | Green | Copper | Copper |

### Status Colors

| Status | Light/Dark | Precision Light | Precision Dark |
|--------|------------|-----------------|----------------|
| **Success** | `#00C27A` | `#5D7E5F` | `#7A9E7E` |
| **Warning** | `#FFD93D` | `#C4960C` | `#E8B931` |
| **Error** | `#B85C5C` | `#A65454` | `#CC7070` |
| **Info** | `#4ECDC4` | `#B8895A` | `#D4A574` |

---

## Visual Characteristics

### Light Theme
- Clean white backgrounds
- Green primary accent
- Standard professional appearance
- Good for well-lit environments

### Dark Theme  
- Deep charcoal backgrounds
- Brighter green accent
- Reduced eye strain
- Good for low-light environments

### Precision Light
- Warm cream backgrounds (`#FAF8F5`)
- Copper/bronze accent (`#B8895A`)
- Blueprint grid overlay (warm tan)
- Evokes architectural drawings, premium materials
- Sophisticated, material-forward aesthetic

### Precision Dark
- Deep slate backgrounds (`#1A1D21`)
- Bright copper accent (`#D4A574`)
- Blueprint grid overlay (subtle copper)
- Evokes technical precision, craftsmanship
- Premium dark mode experience

---

## CSS Usage Examples

### Apply theme-aware backgrounds
```css
.my-card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
}
```

### Precision-specific styles
```css
[data-theme="precision"], [data-theme="precision-light"] {
  .my-element {
    /* Copper-tinted styles */
    border-color: var(--color-border-accent);
  }
}
```

### Blueprint grid background
```css
[data-theme="precision"] .bg-blueprint,
[data-theme="precision-light"] .bg-blueprint {
  /* Automatically uses theme-appropriate grid color */
}
```

---

## Theme Switching

### Using the hook
```tsx
import { useTheme } from '@/hooks/useTheme';

function MyComponent() {
  const { theme, setTheme, cycleTheme, isPrecision, isDark } = useTheme();
  
  return (
    <button onClick={() => setTheme('precision-light')}>
      Switch to Precision Light
    </button>
  );
}
```

### Theme toggle variants
```tsx
// Compact - cycles through all themes
<ThemeToggle variant="compact" />

// Expanded - shows all 4 options as segmented control
<ThemeToggle variant="expanded" />

// Dropdown - hover/click to show menu
<ThemeToggle variant="dropdown" />
```

---

## Design Rationale

### Why Two Precision Themes?

The "Architectural Precision" aesthetic works beautifully in both light and dark variants:

**Precision Light** is ideal for:
- Daytime use / bright environments
- Print-adjacent workflows
- Clients who prefer light themes
- Presentation mode

**Precision Dark** is ideal for:
- Evening / night use
- Long work sessions
- Users who prefer dark themes
- Focused, immersive work

Both maintain the same design language:
- Copper/bronze accent evokes building materials
- Blueprint grid references technical drawings
- Warm neutrals (not cold grays)
- Premium, crafted feel

---

## Migration Checklist

To add precision-light support to your existing setup:

```
□ Add precision-light tokens to globals.css (see precision-light-tokens.css)
□ Update layout.tsx theme script to include 'precision-light' in validThemes
□ Replace useTheme.ts with useTheme-v2.ts
□ Add ThemeToggle component for user control
□ Test all 4 themes across key pages
```
