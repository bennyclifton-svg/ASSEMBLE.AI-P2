Create a subtle Polar-inspired animated vector background for the Sitewise landing page.

Do not copy Polar directly. Use the same design principles: clean, minimal, vector-based, low-contrast, product-first and restrained.

## Resolved implementation decisions

- Build this as `src/components/landing/SitewiseVectorBackground.tsx`.
- Keep the animation dependency-free: inline SVG plus CSS keyframes, not `motion/react`.
- Scope the background to the hero only, with a bottom fade before the next section.
- Keep the current hero content and `HeroAgentRoster` as foreground content.
- Keep the animation keyframes local to `SitewiseVectorBackground` rather than adding globals.
- Use exactly: dark background, faint site-plan SVG, 5 small animated nodes, 2 animated connection paths, 2 floating glass cards, and a slow 6-second idle loop.
- Make the first pass feel like barely-there premium texture; linework density, opacity, and construction motifs can be iterated after visual review.
- Respect `prefers-reduced-motion` by rendering a static, non-distracting state.

Create a reusable React component:

src/components/landing/SitewiseVectorBackground.tsx

Use:
- Next.js / React
- SVG
- CSS keyframe animations
- Tailwind classes
- no video
- no canvas
- no unnecessary dependencies

The animation should show:
- a faint construction site-plan/grid background
- thin drawing-like vector lines
- small project data nodes
- subtle connecting paths
- two or three very soft floating UI cards

Use construction-specific labels such as:
- Programme risk detected
- 14 drawings updated
- Cost variance flagged
- Site update received

The effect must be subtle and sit behind the hero content.

Requirements:
- dark premium background
- low opacity vector linework
- soft blue or amber accent
- responsive
- mobile-safe
- respects prefers-reduced-motion
- no distracting movement
- no generic AI brain graphics
- no particles unless extremely subtle

Then wire the component into the landing page hero section behind the main headline and CTA.
