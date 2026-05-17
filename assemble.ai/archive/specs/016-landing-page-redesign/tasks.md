# Tasks: Landing Page Redesign

**Input**: Design documents from `/specs/016-landing-page-redesign/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files)
- **[Story]**: User story label (US1-US8)

---

## Phase 1: Setup ✅ COMPLETE

**Purpose**: Design system foundation

- [x] T001 Create CSS custom properties in `src/styles/landing.css`
- [x] T002 Configure Google Fonts (DM Sans, Spectral) in `src/app/(public)/layout.tsx`
  - Note: Using Spectral instead of Instrument Serif as specified
- [x] T003 [P] Create Button component with 4 variants in `src/components/landing/shared/Button.tsx`
- [x] T004 [P] Create DotGridPattern component in `src/components/landing/shared/DotGridPattern.tsx`
- [x] T005 [P] Create SectionContainer component in `src/components/landing/shared/SectionContainer.tsx`

---

## Phase 2: Foundational ✅ COMPLETE

**Purpose**: Core utilities needed by all sections

- [x] T006 Create useScrollReveal hook in `src/lib/hooks/use-scroll-reveal.ts`
- [x] T007 Create ScrollReveal wrapper component in `src/components/landing/shared/ScrollReveal.tsx`
- [x] T008 Create landing data file with all content in `src/components/landing/data/landing-data.ts`
- [x] T009 Create component index exports in `src/components/landing/index.ts`

**Checkpoint**: Foundation ready - section implementation can begin ✅

---

## Phase 3: User Stories 1, 2, 8 - Core Experience (P1) 🎯 MVP ✅ COMPLETE

**Goal**: Hero, navigation, and conversion CTAs - the essential visitor journey

**Independent Test**: Visit `/`, see hero, navigate via links, submit email signup

### Navigation (US2)

- [x] T010 [US2] Create NavBar with logo and links in `src/components/landing/NavBar.tsx`
- [x] T011 [US2] Add scroll state effect (background change at 50px) to NavBar
- [x] T012 [US2] Implement smooth scroll for nav anchor links

### Hero (US1)

- [x] T013 [US1] Create HeroSection layout in `src/components/landing/HeroSection.tsx`
- [x] T014 [US1] Build hero headline with serif font and gray/white split
- [x] T015 [US1] Add email signup form with validation
- [x] T016 [P] [US1] Create TeamSelector mockup component
  - Note: Implemented inline in HeroSection.tsx (not in separate mockups folder)
- [x] T017 [US1] Build HeroMockup visual with TeamSelector
  - Note: Implemented inline in HeroSection.tsx (not in separate mockups folder)

### Conversion CTAs (US8)

- [x] T018 [US8] Wire "Get started free" button to `/register?email=` redirect
- [x] T019 [US8] Wire "Sign up free" nav button to `/register`
- [x] T020 [US8] Wire "Book a demo" to `/demo`

**Checkpoint**: MVP complete - visitor can discover product and sign up ✅

---

## Phase 4: User Stories 3, 4, 5 - Value Communication (P2) ✅ COMPLETE

**Goal**: Features, social proof, and problem-solution messaging

### Social Proof (US4)

- [x] T021 [P] [US4] Create LogoBar section in `src/components/landing/LogoBar.tsx`
- [x] T022 [P] [US4] Create StatsSection with 3 stat cards in `src/components/landing/StatsSection.tsx`
- [x] T023 [US4] Create TestimonialsSection with 3 quotes in `src/components/landing/TestimonialsSection.tsx`

### Problem-Solution (US5)

- [x] T024 [P] [US5] Create ProblemSection with 4 pain point cards in `src/components/landing/ProblemSection.tsx`
- [x] T025 [US5] Create SolutionSection in `src/components/landing/SolutionSection.tsx`
- [x] T026 [P] [US5] Create AISection with toolbar mockup in `src/components/landing/AISection.tsx`

### Features (US3)

- [x] T027 [P] [US3] Create feature mockup components
  - Note: Mockups implemented inline in FeaturesSection.tsx (not in separate mockups folder)
- [x] T028 [US3] Create FeaturesSection with alternating rows in `src/components/landing/FeaturesSection.tsx`
- [x] T029 [US3] Create BenefitsSection with benefit cards in `src/components/landing/BenefitsSection.tsx`

**Checkpoint**: Full value proposition communicated ✅

---

## Phase 5: User Stories 6, 7 - Supporting Content (P3) ✅ COMPLETE

**Goal**: How it works and FAQ sections

### How It Works (US6)

- [x] T030 [US6] Create HowItWorksSection with 3 steps in `src/components/landing/HowItWorksSection.tsx`
- [x] T031 [US6] Add connecting gradient line between step circles

### FAQ (US7)

- [x] T032 [US7] Create FAQSection with 4 items in `src/components/landing/FAQSection.tsx`
- [x] T033 [US7] Add hover effect on FAQ items

---

## Phase 6: Closing Sections ✅ COMPLETE

**Purpose**: Final CTAs and footer

- [x] T034 Create CTABannerSection with floating cursor tags in `src/components/landing/CTABannerSection.tsx`
- [x] T035 Create FinalCTASection in `src/components/landing/FinalCTASection.tsx`
- [x] T036 Update FooterSection in `src/components/landing/FooterSection.tsx`

---

## Phase 7: Assembly & Polish 🔄 IN PROGRESS

**Purpose**: Wire up page and add finishing touches

- [x] T037 Update page.tsx to import all 15 sections in `src/app/(public)/page.tsx`
- [x] T038 Add ScrollReveal animations to all section components
- [x] T039 Implement responsive breakpoints (1024px, 768px) across all sections
- [x] T040 Add `prefers-reduced-motion` media query support
- [ ] T041 Run Lighthouse audit and fix any performance issues
- [ ] T042 Visual comparison test against HTML design file

---

## Additional Components Created (Not in Original Plan)

- [x] PricingSection in `src/components/landing/PricingSection.tsx`
  - Added for SaaS launch requirements

---

## Dependencies

```
Phase 1 (Setup) → Phase 2 (Foundational) → Phase 3+ (User Stories)

Phase 3 (P1: Hero, Nav, CTAs) - MVP ✅
    ↓
Phase 4 (P2: Features, Social Proof, Problem/Solution) ✅
    ↓
Phase 5 (P3: How It Works, FAQ) ✅
    ↓
Phase 6 (Closing Sections) ✅
    ↓
Phase 7 (Assembly & Polish) 🔄
```

### User Story Independence

| Story | Dependencies | Can Run In Parallel With | Status |
|-------|--------------|-------------------------|--------|
| US1 (Hero) | Phase 2 | US2, US8 | ✅ |
| US2 (Nav) | Phase 2 | US1, US8 | ✅ |
| US8 (CTAs) | US1, US2 | - | ✅ |
| US3 (Features) | Phase 2 | US4, US5 | ✅ |
| US4 (Social Proof) | Phase 2 | US3, US5 | ✅ |
| US5 (Problem/Solution) | Phase 2 | US3, US4 | ✅ |
| US6 (How It Works) | Phase 2 | US7 | ✅ |
| US7 (FAQ) | Phase 2 | US6 | ✅ |

---

## Summary

| Phase | Tasks | Focus | Status |
|-------|-------|-------|--------|
| 1 Setup | 5 | Design tokens, fonts, shared components | ✅ Complete |
| 2 Foundational | 4 | ScrollReveal, data, exports | ✅ Complete |
| 3 MVP (P1) | 11 | NavBar, Hero, CTAs | ✅ Complete |
| 4 Value (P2) | 9 | Features, Social Proof, Problem/Solution | ✅ Complete |
| 5 Support (P3) | 4 | How It Works, FAQ | ✅ Complete |
| 6 Closing | 3 | CTA Banner, Final CTA, Footer | ✅ Complete |
| 7 Polish | 6 | Assembly, animations, responsive, audit | 🔄 4/6 Complete |
| **Total** | **42** | | **40/42 Complete (95%)** |

## Implementation Notes

1. **Mockups**: TeamSelector and HeroMockup are implemented inline in HeroSection.tsx rather than as separate files in `/mockups/` folder
2. **Font Choice**: Using Spectral instead of Instrument Serif as specified in original design
3. **Extra Component**: PricingSection was added for SaaS launch requirements
4. **All 15 sections**: Assembled and rendering on the public landing page

## Remaining Work

1. **T041**: Run Lighthouse audit and address any performance issues
2. **T042**: Visual comparison test against the HTML design file to ensure pixel-perfect implementation
