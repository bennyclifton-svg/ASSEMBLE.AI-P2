# Research: Resizable Three-Column Layout

**Feature**: Resizable Three-Column Layout
**Date**: 2025-11-22

## Decisions

### 1. Resizing Implementation
- **Decision**: Use `react-resizable-panels` library.
- **Rationale**: It is a lightweight (<10kb), accessible, and robust library specifically designed for resizable panel layouts in React. It handles edge cases (min/max width, keyboard support) better than a custom implementation.
- **Alternatives considered**:
  - *Custom Mouse Events*: High effort to get right (performance, edge cases, accessibility).
  - *CSS Resize*: Limited control and styling options.
  - *dnd-kit*: Designed for drag-and-drop sorting, not resizing panes.

### 2. Persistence Strategy
- **Decision**: React State (in-memory).
- **Rationale**: User explicitly requested "Session Only" persistence which resets on reload. React state is the simplest and most performant way to achieve this.
- **Alternatives considered**:
  - *sessionStorage*: Survives page reload (in same tab), which contradicts the requirement "Resets to defaults upon page reload".
  - *localStorage*: Persists across sessions (rejected by user).

### 3. Project Switcher
- **Decision**: Radix UI `Select` or `DropdownMenu` (via shadcn/ui if available, or raw Radix).
- **Rationale**: `package.json` shows `@radix-ui/react-checkbox` etc., suggesting a headless UI approach (likely shadcn/ui pattern). We should reuse this pattern.
- **Alternatives considered**:
  - *HTML `<select>`*: Limited styling.
  - *Custom Divs*: Accessibility nightmare.

## Dependencies

- `react-resizable-panels` (New dependency)
- `lucide-react` (Existing - for icons)
- `clsx`, `tailwind-merge` (Existing - for styling)
