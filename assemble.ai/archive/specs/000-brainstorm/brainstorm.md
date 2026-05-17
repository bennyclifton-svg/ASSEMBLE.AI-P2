# Profiler & Stakeholder Modules - Speckit-Driven Development Plan

## Overview

This plan outlines the iterative development of two interconnected modules using the speckit agent workflow:

1. **Profiler Module** - Replaces 018-project-initiator with new UI paradigm
2. **Stakeholder Module** - Replaces/unifies consultant & contractor systems

---

## User Decisions

| Decision | Choice |
|----------|--------|
| Profiler vs Project Initiator | **Replace entirely** - Deprecate 018 |
| Data Migration | **Migrate existing** consultant/contractor data to Stakeholder |
| Development Priority | **Profiler first** - Stakeholder depends on it |
| Workflow Style | **Interactive** - Pause after each agent for review |

---

## Current State Analysis

### Project Initiator (018) - Key Findings
- **Location**: `src/components/project-wizard/`
- **Current Flow**: 14 project types → 2-4 questions → AI objectives generation
- **Templates**: 5 JSON files in `src/lib/data/` (project-types, objectives, consultants, program, cost-plan)
- **API**: `/api/planning/[projectId]/initialize`

### Consultant/Contractor Systems - Key Findings
- **Dual-track architecture**: Separate tables for disciplines vs trades
- **4-stage tender process**: Brief → Tender → Recommendation → Award
- **Cost Plan Integration**: Award triggers company creation
- **Location**: `src/components/dashboard/planning/` (ConsultantListSection, ContractorListSection)

---

## Proposed Architecture

### Overall UI Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TOP HEADER BAR                                  │
├───────────────┬─────────────────────────────────────────────────────────────┤
│  LEFT NAV     │                    MIDDLE PANEL                             │
│               │  ┌─────────────┬──────────────┬─────────────┐               │
│ ○ Project     │  │ Procurement │ Cost Planning│  Programme  │  (headers    │
│   Details     │  │  (dimmed)   │   (dimmed)   │  (dimmed)   │   shown but  │
│               │  └─────────────┴──────────────┴─────────────┘   unselected) │
│ ● Profile     │                                                             │
│               │  ┌──────────────────────────────────────────┐               │
│ ○ Objectives  │  │  Content for selected left nav item      │               │
│               │  │  appears here                            │               │
│ ○ Stakeholders│  │                                          │               │
│               │  └──────────────────────────────────────────┘               │
└───────────────┴─────────────────────────────────────────────────────────────┘
```

**Left Navigation Panel** - 4 major sections (selecting one displays its content in Middle Panel):
1. **Project Details** - Basic project info
2. **Profile** - Class/Type/Subclass/Scale/Complexity selection
3. **Objectives** - AI-generated objectives with user editing
4. **Stakeholders** - Unified stakeholder management

**Middle Panel Header Tabs** (always visible, dimmed when not selected):
- Procurement
- Cost Planning
- Programme

These headers remain visible but inactive while the user works through Profile/Objectives/Stakeholders workflow.

---

### Module 1: Profiler

#### Left Nav: Profile Section

**2-column selection within Profile:**
| Column 1: Class | Column 2: Type |
|-----------------|----------------|
| Residential | Refurb |
| Commercial | Extend |
| Industrial | New |
| Institution | Remediation |
| Mixed | Advisory |
| Infrastructure | |

#### Middle Panel: Profile Content (3 columns)

After Class and Type selection, the middle panel displays:

| Subclass | Scale | Complexity |
|----------|-------|------------|
| Context-dependent (e.g., Office, Retail, Lobby for Commercial) | Levels, GFA, beds, functional units | Project-specific complexity options |
| Always includes "Other" | Numeric/categorical inputs | TBD via research |

#### Middle Panel: Objectives Content

When "Objectives" is selected in left nav, the middle panel displays:
- AI generates: **Functional Quality** + **Planning & Compliance**
- User edits (shown in different font color to distinguish user input)
- "Polish" button → AI refines objectives using user feedback

---

### Module 2: Stakeholder

**Schema Structure:**
```
stakeholders
├── group: Client | Authority | Consultant | Contractor
├── subgroup: (varies by group)
│   ├── Client: Owner, Tenant, Project Manager, ...
│   ├── Authority: TfNSW, FRNSW, Council, ...
│   ├── Consultant: Civil, Structural, ...
│   └── Contractor: Trades...
├── firmName: (optional, added later)
├── contactPerson: (optional)
└── ...other fields
```

**UI:**
- Left panel: Group list with counts
- Middle panel: Table view of stakeholders
- "Generate" button → AI reviews Profile + Objectives → auto-populates groups/subgroups

---

## Speckit Agent Workflow (Interactive)

The speckit workflow follows this sequence per module:
```
specify → clarify → plan → tasks → analyze → checklist → implement
```

---

### MODULE 1: PROFILER (First)

#### Step 1: speckit.specify
**Input**: Natural language feature description for Profiler
**Output**: `specs/019-profiler/spec.md` + `checklists/requirements.md`
**User Review**: Approve spec before proceeding

```
Feature: Project Profiler - A replacement for the Project Initiator (018) with
a restructured UI.

UI LAYOUT:
- Left Navigation Panel has 4 sections: Project Details, Profile, Objectives,
  Stakeholders. Selecting any section displays its content in the Middle Panel.
- Middle Panel has header tabs (Procurement, Cost Planning, Programme) that
  remain visible but dimmed/inactive while user works through the profiler workflow.

PROFILE SECTION (Left Nav → Middle Panel):
- Left nav shows 2-column selection: Building Class (Residential, Commercial,
  Industrial, Institution, Mixed, Infrastructure) and Type (Refurb, Extend, New,
  Remediation, Advisory).
- Middle panel then shows 3 columns: Subclass (context-dependent with "Other"
  option), Scale (levels, GFA, beds, functional units), and Complexity
  (class-specific options).

OBJECTIVES SECTION (Left Nav → Middle Panel):
- AI generates objectives under two categories: Functional Quality and Planning
  & Compliance.
- User can edit AI-generated text (user edits shown in different font color).
- "Polish" button triggers AI to refine objectives using user feedback.
```

#### Step 2: speckit.clarify (if needed)
**Purpose**: Resolve max 5 ambiguities from spec
**Focus Areas**:
- Complexity options per Building Class
- Subclass options per Building Class
- Scale input types per Class/Subclass
**User Review**: Approve clarifications

#### Step 3: speckit.plan
**Output**:
- `specs/019-profiler/data-model.md`
- `specs/019-profiler/contracts/` (API contracts)
- `specs/019-profiler/plan.md`
- `specs/019-profiler/quickstart.md`
**User Review**: Approve technical design

#### Step 4: speckit.tasks
**Output**: `specs/019-profiler/tasks.md`
**User Review**: Approve task breakdown

#### Step 5: speckit.analyze
**Purpose**: Cross-artifact consistency analysis (read-only)
**Validates**: Coverage gaps, inconsistencies, constitution alignment
**Output**: Analysis report with severity ratings
**User Review**: Decide if issues need resolution before implement

#### Step 6: speckit.checklist
**Output**: Domain-specific checklists (ux.md, api.md, etc.)
**User Review**: Final quality gates before implementation

#### Step 7: speckit.implement
**Execution**: Phase-by-phase task completion
**User Review**: Ongoing review as tasks complete

---

### MODULE 2: STAKEHOLDER (Second)

#### Step 1: speckit.specify
**Input**: Natural language feature description for Stakeholder
**Output**: `specs/020-stakeholder/spec.md`

```
Feature: Unified Stakeholder System - Replaces and unifies the existing
Consultant and Contractor lists. New schema with 4 Groups: Client (subgroups:
Owner, Tenant, Project Manager), Authority (subgroups: TfNSW, FRNSW, Council,
EPA, Heritage), Consultant (subgroups: Civil, Structural, Architecture, etc.),
Contractor (subgroups: trades). Left panel shows Groups with counts. Middle
panel shows Stakeholder table. "Generate" button uses AI to analyze Profile +
Objectives and auto-populate relevant groups/subgroups. Firm/person details
added progressively. Integrates with Cost Plan. Migrate existing consultant/
contractor data to new schema.
```

#### Steps 2-7: Same workflow as Profiler
- clarify → plan → tasks → analyze → checklist → implement

---

## Research Required (During speckit.clarify)

### Complexity Options by Class
Will be refined during clarify phase:
| Class | Potential Complexity Options |
|-------|------------------------------|
| Residential | Standard, Premium, Luxury, Heritage, Social Housing |
| Commercial | Shell, Cat A Fitout, Cat B Fitout, Turn-key |
| Industrial | Warehouse, Manufacturing, High-tech, Cold Storage |
| Institution | Education, Healthcare, Government, Religious |
| Mixed | Podium + Tower, Strata, Build-to-Rent |
| Infrastructure | Civil, Transport, Utilities, Marine |

### Authority Subgroups (Australian)
- TfNSW (Transport for NSW)
- FRNSW (Fire and Rescue NSW)
- Council (Local Government)
- EPA, Heritage NSW, NSW Planning

---

## Critical Files

### Profiler Module (Replace 018)
| Action | File |
|--------|------|
| Deprecate | `src/components/project-wizard/*` |
| New | `src/components/profiler/` |
| Modify | `src/lib/data/project-types.json` → new Class/Type/Subclass structure |
| Modify | `src/lib/db/schema.ts` → update project schema |
| Modify | `src/app/api/planning/[projectId]/initialize/route.ts` |

### Stakeholder Module (Replace Consultant/Contractor)
| Action | File |
|--------|------|
| Deprecate | `src/components/dashboard/planning/ConsultantListSection.tsx` |
| Deprecate | `src/components/dashboard/planning/ContractorListSection.tsx` |
| New | `src/components/stakeholder/` |
| Modify | `src/lib/db/schema.ts` → add stakeholders table |
| New | Migration script for existing data |

---

## Orchestration Strategy

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATING AGENT                          │
│  - Invokes speckit agents in sequence                          │
│  - Presents outputs to user for review                         │
│  - Handles cross-module integration                            │
│  - MINIMAL direct work - delegates to speckit                  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│ speckit.      │   │ speckit.      │   │ speckit.      │
│ specify       │ → │ clarify/plan  │ → │ tasks/analyze │
│               │   │               │   │               │
│ Creates spec  │   │ Refines &     │   │ Generates     │
│ from NL desc  │   │ designs       │   │ actionable    │
└───────────────┘   └───────────────┘   │ task list     │
                                        └───────────────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │ speckit.      │
                                        │ implement     │
                                        │               │
                                        │ Executes all  │
                                        │ tasks         │
                                        └───────────────┘
```

---

## Immediate Next Action

**Run `speckit.specify`** for Profiler module

The orchestrating agent will:
1. Invoke speckit.specify with the Profiler feature description
2. Present the generated spec to user for review
3. Wait for approval before proceeding to speckit.clarify or speckit.plan
