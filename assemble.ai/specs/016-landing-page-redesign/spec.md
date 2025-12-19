# Feature Specification: Landing Page Redesign

**Feature Branch**: `016-landing-page-redesign`
**Created**: 2025-12-18
**Status**: Draft
**Input**: User description: "Implement the marketing landing page from ASSEMBLE-AI-Landing-Page-v2.html design"

## Overview

Implement a modern, conversion-focused marketing landing page for ASSEMBLE.AI based on the provided HTML design. The landing page will serve as the primary entry point for potential customers, showcasing the platform's value proposition for architecture, engineering, and construction (AEC) firms. The design features a dark hero section, multiple content sections with dot-grid patterns, testimonials, feature showcases, and clear calls-to-action throughout.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - First-Time Visitor Discovery (Priority: P1)

A potential customer visits the ASSEMBLE.AI website for the first time. They immediately see a compelling hero section that communicates the value proposition ("Build faster. Save time. AI Admin."), understands this is an AI platform for project management, and can easily start a free trial by entering their email.

**Why this priority**: The hero section is the first impression and primary conversion point. Without an effective hero, visitors bounce before exploring further.

**Independent Test**: Can be tested by visiting the root URL as an unauthenticated user, viewing the hero section, entering an email, and clicking "Get started free".

**Acceptance Scenarios**:

1. **Given** an unauthenticated user, **When** they visit the root URL (/), **Then** they see the hero section with the headline "Build faster. Save time. Stand out." and an email signup form
2. **Given** a visitor on the landing page, **When** they enter their email and click "Get started free", **Then** they are redirected to the registration flow with their email pre-filled
3. **Given** a visitor viewing the hero, **When** they see the hero mockup on desktop, **Then** they see a visual representation of the project management interface with team selector widget
4. **Given** a visitor on mobile, **When** they view the hero section, **Then** the layout adapts responsively and the mockup visual is hidden

---

### User Story 2 - Navigation and Section Discovery (Priority: P1)

A visitor uses the navigation to explore different sections of the landing page. The navigation is fixed at the top, becomes opaque on scroll, and allows smooth scrolling to Features, How It Works, Testimonials, and FAQ sections.

**Why this priority**: Navigation enables visitors to find relevant information quickly. Poor navigation leads to confusion and abandonment.

**Independent Test**: Can be tested by clicking each nav link and verifying smooth scroll to the correct section, and by scrolling to verify nav background change.

**Acceptance Scenarios**:

1. **Given** a visitor at the top of the page, **When** they view the navigation, **Then** they see the ASSEMBLE.AI logo, nav links (Features, How It Works, Customers, FAQ), and CTA buttons (Book a demo, Sign up free)
2. **Given** a visitor who scrolls down 50+ pixels, **When** the scroll event fires, **Then** the navigation background becomes semi-transparent black with blur effect
3. **Given** a visitor clicking a nav link, **When** they click "Features", **Then** the page smoothly scrolls to the Features section
4. **Given** a mobile visitor, **When** they view the navigation, **Then** the nav links are hidden (mobile menu to be implemented)

---

### User Story 3 - Feature Understanding (Priority: P2)

A visitor wants to understand what ASSEMBLE.AI does. They scroll through the Features section and see 7 feature cards with alternating layouts (text-left/visual-right, then reversed), each explaining a key capability: Project Dashboard, Document Control, AI-Powered Bid Analysis, Cost Planning, Contractor & Consultant Hub, One-Click Reports, and Smart Knowledge Base.

**Why this priority**: Features demonstrate product value and differentiate from competitors. Clear feature presentation drives conversion.

**Independent Test**: Can be tested by scrolling to the Features section and verifying all 7 feature cards display correctly with proper alternating layout and animations.

**Acceptance Scenarios**:

1. **Given** a visitor scrolling to Features, **When** the section comes into view, **Then** they see the header "Everything you need to deliver projects on time"
2. **Given** a visitor viewing feature cards, **When** odd-numbered cards appear, **Then** content is on the left and visual is on the right
3. **Given** a visitor viewing feature cards, **When** even-numbered cards appear, **Then** the layout is reversed (visual left, content right)
4. **Given** each feature card, **When** it enters the viewport, **Then** it animates in with a fade-up effect

---

### User Story 4 - Social Proof Validation (Priority: P2)

A visitor wants to know if other companies trust ASSEMBLE.AI. They see the logo bar showing "Trusted by 200+ architecture and construction firms worldwide" with placeholder company logos, the stats section with key metrics (80% reduction in bid review time, 10+ hours saved per week, 200+ AEC firms), and 3 customer testimonials with quotes and attribution.

**Why this priority**: Social proof builds trust and credibility. Visitors are more likely to convert when they see others have had success.

**Independent Test**: Can be tested by scrolling through the page and verifying the logo bar, stats section, and testimonials section all display correctly.

**Acceptance Scenarios**:

1. **Given** a visitor scrolling past the hero, **When** they reach the logo bar, **Then** they see "Trusted by 200+ architecture and construction firms worldwide" and company name placeholders
2. **Given** a visitor viewing the stats section, **When** the stats cards enter viewport, **Then** they see 80%, 10+, and 200+ metrics with descriptions and fade-in animation
3. **Given** a visitor at testimonials section, **When** they view a testimonial card, **Then** they see a quote, large quotation mark styling, author avatar initials, name, and title
4. **Given** the testimonial grid, **When** viewed on desktop, **Then** it displays as a 3-column grid; on mobile as single column

---

### User Story 5 - Problem-Solution Understanding (Priority: P2)

A visitor wants to understand the problems ASSEMBLE.AI solves. They see a dark-themed Problem section with pain points (lost documents, manual bid reviews, budget overruns, frustrated teams), followed by a Solution section explaining the unified platform approach.

**Why this priority**: Problem-agitation-solution is a proven conversion pattern. Visitors need to see their pain reflected before accepting the solution.

**Independent Test**: Can be tested by scrolling to Problem and Solution sections and verifying all content and visual elements display correctly.

**Acceptance Scenarios**:

1. **Given** a visitor at the Problem section, **When** they view it, **Then** they see a dark background with dot-grid pattern, the headline "Running big projects is hard." and 4 problem cards
2. **Given** each problem card, **When** hovered, **Then** it shows a subtle translation and border color change
3. **Given** a visitor at Solution section, **When** they view it, **Then** they see "One platform for your entire project" headline with explanatory paragraph
4. **Given** both sections, **When** content enters viewport, **Then** elements animate in smoothly

---

### User Story 6 - Getting Started Process (Priority: P3)

A visitor wants to know how easy it is to get started. They see the "How It Works" section with 3 numbered steps: Sign up and add your project, Upload your documents, Run your project smarter. Each step is connected by a visual line.

**Why this priority**: Reducing perceived complexity increases conversion. Clear onboarding steps reduce friction.

**Independent Test**: Can be tested by scrolling to How It Works section and verifying the 3 steps display correctly with connecting line and animations.

**Acceptance Scenarios**:

1. **Given** a visitor at How It Works section, **When** they view it, **Then** they see "Get started in 3 simple steps" headline
2. **Given** the steps grid, **When** viewed on desktop, **Then** a horizontal line connects the 3 step circles
3. **Given** each step card, **When** it enters the viewport, **Then** it animates in with the numbered circle prominently displayed
4. **Given** mobile view, **When** steps are displayed, **Then** the connecting line is hidden and steps stack vertically

---

### User Story 7 - FAQ Answers (Priority: P3)

A visitor has questions before signing up. They scroll to the FAQ section and find answers to common questions: setup time, data security, free trial availability, and support options.

**Why this priority**: FAQs address objections and reduce support burden. Answering questions proactively increases conversion.

**Independent Test**: Can be tested by scrolling to FAQ section and verifying all 4 questions and answers display correctly.

**Acceptance Scenarios**:

1. **Given** a visitor at FAQ section, **When** they view it, **Then** they see "Common questions" headline and 4 FAQ items
2. **Given** each FAQ item, **When** displayed, **Then** it shows the question as a heading and answer as paragraph text
3. **Given** FAQ items, **When** hovered, **Then** border color changes subtly to indicate interactivity
4. **Given** future enhancement, **When** implemented, **Then** FAQ items could be collapsible (not required for initial release)

---

### User Story 8 - Conversion Actions (Priority: P1)

A visitor is ready to sign up. Throughout the page, they encounter multiple CTAs: hero email form, stats section "Learn more", AI section "Learn more about ASSEMBLE AI", CTA banner ("Start for free", "See pricing"), and final CTA "Start my free trial". All buttons have consistent styling and arrow indicators.

**Why this priority**: Multiple, well-placed CTAs capture visitors at different stages of decision-making. This directly impacts conversion rate.

**Independent Test**: Can be tested by clicking each CTA button and verifying correct navigation/action.

**Acceptance Scenarios**:

1. **Given** a visitor clicking "Get started free" in hero, **When** they have entered an email, **Then** they proceed to registration with email pre-filled
2. **Given** a visitor clicking "Sign up free" in nav, **When** clicked, **Then** they are taken to the registration page
3. **Given** a visitor clicking "Book a demo" in nav, **When** clicked, **Then** they are taken to a demo booking flow (or Calendly link)
4. **Given** CTA buttons throughout the page, **When** hovered, **Then** the arrow icon translates right slightly
5. **Given** the CTA banner section, **When** viewed, **Then** it displays with light green background, floating cursor tags (CEO, CPO), and two buttons

---

### Edge Cases

- What happens when JavaScript is disabled?
  - Core content remains visible; animations and scroll effects degrade gracefully
- What happens when a user submits an empty email in the hero form?
  - Form validation prevents submission; inline error message displayed
- What happens when the page is viewed on very large screens (4K+)?
  - Max-width container (1280px) keeps content readable; background patterns extend
- What happens when a user has reduced motion preferences?
  - Scroll animations should respect `prefers-reduced-motion` media query
- What happens when images fail to load?
  - Mockup visuals use CSS shapes and don't require external images in current design

## Requirements *(mandatory)*

### Functional Requirements

#### Navigation
- **FR-001**: System MUST display a fixed navigation bar at the top of the page
- **FR-002**: System MUST show the ASSEMBLE.AI logo with 4-bar color icon (green, yellow, red, teal)
- **FR-003**: System MUST display nav links: Features, How It Works, Customers, FAQ
- **FR-004**: System MUST display CTA buttons: "Book a demo" (ghost style), "Sign up free" (black style with arrow)
- **FR-005**: System MUST add `.scrolled` class to nav when page scrolls beyond 50px, changing background to semi-transparent black with backdrop blur
- **FR-006**: System MUST implement smooth scrolling when nav links are clicked
- **FR-007**: System MUST hide nav links on mobile viewports (below 768px)

#### Hero Section
- **FR-008**: System MUST display hero section with dark background (#000) and dot-grid pattern overlay
- **FR-009**: System MUST display the serif headline "Build faster. Save time. Stand out." with gray/white color split
- **FR-010**: System MUST display subtitle text explaining the platform value proposition
- **FR-011**: System MUST display an email input field with "Enter your email" placeholder
- **FR-012**: System MUST display "Get started free" primary green button with arrow
- **FR-013**: System MUST display terms agreement text with links to Terms and Privacy Policy
- **FR-014**: System MUST display hero mockup visual on desktop (hidden on tablet/mobile below 1024px)
- **FR-015**: System MUST display team selector widget overlay on hero mockup with 4 team options (Architecture, Construction, Engineering, Project Mgmt)
- **FR-016**: Hero layout MUST be two-column grid on desktop, single column centered on mobile

#### Logo Bar
- **FR-017**: System MUST display logo bar section with white background
- **FR-018**: System MUST display "Trusted by 200+ architecture and construction firms worldwide" text
- **FR-019**: System MUST display placeholder company logos (SKYLINE, BUILDCO, STRUCTURA, ARCHIGROUP, CONSTRUCT+)

#### Stats Section
- **FR-020**: System MUST display stats section with dot-grid background pattern
- **FR-021**: System MUST display section label "We don't just talk about results, we show them"
- **FR-022**: System MUST display serif headline "Seeing is how ASSEMBLE.AI gets you to faster outcomes" with highlighted span
- **FR-023**: System MUST display 3 stat cards: "80%" (bid review reduction), "10+" (hours saved), "200+" (AEC firms)
- **FR-024**: System MUST display "Learn more" CTA button in stats header

#### AI Section
- **FR-025**: System MUST display AI section with gray background and dot-grid pattern
- **FR-026**: System MUST display "AI by your side" label
- **FR-027**: System MUST display serif headline "AI-powered workflows that move teams forward"
- **FR-028**: System MUST display description text and "Learn more about ASSEMBLE AI" CTA button
- **FR-029**: System MUST display AI toolbar mockup with icon buttons

#### Problem Section
- **FR-030**: System MUST display problem section with black background and dot-grid pattern
- **FR-031**: System MUST display two-column layout: text on left, problem cards on right
- **FR-032**: System MUST display serif headline "Running big projects is hard."
- **FR-033**: System MUST display 4 problem cards with icons and descriptions
- **FR-034**: Problem cards MUST have hover effect (translateX and border color change)

#### Solution Section
- **FR-035**: System MUST display solution section with white background and fine dot-grid
- **FR-036**: System MUST display "The Solution" label
- **FR-037**: System MUST display serif headline "One platform for your entire project"
- **FR-038**: System MUST display solution description paragraph

#### Features Section
- **FR-039**: System MUST display features section with gray background and dot-grid pattern
- **FR-040**: System MUST display "Features" label and serif headline "Everything you need to deliver projects on time"
- **FR-041**: System MUST display 7 feature rows with alternating left/right layouts
- **FR-042**: Each feature row MUST contain: icon, serif title, description, benefit tag, and visual mockup
- **FR-043**: Feature visuals MUST be CSS-based mockups (no external images required)
- **FR-044**: Feature rows MUST animate in when entering viewport
- **FR-045**: Features to display: Project Dashboard, Document Control, AI-Powered Bid Analysis, Cost Planning, Contractor & Consultant Hub, One-Click Reports, Smart Knowledge Base

#### Benefits Section
- **FR-046**: System MUST display benefits section with white background
- **FR-047**: System MUST display serif headline "Why teams switch to ASSEMBLE.AI"
- **FR-048**: System MUST display 5 benefit cards in responsive grid
- **FR-049**: Each benefit card MUST have green checkmark icon and benefit text
- **FR-050**: Benefits to display: Save 10+ hours/week, Fewer costly mistakes, Happier clients, One source of truth, Enterprise security

#### Testimonials Section
- **FR-051**: System MUST display testimonials section with gray background and dot-grid
- **FR-052**: System MUST display "What our customers say" label and "Trusted by AEC professionals" headline
- **FR-053**: System MUST display 3 testimonial cards in responsive grid
- **FR-054**: Each testimonial card MUST have: large quotation mark, italic quote text, avatar with initials, name, and title
- **FR-055**: Testimonial cards MUST animate in when entering viewport

#### How It Works Section
- **FR-056**: System MUST display how it works section with white background
- **FR-057**: System MUST display "How it works" label and "Get started in 3 simple steps" headline
- **FR-058**: System MUST display 3 step cards in horizontal layout on desktop
- **FR-059**: System MUST display connecting gradient line between step circles on desktop
- **FR-060**: Each step card MUST have: numbered circle, serif title, and description
- **FR-061**: Steps: 1) Sign up and add your project, 2) Upload your documents, 3) Run your project smarter

#### CTA Banner Section
- **FR-062**: System MUST display CTA banner with light green background (#B4F5C8) and green dot-grid
- **FR-063**: System MUST display serif headline "Designed for businesses of all sizes"
- **FR-064**: System MUST display subtitle "Expand with reassurance: no credit card, cancel anytime, instant setup."
- **FR-065**: System MUST display two CTA buttons: "Start for free" (light green) and "See pricing" (black)
- **FR-066**: System MUST display floating cursor tags (CEO, CPO) on desktop; hidden on mobile

#### FAQ Section
- **FR-067**: System MUST display FAQ section with gray background and fine dot-grid
- **FR-068**: System MUST display serif headline "Common questions"
- **FR-069**: System MUST display 4 FAQ items in centered layout (max-width 800px)
- **FR-070**: Each FAQ item MUST have: question heading and answer paragraph
- **FR-071**: FAQ questions: Setup time, Data security, Free trial, Support availability
- **FR-072**: FAQ items MUST have hover effect (border color change)

#### Final CTA Section
- **FR-073**: System MUST display final CTA section with black background and dot-grid
- **FR-074**: System MUST display serif headline "Ready to build smarter?" with gray/green color split
- **FR-075**: System MUST display subtitle "Join hundreds of AEC firms who deliver projects faster with ASSEMBLE.AI."
- **FR-076**: System MUST display "Start my free trial" primary green CTA button
- **FR-077**: System MUST display note text "No credit card required. Set up in minutes"

#### Footer
- **FR-078**: System MUST display footer with black background and top border
- **FR-079**: System MUST display ASSEMBLE.AI logo centered
- **FR-080**: System MUST display copyright text "2025 ASSEMBLE.AI - Built for the teams who build our world."

#### Styling & Design System
- **FR-081**: System MUST use DM Sans as primary font family
- **FR-082**: System MUST use Instrument Serif for headings with `.serif` class
- **FR-083**: System MUST implement CSS custom properties for colors matching design spec
- **FR-084**: System MUST implement responsive breakpoints: 1024px (tablet), 768px (mobile)
- **FR-085**: System MUST implement button styles: primary-green, light-green, black, ghost
- **FR-086**: System MUST implement dot-grid and plus-grid background patterns via CSS

#### Animations & Interactions
- **FR-087**: System MUST implement scroll-triggered fade-in animations for feature rows, benefit cards, testimonial cards, step cards, stats, and FAQ items
- **FR-088**: System MUST implement button arrow hover effect (translateX 2px)
- **FR-089**: System MUST implement team selector click interaction in hero mockup
- **FR-090**: System MUST implement Intersection Observer for scroll animations
- **FR-091**: System MUST respect `prefers-reduced-motion` media query

### Key Entities

- **Landing Page Component**: Main page component containing all sections
  - Contains multiple section components
  - Manages scroll state for navigation
  - Handles email form submission

- **Section Components**: Individual sections (Hero, Stats, Features, etc.)
  - Self-contained styling and layout
  - Consistent container widths and padding
  - Responsive behavior per breakpoint

- **Interactive Elements**: Buttons, forms, cards with interactions
  - Button variants with consistent styling
  - Form inputs with validation
  - Cards with hover effects

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Landing page loads completely in under 2 seconds on standard broadband (Lighthouse Performance score > 90)
- **SC-002**: Page achieves Lighthouse Accessibility score of 90+
- **SC-003**: All interactive elements (buttons, links, form inputs) are keyboard accessible
- **SC-004**: Page renders correctly on viewports from 320px to 2560px width
- **SC-005**: Email signup form submits successfully and redirects to registration
- **SC-006**: All scroll-to-section navigation links work correctly
- **SC-007**: Page content is readable without JavaScript (progressive enhancement)
- **SC-008**: All text content passes WCAG 2.1 AA color contrast requirements
- **SC-009**: Page achieves Lighthouse SEO score of 90+
- **SC-010**: All 15 sections render correctly with proper styling and spacing

## Design System Reference

**IMPORTANT**: This section contains the exact design tokens and values from the HTML reference file (`Landing Page Design/ASSEMBLE-AI-Landing-Page-v2.html`). Implementation MUST match these values precisely.

### Color Palette

| Token | Hex Value | Usage |
|-------|-----------|-------|
| `--primary` | `#00C27A` | Primary green, CTA buttons, stat numbers, checkmarks |
| `--primary-light` | `#B4F5C8` | CTA banner background, feature icons, benefit tags |
| `--primary-lighter` | `#E8FDF0` | Team option active state, subtle green backgrounds |
| `--primary-dark` | `#00A366` | Button hover states, arrow backgrounds |
| `--black` | `#000000` | Hero background, problem section, final CTA |
| `--white` | `#FFFFFF` | Text on dark, card backgrounds |
| `--gray-50` | `#FAFAFA` | AI section background, features background |
| `--gray-100` | `#F5F5F5` | Card borders, mockup backgrounds |
| `--gray-200` | `#E5E5E5` | Dividers, inactive borders |
| `--gray-300` | `#D4D4D4` | Dot-grid fine pattern, placeholder logos |
| `--gray-400` | `#A3A3A3` | Nav links, label text, dot-grid pattern |
| `--gray-500` | `#737373` | Hero headline gray text, descriptions |
| `--gray-600` | `#525252` | Body text, testimonial quotes |
| `--gray-700` | `#404040` | Dark dot-grid, ghost button border |
| `--gray-800` | `#262626` | Body text color, dark backgrounds |
| `--gray-900` | `#171717` | Mockup backgrounds, footer border |

### Logo Icon Colors

| Bar | Color | Hex |
|-----|-------|-----|
| 1st | Green | `#00C27A` |
| 2nd | Yellow | `#FFD93D` |
| 3rd | Red/Coral | `#FF6B6B` |
| 4th | Teal | `#4ECDC4` |

### Typography

| Element | Font Family | Weight | Size | Line Height |
|---------|-------------|--------|------|-------------|
| Body | DM Sans | 400 | 16px | 1.6 |
| Serif headings | Instrument Serif | 400 | varies | 1.05-1.1 |
| Nav links | DM Sans | 500 | 15px | - |
| Buttons | DM Sans | 600 | 14px (default), 15px (large) | - |
| Labels | DM Sans | 500 | 12px | - |
| Logo | DM Sans | 700 | 22px | - |

#### Heading Sizes (clamp values)

| Element | Size |
|---------|------|
| Hero h1 | `clamp(48px, 5.5vw, 72px)` |
| Section h2 | `clamp(36px, 4vw, 52px)` |
| AI/Solution h2 | `clamp(36px, 4.5vw, 56px)` |
| Final CTA h2 | `clamp(44px, 5.5vw, 72px)` |
| Feature h3 | 28px |
| Step h3 | 22px |
| FAQ h3 | 17px |

### Spacing & Layout

| Property | Value |
|----------|-------|
| Container max-width | 1280px |
| Container padding | 0 32px |
| Section padding | 100px-140px vertical |
| Nav padding | 16px 0 |
| Card border-radius | 12px-20px |
| Button border-radius | 8px (default), 100px (pill) |

### Border Radius Tokens

| Token | Value |
|-------|-------|
| `--radius` | 8px |
| `--radius-lg` | 16px |
| `--radius-full` | 100px |

### Background Patterns

#### Dot Grid (Standard)
```css
background-image: radial-gradient(circle, var(--gray-400) 1px, transparent 1px);
background-size: 24px 24px;
```

#### Dot Grid (Dark)
```css
background-image: radial-gradient(circle, var(--gray-700) 1px, transparent 1px);
background-size: 24px 24px;
```

#### Dot Grid (Fine)
```css
background-image: radial-gradient(circle, var(--gray-300) 1px, transparent 1px);
background-size: 16px 16px;
```

#### Dot Grid (Green - for CTA banner)
```css
background-image: radial-gradient(circle, rgba(0, 194, 122, 0.3) 1px, transparent 1px);
background-size: 20px 20px;
```

#### Hero Grid
```css
background-image: radial-gradient(circle, var(--gray-800) 1px, transparent 1px);
background-size: 32px 32px;
opacity: 0.5;
/* With gradient fade at bottom */
```

### Button Variants

#### Primary Green (`.btn-primary-green`)
- Background: `--primary` (#00C27A)
- Text: `--black`
- Arrow background: `--primary-dark`
- Hover: background `--primary-dark`

#### Light Green (`.btn-light-green`)
- Background: `--primary-light` (#B4F5C8)
- Text: `--black`
- Arrow background: `--black`
- Hover: `#9EEAB5`

#### Black (`.btn-black`)
- Background: `--black`
- Text: `--white`
- Arrow background: `--gray-800`
- Hover: `--gray-800`

#### Ghost (`.btn-ghost`)
- Background: transparent
- Text: `--white`
- Border: 1px solid `--gray-700`
- Hover: border `--gray-500`, background `--gray-900`

### Animation Specifications

#### Scroll Reveal Animation
```css
/* Initial state */
opacity: 0;
transform: translateY(30px);
transition: opacity 0.6s ease, transform 0.6s ease;

/* Revealed state */
opacity: 1;
transform: translateY(0);
```

#### Button Arrow Hover
```css
.btn:hover .btn-arrow {
  transform: translateX(2px);
}
```

#### Nav Scroll Effect
- Trigger: 50px scroll
- Background: `rgba(0, 0, 0, 0.95)`
- Backdrop filter: `blur(20px)`
- Transition: `all 0.3s ease`

#### Problem Card Hover
```css
.problem-card:hover {
  border-color: var(--gray-700);
  transform: translateX(4px);
}
```

### Responsive Breakpoints

| Breakpoint | Changes |
|------------|---------|
| 1024px | Hero: single column, mockup hidden; Problem: single column; Feature rows: single column; Stats: single column |
| 768px | Nav links hidden; Hero form: column layout; Testimonials: single column; CTA buttons: column; Cursor tags hidden |

### Section-Specific Measurements

#### Hero
- Content grid: `1fr 1fr` with 60px gap
- Padding: 120px top, 80px bottom
- Headline letter-spacing: -2px
- Subtitle: 17px, max-width 480px
- Input: 14px padding, max-width 280px

#### Stats
- Grid: 3 columns, 40px gap
- Card padding: 40px
- Stat number size: `clamp(56px, 7vw, 80px)`

#### Features
- Row padding: 60px
- Row gap: 60px between columns
- Feature icon: 60px square, 14px border-radius
- Benefit tag: 10px 16px padding, pill shape

#### Testimonials
- Card padding: 40px
- Quote mark: 72px, Instrument Serif
- Avatar: 52px, gradient background
- Grid: min 360px columns

#### How It Works
- Step number: 72px circle
- Connecting line: gradient from `--primary-light` to `--primary` to `--primary-light`
- Line position: top 50px, spanning middle 66%

#### CTA Banner
- Padding: 100px vertical
- Cursor tags: absolute positioned, 20px border-radius

### Exact Content Reference

#### Hero Subtitle
"You're busier than ever. ASSEMBLE.AI is the AI platform that turns project chaos into an ongoing way of working, connecting strategy to execution and driving results in one shared workspace."

#### Stats
1. **80%** - "Reduction in bid review time"
2. **10+** - "Hours saved per week on documents"
3. **200+** - "AEC firms trust ASSEMBLE.AI"

#### Problem Cards
1. Lost documents and version confusion
2. Hours wasted on manual bid reviews
3. Budget overruns from missed details
4. Frustrated teams and unhappy clients

#### Features (with icons and benefits)
1. **Project Dashboard** - "Stop chasing status updates. Get answers instantly."
2. **Document Control** - "Never lose a document again."
3. **AI-Powered Bid Analysis** - "Cut bid review time by 80%."
4. **Cost Planning** - "Stay on budget. Spot problems early."
5. **Contractor & Consultant Hub** - "Hire the right people. Onboard faster."
6. **One-Click Reports** - "Create reports in seconds, not hours."
7. **Smart Knowledge Base** - "Get insights without digging through folders."

#### Benefits
1. Save 10+ hours per week on document handling and bid reviews
2. Fewer costly mistakes with AI-powered data extraction
3. Happier clients with projects that finish on time and on budget
4. One source of truth for your entire team, anywhere in the world
5. Enterprise security to keep your sensitive project data safe

#### Testimonials
1. **Sarah Chen**, Project Director, Mitchell & Associates - "We used to spend two full days reviewing tender submissions. Now our AI does the heavy lifting and we're done in a few hours. ASSEMBLE.AI paid for itself in the first month."
2. **Marcus Thompson**, Senior PM, BuildRight Construction - "Finally, one place for everything. My team stopped asking me where files are. I stopped losing sleep over missed deadlines. This tool just works."
3. **David Okonkwo**, Operations Manager, Skyline Engineering - "The cost planning feature alone is worth it. We caught a $200K budget issue before it became a problem. Our CFO is a big fan."

#### FAQ
1. **How long does setup take?** - "Most teams are up and running in less than a day. We help you import existing data and train your team at no extra cost."
2. **Is my data secure?** - "Yes. We use bank-level encryption. Your data stays private and is never shared. We meet all major security standards for enterprise software."
3. **Can I try it before I buy?** - "Absolutely. Start a 14-day free trial with full access to all features. No credit card needed."
4. **What if I need help?** - "Our support team is available by chat, email, or phone. Enterprise customers get a dedicated success manager."

## Assumptions

1. **Existing App Integration**: Landing page integrates with existing Next.js app structure in `/app` directory
2. **Authentication Context**: Existing auth context can detect authenticated users for redirect to `/dashboard`
3. **Fonts**: Google Fonts (DM Sans, Instrument Serif) are acceptable; no custom font files needed
4. **No External Images**: Current design uses CSS shapes for mockups; no image assets required initially
5. **Placeholder Logos**: Company logos in logo bar are text placeholders; real logos to be added later
6. **Testimonial Content**: Current testimonial content is placeholder; may be updated with real quotes
7. **Form Integration**: Email signup form integrates with existing registration flow
8. **Mobile Menu**: Mobile hamburger menu is out of scope for initial release; nav links simply hide
9. **FAQ Expansion**: FAQ items are static; collapsible accordion behavior is a future enhancement

## Dependencies

- **Tailwind CSS**: Existing Tailwind setup for utility classes
- **Google Fonts**: External font loading for DM Sans and Instrument Serif
- **Next.js App Router**: Existing routing infrastructure
- **Authentication System**: Existing auth for redirect logic

## Out of Scope

- Mobile hamburger menu implementation
- Collapsible FAQ accordion functionality
- Real company logo images
- Video or animated hero visuals
- A/B testing variants
- Analytics event tracking
- Contact form or demo booking integration (beyond link)
- Blog or resources section
- Multi-language support
- Cookie consent banner
