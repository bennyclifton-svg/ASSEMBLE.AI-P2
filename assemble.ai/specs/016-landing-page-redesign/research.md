# Research: Landing Page Redesign

**Feature**: 016-landing-page-redesign
**Date**: 2025-12-18

## Overview

Research findings and design decisions for implementing the ASSEMBLE.AI marketing landing page based on the HTML design reference.

---

## Decision 1: Font Loading Strategy

**Context**: The design requires DM Sans (body) and Instrument Serif (headings) from Google Fonts.

**Decision**: Use `next/font/google` for optimized font loading.

**Rationale**:
- Next.js 16 includes built-in font optimization
- Fonts are self-hosted, eliminating external requests
- Automatic font-display: swap for better Core Web Vitals
- CSS variables automatically generated for font families

**Alternatives Considered**:
- **CSS @import**: Rejected - blocks rendering, slower
- **Manual self-hosting**: Rejected - more maintenance, next/font handles this
- **External CDN link**: Rejected - additional network request, GDPR concerns

**Implementation**:
```tsx
// app/(public)/layout.tsx
import { DM_Sans, Instrument_Serif } from 'next/font/google';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700']
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  weight: ['400']
});
```

---

## Decision 2: CSS Architecture for Design System

**Context**: The HTML design uses CSS custom properties (`:root` variables) for colors, spacing, and typography. Need to integrate with existing Tailwind CSS v4 setup.

**Decision**: Create a dedicated `landing.css` file with CSS custom properties, imported only for the public route group.

**Rationale**:
- Keeps landing-specific tokens separate from app-wide styles
- Matches the HTML design's architecture for easy reference
- Avoids polluting global styles
- CSS variables work well with Tailwind's arbitrary value syntax

**Alternatives Considered**:
- **Tailwind config extension**: Rejected - adds complexity, tokens only used on landing page
- **Inline styles**: Rejected - harder to maintain, no design system reference
- **CSS-in-JS (styled-components)**: Rejected - not in project, adds bundle size

**Implementation**:
```css
/* styles/landing.css */
:root {
  --primary: #00C27A;
  --primary-light: #B4F5C8;
  /* ... all 16 color tokens from spec */
}
```

---

## Decision 3: Scroll Animation Approach

**Context**: Multiple sections need scroll-triggered fade-in animations. Must respect `prefers-reduced-motion`.

**Decision**: Create a custom `useScrollReveal` hook using Intersection Observer API, wrapped in a `ScrollReveal` component.

**Rationale**:
- Intersection Observer is performant (no scroll event listeners)
- Easy to respect `prefers-reduced-motion` via CSS media query
- Reusable across all 15 sections
- Standard React pattern (hook + component)

**Alternatives Considered**:
- **Framer Motion**: Rejected - adds 20KB+ to bundle, overkill for simple fades
- **GSAP ScrollTrigger**: Rejected - commercial license, large bundle
- **CSS scroll-driven animations**: Rejected - limited browser support as of 2025
- **AOS library**: Rejected - another dependency, easy to implement ourselves

**Implementation**:
```tsx
// lib/hooks/use-scroll-reveal.ts
export function useScrollReveal(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    }, { threshold: 0.1, ...options });

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return { ref, isVisible };
}
```

---

## Decision 4: Background Pattern Implementation

**Context**: Design uses 5 different dot-grid patterns (standard, dark, fine, green, hero). These appear in multiple sections.

**Decision**: Create a `DotGridPattern` component with variant prop, using CSS pseudo-elements.

**Rationale**:
- Component encapsulates pattern CSS
- Variant prop allows easy switching between pattern types
- Pseudo-element overlay doesn't add DOM nodes
- Pattern CSS matches HTML design exactly

**Alternatives Considered**:
- **SVG patterns**: Rejected - more complex, no benefit
- **Inline styles per section**: Rejected - duplication, harder to maintain
- **Tailwind plugin**: Rejected - overkill for 5 patterns

**Implementation**:
```tsx
// components/landing/shared/DotGridPattern.tsx
type Variant = 'standard' | 'dark' | 'fine' | 'green' | 'hero';

export function DotGridPattern({ variant = 'standard' }: { variant?: Variant }) {
  const patterns = {
    standard: 'radial-gradient(circle, var(--gray-400) 1px, transparent 1px)',
    dark: 'radial-gradient(circle, var(--gray-700) 1px, transparent 1px)',
    // ... other patterns from spec
  };
  // ...
}
```

---

## Decision 5: Button Component Architecture

**Context**: Design has 4 button variants (primary-green, light-green, black, ghost) with consistent arrow styling.

**Decision**: Create a dedicated `Button` component with variant and hasArrow props, separate from existing UI button.

**Rationale**:
- Landing page buttons have unique styling (pill shape, arrow animation)
- Avoids modifying existing UI button used elsewhere in app
- Clean separation of marketing vs app UI
- Matches HTML design's class structure

**Alternatives Considered**:
- **Extend existing button.tsx**: Rejected - would add landing-specific variants to app-wide component
- **CSS-only with Tailwind**: Rejected - arrow animation requires component logic
- **Radix UI Button**: Already in project but landing design doesn't use Radix patterns

**Implementation**:
```tsx
// components/landing/shared/Button.tsx
type ButtonVariant = 'primary-green' | 'light-green' | 'black' | 'ghost';

export function Button({
  variant = 'primary-green',
  hasArrow = true,
  children,
  ...props
}: ButtonProps) {
  // ...
}
```

---

## Decision 6: Section Component Organization

**Context**: Design has 15 distinct sections. Need to decide on component structure.

**Decision**: One component per section, all in `/components/landing/` with shared utilities in `/shared/` subdirectory.

**Rationale**:
- Clear 1:1 mapping between design sections and components
- Easy to find and modify specific sections
- Shared components (Button, DotGridPattern, etc.) extracted for reuse
- Follows existing project patterns

**Alternatives Considered**:
- **Single monolithic page component**: Rejected - 2000+ lines, unmaintainable
- **Atomic design (atoms/molecules/organisms)**: Rejected - overkill for single page
- **Compound components**: Rejected - sections are independent, don't compose

---

## Decision 7: Hero Mockup Visual Implementation

**Context**: Hero section has a complex "mockup" visual showing a project management interface with team selector widget.

**Decision**: Implement mockup using pure CSS/HTML, no images.

**Rationale**:
- HTML design already uses CSS for mockups (no external images)
- Faster loading, no image optimization needed
- Scales perfectly at any resolution
- Easier to maintain and modify

**Alternatives Considered**:
- **Static PNG/WebP image**: Rejected - larger file size, pixelation risk
- **SVG**: Possible but CSS is simpler for geometric shapes
- **Canvas/WebGL**: Rejected - overkill, accessibility concerns

---

## Decision 8: Mobile Navigation

**Context**: Spec marks mobile hamburger menu as "out of scope" - nav links simply hide on mobile.

**Decision**: Hide nav links on mobile (< 768px), show only logo and CTA buttons.

**Rationale**:
- Matches spec scope
- Simple implementation
- CTAs remain accessible on mobile
- Full mobile menu can be added in future iteration

**Implementation**:
```css
@media (max-width: 768px) {
  .nav-links { display: none; }
}
```

---

## Technical Constraints Summary

| Constraint | Source | Implementation Impact |
|------------|--------|----------------------|
| No external images | Spec assumption | Mockups via CSS |
| Lighthouse > 90 | Success criteria | Code-split, optimize fonts |
| 320px-2560px viewport | Success criteria | Fluid typography (clamp) |
| Reduced motion support | FR-091 | CSS media query + hook |
| No mobile menu | Out of scope | Hide nav links |
| Match HTML pixel-perfect | User requirement | CSS variables from design |

---

## Open Questions Resolved

All specification requirements are clear. No NEEDS CLARIFICATION items remain.

---

## References

- HTML Design: `Landing Page Design/ASSEMBLE-AI-Landing-Page-v2.html`
- Specification: `specs/016-landing-page-redesign/spec.md`
- Next.js Fonts: https://nextjs.org/docs/app/building-your-application/optimizing/fonts
- Intersection Observer: https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
