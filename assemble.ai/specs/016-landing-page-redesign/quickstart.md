# Quickstart: Landing Page Redesign

**Feature**: 016-landing-page-redesign
**Date**: 2025-12-18

## Overview

This guide provides step-by-step instructions for implementing the ASSEMBLE.AI landing page redesign. Follow these steps to set up the foundation and build each section.

---

## Prerequisites

Before starting, ensure you have:
- [ ] Node.js 20+ installed
- [ ] Project dependencies installed (`npm install`)
- [ ] Access to the HTML design file: `Landing Page Design/ASSEMBLE-AI-Landing-Page-v2.html`
- [ ] Familiarity with Next.js App Router and React
- [ ] Understanding of Tailwind CSS v4

---

## Step 1: Set Up Design System (30 mins)

### 1.1 Create landing.css with design tokens

```bash
# Create the file
touch src/styles/landing.css
```

```css
/* src/styles/landing.css */
:root {
  /* Primary Colors */
  --primary: #00C27A;
  --primary-light: #B4F5C8;
  --primary-lighter: #E8FDF0;
  --primary-dark: #00A366;

  /* Neutrals */
  --black: #000000;
  --white: #FFFFFF;
  --gray-50: #FAFAFA;
  --gray-100: #F5F5F5;
  --gray-200: #E5E5E5;
  --gray-300: #D4D4D4;
  --gray-400: #A3A3A3;
  --gray-500: #737373;
  --gray-600: #525252;
  --gray-700: #404040;
  --gray-800: #262626;
  --gray-900: #171717;

  /* Border Radius */
  --radius: 8px;
  --radius-lg: 16px;
  --radius-full: 100px;
}
```

### 1.2 Configure Google Fonts in public layout

```tsx
// src/app/(public)/layout.tsx
import { DM_Sans, Instrument_Serif } from 'next/font/google';
import '@/styles/landing.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  variable: '--font-instrument-serif',
  weight: ['400'],
  display: 'swap',
});

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${dmSans.variable} ${instrumentSerif.variable} font-sans`}>
      {children}
    </div>
  );
}
```

---

## Step 2: Create Shared Components (1 hour)

### 2.1 Button Component

```tsx
// src/components/landing/shared/Button.tsx
'use client';

import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';

type ButtonVariant = 'primary-green' | 'light-green' | 'black' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  hasArrow?: boolean;
  size?: 'default' | 'large';
}

const variantStyles: Record<ButtonVariant, string> = {
  'primary-green': 'bg-[var(--primary)] text-black hover:bg-[var(--primary-dark)]',
  'light-green': 'bg-[var(--primary-light)] text-black hover:bg-[#9EEAB5]',
  'black': 'bg-black text-white hover:bg-[var(--gray-800)]',
  'ghost': 'bg-transparent text-white border border-[var(--gray-700)] hover:bg-[var(--gray-900)] hover:border-[var(--gray-500)]',
};

export function Button({
  variant = 'primary-green',
  hasArrow = true,
  size = 'default',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-2 font-semibold rounded-full transition-all duration-200',
        size === 'default' ? 'px-5 py-2.5 text-sm' : 'px-6 py-3 text-[15px]',
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
      {hasArrow && (
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/10 transition-transform duration-200 group-hover:translate-x-0.5">
          <ArrowRight className="w-3 h-3" />
        </span>
      )}
    </button>
  );
}
```

### 2.2 DotGridPattern Component

```tsx
// src/components/landing/shared/DotGridPattern.tsx
import { cn } from '@/lib/utils';

type PatternVariant = 'standard' | 'dark' | 'fine' | 'green' | 'hero';

interface DotGridPatternProps {
  variant?: PatternVariant;
  className?: string;
}

export function DotGridPattern({ variant = 'standard', className }: DotGridPatternProps) {
  const patterns: Record<PatternVariant, React.CSSProperties> = {
    standard: {
      backgroundImage: 'radial-gradient(circle, var(--gray-400) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    },
    dark: {
      backgroundImage: 'radial-gradient(circle, var(--gray-700) 1px, transparent 1px)',
      backgroundSize: '24px 24px',
    },
    fine: {
      backgroundImage: 'radial-gradient(circle, var(--gray-300) 1px, transparent 1px)',
      backgroundSize: '16px 16px',
    },
    green: {
      backgroundImage: 'radial-gradient(circle, rgba(0, 194, 122, 0.3) 1px, transparent 1px)',
      backgroundSize: '20px 20px',
    },
    hero: {
      backgroundImage: 'radial-gradient(circle, var(--gray-800) 1px, transparent 1px)',
      backgroundSize: '32px 32px',
      opacity: 0.5,
    },
  };

  return (
    <div
      className={cn('absolute inset-0 pointer-events-none', className)}
      style={patterns[variant]}
    />
  );
}
```

### 2.3 ScrollReveal Hook and Component

```tsx
// src/lib/hooks/use-scroll-reveal.ts
'use client';

import { useEffect, useRef, useState } from 'react';

export function useScrollReveal(options?: IntersectionObserverInit) {
  const ref = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Only trigger once
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isVisible };
}
```

```tsx
// src/components/landing/shared/ScrollReveal.tsx
'use client';

import { cn } from '@/lib/utils';
import { useScrollReveal } from '@/lib/hooks/use-scroll-reveal';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export function ScrollReveal({ children, className, delay = 0 }: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={cn(
        'transition-all duration-600 ease-out',
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-[30px]',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
```

### 2.4 SectionContainer Component

```tsx
// src/components/landing/shared/SectionContainer.tsx
import { cn } from '@/lib/utils';
import { DotGridPattern } from './DotGridPattern';

interface SectionContainerProps {
  children: React.ReactNode;
  id?: string;
  className?: string;
  pattern?: 'none' | 'standard' | 'dark' | 'fine' | 'green' | 'hero';
  background?: string;
}

export function SectionContainer({
  children,
  id,
  className,
  pattern = 'none',
  background = 'bg-white',
}: SectionContainerProps) {
  return (
    <section id={id} className={cn('relative overflow-hidden', background, className)}>
      {pattern !== 'none' && <DotGridPattern variant={pattern} />}
      <div className="relative max-w-[1280px] mx-auto px-8">
        {children}
      </div>
    </section>
  );
}
```

---

## Step 3: Build NavBar (45 mins)

```tsx
// src/components/landing/NavBar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from './shared/Button';

export function NavBar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Customers', href: '#testimonials' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled ? 'bg-black/95 backdrop-blur-[20px]' : 'bg-transparent'
      )}
    >
      <div className="max-w-[1280px] mx-auto px-8 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="w-1 h-6 rounded-full bg-[#00C27A]" />
            <div className="w-1 h-6 rounded-full bg-[#FFD93D]" />
            <div className="w-1 h-6 rounded-full bg-[#FF6B6B]" />
            <div className="w-1 h-6 rounded-full bg-[#4ECDC4]" />
          </div>
          <span className="text-white font-bold text-[22px]">ASSEMBLE.AI</span>
        </Link>

        {/* Nav Links - hidden on mobile */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[var(--gray-400)] hover:text-white transition-colors text-[15px] font-medium"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" hasArrow={false} className="hidden sm:flex">
            Book a demo
          </Button>
          <Link href="/register">
            <Button variant="black">Sign up free</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
```

---

## Step 4: Build Hero Section (1 hour)

```tsx
// src/components/landing/HeroSection.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SectionContainer } from './shared/SectionContainer';
import { Button } from './shared/Button';

export function HeroSection() {
  const [email, setEmail] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      router.push(`/register?email=${encodeURIComponent(email)}`);
    }
  };

  return (
    <SectionContainer pattern="hero" background="bg-black" className="py-[120px] md:py-[80px]">
      <div className="grid grid-cols-2 gap-[60px] items-center lg:grid-cols-1">
        {/* Content */}
        <div>
          <h1 className="font-serif text-[clamp(48px,5.5vw,72px)] leading-[1.05] tracking-[-2px] mb-6">
            <span className="text-[var(--gray-500)]">Build faster.</span>{' '}
            <span className="text-white">Save time.</span>{' '}
            <span className="text-white">Stand out.</span>
          </h1>

          <p className="text-[17px] text-[var(--gray-400)] max-w-[480px] mb-8 leading-relaxed">
            You're busier than ever. ASSEMBLE.AI is the AI platform that turns project
            chaos into an ongoing way of working, connecting strategy to execution and
            driving results in one shared workspace.
          </p>

          <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="px-4 py-3 bg-[var(--gray-900)] border border-[var(--gray-700)] rounded-lg text-white text-sm max-w-[280px] w-full focus:outline-none focus:border-[var(--gray-500)]"
            />
            <Button type="submit" variant="primary-green" size="large">
              Get started free
            </Button>
          </form>

          <p className="text-[13px] text-[var(--gray-500)] mt-4">
            By signing up, you agree to our{' '}
            <a href="/terms" className="underline hover:text-[var(--gray-400)]">Terms</a>
            {' '}and{' '}
            <a href="/privacy" className="underline hover:text-[var(--gray-400)]">Privacy Policy</a>
          </p>
        </div>

        {/* Hero Mockup - hidden on tablet/mobile */}
        <div className="hidden lg:hidden xl:block">
          {/* CSS-based mockup goes here - see full implementation */}
        </div>
      </div>
    </SectionContainer>
  );
}
```

---

## Step 5: Continue with Remaining Sections

Follow the same pattern for each section:

1. **LogoBar** - Simple horizontal layout with text placeholders
2. **StatsSection** - 3-column grid with stat cards
3. **AISection** - Two-column with content + mockup
4. **ProblemSection** - Dark background, 4 problem cards
5. **SolutionSection** - Light background, centered content
6. **FeaturesSection** - 7 alternating feature rows
7. **BenefitsSection** - 5-card grid with checkmark icons
8. **TestimonialsSection** - 3-column testimonial cards
9. **HowItWorksSection** - 3 steps with connecting line
10. **CTABannerSection** - Light green with floating tags
11. **FAQSection** - Centered FAQ items
12. **FinalCTASection** - Dark CTA with large headline
13. **FooterSection** - Simple centered footer

---

## Step 6: Assemble the Page

```tsx
// src/app/(public)/page.tsx
import { NavBar } from '@/components/landing/NavBar';
import { HeroSection } from '@/components/landing/HeroSection';
import { LogoBar } from '@/components/landing/LogoBar';
import { StatsSection } from '@/components/landing/StatsSection';
import { AISection } from '@/components/landing/AISection';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { SolutionSection } from '@/components/landing/SolutionSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { BenefitsSection } from '@/components/landing/BenefitsSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { HowItWorksSection } from '@/components/landing/HowItWorksSection';
import { CTABannerSection } from '@/components/landing/CTABannerSection';
import { FAQSection } from '@/components/landing/FAQSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';
import { FooterSection } from '@/components/landing/FooterSection';

export default function LandingPage() {
  return (
    <>
      <NavBar />
      <main>
        <HeroSection />
        <LogoBar />
        <StatsSection />
        <AISection />
        <ProblemSection />
        <SolutionSection />
        <FeaturesSection />
        <BenefitsSection />
        <TestimonialsSection />
        <HowItWorksSection />
        <CTABannerSection />
        <FAQSection />
        <FinalCTASection />
      </main>
      <FooterSection />
    </>
  );
}
```

---

## Step 7: Testing

### 7.1 Run development server

```bash
npm run dev
```

### 7.2 Visual comparison

Open the HTML design file in a browser and compare side-by-side with http://localhost:3000

### 7.3 Responsive testing

Test at these breakpoints:
- 1440px (Desktop)
- 1024px (Tablet)
- 768px (Mobile landscape)
- 375px (Mobile portrait)

### 7.4 Lighthouse audit

```bash
# In Chrome DevTools > Lighthouse
# Target scores: Performance 90+, Accessibility 90+, SEO 90+
```

---

## Checklist

- [ ] Design tokens in landing.css
- [ ] Fonts configured with next/font
- [ ] Shared components (Button, DotGridPattern, ScrollReveal, SectionContainer)
- [ ] NavBar with scroll effect
- [ ] HeroSection with email form
- [ ] LogoBar
- [ ] StatsSection
- [ ] AISection
- [ ] ProblemSection
- [ ] SolutionSection
- [ ] FeaturesSection (7 rows)
- [ ] BenefitsSection (5 cards)
- [ ] TestimonialsSection (3 cards)
- [ ] HowItWorksSection (3 steps)
- [ ] CTABannerSection
- [ ] FAQSection (4 items)
- [ ] FinalCTASection
- [ ] FooterSection
- [ ] Responsive breakpoints (1024px, 768px)
- [ ] Scroll animations
- [ ] Lighthouse audit passed

---

## Common Issues

### Fonts not loading
- Check that `font-sans` class is applied to root element
- Verify font imports in layout.tsx

### CSS variables not working
- Ensure landing.css is imported in the public layout
- Check browser dev tools for variable values

### Animations not triggering
- Verify Intersection Observer is supported
- Check threshold value (0.1 = 10% visible)

### Layout breaking on mobile
- Check grid-cols responsive classes
- Verify hidden/block classes at breakpoints

---

## Reference Files

- **HTML Design**: `Landing Page Design/ASSEMBLE-AI-Landing-Page-v2.html`
- **Specification**: `specs/016-landing-page-redesign/spec.md`
- **Data Model**: `specs/016-landing-page-redesign/data-model.md`
- **Research**: `specs/016-landing-page-redesign/research.md`
