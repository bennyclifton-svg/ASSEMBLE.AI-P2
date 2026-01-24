# Feature Specification: Application Design System Unification

**Feature Branch**: `017-app-design-unification`
**Created**: 2024-12-19
**Status**: Draft
**Input**: User description: "Unify application/project page GUI with landing page design system. Include light mode (default) and dark mode with theme toggle. Add vibrant pops of brand colors (green, yellow, coral, teal) throughout both themes for a beautiful, cohesive experience."

## Overview

Unify the application's dashboard and project pages with the landing page design system to achieve a cohesive, premium user experience. The design features **dual-theme support** (light mode default, dark mode optional) with strategic use of **four vibrant brand accent colors** that bring energy and visual delight to the interface.

The four signature "pop" colors - **Green**, **Yellow**, **Coral**, and **Teal** - are woven throughout the UI as accent colors for status indicators, categories, interactive elements, and decorative touches, creating a distinctive and memorable brand experience that feels both professional and approachable.

### Design Philosophy

- **Light Mode First**: Clean, airy, professional - optimized for extended work sessions
- **Dark Mode**: Rich, focused, elegant - for low-light environments and user preference
- **Vibrant Accents**: The four brand colors add personality and improve scannability
- **Functional Color**: Each accent color has semantic meaning, aiding comprehension

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Theme Preference & Persistence (Priority: P1)

A user opens the application and sees a clean, light-themed interface by default. They can toggle to dark mode via a theme switcher, and their preference persists across sessions. Both themes feel equally polished and intentional.

**Why this priority**: Theme preference is a fundamental UX feature that affects every interaction. Users expect their preference to be remembered.

**Independent Test**: Can be tested by toggling theme, refreshing the page, and verifying preference persistence.

**Acceptance Scenarios**:

1. **Given** a new user visiting the application, **When** the page loads, **Then** the light theme is displayed by default
2. **Given** a user viewing the application, **When** they click the theme toggle, **Then** the interface smoothly transitions to dark mode
3. **Given** a user who selected dark mode, **When** they close and reopen the browser, **Then** dark mode is still active
4. **Given** a user with system preference set to dark mode, **When** they visit for the first time, **Then** the app respects their system preference
5. **Given** a user toggling themes, **When** the transition occurs, **Then** there is no flash of unstyled content or jarring color shift

---

### User Story 2 - Light Mode Experience (Priority: P1)

A user works in the default light mode throughout their day. They experience a clean, bright interface with white and light gray backgrounds, dark text for readability, and vibrant accent colors that provide visual interest and functional cues without overwhelming the professional aesthetic.

**Why this priority**: Light mode is the default and will be used by the majority of users during typical working hours.

**Independent Test**: Can be tested by using all major features in light mode and verifying visual consistency and readability.

**Acceptance Scenarios**:

1. **Given** a user in light mode, **When** they view the main workspace, **Then** backgrounds are white/light gray with excellent text contrast
2. **Given** a user in light mode, **When** they see status indicators, **Then** they see vibrant green (success), coral (alert), yellow (pending), teal (info) colors
3. **Given** a user in light mode, **When** they interact with buttons and links, **Then** the green primary accent is clearly visible and accessible
4. **Given** a user in light mode for extended periods, **When** they work, **Then** the interface feels comfortable and non-fatiguing

---

### User Story 3 - Dark Mode Experience (Priority: P1)

A user toggles to dark mode for evening work or personal preference. They experience a rich, sophisticated dark interface with carefully calibrated colors that maintain the same visual hierarchy and accent color vibrancy as light mode.

**Why this priority**: Dark mode is expected by modern users and essential for accessibility and comfort.

**Independent Test**: Can be tested by using all major features in dark mode and verifying visual consistency, readability, and accent color visibility.

**Acceptance Scenarios**:

1. **Given** a user in dark mode, **When** they view the main workspace, **Then** backgrounds are dark gray/charcoal with light text
2. **Given** a user in dark mode, **When** they see accent colors, **Then** the vibrant pop colors remain visually striking and accessible
3. **Given** a user in dark mode, **When** they view cards and panels, **Then** there is clear visual hierarchy through subtle background variations
4. **Given** a user switching from light to dark mode, **When** they compare the layouts, **Then** all elements remain in the same positions with only colors changing

---

### User Story 4 - Vibrant Color System in Action (Priority: P1)

A user navigates through different sections and sees the four brand colors used meaningfully throughout the interface - not just decoratively, but functionally. Each color carries semantic meaning that aids comprehension and creates visual delight.

**Why this priority**: The vibrant color system is the differentiating design element that makes ASSEMBLE.AI visually memorable and functionally clearer.

**Independent Test**: Can be tested by identifying all uses of each accent color and verifying semantic consistency.

**Acceptance Scenarios**:

1. **Given** a user viewing project status, **When** they see green indicators, **Then** green consistently means "complete/success/active"
2. **Given** a user viewing alerts or issues, **When** they see coral/red indicators, **Then** coral consistently means "attention needed/error/overdue"
3. **Given** a user viewing pending items, **When** they see yellow indicators, **Then** yellow consistently means "in progress/pending/warning"
4. **Given** a user viewing informational elements, **When** they see teal indicators, **Then** teal consistently means "information/neutral/secondary"
5. **Given** a user viewing the logo in the header, **When** they observe the interface, **Then** they see the same four colors echoed thoughtfully throughout

---

### User Story 5 - Visual Brand Continuity (Priority: P2)

A user visits the ASSEMBLE.AI landing page, signs up, and enters the application. They experience a seamless visual transition where the color palette, typography, and the four vibrant brand colors carry through from marketing to product.

**Why this priority**: Brand continuity builds trust and perceived quality.

**Independent Test**: Can be tested by navigating from landing page through registration into the dashboard.

**Acceptance Scenarios**:

1. **Given** a user on the landing page, **When** they enter the application, **Then** they recognize the same visual language and color palette
2. **Given** a user viewing the app logo, **When** they compare to the landing page, **Then** the 4-bar colorful logo is identical
3. **Given** a user viewing typography, **When** they read headings and body text, **Then** fonts match the landing page (DM Sans, Spectral)

---

### User Story 6 - Category & Section Color Coding (Priority: P2)

A user works across different project sections (Planning, Procurement, Documents, Cost Planning). Each major section has a subtle color association using the four brand colors, helping users orient themselves and creating visual variety.

**Why this priority**: Color-coded sections improve navigation and reduce cognitive load.

**Independent Test**: Can be tested by navigating between sections and identifying consistent color associations.

**Acceptance Scenarios**:

1. **Given** a user in the Planning section, **When** they view section headers/accents, **Then** they see green as the section accent
2. **Given** a user in the Procurement section, **When** they view section headers/accents, **Then** they see teal as the section accent
3. **Given** a user in the Documents section, **When** they view section headers/accents, **Then** they see yellow as the section accent
4. **Given** a user viewing tabs within a section, **When** a tab is active, **Then** the active indicator uses the section's accent color

---

### User Story 7 - Interactive Element Delight (Priority: P3)

A user interacts with buttons, cards, and other elements throughout the application. Hover states, focus rings, and micro-interactions incorporate the vibrant colors in subtle, delightful ways that make the interface feel alive and responsive.

**Why this priority**: Micro-interactions and hover states add polish and delight.

**Independent Test**: Can be tested by hovering over and focusing on various interactive elements.

**Acceptance Scenarios**:

1. **Given** a user hovering over a card, **When** they see the hover state, **Then** there is a subtle accent color highlight or border
2. **Given** a user focusing on an input, **When** the focus ring appears, **Then** it uses the appropriate accent color
3. **Given** a user hovering over a status badge, **When** they see the hover state, **Then** the badge color subtly intensifies

---

### Edge Cases

- What happens when the user's system preference changes while the app is open?
  - App detects the change and offers to switch themes (if user hasn't set explicit preference)
- What happens for users with color vision deficiency?
  - All color-coded information has secondary indicators (icons, text labels, patterns)
  - Color contrast meets WCAG 2.1 AA standards
- What happens when custom fonts fail to load?
  - System gracefully falls back to appropriate system fonts while maintaining colors
- What happens in print mode?
  - Print styles use light theme colors optimized for paper
- What happens on very large or very small screens?
  - Color system and theme work identically; only layout adapts

## Requirements *(mandatory)*

### Functional Requirements

#### Theme System
- **FR-001**: System MUST support two themes: Light Mode and Dark Mode
- **FR-002**: System MUST default to Light Mode for new users
- **FR-003**: System MUST provide a visible theme toggle control accessible from all pages
- **FR-004**: System MUST persist user's theme preference in local storage
- **FR-005**: System MUST respect user's system preference (prefers-color-scheme) on first visit if no preference is stored
- **FR-006**: System MUST apply theme changes instantly without page reload
- **FR-007**: System MUST use CSS custom properties for all theme-dependent values to enable instant switching

#### Design Token System
- **FR-008**: System MUST define CSS custom properties for all colors that vary between themes
- **FR-009**: System MUST define semantic color tokens (e.g., --color-bg-primary, --color-text-primary) that resolve differently per theme
- **FR-010**: System MUST use consistent border-radius tokens (--radius: 8px, --radius-lg: 16px, --radius-full: 100px)
- **FR-011**: System MUST NOT use hardcoded hex color values in component files

#### Vibrant Accent Color Palette (Pop Colors)
- **FR-012**: System MUST use Green (#00C27A) as the primary action color and for success/complete/active states
- **FR-013**: System MUST use Yellow (#FFD93D) for warning/pending/in-progress states and highlights
- **FR-014**: System MUST use Coral (#FF6B6B) for error/alert/attention-needed states
- **FR-015**: System MUST use Teal (#4ECDC4) for informational/neutral/secondary accent states
- **FR-016**: System MUST ensure all four accent colors have appropriate light and dark mode variants that maintain vibrancy
- **FR-017**: System MUST use accent colors consistently for their semantic meanings across the entire application

#### Light Mode Palette
- **FR-018**: Light mode MUST use white (#FFFFFF) as the primary background
- **FR-019**: Light mode MUST use light grays (#FAFAFA, #F5F5F5) for secondary/elevated surfaces
- **FR-020**: Light mode MUST use dark text (#171717, #262626) for primary content
- **FR-021**: Light mode MUST use medium grays (#525252, #737373) for secondary text
- **FR-022**: Light mode MUST use light borders (#E5E5E5, #D4D4D4)

#### Dark Mode Palette
- **FR-023**: Dark mode MUST use near-black (#0A0A0A, #171717) as the primary background
- **FR-024**: Dark mode MUST use dark grays (#1E1E1E, #262626) for secondary/elevated surfaces
- **FR-025**: Dark mode MUST use light text (#FFFFFF, #FAFAFA) for primary content
- **FR-026**: Dark mode MUST use medium grays (#A3A3A3, #737373) for secondary text
- **FR-027**: Dark mode MUST use dark borders (#404040, #525252)

#### Section Color Coding
- **FR-028**: Planning section MUST use Green (#00C27A) as its accent color
- **FR-029**: Procurement section MUST use Teal (#4ECDC4) as its accent color
- **FR-030**: Documents section MUST use Yellow (#FFD93D) as its accent color
- **FR-031**: Cost Planning section MUST use Coral (#FF6B6B) as its accent color
- **FR-032**: Tab active indicators MUST use the parent section's accent color

#### Typography
- **FR-033**: System MUST load DM Sans from Google Fonts as the primary body font
- **FR-034**: System MUST load Spectral from Google Fonts as the serif heading font
- **FR-035**: System MUST apply DM Sans to all body text, labels, and UI elements
- **FR-036**: System MUST apply Spectral (serif) to major section headings
- **FR-037**: System MUST ensure text colors adapt appropriately between light and dark modes

#### Component Styling
- **FR-038**: Buttons MUST have variants using all four accent colors plus neutral variants
- **FR-039**: Status badges MUST use semantic colors (green=success, yellow=pending, coral=error, teal=info)
- **FR-040**: Progress indicators MUST use accent colors to show different states or segments
- **FR-041**: Cards MUST have subtle colored accents (border, header stripe, or icon) where appropriate
- **FR-042**: Focus rings MUST use the contextually appropriate accent color
- **FR-043**: Hover states MUST provide visual feedback using accent colors subtly

#### Logo & Branding
- **FR-044**: System MUST display the ASSEMBLE.AI logo with all 4 color bars (green, yellow, coral, teal)
- **FR-045**: Logo MUST be visible and properly contrasted in both light and dark modes

#### Accessibility
- **FR-046**: All text MUST maintain WCAG 2.1 AA contrast ratios (4.5:1 normal, 3:1 large) in both themes
- **FR-047**: All accent colors MUST have accessible contrast against their backgrounds in both themes
- **FR-048**: Color MUST NOT be the only means of conveying information (icons/text labels required)
- **FR-049**: Focus indicators MUST be clearly visible in both themes
- **FR-050**: System MUST preserve all existing keyboard navigation functionality

### Non-Functional Requirements

- **NFR-001**: Visual changes MUST NOT alter the position or location of any UI elements
- **NFR-002**: Visual changes MUST NOT modify any existing functionality or user workflows
- **NFR-003**: Theme switching MUST occur in under 100ms with no visible flash
- **NFR-004**: Page load time MUST NOT increase by more than 150ms due to fonts and theme system
- **NFR-005**: All styling MUST be implemented using CSS custom properties for maintainability

### Key Entities

- **Theme**: A complete set of color values and visual treatments for the interface
  - Values: "light" or "dark"
  - Contains: Background colors, text colors, border colors, accent color variants
  - Stored in: localStorage, applied via CSS custom properties and data attribute

- **Accent Color**: One of four vibrant brand colors used for visual emphasis and semantic meaning
  - Colors: Green (#00C27A), Yellow (#FFD93D), Coral (#FF6B6B), Teal (#4ECDC4)
  - Contains: Base value, light mode variant, dark mode variant, hover/active states
  - Used for: Status indicators, section accents, interactive feedback, decorative touches

- **Design Token**: A named CSS custom property that adapts to the current theme
  - Contains: Name, light mode value, dark mode value, semantic purpose
  - Examples: --color-bg-primary, --color-text-primary, --color-accent-green

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of pages support both light and dark themes without layout shifts
- **SC-002**: Theme toggle is accessible from every page within 1 click
- **SC-003**: Theme preference persists correctly across browser sessions (100% reliability)
- **SC-004**: All four accent colors (green, yellow, coral, teal) are used at least 3 distinct ways each
- **SC-005**: 0 hardcoded hex color values remain in component files (all use CSS variables)
- **SC-006**: All text maintains WCAG 2.1 AA contrast in both themes (verified by automated audit)
- **SC-007**: Theme switch completes in under 100ms (no perceptible delay)
- **SC-008**: 100% of status indicators use semantically appropriate accent colors
- **SC-009**: Users can complete all existing workflows in both themes without confusion
- **SC-010**: Page load time increases by no more than 150ms

### Qualitative Outcomes

- **SC-011**: Users describe the interface as "colorful but professional" or similar positive terms
- **SC-012**: Users can correctly identify section by color association after brief usage
- **SC-013**: Both light and dark modes feel equally polished and intentional
- **SC-014**: The four accent colors are perceived as a cohesive, intentional palette
- **SC-015**: Visual transition from landing page to app feels seamless

## Design System Reference

### Vibrant Accent Palette (Pop Colors)

These four colors are the signature of ASSEMBLE.AI's visual identity. They appear throughout the interface as accents, status indicators, and decorative elements.

| Color | Name | Hex | Semantic Meaning | Example Uses |
|-------|------|-----|------------------|--------------|
| | **Green** | `#00C27A` | Success, Active, Complete, Primary Action | Primary buttons, success badges, checkmarks, active tabs, completion indicators |
| | **Yellow** | `#FFD93D` | Warning, Pending, In Progress, Highlight | Pending badges, warning alerts, in-progress indicators, highlighted items, Documents section |
| | **Coral** | `#FF6B6B` | Error, Alert, Attention, Urgent | Error messages, overdue items, delete actions, urgent badges, Cost Planning section |
| | **Teal** | `#4ECDC4` | Information, Neutral, Secondary | Info badges, links, secondary actions, Procurement section accent |

### Accent Color Variants

Each accent color has variants for different contexts:

| Color | Base | Light (bg tint) | Dark (hover) | On-dark variant |
|-------|------|-----------------|--------------|-----------------|
| Green | `#00C27A` | `#E8FDF0` | `#00A366` | `#00D68A` |
| Yellow | `#FFD93D` | `#FFF9E6` | `#E6C235` | `#FFE066` |
| Coral | `#FF6B6B` | `#FFEEEE` | `#E55555` | `#FF8585` |
| Teal | `#4ECDC4` | `#E6FAF8` | `#3DB8AF` | `#6EDED6` |

### Light Mode Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg-primary` | `#FFFFFF` | Main background |
| `--color-bg-secondary` | `#FAFAFA` | Cards, elevated surfaces |
| `--color-bg-tertiary` | `#F5F5F5` | Subtle backgrounds, hover states |
| `--color-text-primary` | `#171717` | Headings, primary text |
| `--color-text-secondary` | `#525252` | Body text, descriptions |
| `--color-text-muted` | `#737373` | Labels, hints, metadata |
| `--color-border` | `#E5E5E5` | Borders, dividers |
| `--color-border-subtle` | `#F5F5F5` | Subtle separators |

### Dark Mode Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg-primary` | `#0A0A0A` | Main background |
| `--color-bg-secondary` | `#171717` | Cards, elevated surfaces |
| `--color-bg-tertiary` | `#262626` | Subtle backgrounds, hover states |
| `--color-text-primary` | `#FFFFFF` | Headings, primary text |
| `--color-text-secondary` | `#E5E5E5` | Body text, descriptions |
| `--color-text-muted` | `#A3A3A3` | Labels, hints, metadata |
| `--color-border` | `#404040` | Borders, dividers |
| `--color-border-subtle` | `#262626` | Subtle separators |

### Section Color Mapping

| Section | Accent Color | Light Mode Tint | Dark Mode Tint |
|---------|--------------|-----------------|----------------|
| Planning | Green `#00C27A` | `#E8FDF0` | `#0D2818` |
| Procurement | Teal `#4ECDC4` | `#E6FAF8` | `#0D2625` |
| Documents | Yellow `#FFD93D` | `#FFF9E6` | `#2A2510` |
| Cost Planning | Coral `#FF6B6B` | `#FFEEEE` | `#2A1515` |

### Creative Uses of Pop Colors

#### Status & State Indicators
- **Green**: Completed tasks, successful uploads, active projects, online status
- **Yellow**: In-progress items, pending approvals, draft status, warnings
- **Coral**: Overdue items, errors, failed uploads, items needing attention
- **Teal**: Informational notices, neutral selections, links, secondary highlights

#### UI Elements
- **Progress bars**: Multi-segment with all four colors showing different phases
- **Charts & graphs**: Data visualization using the four-color palette
- **Category tags**: Color-coded tags for document types, project phases
- **Avatar borders**: Colored rings indicating user role or status
- **Card accents**: Thin top border or left stripe in section color
- **Icon backgrounds**: Subtle colored circles behind icons
- **Toast notifications**: Color-coded by type (success/warning/error/info)
- **Tab indicators**: Active tab underline in section accent color
- **Badge pills**: Status badges using semantic colors
- **Button variants**: Primary (green), warning (yellow), danger (coral), secondary (teal)

#### Decorative Touches
- **Empty state illustrations**: Include all four colors
- **Loading skeletons**: Subtle colored shimmer
- **Hover highlights**: Faint color tint on interactive elements
- **Selection states**: Light colored background when items selected
- **Focus rings**: Colored outline matching context

### Typography

| Element | Font Family | Weight | Size |
|---------|-------------|--------|------|
| Body | DM Sans | 400 | 16px base |
| Labels | DM Sans | 500 | 12-14px |
| Buttons | DM Sans | 600 | 14-15px |
| Logo | DM Sans | 700 | 22px |
| Headings | Spectral (serif) | 400 | varies |

### Border Radius Tokens

| Token | Value |
|-------|-------|
| `--radius` | 8px |
| `--radius-lg` | 16px |
| `--radius-full` | 100px |

## Assumptions

1. **Theme Storage**: localStorage is acceptable for persisting theme preference
2. **System Preference**: The app can detect `prefers-color-scheme` media query
3. **CSS Custom Properties**: All target browsers support CSS custom properties
4. **Instant Switching**: CSS custom property updates trigger immediate repaints
5. **Font Availability**: Google Fonts (DM Sans, Spectral) are accessible
6. **Component Architecture**: UI components can be updated to use semantic color tokens

## Dependencies

- **Spec 016**: Landing Page Redesign - provides foundational design language
- **Google Fonts**: DM Sans and Spectral font families
- **CSS Custom Properties**: Browser support for theme switching
- **localStorage API**: For persisting user preference

## Out of Scope

- Additional themes beyond light and dark
- User-customizable accent colors
- Scheduled/automatic theme switching
- Per-section theme overrides
- Animation/motion design changes
- Layout or functionality changes
- Design system documentation site
