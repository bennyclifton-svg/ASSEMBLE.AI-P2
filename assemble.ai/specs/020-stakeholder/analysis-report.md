# Specification Analysis Report: Unified Stakeholder System

**Analyzed**: 2026-01-21
**Spec Version**: Draft
**Analyzer**: speckit.analyze

---

## Executive Summary

The Stakeholder Module specification is **READY FOR PLANNING** with no critical issues. The spec demonstrates strong alignment with constitution principles, clear integration points with the Profiler module, and well-bounded scope. Minor improvements are recommended for enhanced clarity.

| Metric | Value |
|--------|-------|
| Total Requirements | 13 |
| Total User Stories | 5 |
| Total Acceptance Scenarios | 12 |
| Coverage % (requirements mapped to scenarios) | 100% |
| Ambiguity Count | 0 |
| Duplication Count | 0 |
| Critical Issues | 0 |
| High Issues | 0 |
| Medium Issues | 2 |
| Low Issues | 3 |

---

## Specification Analysis Table

| ID | Category | Severity | Location(s) | Summary | Recommendation |
|----|----------|----------|-------------|---------|----------------|
| C1 | Coverage Gap | MEDIUM | FR-002, spec.md:§FR-002 | Contractor subgroups listed as "dynamically populated from project requirements" without explicit examples | Add initial default trades list (e.g., Demolition, Structural, Hydraulic, Electrical, etc.) matching existing `contractorTrades` in schema |
| C2 | Cross-Module | MEDIUM | spec.md:US1, profiler/spec.md:§12 | Stakeholder generation depends on Profile + Objectives but no explicit API contract for fetching profile context | Add dependency note that profile data is fetched via existing `/api/planning/{projectId}/profile` endpoint |
| U1 | Underspecification | LOW | spec.md:§Edge Cases | Large stakeholder counts (50+ per group) mentions pagination after 25 rows but no UX details | Consider specifying virtualization approach or accept as implementation detail |
| U2 | Underspecification | LOW | spec.md:FR-011 | "Visually distinguish AI-generated vs manually-added stakeholders" lacks specific design | Add note: "e.g., badge, icon, or subtle color indicator" |
| T1 | Terminology | LOW | spec.md throughout | "Tender Status" used for Consultant/Contractor but "Submission Status" for Authority - consider unified naming | Accept as intentional (different workflows) but add clarification note |

---

## Constitution Alignment Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Intelligent Document Repository | N/A | Stakeholder module doesn't directly manage documents |
| II. Domain-First Intelligence | **ALIGNED** | Uses construction industry terminology (disciplines, trades, authorities), Australian-specific authority subgroups (TfNSW, FRNSW) |
| III. AI-Powered Automation | **ALIGNED** | AI-powered stakeholder generation from profile context; reduces manual work |
| IV. Financial Visibility Throughout Lifecycle | **ALIGNED** | Award integration with Cost Plan; stakeholder → company → cost line flow |
| V. Small Firm Optimization | **ALIGNED** | Single PM can manage stakeholders across 4 groups; reduces setup time by 60% |
| VI. Sharp, Actionable Outputs | **ALIGNED** | AI generates project-specific stakeholders based on profile, not generic lists |
| VII. Integration Over Isolation | **ALIGNED** | Integrates with existing Cost Plan, Companies table, profile data |
| VIII. Test-Driven Quality | **PENDING** | No test requirements specified; should be added in tasks.md |
| IX. Spreadsheet-Native UX | **PARTIALLY ALIGNED** | Table view mentioned but no FortuneSheet specification for stakeholder grid |

**Constitution Issues**: None critical. Spreadsheet-native UX (Principle IX) may not be mandatory for Stakeholders as it's primarily list management rather than financial data entry.

---

## Cross-Module Consistency Analysis

### Profiler ↔ Stakeholder Integration

| Integration Point | Profiler Spec Reference | Stakeholder Spec Reference | Status |
|-------------------|------------------------|----------------------------|--------|
| Profile data for generation | §3.3.6 Consultant Scope Preview | US1: AI-Powered Stakeholder Generation | **ALIGNED** |
| Objectives context | §4 Objectives Section | US1: "AI analyzes... objectives" | **ALIGNED** |
| Navigation structure | §2.1 Left Nav includes "Stakeholders (Phase 2)" | US2: Left panel shows 4 groups | **ALIGNED** |
| Consultant disciplines | §3.3.6 lists disciplines by profile | FR-002 lists Consultant subgroups | **ALIGNED** - lists match |

**Consistency Issues**: None identified. The Stakeholder spec correctly references Profiler outputs.

---

## Coverage Summary Table

| Requirement Key | Has Scenario? | Scenario IDs | Notes |
|-----------------|---------------|--------------|-------|
| FR-001 (4 groups) | Yes | US2-AC1 | Covered by navigation scenario |
| FR-002 (subgroups) | Yes | US2-AC1, US4-AC1, US4-AC2 | Client, Authority, Consultant covered |
| FR-003 (AI generation) | Yes | US1-AC1, US1-AC2, US1-AC3 | Full coverage |
| FR-004 (counts display) | Yes | US2-AC1 | Left panel counts |
| FR-005 (tender process) | Yes | US3-AC1, US3-AC2 | Consultant/Contractor only |
| FR-006 (inline editing) | Yes | US2-AC3 | Edit firm, contact, email, phone |
| FR-007 (Award → Cost Plan) | Yes | US3-AC2, US3-AC3 | Link and company creation |
| FR-008 (Authority submission) | Yes | US4-AC2, US4-AC3 | Status workflow |
| FR-009 (migration) | Yes | US5-AC1, US5-AC2, US5-AC3 | Full data migration |
| FR-010 (preserve data) | Yes | US5-AC2, US5-AC3 | Tender status, brief data |
| FR-011 (AI vs manual indicator) | Yes | US1-AC2 | Visual indicator |
| FR-012 (enable/disable) | Implicit | US5-AC1 | Mentioned in migration |
| FR-013 (soft delete) | Yes | Edge Case 3 | Preserve Cost Plan links |

**Coverage**: 100% of functional requirements have associated acceptance scenarios.

---

## Unmapped Tasks

N/A - Tasks not yet generated. Run `/speckit.tasks` after planning phase.

---

## Dependencies Identified

1. **Profiler Module (019)** - REQUIRED
   - Profile must be completed for AI stakeholder generation
   - Objectives provide context for relevance scoring
   - API: `/api/planning/{projectId}/profile`

2. **Cost Plan Module (006)** - INTEGRATION
   - Award completion creates/links Company record
   - Links stakeholder to cost line item
   - Tables: `companies`, `costLines`

3. **Existing Schema** - MIGRATION
   - `consultantDisciplines` → Consultant stakeholders
   - `contractorTrades` → Contractor stakeholders
   - `consultants` / `contractors` → Firm associations
   - `consultantStatuses` / `contractorStatuses` → Tender progress

---

## Schema Migration Analysis

### Current Schema → Unified Stakeholders

| Current Table | Mapped To | Key Transformations |
|---------------|-----------|---------------------|
| `consultantDisciplines` | `stakeholders` (group: Consultant) | `disciplineName` → `subgroup` |
| `contractorTrades` | `stakeholders` (group: Contractor) | `tradeName` → `subgroup` |
| `consultants` | `stakeholders` + `stakeholderFirms` | Firm details extracted |
| `contractors` | `stakeholders` + `stakeholderFirms` | Firm details extracted |
| `consultantStatuses` | `stakeholderTenderStatus` | Status type preserved |
| `contractorStatuses` | `stakeholderTenderStatus` | Status type preserved |
| `stakeholders` (existing) | `stakeholders` (group: Client) | Retain, add group column |

**Migration Complexity**: Medium - requires data transformation and FK updates

---

## Next Actions

### If MEDIUM issues need resolution:

1. **C1 (Contractor subgroups)**: Add explicit default list in FR-002:
   ```markdown
   Contractor: Demolition, Structural Steel, Concrete, Formwork,
   Hydraulic, Mechanical HVAC, Electrical, Fire Services,
   Facade/Glazing, Roofing, Waterproofing, Painting, Flooring,
   Joinery, Landscaping, Other
   ```

2. **C2 (Profile API)**: Add dependency note in spec:
   ```markdown
   **Dependencies**: Stakeholder generation requires completed Profile
   (fetched via `/api/planning/{projectId}/profile`)
   ```

### Proceed to planning:

Run `/speckit.plan` to generate:
- `data-model.md` - New stakeholders schema
- `contracts/` - API contracts
- `plan.md` - Implementation phases
- `quickstart.md` - Getting started guide

---

## Offer for Remediation

Would you like me to suggest concrete remediation edits for the top 2 medium issues?

1. **C1**: Add explicit Contractor subgroups list to FR-002
2. **C2**: Add Profile API dependency note

These can be applied directly to the spec before proceeding to `/speckit.plan`.
