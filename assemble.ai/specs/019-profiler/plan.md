# Implementation Plan: Profiler Module

**Branch**: `019-profiler` | **Date**: 2026-01-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-profiler/spec.md`
**Requirements**: 151 total requirements across 16 categories

---

## Summary

The Profiler module replaces the existing Project Initiator (018) with a restructured UI paradigm featuring:
- Left Navigation + Middle Panel layout
- Class/Type/Subclass taxonomy replacing 14-type wizard
- Multi-dimensional complexity selection
- AI-generated objectives with manual entry option
- 10x Power Features (Smart Defaults, Context Chips, Complexity Score, Risk Flags)

**Technical Approach**: Data-driven UI using JSON templates, lean component architecture (<2000 lines), zero new runtime dependencies.

---

## Technical Context

**Language/Version**: TypeScript 5.x, React 18, Next.js 14
**Primary Dependencies**: Drizzle ORM, TailwindCSS, shadcn/ui (existing stack)
**Storage**: PostgreSQL (existing), new tables: project_profiles, profiler_objectives, profile_patterns
**Testing**: Vitest, React Testing Library (existing)
**Target Platform**: Web (desktop-first, mobile-responsive at 768px)
**Project Type**: Web application (Next.js App Router)
**Performance Goals**: Page load <200ms, Profile save <500ms, AI generation <3s, Polish <5s
**Constraints**: 0 new runtime dependencies, <2000 lines new code, mobile responsive
**Scale/Scope**: 6 building classes, 5 project types, ~50 subclasses, 151 requirements

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. Intelligent Document Repository | N/A | Not document-focused feature |
| II. Domain-First Intelligence | PASS | Construction-specific: NCC/BCA classes, Rawlinsons benchmarks, AIQS standards |
| III. AI-Powered Automation | PASS | AI objectives generation, polish function, smart defaults |
| IV. Financial Visibility | PASS | Complexity affects cost benchmarks, consultant fee structures |
| V. Small Firm Optimization | PASS | <3 min workflow, no training required, progressive disclosure |
| VI. Sharp, Actionable Outputs | PASS | Project-specific objectives, not generic templates |
| VII. Integration Over Isolation | PASS | Integrates with Cost Plan, Programme, Procurement |
| VIII. Test-Driven Quality | PENDING | Tests required for all 151 requirements |
| IX. Spreadsheet-Native UX | N/A | Not data-grid focused (form-based UI) |

**Result**: PASS - Proceed to Phase 0

---

## Project Structure

### Documentation (this feature)

```text
specs/019-profiler/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── profile-api.yaml
│   └── objectives-api.yaml
├── requirements.md      # Requirements checklist (151 items)
├── spec.md              # Feature specification
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/
│   └── profiler/                    # NEW - All profiler components
│       ├── ProfilerLayout.tsx       # CMP-001: Main layout (<100 lines)
│       ├── LeftNavigation.tsx       # CMP-002: 4-section nav
│       ├── ProfileSection.tsx       # CMP-003: Class/Type + details
│       ├── ClassTypeSelector.tsx    # CMP-004: 2-column selector
│       ├── SubclassSelector.tsx     # CMP-005: Multi-select for Mixed
│       ├── ScaleInputs.tsx          # CMP-006: Dynamic fields
│       ├── ComplexitySelector.tsx   # CMP-007: Multi-dimensional
│       ├── ObjectivesSection.tsx    # CMP-008: Generate/Manual/Polish
│       ├── SimpleMarkdownEditor.tsx # CMP-009: Lightweight editor
│       ├── PowerFeatures/           # 10x features
│       │   ├── ContextChips.tsx
│       │   ├── ComplexityScore.tsx
│       │   ├── ConsultantPreview.tsx
│       │   ├── RiskFlags.tsx
│       │   └── MarketContext.tsx
│       └── index.ts                 # CMP-010: Exports
│
├── lib/
│   ├── data/
│   │   └── profile-templates.json   # TPL-001-004: All templates
│   └── db/
│       └── pg-schema.ts             # DB-001-017: Schema updates
│
└── app/
    └── api/
        └── planning/
            └── [projectId]/
                ├── profile/
                │   └── route.ts     # API-001-004
                └── objectives/
                    ├── route.ts     # API-006
                    ├── generate/
                    │   └── route.ts # API-005
                    └── polish/
                        └── route.ts # API-007
```

**Structure Decision**: Extends existing Next.js App Router structure. New `profiler/` component directory with lean architecture. Deprecates `project-wizard/` directory (DEP-001).

---

## Implementation Phases

### Phase 0: Foundation (33 Requirements)

**Goal**: Establish data layer, templates, and basic UI shell

#### 0.1 Database Schema (9 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| DB-001 | Create `projectProfiles` table | P0 |
| DB-002 | Store building_class, project_type | P0 |
| DB-003 | Store subclass as JSONB array (multi-select) | P0 |
| DB-004 | Store subclass_other as TEXT[] array | P0 |
| DB-005 | Store scale_data as JSONB | P0 |
| DB-006 | Store complexity as JSONB (multi-dimensional) | P0 |
| DB-007 | Unique constraint on project_id | P0 |
| DB-008 | Cascade delete with project | P0 |
| DB-009 | Index for AI learning queries | P1 |

#### 0.2 Objectives Storage (5 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| DB-010 | Create `profilerObjectives` table | P0 |
| DB-011 | Store objectives as JSONB with source tracking | P0 |
| DB-012 | Store profile_context snapshot | P1 |
| DB-013 | Track generated_at and polished_at timestamps | P1 |
| DB-014 | Store editHistory for AI learning | P2 |

#### 0.3 AI Learning Storage (3 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| DB-015 | Create `profilePatterns` table | P2 |
| DB-016 | Track pattern_type | P2 |
| DB-017 | Upsert on pattern match | P2 |

#### 0.4 Profile Templates (4 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| TPL-001 | Create profile-templates.json | P0 |
| TPL-002 | Define subclasses per Building Class (NCC/BCA) | P0 |
| TPL-003 | Define scaleFields per Building Class (Rawlinsons) | P0 |
| TPL-004 | Define complexityDimensions per Building Class | P0 |

#### 0.5 Objectives Templates (3 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| TPL-005 | Extend objective-templates.json | P1 |
| TPL-006 | Templates for all Class × Type combinations | P1 |
| TPL-007 | Support variable substitution | P1 |

#### 0.6 UI Layout Foundation (7 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| UI-001 | Left Navigation Panel (200-280px) | P0 |
| UI-002 | Middle Panel fills remaining width | P0 |
| UI-003 | Top Header Bar present | P0 |
| UI-004 | Responsive breakpoint at 768px | P1 |
| NAV-001 | Display 4 sections | P0 |
| NAV-002 | Clicking section displays content | P0 |
| NAV-003 | Visual completion indicator | P1 |

#### 0.7 Code Philosophy (2 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| CODE-001 | Each component does ONE thing well | P0 |
| CODE-002 | Data-driven UI | P0 |

**Phase 0 Deliverables**:
- [ ] Database migrations for 3 new tables
- [ ] profile-templates.json with all classes/subclasses/scale/complexity
- [ ] ProfilerLayout.tsx shell with left nav + middle panel
- [ ] LeftNavigation.tsx with 4 sections

---

### Phase 1: Profile Section (49 Requirements)

**Goal**: Complete Profile selection workflow (Class/Type/Subclass/Scale/Complexity)

#### 1.1 Class/Type Selection (6 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| PROF-001 | Display 6 Building Classes | P0 |
| PROF-002 | Display 5 Project Types | P0 |
| PROF-003 | Require both Class AND Type | P0 |
| PROF-004 | Selection triggers Middle Panel update | P0 |
| NAV-004 | Non-linear navigation | P0 |
| NAV-005 | Stakeholders disabled (Phase 2) | P0 |

#### 1.2 Subclass Selection (6 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| SUB-001 | Subclass options depend on Building Class | P0 |
| SUB-002 | Always include "Other" option | P0 |
| SUB-003 | "Other" enables free-text input | P0 |
| SUB-004 | Single selection; MULTIPLE for Mixed | P0 |
| SUB-005 | Options load from configuration | P0 |
| SUB-006 | "Other" selections stored for AI learning | P2 |

#### 1.3 Scale Inputs (5 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| SCALE-001 | Scale fields depend on Class + Subclass | P0 |
| SCALE-002 | At least one scale metric required | P0 |
| SCALE-003 | Numeric validation | P0 |
| SCALE-004 | Placeholders show Rawlinsons ranges | P1 |
| SCALE-005 | Fields adapt dynamically | P0 |

#### 1.4 Complexity Selection - Core (5 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| CMPLX-001 | Complexity is multi-dimensional | P0 |
| CMPLX-002 | Multiple dimensions can be selected | P0 |
| CMPLX-003 | Selection affects cost multipliers | P1 |
| CMPLX-004 | Feeds into risk assessment | P2 |
| CMPLX-005 | "Other" inputs stored for AI learning | P2 |

#### 1.5 Complexity Selection - By Class (10 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| CMPLX-006 | Commercial Office: 5 dimensions | P0 |
| CMPLX-007 | Commercial Retail: 5 dimensions | P0 |
| CMPLX-008 | Commercial Hotel: 5 dimensions | P0 |
| CMPLX-009 | Industrial Warehouse: 5 dimensions | P0 |
| CMPLX-010 | Industrial Data Centre: 5 dimensions | P0 |
| CMPLX-011 | Industrial Manufacturing: 5 dimensions | P0 |
| CMPLX-012 | Institution Education: 5 dimensions | P0 |
| CMPLX-013 | Institution Healthcare: 6 dimensions | P0 |
| CMPLX-014 | Mixed Use: 5 dimensions | P0 |
| CMPLX-015 | Infrastructure: 6 dimensions | P0 |

#### 1.6 Seniors Living (13 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| SENIORS-001 | Retirement Living / ILUs subclass | P0 |
| SENIORS-002 | Residential Aged Care (Class 9c) | P0 |
| SENIORS-003 | ILU scale fields (5 fields) | P0 |
| SENIORS-004 | Class 9c scale fields (6 fields) | P0 |
| SENIORS-005 | ILU complexity dimensions (5 dims) | P0 |
| SENIORS-006 | Class 9c complexity dimensions (6 dims) | P0 |
| SENIORS-007 | ILU unit config maps to NCC class | P1 |
| SENIORS-008 | Class 9c care level options | P0 |
| SENIORS-009 | Class 9c accommodation model options | P0 |
| SENIORS-010 | Dementia design options | P0 |
| SENIORS-011 | Scale placeholders (Rawlinsons/AIQS) | P1 |
| SENIORS-012 | Complexity cost multipliers | P1 |
| SENIORS-013 | Integrated developments (Mixed multi-select) | P1 |

#### 1.7 Middle Panel Tabs (3 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| TAB-001 | Display Procurement, Cost Planning, Programme tabs | P0 |
| TAB-002 | Tabs dimmed during profiler workflow | P0 |
| TAB-003 | Tabs active after completion | P1 |

#### 1.8 Code Philosophy (1 requirement)
| ID | Requirement | Priority |
|----|-------------|----------|
| CODE-003 | No prop drilling beyond 2 levels | P0 |

**Phase 1 Deliverables**:
- [ ] ClassTypeSelector.tsx - 2-column selector
- [ ] SubclassSelector.tsx - with multi-select for Mixed
- [ ] ScaleInputs.tsx - dynamic fields from templates
- [ ] ComplexitySelector.tsx - multi-dimensional selection
- [ ] All scale/complexity templates for 6 classes
- [ ] Profile save API endpoint

---

### Phase 2: Objectives Section (20 Requirements)

**Goal**: Implement objectives with Generate/Manual/Polish modes

#### 2.1 Display & Entry Mode (6 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| OBJ-001 | Display two categories | P0 |
| OBJ-002 | [Generate] button for AI | P0 |
| OBJ-003 | [Manual] button for direct entry | P0 |
| OBJ-004 | Simple markdown text editor | P0 |
| OBJ-005 | [Polish] visible only with content | P0 |
| OBJ-006 | User edits with diff highlighting | P1 |

#### 2.2 Manual Entry Mode (3 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| MANUAL-001 | Lightweight text editor | P0 |
| MANUAL-002 | Markdown support | P0 |
| MANUAL-003 | Text saved as source: 'manual' | P0 |

#### 2.3 AI Generation Mode (4 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| GEN-001 | Triggered via [Generate] button | P0 |
| GEN-002 | Use template substitution | P0 |
| GEN-003 | Generation completes <3 seconds | P1 |
| GEN-004 | Text saved as source: 'ai_generated' | P0 |

#### 2.4 Editing & Polish (7 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| EDIT-001 | Both can be edited inline | P0 |
| EDIT-002 | Original text preserved | P1 |
| POLISH-001 | Send Profile context + text + history | P0 |
| POLISH-002 | AI refines objectives | P0 |
| POLISH-003 | Marked as source: 'ai_polished' | P0 |
| POLISH-004 | Polish completes <5 seconds | P1 |
| CODE-007 | Progressive enhancement | P0 |

**Phase 2 Deliverables**:
- [ ] ObjectivesSection.tsx - main container
- [ ] SimpleMarkdownEditor.tsx - lightweight (<50 lines)
- [ ] Generate objectives API endpoint
- [ ] Polish objectives API endpoint
- [ ] Save objectives API endpoint

---

### Phase 3: 10x Power Features (19 Requirements)

**Goal**: Implement smart defaults, context chips, complexity score, risk flags

#### 3.1 Smart Defaults (3 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| POWER-001 | Auto-populate scale placeholders | P1 |
| POWER-002 | Suggest complexity tier from scale | P1 |
| POWER-003 | Auto-suggest consultant disciplines | P2 |

#### 3.2 Plausibility Alerts (3 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| POWER-004 | Non-blocking warnings | P1 |
| POWER-005 | Hotel rooms vs star rating | P1 |
| POWER-006 | Aged care beds vs viability | P1 |

#### 3.3 Context Chips (2 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| POWER-007 | Display NCC class, cost range, timeframe | P1 |
| POWER-008 | Render within 100ms | P1 |

#### 3.4 Complexity Score (3 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| POWER-009 | Real-time score (1-10) | P1 |
| POWER-010 | Show contributing factors | P1 |
| POWER-011 | Suggest contingency range | P2 |

#### 3.5 Market Context & Consultant Preview (3 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| POWER-012 | Show benchmark cost ranges | P2 |
| POWER-013 | Show typical GFA and programme | P2 |
| POWER-014 | Consultant Preview based on profile | P2 |

#### 3.6 Risk Flags (2 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| POWER-015 | Auto-surface high-impact risks | P1 |
| POWER-016 | BAL-FZ + Class 9c warning | P1 |

#### 3.7 UX Principles (3 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| POWER-017 | Progressive disclosure | P0 |
| POWER-018 | Tooltips explain industry terms | P1 |
| POWER-019 | Keyboard navigation | P1 |

**Phase 3 Deliverables**:
- [ ] ContextChips.tsx - instant insights
- [ ] ComplexityScore.tsx - real-time calculation
- [ ] RiskFlags.tsx - auto-generated warnings
- [ ] ConsultantPreview.tsx - discipline suggestions
- [ ] MarketContext.tsx - benchmark display
- [ ] Smart defaults logic integrated into selectors

---

### Phase 4: AI Learning (4 Requirements)

**Goal**: Implement aggregate learning from user inputs

| ID | Requirement | Priority |
|----|-------------|----------|
| LEARN-001 | "Other" subclass entries collected | P2 |
| LEARN-002 | Manual objectives analyzed | P3 |
| LEARN-003 | Polish edits inform templates | P3 |
| LEARN-004 | Learning is aggregate/anonymous | P2 |

**Phase 4 Deliverables**:
- [ ] Pattern collection API
- [ ] Background job for pattern analysis
- [ ] Admin dashboard for pattern review (optional)

---

### Phase 5: API & Integration (12 Requirements)

**Goal**: Complete API layer and system integration

#### 5.1 Profile API (4 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| API-001 | POST /api/planning/{projectId}/profile | P0 |
| API-002 | Profile save <500ms | P1 |
| API-003 | Validate required fields | P0 |
| API-004 | Return profileId on success | P0 |

#### 5.2 Objectives API (3 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| API-005 | POST .../objectives/generate | P0 |
| API-006 | PATCH .../objectives | P0 |
| API-007 | POST .../objectives/polish | P1 |

#### 5.3 Integration (5 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| INT-001 | Complexity affects cost benchmarks | P1 |
| INT-002 | Class/type affects programme templates | P1 |
| INT-003 | Profile determines consultant disciplines | P1 |
| INT-004 | Profile data in reports | P2 |
| INT-005 | Backward compatibility with legacy | P1 |

**Phase 5 Deliverables**:
- [ ] All 7 API routes implemented
- [ ] Integration hooks for Cost Plan
- [ ] Integration hooks for Programme
- [ ] Legacy projectType fallback

---

### Phase 6: Components & Polish (14 Requirements)

**Goal**: Finalize components and code quality

#### 6.1 Components (10 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| CMP-001 | ProfilerLayout.tsx (<100 lines) | P0 |
| CMP-002 | LeftNavigation.tsx | P0 |
| CMP-003 | ProfileSection.tsx | P0 |
| CMP-004 | ClassTypeSelector.tsx | P0 |
| CMP-005 | SubclassSelector.tsx | P0 |
| CMP-006 | ScaleInputs.tsx | P0 |
| CMP-007 | ComplexitySelector.tsx | P0 |
| CMP-008 | ObjectivesSection.tsx | P0 |
| CMP-009 | SimpleMarkdownEditor.tsx | P0 |
| CMP-010 | index.ts | P0 |

#### 6.2 Code Philosophy (4 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| CODE-004 | No separate files for single-use types | P0 |
| CODE-005 | Total new code <2000 lines | P0 |
| CODE-006 | 0 new runtime dependencies | P0 |
| DEP-001 | Deprecate project-wizard/ | P1 |

#### 6.3 Performance (4 requirements)
| ID | Requirement | Priority |
|----|-------------|----------|
| PERF-001 | Page load <200ms | P1 |
| PERF-002 | Profile save <500ms | P1 |
| PERF-003 | Objectives generation <3s | P1 |
| PERF-004 | Polish operation <5s | P1 |

**Phase 6 Deliverables**:
- [ ] All 10 components under 2000 lines total
- [ ] Performance tests passing
- [ ] project-wizard/ marked deprecated

---

## Priority Summary

| Priority | Count | Description |
|----------|-------|-------------|
| P0 | 89 | Must-have for MVP |
| P1 | 42 | Important for quality release |
| P2 | 16 | Nice-to-have, can defer |
| P3 | 4 | Future enhancement |
| **Total** | **151** | |

---

## Complexity Tracking

No Constitution violations requiring justification. All principles aligned.

---

## Timeline Recommendation

| Phase | Dependencies | Requirements |
|-------|--------------|--------------|
| Phase 0: Foundation | None | 33 |
| Phase 1: Profile Section | Phase 0 | 49 |
| Phase 2: Objectives | Phase 0, 1 | 20 |
| Phase 3: Power Features | Phase 1 | 19 |
| Phase 4: AI Learning | Phase 2 | 4 |
| Phase 5: API & Integration | Phase 1, 2 | 12 |
| Phase 6: Polish | All above | 14 |

**Critical Path**: Phase 0 → Phase 1 → Phase 2 → Phase 5

**Parallel Work Possible**:
- Phase 3 (Power Features) can start after Phase 1
- Phase 4 (AI Learning) can be deferred to post-MVP

---

## Open Questions Resolved

| ID | Question | Resolution |
|----|----------|------------|
| Q-001 | Include approval pathway in complexity? | Yes - in Residential complexity |
| Q-002 | Profile auto-populate consultants? | Yes - via Consultant Preview (§3.3.6) |
| Q-003 | Migrate existing 018 projects? | No - all existing are test projects |
| Q-004 | Min/max bounds for scale? | Documented in Scale tables |
| Q-005 | Complexity to cost multipliers? | Documented in Complexity tables |
