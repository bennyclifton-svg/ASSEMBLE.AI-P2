# Data Model: Landing Page Redesign

**Feature**: 016-landing-page-redesign
**Date**: 2025-12-18

## Overview

This document defines the component structure, props interfaces, and data flow for the landing page implementation. Since the landing page is a static marketing page with minimal interactivity, the "data model" focuses on component contracts rather than database entities.

---

## Component Architecture

```
LandingPage (page.tsx)
├── NavBar
│   ├── Logo
│   ├── NavLinks
│   └── CTAButtons
├── HeroSection
│   ├── HeroContent
│   │   ├── Headline
│   │   ├── Subtitle
│   │   └── EmailSignupForm
│   └── HeroMockup
│       └── TeamSelector
├── LogoBar
│   └── CompanyLogo[] (x5)
├── StatsSection
│   ├── StatsHeader
│   └── StatCard[] (x3)
├── AISection
│   ├── AIContent
│   └── AIToolbarMockup
├── ProblemSection
│   ├── ProblemContent
│   └── ProblemCard[] (x4)
├── SolutionSection
│   └── SolutionContent
├── FeaturesSection
│   ├── FeaturesHeader
│   └── FeatureRow[] (x7)
├── BenefitsSection
│   └── BenefitCard[] (x5)
├── TestimonialsSection
│   ├── TestimonialsHeader
│   └── TestimonialCard[] (x3)
├── HowItWorksSection
│   ├── HowItWorksHeader
│   ├── StepConnector
│   └── StepCard[] (x3)
├── CTABannerSection
│   ├── CursorTag[] (x2)
│   └── CTAContent
├── FAQSection
│   ├── FAQHeader
│   └── FAQItem[] (x4)
├── FinalCTASection
│   └── FinalCTAContent
└── FooterSection
    ├── Logo
    └── Copyright
```

---

## Shared Components

### Button

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary-green' | 'light-green' | 'black' | 'ghost';
  hasArrow?: boolean;
  size?: 'default' | 'large';
  asChild?: boolean;
}

// Usage
<Button variant="primary-green" hasArrow>
  Get started free
</Button>
```

### SectionContainer

```typescript
interface SectionContainerProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  pattern?: 'none' | 'standard' | 'dark' | 'fine' | 'green' | 'hero';
  background?: string; // Tailwind bg class or CSS color
}

// Usage
<SectionContainer id="features" pattern="standard" background="bg-gray-50">
  {/* Section content */}
</SectionContainer>
```

### DotGridPattern

```typescript
interface DotGridPatternProps {
  variant: 'standard' | 'dark' | 'fine' | 'green' | 'hero';
  className?: string;
}

// CSS Patterns (from spec)
const patterns = {
  standard: {
    image: 'radial-gradient(circle, var(--gray-400) 1px, transparent 1px)',
    size: '24px 24px'
  },
  dark: {
    image: 'radial-gradient(circle, var(--gray-700) 1px, transparent 1px)',
    size: '24px 24px'
  },
  fine: {
    image: 'radial-gradient(circle, var(--gray-300) 1px, transparent 1px)',
    size: '16px 16px'
  },
  green: {
    image: 'radial-gradient(circle, rgba(0, 194, 122, 0.3) 1px, transparent 1px)',
    size: '20px 20px'
  },
  hero: {
    image: 'radial-gradient(circle, var(--gray-800) 1px, transparent 1px)',
    size: '32px 32px',
    opacity: 0.5,
    hasFade: true
  }
};
```

### ScrollReveal

```typescript
interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number; // ms
  threshold?: number; // 0-1
}

// Usage
<ScrollReveal delay={100}>
  <FeatureRow {...feature} />
</ScrollReveal>
```

---

## Section Data Models

### StatCard

```typescript
interface StatCardData {
  value: string;      // "80%", "10+", "200+"
  label: string;      // "Reduction in bid review time"
}

const statsData: StatCardData[] = [
  { value: "80%", label: "Reduction in bid review time" },
  { value: "10+", label: "Hours saved per week on documents" },
  { value: "200+", label: "AEC firms trust ASSEMBLE.AI" }
];
```

### ProblemCard

```typescript
interface ProblemCardData {
  icon: React.ReactNode;  // Lucide icon component
  text: string;
}

const problemsData: ProblemCardData[] = [
  { icon: <FileX />, text: "Lost documents and version confusion" },
  { icon: <Clock />, text: "Hours wasted on manual bid reviews" },
  { icon: <TrendingDown />, text: "Budget overruns from missed details" },
  { icon: <Users />, text: "Frustrated teams and unhappy clients" }
];
```

### FeatureRow

```typescript
interface FeatureRowData {
  icon: React.ReactNode;
  title: string;
  description: string;
  benefitTag: string;
  visualComponent: React.ReactNode; // CSS mockup component
  reversed: boolean;  // Layout direction
}

const featuresData: FeatureRowData[] = [
  {
    icon: <LayoutDashboard />,
    title: "Project Dashboard",
    description: "See everything at a glance. Track progress, deadlines, and team activity in one view. No more digging through emails or spreadsheets.",
    benefitTag: "Stop chasing status updates. Get answers instantly.",
    visualComponent: <DashboardMockup />,
    reversed: false
  },
  // ... 6 more features
];
```

### BenefitCard

```typescript
interface BenefitCardData {
  text: string;
}

const benefitsData: BenefitCardData[] = [
  { text: "Save 10+ hours per week on document handling and bid reviews" },
  { text: "Fewer costly mistakes with AI-powered data extraction" },
  { text: "Happier clients with projects that finish on time and on budget" },
  { text: "One source of truth for your entire team, anywhere in the world" },
  { text: "Enterprise security to keep your sensitive project data safe" }
];
```

### TestimonialCard

```typescript
interface TestimonialCardData {
  quote: string;
  author: {
    name: string;
    title: string;
    company: string;
    initials: string;  // For avatar
  };
}

const testimonialsData: TestimonialCardData[] = [
  {
    quote: "We used to spend two full days reviewing tender submissions...",
    author: {
      name: "Sarah Chen",
      title: "Project Director",
      company: "Mitchell & Associates",
      initials: "SC"
    }
  },
  // ... 2 more testimonials
];
```

### StepCard

```typescript
interface StepCardData {
  number: number;
  title: string;
  description: string;
}

const stepsData: StepCardData[] = [
  { number: 1, title: "Sign up and add your project", description: "Create your account in seconds..." },
  { number: 2, title: "Upload your documents", description: "Drag and drop your project files..." },
  { number: 3, title: "Run your project smarter", description: "Let AI handle the heavy lifting..." }
];
```

### FAQItem

```typescript
interface FAQItemData {
  question: string;
  answer: string;
}

const faqData: FAQItemData[] = [
  {
    question: "How long does setup take?",
    answer: "Most teams are up and running in less than a day..."
  },
  // ... 3 more FAQs
];
```

### CursorTag

```typescript
interface CursorTagData {
  label: string;
  position: {
    top?: string;
    left?: string;
    right?: string;
    bottom?: string;
  };
  rotation?: number;
}

const cursorTags: CursorTagData[] = [
  { label: "CEO", position: { top: "20%", left: "10%" }, rotation: -8 },
  { label: "CPO", position: { bottom: "30%", right: "15%" }, rotation: 12 }
];
```

---

## Form Data

### EmailSignupForm

```typescript
interface EmailSignupFormData {
  email: string;
}

interface EmailSignupFormState {
  isSubmitting: boolean;
  error: string | null;
}

// Form submission redirects to /register?email=${encodeURIComponent(email)}
```

---

## Navigation Data

```typescript
interface NavLinkData {
  label: string;
  href: string;  // Anchor link for scroll
}

const navLinks: NavLinkData[] = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Customers", href: "#testimonials" },
  { label: "FAQ", href: "#faq" }
];

interface NavCTAData {
  label: string;
  href: string;
  variant: ButtonProps['variant'];
}

const navCTAs: NavCTAData[] = [
  { label: "Book a demo", href: "/demo", variant: "ghost" },
  { label: "Sign up free", href: "/register", variant: "black" }
];
```

---

## CSS Custom Properties (Design Tokens)

```typescript
// Type definitions for design system tokens
interface DesignTokens {
  colors: {
    primary: string;        // #00C27A
    primaryLight: string;   // #B4F5C8
    primaryLighter: string; // #E8FDF0
    primaryDark: string;    // #00A366
    black: string;          // #000000
    white: string;          // #FFFFFF
    gray50: string;         // #FAFAFA
    gray100: string;        // #F5F5F5
    gray200: string;        // #E5E5E5
    gray300: string;        // #D4D4D4
    gray400: string;        // #A3A3A3
    gray500: string;        // #737373
    gray600: string;        // #525252
    gray700: string;        // #404040
    gray800: string;        // #262626
    gray900: string;        // #171717
  };
  radius: {
    default: string;  // 8px
    lg: string;       // 16px
    full: string;     // 100px
  };
  fonts: {
    sans: string;   // 'DM Sans', sans-serif
    serif: string;  // 'Instrument Serif', serif
  };
}
```

---

## State Management

### NavBar Scroll State

```typescript
// Managed via useState + useEffect with scroll listener
interface NavScrollState {
  isScrolled: boolean;  // true when scrollY > 50
}
```

### Team Selector State (Hero Mockup)

```typescript
// Interactive mockup element
interface TeamSelectorState {
  selectedTeam: 'Architecture' | 'Construction' | 'Engineering' | 'Project Mgmt';
}
```

### ScrollReveal Visibility

```typescript
// Managed via Intersection Observer in useScrollReveal hook
interface ScrollRevealState {
  isVisible: boolean;
  ref: React.RefObject<HTMLElement>;
}
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        page.tsx (Server Component)               │
│  - Static content data defined inline or imported from data.ts  │
│  - No server-side data fetching required                        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Section Components                            │
│  - Receive props from page                                       │
│  - Map over data arrays to render cards/items                    │
│  - Use ScrollReveal for animations                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Client Components                             │
│  - NavBar: scroll event listener for isScrolled state            │
│  - HeroSection: email form submission                            │
│  - TeamSelector: click handler for team selection                │
│  - ScrollReveal: Intersection Observer for visibility            │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Organization

```
src/components/landing/
├── data/
│   └── landing-data.ts       # All static content data
├── shared/
│   ├── Button.tsx
│   ├── DotGridPattern.tsx
│   ├── SectionContainer.tsx
│   └── ScrollReveal.tsx
├── mockups/
│   ├── DashboardMockup.tsx
│   ├── DocumentMockup.tsx
│   ├── BidAnalysisMockup.tsx
│   ├── CostPlanMockup.tsx
│   ├── ContractorHubMockup.tsx
│   ├── ReportsMockup.tsx
│   ├── KnowledgeBaseMockup.tsx
│   ├── AIToolbarMockup.tsx
│   └── TeamSelector.tsx
├── NavBar.tsx
├── HeroSection.tsx
├── LogoBar.tsx
├── StatsSection.tsx
├── AISection.tsx
├── ProblemSection.tsx
├── SolutionSection.tsx
├── FeaturesSection.tsx
├── BenefitsSection.tsx
├── TestimonialsSection.tsx
├── HowItWorksSection.tsx
├── CTABannerSection.tsx
├── FAQSection.tsx
├── FinalCTASection.tsx
├── FooterSection.tsx
└── index.ts                  # Re-exports all components
```
