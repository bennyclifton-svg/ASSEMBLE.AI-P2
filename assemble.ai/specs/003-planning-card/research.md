# Research: Planning Card

## Phase 0: Technical Decisions

### Decision 1: Inline Editing Implementation

**Options Considered**:
1. **react-hook-form** - Popular form library with built-in validation
2. **formik** - Alternative form library
3. Custom implementation with React state

**Decision**: Use **react-hook-form** with **zod** for validation

**Rationale**:
- Already familiar pattern in Next.js ecosystem
- Built-in support for field-level validation
- Excellent performance with uncontrolled components
- Zod integration provides type-safe validation schemas
- Supports optimistic updates pattern

---

### Decision 2: AI Integration

**Options Considered**:
1. **Vercel AI SDK** - Official Next.js AI integration
2. **LangChain** - Comprehensive AI framework
3. Direct OpenAI API calls

**Decision**: Use **Vercel AI SDK**

**Rationale**:
- Native Next.js integration
- Streaming support for better UX
- Built-in error handling and retry logic
- Type-safe with TypeScript
- Simpler than LangChain for our use case

---

### Decision 3: GIS API Integration

**Options Considered**:
1. **Google Maps Geocoding API** - Comprehensive but paid
2. **OpenStreetMap Nominatim** - Free but rate-limited
3. **Mapbox Geocoding API** - Good balance of features and cost

**Decision**: Use **Mapbox Geocoding API** with fallback to manual entry

**Rationale**:
- Generous free tier (100,000 requests/month)
- Good coverage for Australian addresses
- Returns zoning and jurisdiction data
- Reliable performance
- Easy to implement fallback for failures

---

### Decision 4: PDF Generation

**Options Considered**:
1. **jsPDF** (existing) - Client-side PDF generation
2. **Puppeteer** - Server-side HTML-to-PDF
3. **react-pdf** - React components to PDF

**Decision**: Use existing **jsPDF** library

**Rationale**:
- Already in dependencies
- Client-side generation (no server load)
- Good control over formatting
- Supports custom fonts and branding
- Can include revision history programmatically

---

### Decision 5: Interactive Timeline

**Options Considered**:
1. **@dnd-kit/core** (existing) - Drag-and-drop library
2. **react-beautiful-dnd** - Alternative DnD library
3. Custom canvas-based implementation

**Decision**: Use existing **@dnd-kit/core** with custom grid component

**Rationale**:
- Already in dependencies (used for document drag-drop)
- Excellent accessibility support
- Performant with 60fps interactions
- Flexible enough for grid-based timeline
- Well-maintained and documented

---

### Decision 6: Database Schema Design

**Approach**: Normalized schema with separate tables for each entity

**Rationale**:
- Supports efficient querying of consultant/contractor lists
- Enables revision history tracking per field
- Allows for future expansion (e.g., custom fields)
- Maintains referential integrity
- Optimizes for read-heavy workload (planning data is read more than written)

---

### Decision 7: Optimistic Updates Strategy

**Approach**: Optimistic UI updates with background sync and conflict resolution

**Implementation**:
- Update UI immediately on user input
- Queue save operation in background
- Show loading indicator during save
- Revert on error with user notification
- Handle concurrent edits with last-write-wins + notification

**Rationale**:
- Provides instant feedback (feels faster)
- Reduces perceived latency
- Aligns with modern web app expectations
- Graceful degradation on network issues
