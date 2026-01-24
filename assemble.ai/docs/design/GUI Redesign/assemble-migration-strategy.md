# Assemble.ai Redesign: Migration Strategy

## Stack Analysis

Your current setup:
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS v4 with `@theme inline`
- **Fonts**: DM Sans (body) + Spectral (headings) — keeping these
- **Components**: Custom Button, shadcn-style Card
- **Theme System**: Light/dark with 3-tier CSS variable architecture

**Good news**: Your token architecture is solid. We're extending it, not replacing it.

---

## Migration Philosophy

### Option A: New "Precision" Theme (Recommended)
Add the new aesthetic as a third theme option (`data-theme="precision"`) alongside light/dark. This lets you:
- A/B test the new design
- Roll back instantly if needed
- Gradually migrate sections

### Option B: Replace Dark Theme
Transform your existing dark theme into the new aesthetic. Faster, but less reversible.

**This guide assumes Option A** — you can adapt to Option B by modifying the dark theme directly.

---

## Phase 1: Design Token Extension

### Prompt 1.1: Add Primitive Copper Palette
```
In globals.css, add a new copper/bronze primitive palette to the :root section after the existing purple colors:

/* Copper/Bronze Palette (Architectural Precision) */
--primitive-copper: #D4A574;
--primitive-copper-light: #E8C4A0;
--primitive-copper-lighter: #F5E6D3;
--primitive-copper-dark: #C49464;
--primitive-copper-darker: #8B7355;

/* Slate Palette (Deep neutrals) */
--primitive-slate-950: #0F1115;
--primitive-slate-900: #141618;
--primitive-slate-850: #1A1D21;
--primitive-slate-800: #22262B;
--primitive-slate-700: #2E3338;
--primitive-slate-600: #3D4349;

These will be the foundation for the "Architectural Precision" theme.
```

### Prompt 1.2: Create Precision Theme Semantic Tokens
```
In globals.css, add a new theme block after the [data-theme="dark"] section:

/* ============================================
   TIER 2: SEMANTIC TOKENS - PRECISION THEME
   ============================================ */
[data-theme="precision"] {
  /* Backgrounds - Deep slate with warmth */
  --color-bg-primary: var(--primitive-slate-850);
  --color-bg-secondary: var(--primitive-slate-900);
  --color-bg-tertiary: var(--primitive-slate-800);
  --color-bg-elevated: rgba(26, 29, 33, 0.7);
  --color-bg-inverse: var(--primitive-copper-lighter);

  /* Text - Warm off-whites */
  --color-text-primary: #E8E6E3;
  --color-text-secondary: #9CA3AF;
  --color-text-muted: #6B7280;
  --color-text-inverse: var(--primitive-slate-900);

  /* Borders - Copper-tinted */
  --color-border: rgba(107, 114, 128, 0.25);
  --color-border-subtle: rgba(107, 114, 128, 0.15);
  --color-border-strong: rgba(107, 114, 128, 0.4);
  --color-border-accent: rgba(212, 165, 116, 0.25);

  /* Primary accent is now copper */
  --color-accent-primary: var(--primitive-copper);
  --color-accent-primary-hover: var(--primitive-copper-light);
  --color-accent-primary-tint: rgba(212, 165, 116, 0.12);

  /* Status colors - Earth tones */
  --color-success: #7A9E7E;
  --color-warning: #E8B931;
  --color-error: #CC7070;
  --color-info: var(--primitive-copper);

  /* Shadows - Deeper for dark theme */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
  --shadow: 0 2px 4px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
  --shadow-md: 0 4px 8px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 20px rgba(212, 165, 116, 0.15);

  /* Scrollbar */
  --scrollbar-track: var(--primitive-slate-900);
  --scrollbar-thumb: var(--primitive-slate-700);
  --scrollbar-thumb-hover: var(--primitive-slate-600);

  /* Tailwind CSS Theme Integration */
  --background: var(--color-bg-primary);
  --foreground: var(--color-text-primary);
  --card: var(--color-bg-secondary);
  --card-foreground: var(--color-text-primary);
  --popover: var(--color-bg-secondary);
  --popover-foreground: var(--color-text-primary);
  --primary: var(--color-accent-primary);
  --primary-foreground: var(--primitive-slate-900);
  --secondary: var(--color-bg-tertiary);
  --secondary-foreground: var(--color-text-primary);
  --muted: var(--color-bg-tertiary);
  --muted-foreground: var(--color-text-muted);
  --accent: var(--color-accent-primary);
  --accent-foreground: var(--primitive-slate-900);
  --destructive: var(--color-error);
  --destructive-foreground: var(--primitive-white);
  --border: var(--color-border);
  --input: var(--color-border);
  --ring: var(--color-accent-primary);
}
```

### Prompt 1.3: Add Precision-Specific Utility Classes
```
In globals.css, add these utility classes after the existing badge styles:

/* ============================================
   PRECISION THEME UTILITIES
   ============================================ */
[data-theme="precision"] {
  /* Blueprint grid background */
  .bg-blueprint {
    background-image: 
      linear-gradient(rgba(212, 165, 116, 0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(212, 165, 116, 0.04) 1px, transparent 1px);
    background-size: 32px 32px;
  }

  /* Copper glow effect */
  .glow-copper {
    box-shadow: 0 0 20px rgba(212, 165, 116, 0.15);
  }

  /* Translucent card style */
  .card-translucent {
    background: var(--color-bg-elevated);
    border: 1px solid var(--color-border);
    backdrop-filter: blur(8px);
  }

  /* Copper accent border on left */
  .border-l-copper {
    border-left: 3px solid var(--color-accent-primary);
  }

  /* Section divider with gradient */
  .divider-gradient {
    height: 1px;
    background: linear-gradient(90deg, rgba(212, 165, 116, 0.4), transparent);
  }
}

/* Precision badge variants */
[data-theme="precision"] .badge-active {
  background: rgba(212, 165, 116, 0.2);
  color: var(--primitive-copper);
  border: 1px solid rgba(212, 165, 116, 0.4);
}

[data-theme="precision"] .badge-complete {
  background: rgba(122, 158, 126, 0.2);
  color: #7A9E7E;
  border: 1px solid rgba(122, 158, 126, 0.4);
}

[data-theme="precision"] .badge-review {
  background: rgba(232, 185, 49, 0.2);
  color: #E8B931;
  border: 1px solid rgba(232, 185, 49, 0.4);
}

[data-theme="precision"] .badge-draft {
  background: rgba(107, 114, 128, 0.2);
  color: #9CA3AF;
  border: 1px solid rgba(107, 114, 128, 0.4);
}
```

---

## Phase 2: Layout Components

### Prompt 2.1: Create AppShell Component
```
Create a new component at components/layout/AppShell.tsx:

This is the main three-column layout wrapper for the app.

interface AppShellProps {
  leftPanel: React.ReactNode;
  mainContent: React.ReactNode;
  rightPanel: React.ReactNode;
}

Requirements:
1. CSS Grid layout: grid-template-columns: 260px 1fr 280px
2. Min-height: 100vh
3. Position: relative (for blueprint overlay)
4. Add a pseudo-element or child div for the blueprint grid pattern:
   - Position absolute, inset-0
   - Use the .bg-blueprint class
   - pointer-events: none, z-index: 0
5. Each panel should have:
   - position: relative, z-index: 1
   - Appropriate padding (20px for side panels, 20px 28px for main)
6. Left panel: bg-[var(--color-bg-secondary)], border-r with --color-border-accent
7. Right panel: bg-[var(--color-bg-secondary)], border-l with --color-border-accent
8. Main content: bg-[var(--color-bg-primary)]

Use Tailwind classes where possible, CSS variables for colors.
Export as default.
```

### Prompt 2.2: Create SectionHeader Component
```
Create components/ui/SectionHeader.tsx:

A reusable section header with label and gradient divider line.

interface SectionHeaderProps {
  label: string;
  className?: string;
}

Requirements:
1. Flex container with items-center and gap-2.5
2. Label: 
   - text-[9px] font-semibold uppercase tracking-[2px]
   - text-[var(--color-text-muted)]
3. Divider line (after label):
   - flex-1, h-px
   - Use .divider-gradient class or inline gradient
4. Accept className prop for custom spacing

Example usage:
<SectionHeader label="Project" className="mb-4" />
```

### Prompt 2.3: Create Logo Component
```
Create components/brand/Logo.tsx:

The assemble.ai logo for the precision theme.

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

Requirements:
1. Horizontal flex layout with items-center gap-2
2. Icon: Use a grid icon from lucide-react (Grid3x3 or LayoutGrid)
   - Color: var(--color-accent-primary) / text-primary in Tailwind
   - Size based on prop: sm=18px, md=22px, lg=28px
3. "assemble" text:
   - font-semibold, tracking-tight
   - Size: sm=16px, md=18px, lg=22px
4. ".ai" text:
   - font-light
   - Color: var(--color-accent-primary)
   - Same size as main text
5. Subtle hover: scale-[1.02] transition

Export named: export function Logo({ ... })
```

---

## Phase 3: Card & Container Components

### Prompt 3.1: Extend Card Component with Precision Variants
```
Modify components/ui/card.tsx to add precision theme variants:

Add these new variants to the Card component:

1. variant="translucent" (for precision theme):
   - bg-[var(--color-bg-elevated)]
   - border border-[var(--color-border)]
   - backdrop-blur-sm
   - rounded-xl (14px)

2. variant="elevated" (for RFT-style sections):
   - Same as translucent but with rounded-2xl (16px)
   - overflow-hidden (for header backgrounds)

Update the Card component to accept a variant prop:
type CardVariant = 'default' | 'translucent' | 'elevated';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

Apply variant styles using cn() utility.
Keep backward compatibility - default variant keeps current behavior.
```

### Prompt 3.2: Create ProjectCard Component
```
Create components/planning/ProjectCard.tsx:

Displays project summary information in the left panel.

interface ProjectCardProps {
  name: string;
  address: string;
  lotArea: string;
  stories: number;
  buildingClass: string;
  zoning: string;
}

Requirements:
1. Use Card component with variant="translucent"
2. Add custom styles for precision theme:
   - border-[rgba(212,165,116,0.18)]
   - bg-[rgba(212,165,116,0.06)]
3. Title: text-[15px] font-semibold tracking-tight
4. Address: text-[11px] text-[var(--color-text-secondary)] mb-3.5
5. Metadata grid:
   - 2x2 CSS grid with gap-2.5
   - Each item: label (9px uppercase tracking-wide muted) + value (12px font-medium)
   - Items: Lot Area, Stories, Class, Zoning

Example usage:
<ProjectCard 
  name="Unit 10 Extension Works"
  address="145-151 Arthur Street, Homebush West NSW"
  lotArea="2,135 m²"
  stories={2}
  buildingClass="Warehouse"
  zoning="Industrial"
/>
```

### Prompt 3.3: Create ObjectiveCard Component
```
Create components/procurement/ObjectiveCard.tsx:

Displays a single objective (Functional, Quality, Budget) in the RFT section.

interface ObjectiveCardProps {
  icon?: React.ReactNode;
  label: string;
  description: string;
}

Requirements:
1. Container:
   - p-3 rounded-md
   - bg-[rgba(212,165,116,0.04)]
   - border border-[rgba(212,165,116,0.12)]
2. Header row (flex items-center gap-1.5 mb-1.5):
   - Icon: Default to Diamond from lucide-react, 10px, copper color
   - Label: text-[11px] font-semibold text-[var(--color-text-primary)]
3. Description:
   - text-[11px] leading-relaxed text-[var(--color-text-secondary)]

Example usage:
<ObjectiveCard 
  label="Functional"
  description="Provide single-level warehouse tenancy with mezzanine office..."
/>
```

---

## Phase 4: Button Component Extension

### Prompt 4.1: Add Precision Button Variants
```
Modify components/ui/Button.tsx to add precision theme variants:

Add new variants to ButtonVariant type:
type ButtonVariant = 
  | 'primary-green' 
  | 'light-green' 
  | 'black' 
  | 'ghost'
  | 'copper'        // NEW: Primary action in precision theme
  | 'copper-ghost'  // NEW: Secondary action in precision theme
  | 'copper-outline'; // NEW: Tertiary action

Add to variantStyles:
'copper': 'bg-gradient-to-br from-[#D4A574] to-[#C49464] text-[#1A1D21] hover:brightness-110 font-semibold',
'copper-ghost': 'bg-transparent text-[var(--color-text-primary)] border border-[var(--color-border-strong)] hover:bg-[rgba(212,165,116,0.08)] hover:border-[rgba(212,165,116,0.4)]',
'copper-outline': 'bg-transparent text-[#D4A574] border border-[rgba(212,165,116,0.4)] hover:bg-[rgba(212,165,116,0.1)]',

Add to arrowBgStyles:
'copper': 'bg-[#1A1D21]/20',
'copper-ghost': 'bg-[var(--color-border)]',
'copper-outline': 'bg-[rgba(212,165,116,0.2)]',

The copper variant should be the primary CTA in precision theme.
```

---

## Phase 5: Navigation Components

### Prompt 5.1: Create TabNav Component
```
Create components/ui/TabNav.tsx:

Horizontal tab navigation with animated indicator.

interface TabNavProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

Requirements:
1. Container: flex gap-1.5, border-b border-[var(--color-border)], pb-3.5
2. Each tab button:
   - relative, px-4 py-1.5
   - text-[13px] font-medium
   - text-[var(--color-text-muted)] default
   - text-[var(--color-text-primary)] when active
   - transition-colors duration-200
   - cursor-pointer, bg-transparent, border-none
3. Active indicator (only on active tab):
   - absolute, bottom-[-15px], left-1/2, -translate-x-1/2
   - w-8 h-0.5 rounded-full
   - bg-[var(--color-accent-primary)]
4. Hover state: text color lightens

Use React state or accept controlled props.
Consider using Framer Motion for indicator animation if available.
```

### Prompt 5.2: Create ProjectTypeSelector Component
```
Create components/planning/ProjectTypeSelector.tsx:

Vertical button list for selecting project type.

interface ProjectType {
  id: string;
  label: string;
  icon: string; // Unicode character or icon name
}

interface ProjectTypeSelectorProps {
  types: ProjectType[];
  activeType: string;
  onTypeChange: (typeId: string) => void;
}

Requirements:
1. Container: flex flex-col gap-1.5
2. Each type button:
   - flex items-center gap-2.5
   - px-3 py-2.5 rounded-md
   - border border-[var(--color-border)]
   - bg-transparent default
   - text-[var(--color-text-secondary)] default
   - transition-all duration-200
3. Active state:
   - bg-[rgba(212,165,116,0.12)]
   - border-[var(--color-accent-primary)]
   - text-[var(--color-text-primary)]
4. Hover state (non-active):
   - border-[rgba(212,165,116,0.4)]
   - bg-[rgba(212,165,116,0.05)]
5. Icon container: w-5 text-center text-sm
6. Label: text-xs font-medium

Default types:
- Pre-Development (◇)
- Residential (⌂)
- Commercial (▣)
- Industrial (⚙)
- Refurbishment (↻)
```

---

## Phase 6: Document Components

### Prompt 6.1: Create DocumentCategoryList Component
```
Create components/documents/DocumentCategoryList.tsx:

Vertical list of document categories with counts.

interface DocumentCategory {
  name: string;
  count: number;
}

interface DocumentCategoryListProps {
  categories: DocumentCategory[];
  activeCategory: string;
  onCategoryChange: (name: string) => void;
}

Requirements:
1. Container: flex flex-col gap-1
2. Each category button:
   - flex justify-between items-center w-full
   - px-2.5 py-2 rounded-md
   - bg-transparent default
   - text-[var(--color-text-secondary)] default
   - transition-all duration-200
3. Active state:
   - bg-[rgba(212,165,116,0.12)]
   - text-[var(--color-text-primary)]
4. Category name: text-xs font-medium
5. Count badge:
   - text-[10px] font-semibold
   - text-[var(--color-accent-primary)]
   - bg-[rgba(212,165,116,0.18)]
   - px-1.5 py-0.5 rounded-full
```

### Prompt 6.2: Create DocumentListItem Component
```
Create components/documents/DocumentListItem.tsx:

Single document row in the documents panel.

type DocumentStatus = 'active' | 'complete' | 'review' | 'draft';

interface DocumentListItemProps {
  name: string;
  category: string;
  status: DocumentStatus;
  onClick?: () => void;
}

Requirements:
1. Container:
   - flex justify-between items-center
   - px-3 py-2.5 rounded-md
   - bg-[var(--color-bg-elevated)]
   - border border-[var(--color-border-subtle)]
   - hover:border-[rgba(212,165,116,0.3)]
   - hover:bg-[rgba(212,165,116,0.04)]
   - transition-all duration-200
   - cursor-pointer
2. Left side (flex items-center gap-2):
   - Status dot: w-1.5 h-1.5 rounded-full
     - active: bg-[#D4A574]
     - complete: bg-[#7A9E7E]
     - review: bg-[#E8B931]
     - draft: bg-[#6B7280]
   - Name: text-[11px] font-medium
3. Right side:
   - Category tag: text-[9px] font-semibold uppercase tracking-wide
   - bg-[rgba(107,114,128,0.25)]
   - text-[var(--color-text-secondary)]
   - px-1.5 py-0.5 rounded
```

---

## Phase 7: Consultant Components

### Prompt 7.1: Create ConsultantCard Component
```
Create components/procurement/ConsultantCard.tsx:

Card for selecting a consultant type in the RFT section.

interface ConsultantCardProps {
  name: string;
  icon: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}

Requirements:
1. Container:
   - flex flex-col items-center gap-1.5
   - p-3.5 rounded-xl
   - bg-[var(--color-bg-elevated)]
   - border border-[var(--color-border)]
   - cursor-pointer
   - transition-all duration-200
   - hover:border-[rgba(212,165,116,0.4)]
   - hover:-translate-y-0.5
2. Active state:
   - bg-[rgba(212,165,116,0.12)]
   - border-[var(--color-accent-primary)]
3. Icon: text-xl text-[var(--color-accent-primary)]
4. Name: text-[10px] font-medium text-center
5. Active badge (when isActive):
   - text-[8px] font-semibold uppercase tracking-wide
   - bg-[rgba(212,165,116,0.25)]
   - text-[var(--color-accent-primary)]
   - px-1.5 py-0.5 rounded
```

### Prompt 7.2: Create ConsultantGrid Component
```
Create components/procurement/ConsultantGrid.tsx:

Grid of consultant cards with "Add" option.

interface Consultant {
  id: string;
  name: string;
  icon: React.ReactNode;
}

interface ConsultantGridProps {
  consultants: Consultant[];
  activeConsultantId: string;
  onConsultantSelect: (id: string) => void;
  onAddConsultant?: () => void;
}

Requirements:
1. Container: grid grid-cols-4 gap-2.5
2. Map consultants to ConsultantCard components
3. Add card at the end:
   - Same dimensions as ConsultantCard
   - border-dashed border-[var(--color-border)]
   - bg-transparent
   - Icon: Plus from lucide-react, text-[var(--color-text-muted)]
   - Label: "Add Firm", text-[10px] text-[var(--color-text-muted)]
   - hover:border-[rgba(212,165,116,0.5)]
   - hover:bg-[rgba(212,165,116,0.05)]
```

---

## Phase 8: Progress & Status Components

### Prompt 8.1: Create ProgressBar Component
```
Create components/ui/ProgressBar.tsx:

Animated progress bar for project completion.

interface ProgressBarProps {
  value: number; // 0-100
  label?: string;
  showValue?: boolean;
  className?: string;
}

Requirements:
1. Container:
   - p-3.5 rounded-lg
   - bg-[rgba(212,165,116,0.06)]
2. Header (flex justify-between mb-2):
   - Label: text-[11px] text-[var(--color-text-secondary)]
   - Value: text-[11px] font-semibold text-[var(--color-accent-primary)]
3. Track:
   - h-[3px] rounded-full
   - bg-[rgba(212,165,116,0.25)]
   - overflow-hidden
4. Fill:
   - height: 100%
   - width: {value}%
   - background: linear-gradient to right from #D4A574 to #E8C4A0
   - rounded-full
   - transition-[width] duration-1000 ease-out
5. Animate on mount: Start at 0%, animate to value

Consider using Framer Motion for smooth animation.
```

---

## Phase 9: RFT Section Components

### Prompt 9.1: Create RFTHeader Component
```
Create components/procurement/RFTHeader.tsx:

Header bar for the RFT section with title and actions.

interface RFTHeaderProps {
  documentType: string;
  title: string;
  onSave?: () => void;
  onDownload?: () => void;
}

Requirements:
1. Container:
   - flex justify-between items-center
   - px-5 py-4
   - border-b border-[var(--color-border-subtle)]
   - bg-[rgba(212,165,116,0.04)]
2. Left side (flex items-center gap-2.5):
   - Badge: text-[10px] font-bold uppercase tracking-wide
     - bg-[var(--color-accent-primary)]
     - text-[var(--color-bg-primary)]
     - px-2 py-1 rounded
   - Title: text-[15px] font-semibold tracking-tight
3. Right side (flex gap-2.5):
   - Save button: Use Button with variant="copper-ghost", size="sm"
   - Download button: Use Button with variant="copper", size="sm"
```

### Prompt 9.2: Create RFTDetails Component
```
Create components/procurement/RFTDetails.tsx:

Left column of RFT content showing project details.

interface RFTDetailsProps {
  projectName: string;
  address: string;
  documentName: string;
  date: string;
}

Requirements:
1. Container: flex flex-col gap-3.5
2. Each detail row:
   - flex flex-col gap-0.5
   - Label: text-[9px] uppercase tracking-wide text-[var(--color-text-muted)]
   - Value: text-[13px] font-medium
3. For the document row, add date inline:
   - Date: text-[11px] text-[var(--color-accent-primary)] ml-1.5
```

---

## Phase 10: Theme Toggle & Integration

### Prompt 10.1: Update Theme Toggle
```
Update your theme toggle component to support three themes: light, dark, precision.

If you have a ThemeToggle component:
1. Add "precision" as a third option
2. Update the toggle UI to show three states
3. Consider using a dropdown or segmented control instead of a simple toggle
4. Icon suggestions:
   - Light: Sun
   - Dark: Moon
   - Precision: Compass or Ruler (architectural)

Update the theme script in layout.tsx to recognize "precision" as a valid stored theme.
```

### Prompt 10.2: Create Theme Provider Hook
```
Create hooks/useTheme.ts:

Custom hook for managing theme state.

interface UseThemeReturn {
  theme: 'light' | 'dark' | 'precision';
  setTheme: (theme: 'light' | 'dark' | 'precision') => void;
  toggleTheme: () => void;
}

Requirements:
1. Read initial theme from localStorage or system preference
2. Update document.documentElement.setAttribute('data-theme', theme) on change
3. Persist to localStorage
4. toggleTheme cycles through: light → dark → precision → light
5. Handle SSR: Return 'light' initially, update after mount
```

---

## Phase 11: Animation & Polish

### Prompt 11.1: Add Page Load Animations
```
Add staggered entrance animations to major layout sections.

Option A: CSS-only
Add these keyframes to globals.css:

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-slide-in {
  animation: slideInUp 0.4s ease-out forwards;
}

.animate-delay-100 { animation-delay: 100ms; }
.animate-delay-200 { animation-delay: 200ms; }
.animate-delay-300 { animation-delay: 300ms; }

Option B: Framer Motion (if available)
Wrap major sections in motion.div with:
- initial={{ opacity: 0, y: 12 }}
- animate={{ opacity: 1, y: 0 }}
- transition={{ duration: 0.4, delay: index * 0.1 }}
```

### Prompt 11.2: Add Hover Micro-interactions
```
Add subtle hover effects across interactive elements.

In globals.css, add:

[data-theme="precision"] {
  /* Card hover lift */
  .hover-lift {
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .hover-lift:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  /* Subtle scale on press */
  .active-press:active {
    transform: scale(0.98);
  }

  /* Glow on hover */
  .hover-glow:hover {
    box-shadow: var(--shadow-glow);
  }
}

Apply these classes to:
- ConsultantCard: hover-lift
- DocumentListItem: hover-glow (subtle)
- Button: active-press
```

---

## Implementation Checklist

```
□ Phase 1: Design Tokens
  □ 1.1 Add copper primitive palette
  □ 1.2 Create precision theme semantic tokens
  □ 1.3 Add precision utility classes

□ Phase 2: Layout
  □ 2.1 AppShell component
  □ 2.2 SectionHeader component
  □ 2.3 Logo component

□ Phase 3: Cards
  □ 3.1 Extend Card with variants
  □ 3.2 ProjectCard component
  □ 3.3 ObjectiveCard component

□ Phase 4: Buttons
  □ 4.1 Add copper button variants

□ Phase 5: Navigation
  □ 5.1 TabNav component
  □ 5.2 ProjectTypeSelector component

□ Phase 6: Documents
  □ 6.1 DocumentCategoryList component
  □ 6.2 DocumentListItem component

□ Phase 7: Consultants
  □ 7.1 ConsultantCard component
  □ 7.2 ConsultantGrid component

□ Phase 8: Progress
  □ 8.1 ProgressBar component

□ Phase 9: RFT Section
  □ 9.1 RFTHeader component
  □ 9.2 RFTDetails component

□ Phase 10: Theme Integration
  □ 10.1 Update theme toggle
  □ 10.2 Create useTheme hook

□ Phase 11: Polish
  □ 11.1 Page load animations
  □ 11.2 Hover micro-interactions
```

---

## Quick Reference: Token Mapping

| Semantic Token | Light Theme | Dark Theme | Precision Theme |
|---------------|-------------|------------|-----------------|
| --color-bg-primary | #FFFFFF | #0A0A0A | #1A1D21 |
| --color-bg-secondary | #FAFAFA | #171717 | #141618 |
| --color-text-primary | #171717 | #FFFFFF | #E8E6E3 |
| --primary | #00C27A | #00D68A | #D4A574 |
| --ring | #00C27A | #00D68A | #D4A574 |

---

## File Structure After Migration

```
components/
├── brand/
│   └── Logo.tsx
├── documents/
│   ├── DocumentCategoryList.tsx
│   └── DocumentListItem.tsx
├── layout/
│   └── AppShell.tsx
├── planning/
│   ├── ProjectCard.tsx
│   └── ProjectTypeSelector.tsx
├── procurement/
│   ├── ConsultantCard.tsx
│   ├── ConsultantGrid.tsx
│   ├── ObjectiveCard.tsx
│   ├── RFTDetails.tsx
│   └── RFTHeader.tsx
└── ui/
    ├── Button.tsx (extended)
    ├── card.tsx (extended)
    ├── ProgressBar.tsx
    ├── SectionHeader.tsx
    └── TabNav.tsx
hooks/
└── useTheme.ts
```
