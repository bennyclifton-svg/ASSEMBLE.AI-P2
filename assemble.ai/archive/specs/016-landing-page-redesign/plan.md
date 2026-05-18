# Implementation Plan: Landing Page Redesign

**Branch**: `016-landing-page-redesign` | **Date**: 2025-12-18 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/016-landing-page-redesign/spec.md`

## Summary

Implement a comprehensive marketing landing page for ASSEMBLE.AI based on the HTML design (`Landing Page Design/ASSEMBLE-AI-Landing-Page-v2.html`). The implementation replaces the existing basic landing page with a 15-section, conversion-focused design featuring dark hero, dot-grid patterns, scroll animations, testimonials, feature showcases, and multiple CTAs. Built using Next.js App Router with React components, Tailwind CSS for styling, and CSS custom properties for the design system.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16.0.3, React 19.2.0
**Primary Dependencies**: React, Tailwind CSS v4, Lucide React (icons), clsx/tailwind-merge
**Storage**: N/A (no data persistence for landing page)
**Testing**: Jest with React Testing Library
**Target Platform**: Web browser (Chrome, Firefox, Safari, Edge)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Lighthouse Performance score > 90, page load < 2 seconds
**Constraints**: Must match HTML design pixel-perfect, mobile responsive (320px-2560px)
**Scale/Scope**: Single page with 15 sections, ~20 components

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| **I. Intelligent Document Repository** | N/A - Marketing page only | ✅ PASS |
| **II. Domain-First Intelligence** | Landing page MUST use AEC terminology | ✅ PASS - All copy uses construction industry terms |
| **III. AI-Powered Automation** | N/A - No AI features in landing page | ✅ PASS |
| **IV. Financial Visibility Throughout Lifecycle** | N/A - Marketing page only | ✅ PASS |
| **V. Small Firm Optimization** | Landing page MUST have simple onboarding CTA | ✅ PASS - Email signup form present |
| **VI. Sharp, Actionable Outputs** | N/A - No generated content | ✅ PASS |
| **VII. Integration Over Isolation** | MUST link to existing auth/registration | ✅ PASS - CTAs link to /register |
| **VIII. Test-Driven Quality** | MUST have component tests | ✅ PASS - Jest tests planned |
| **IX. Spreadsheet-Native UX** | N/A - Marketing page only | ✅ PASS |

**Result**: All applicable gates pass. No violations requiring justification.

## Project Structure

### Documentation (this feature)

```text
specs/016-landing-page-redesign/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output - design decisions
├── data-model.md        # Phase 1 output - component structure
├── quickstart.md        # Phase 1 output - implementation guide
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── app/
│   └── (public)/
│       ├── page.tsx                    # Landing page route (UPDATE)
│       ├── layout.tsx                  # Public layout with fonts (UPDATE/CREATE)
│       └── pricing/
│           └── page.tsx                # Pricing page (existing)
├── components/
│   └── landing/                        # Landing page components (UPDATE/CREATE)
│       ├── NavBar.tsx                  # Fixed navigation (UPDATE)
│       ├── HeroSection.tsx             # Dark hero with mockup (UPDATE)
│       ├── LogoBar.tsx                 # Trusted by section (CREATE)
│       ├── StatsSection.tsx            # Key metrics (CREATE)
│       ├── AISection.tsx               # AI features highlight (CREATE)
│       ├── ProblemSection.tsx          # Pain points (CREATE)
│       ├── SolutionSection.tsx         # Platform solution (CREATE)
│       ├── FeaturesSection.tsx         # 7 feature cards (UPDATE)
│       ├── BenefitsSection.tsx         # 5 benefits grid (CREATE)
│       ├── TestimonialsSection.tsx     # Customer quotes (CREATE)
│       ├── HowItWorksSection.tsx       # 3-step process (CREATE)
│       ├── CTABannerSection.tsx        # Floating CTA banner (CREATE)
│       ├── FAQSection.tsx              # Common questions (CREATE)
│       ├── FinalCTASection.tsx         # Closing CTA (CREATE)
│       ├── FooterSection.tsx           # Footer (UPDATE)
│       └── shared/
│           ├── Button.tsx              # Button variants (CREATE)
│           ├── SectionContainer.tsx    # Section wrapper (CREATE)
│           ├── DotGridPattern.tsx      # Background pattern (CREATE)
│           └── ScrollReveal.tsx        # Animation wrapper (CREATE)
├── styles/
│   └── landing.css                     # Landing-specific CSS variables (CREATE)
└── lib/
    └── hooks/
        └── use-scroll-reveal.ts        # Intersection Observer hook (CREATE)

tests/
├── components/
│   └── landing/
│       ├── NavBar.test.tsx
│       ├── HeroSection.test.tsx
│       └── ...
└── e2e/
    └── landing-page.test.ts            # E2E navigation test (if Playwright configured)
```

**Structure Decision**: Extends existing Next.js App Router structure under `(public)` route group. Landing components remain in dedicated `/components/landing/` directory. CSS custom properties for design system tokens added to landing-specific stylesheet.

## Complexity Tracking

> No violations requiring justification. Implementation follows existing patterns.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| CSS Variables | Use CSS custom properties in dedicated file | Matches HTML design approach, allows easy theming |
| Component Structure | One component per section | Simple, maintainable, matches 15-section design |
| Animations | Intersection Observer hook | Standard pattern, performant, respects reduced-motion |
| Fonts | Google Fonts via next/font | Next.js recommended approach for font optimization |

## Implementation Phases

### Phase 1: Foundation (Priority: Critical)
- Set up CSS custom properties / design system tokens
- Create Google Fonts configuration (DM Sans, Instrument Serif)
- Build shared components (Button variants, SectionContainer, DotGridPattern)
- Build ScrollReveal hook and component

### Phase 2: Core Sections (Priority: High)
- Update NavBar with scroll effect and new styling
- Rebuild HeroSection with mockup visual
- Create LogoBar, StatsSection, ProblemSection, SolutionSection

### Phase 3: Feature Sections (Priority: High)
- Rebuild FeaturesSection with 7 alternating feature cards
- Create BenefitsSection with 5-card grid
- Create TestimonialsSection with 3 quotes

### Phase 4: Conversion Sections (Priority: Medium)
- Create HowItWorksSection with 3 steps and connecting line
- Create CTABannerSection with floating cursor tags
- Create FAQSection with 4 items
- Create FinalCTASection

### Phase 5: Polish & Testing (Priority: Medium)
- Update FooterSection
- Implement scroll animations for all sections
- Add responsive breakpoints (1024px, 768px)
- Write component tests
- Lighthouse audit and optimization

## Dependencies

- **Google Fonts**: DM Sans, Instrument Serif (load via next/font)
- **Tailwind CSS v4**: Already configured in project
- **Lucide React**: For icons (arrows, checkmarks)
- **clsx/tailwind-merge**: Already in project for class merging

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Font loading delays | Low | Medium | Use next/font for optimization, display: swap |
| Animation jank on mobile | Medium | Low | Test on real devices, use transform/opacity only |
| CSS specificity conflicts | Low | Medium | Use landing-specific CSS module or scoped classes |
| Large bundle size | Low | Low | Code-split landing components, tree-shake unused icons |
