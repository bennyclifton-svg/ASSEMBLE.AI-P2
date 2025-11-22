# Research & Technical Decisions: Intelligent Document Repository

**Feature**: Intelligent Document Repository
**Date**: 2025-11-22

## Technical Stack Decisions

### Framework: Next.js (App Router)
- **Decision**: Use Next.js 14+ with App Router.
- **Rationale**: 
    - **Integration**: Combines frontend and backend in a single project, ideal for "Small Firm Optimization" (Principle IV) by reducing deployment complexity.
    - **Performance**: Server Components allow efficient rendering of large document lists (SC-002).
    - **Ecosystem**: Rich ecosystem for file handling (`react-dropzone`) and UI components.
- **Alternatives Considered**: 
    - *Vite + Express*: More flexible but requires managing two separate deployment pipelines. Rejected to minimize overhead.
    - *Remix*: Strong contender, but Next.js has broader adoption and Vercel integration for easy "staging" deployments.

### Database: SQLite (Better-SQLite3 / Turso)
- **Decision**: Use SQLite for metadata storage.
- **Rationale**:
    - **Simplicity**: Zero-configuration, serverless (file-based), perfect for a self-contained "workspace" feel.
    - **Portability**: Easy to backup/move the entire project state (just a file).
    - **Performance**: Extremely fast read speeds for metadata queries (filtering by Category/Subcategory).
- **Alternatives Considered**:
    - *PostgreSQL*: Overkill for initial scale (1-5 person firms). Adds Docker dependency.
    - *JSON Files*: Too slow for filtering/sorting 500+ documents.

### Styling: Vanilla CSS (CSS Modules)
- **Decision**: Use CSS Modules with CSS Variables.
- **Rationale**:
    - **Compliance**: Strictly follows System Prompt "Vanilla CSS" rule.
    - **Maintainability**: Scoped styles prevent leakage.
    - **Theming**: CSS Variables make implementing "Dark Mode" and "Premium Aesthetics" (glassmorphism) easy.

## Domain Modeling Decisions

### Categorization Strategy
- **Decision**: Use Database Tables (`Category`, `Subcategory`) seeded with defaults.
- **Rationale**: 
    - **Flexibility**: User requirement to "create new categories on the fly" rules out strict Enums.
    - **Structure**: Seeded data ensures the "Mandatory" categories (Planning, etc.) exist out of the box.

### Transmittals (formerly Saved Sets/Contexts)
- **Decision**: Rename to "Transmittal" and link to Subcategories.
- **Rationale**:
    - **Terminology**: "Transmittal" is the correct construction domain term for issuing documents.
    - **Workflow**: Users create a "Transmittal" for a specific trade (e.g., "Carpentry Tender").
    - **Export**: Must support PDF/Excel generation for formal issuance.

### Export & Bulk Operations
- **Decision**: Use `jspdf` (PDF) and `exceljs` (Excel) for client-side generation; `jszip` for bulk download.
- **Rationale**: 
    - **Client-Side**: Avoids heavy server processing for file generation.
    - **Performance**: JSZip allows streaming multiple files into a single download.

### Accessibility (WCAG 2.1 AA)
- **Decision**: Use Radix UI primitives (or similar accessible-first libs) for complex interactive components (Dropdowns, Modals).
- **Rationale**: 
    - **Compliance**: Built-in keyboard navigation and ARIA management.
    - **Efficiency**: Saves re-inventing the wheel for focus traps and screen reader support.

### Versioning Logic
- **Decision**: Filename-based heuristic + Manual Override.
- **Rationale**: 
    - **Reality**: Users often rename files inconsistently ("v1", "_final", "-revA").
    - **Algorithm**: Regex matching for common patterns, falling back to "New Document" if unsure.
    - **Safety**: Always prompt user if "overwrite" or "version" is ambiguous.

## Open Questions / Risks
- **File Storage**: Local filesystem is fine for MVP, but what about multi-device access? 
    - *Mitigation*: Design the `StorageService` interface to be swappable for S3 later.
