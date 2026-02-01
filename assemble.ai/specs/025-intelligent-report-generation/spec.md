# Spec 025: Intelligent Report Generation with Full Project Context

**Status:** Planned
**Created:** 2026-01-25

## Strategic Vision

**Current State:** AI generation uses ~10% of available data (starred notes + procurement docs)
**Target State:** Section-aware orchestration drawing from the FULL project lifecycle + RAG knowledge

---

## RAG-Enabled Note Workflow

### User Workflow
1. User receives important document (e.g., council planning response)
2. User uploads document to repository and **syncs to RAG** (vectorized)
3. User creates a **Note** and attaches that document
4. User writes their own summary/observations in the note content
5. User **stars** the note if important for reporting

### AI Generation Flow
When generating a report section:
1. Fetch starred notes (existing)
2. For each note with attachments → retrieve attached document IDs
3. Query RAG for those document chunks (semantic context from source)
4. Combine: **User's note summary + RAG document context**

### Result
AI has access to:
- User's curated interpretation (note content)
- Source document knowledge (RAG retrieval)
- Best of both: human judgment + document detail

---

## The Data Landscape (What Exists)

| Data Domain | Current Use | Available Data |
|-------------|-------------|----------------|
| **Project Details** | Basic | Project title, lot area, jurisdiction, legal address, zoning, number of stories |
| **Profiler** | None | Building class, type, scale (GFA/storeys), complexity, quality tier, procurement route, work scope |
| **Cost Plan** | None | Budget, approved contracts, variations, invoices, contingency, forecast, ETC |
| **Program** | None | Activities, milestones, dependencies, critical path, stage status |
| **Stakeholders** | Names only | Tender status (brief/tender/rec/award), shortlist, awards, disciplines, trades, contacts |
| **Procurement Docs** | Basic | RFT scope, addenda content, evaluation data, TRR recommendations |
| **Notes** | Starred only | All notes with attachments, meeting minutes |
| **Risks** | None | Risk register with likelihood, impact, mitigation status |
| **Authorities** | None | Submission status, conditions, approvals, due dates |

---

## Section-Specific Data Orchestration

### Brief / Summary Section
**Purpose:** Executive overview of project status

| Data Source | What to Include |
|-------------|-----------------|
| Profiler | Building class, type, GFA, storeys, quality tier, complexity score |
| Cost Plan | Budget total, current forecast, variance %, contingency remaining |
| Program | Current stage, next milestone, % complete, days ahead/behind |
| Risks | Count by severity, top 3 active risks |
| Procurement | Overall status (X of Y consultants awarded, X of Y contractors tendered) |

### Procurement Section
**Purpose:** Tendering progress and upcoming activities

| Data Source | What to Include |
|-------------|-----------------|
| Profiler | Procurement route (D&C, Traditional, ECI, etc.) |
| Consultants | Each discipline: firm name, tender stage, dates, awarded? |
| Contractors | Each trade: firm name, tender stage, dates, awarded? |
| Shortlists | All shortlisted firms with discipline/trade |
| RFT/TRR | Key dates, recent addenda, recommendations |
| Cost Plan | Awarded values vs budget allowances |

### Planning & Authorities Section
**Purpose:** Regulatory compliance and approvals

| Data Source | What to Include |
|-------------|-----------------|
| Authority Stakeholders | Each authority: submission status, response due, conditions |
| Submission Statuses | Pending/submitted/approved/rejected breakdown |
| Conditions | Outstanding conditions, cleared count |
| Notes | Authority-related notes from period |

### Design Section
**Purpose:** Design progress by discipline

| Data Source | What to Include |
|-------------|-----------------|
| Consultant Stakeholders | Each discipline: firm, brief status, fee |
| Program | Design milestones, current design stage |
| Notes | Design-related notes from period |
| Documents | Recent design document submissions |

### Construction Section
**Purpose:** Site progress and contractor performance

| Data Source | What to Include |
|-------------|-----------------|
| Contractor Stakeholders | Each trade: firm, scope, status |
| Program | Construction milestones, % complete |
| Invoices | Claims this period, total claimed |
| Variations | Contractor variations pending/approved |

### Cost Planning Section
**Purpose:** Financial status and forecasting

| Data Source | What to Include |
|-------------|-----------------|
| Cost Lines | Budget vs Approved Contract vs Forecast by section |
| Variations | Summary: X pending ($Y), X approved ($Z) |
| Invoices | This period: X invoices ($Y), cumulative claimed |
| Contingency | Original, used, remaining, % |
| Forecast | ETC, Final Forecast Cost, variance to budget |

### Programme Section
**Purpose:** Schedule status and milestones

| Data Source | What to Include |
|-------------|-----------------|
| Program Activities | Current stage, active activities |
| Milestones | Upcoming milestones (next 30/60/90 days) |
| Dependencies | Critical path status |
| Stages | Stage completion status |

---

## Implementation Architecture

### New Service: `report-context-orchestrator.ts`

```
┌─────────────────────────────────────────────────────────────┐
│                  generateSectionContent()                    │
├─────────────────────────────────────────────────────────────┤
│  1. Identify section type (brief, procurement, cost, etc.)  │
│  2. Call section-specific orchestrator                       │
│  3. Orchestrator fetches ALL relevant data in parallel       │
│  4. Compress into structured context                         │
│  5. Pass to AI with section-specific prompt                  │
└─────────────────────────────────────────────────────────────┘

Section Orchestrators:
├── fetchBriefContext()         → Profiler + Cost summary + Program status + Risks
├── fetchProcurementContext()   → Route + All stakeholder statuses + Shortlists + Awards
├── fetchPlanningContext()      → Authority submissions + Conditions + Due dates
├── fetchDesignContext()        → Consultant status + Design milestones + Recent docs
├── fetchConstructionContext()  → Contractor status + Claims + Site milestones
├── fetchCostContext()          → Full cost breakdown + Variations + Invoices + Contingency
└── fetchProgrammeContext()     → Activities + Milestones + Critical path
```

### Reporting Period Filtering
ALL data filtered to show:
- Changes during this period (new awards, variations, submissions)
- Status transitions (was tender → now awarded)
- Upcoming items (milestones, due dates in next period)

---

## Files to Create/Modify

### New File
- `assemble.ai/src/lib/services/report-context-orchestrator.ts` - Section-specific data fetchers

### Modify
- `assemble.ai/src/lib/services/ai-content-generation.ts` - Use orchestrator for context

### Reference Files (Read Only)
- `assemble.ai/src/lib/db/schema.ts` - Table definitions (notes, noteTransmittals, consultants, contractors, etc.)
- `assemble.ai/src/lib/db/pg-schema.ts` - Additional tables (costLines, variations, invoices, program)
- `assemble.ai/src/lib/db/rag-schema.ts` - RAG tables (document_chunks, document_sets, document_set_members)
- `assemble.ai/src/lib/rag/retrieval.ts` - RAG retrieval pipeline (retrieve, vectorSearch, rerank)
- `assemble.ai/src/lib/services/planning-context.ts` - Pattern reference for data fetching

---

## Context Format Examples

### RAG-Enhanced Note Context
```markdown
## Starred Notes with Source Documents

### Note: Council DA Response Review (12 Jan 2026)
**User Summary:**
Council has conditionally approved the DA. Key conditions include heritage consultant
sign-off on facade materials and traffic management plan for construction vehicles.
Two conditions need clarification - will request formal response.

**Attached Document:** DA-2024-1234_Determination.pdf (RAG-synced)
**Relevant Excerpts:**
- Condition 12: "Prior to issue of CC, submit heritage consultant certification..."
- Condition 15: "Construction Traffic Management Plan to be approved by TfNSW..."
- Condition 23: "All external materials samples to be submitted for approval..."
```

### Brief Section Context
```markdown
## Project Profile
- Building Class: Commercial (Office)
- Project Type: New Build
- Scale: 12,500 m² GFA, 8 storeys
- Quality: Premium
- Complexity Score: 7/10

## Financial Summary
- Budget: $45,000,000
- Current Forecast: $46,200,000
- Variance: +$1,200,000 (+2.7%)
- Contingency Remaining: $1,800,000 (4%)

## Program Status
- Current Stage: Design Development
- Next Milestone: DD Completion (15 Feb 2026)
- Status: 5 days behind schedule

## Key Risks
- High: Contamination remediation scope unclear
- Medium: Authority response delays
- Low: Material supply chain

## Procurement Overview
- Consultants: 8 of 12 awarded
- Contractors: 2 of 6 tendered
```

### Procurement Section Context
```markdown
## Procurement Method
- Approach: Design & Construct

## Consultant Status
| Discipline | Firm | Stage | Status |
|------------|------|-------|--------|
| Architecture | ABC Architects | Award | Complete |
| Structural | XYZ Engineers | Tender | In Progress |
| Mechanical | TBD | Brief | Shortlisting |

## Shortlisted Contractors
- Main Contractor: BuildCo, ConstructAll, QualityBuild
- Demolition: DemoCo (AWARDED)

## Recent Activity (This Period)
- Structural tender issued 10 Jan
- Mechanical RFT responses due 28 Jan
- Demolition awarded to DemoCo ($850,000)
```

---

## Verification Plan

1. **Test Brief Generation**
   - Create report for project with full profiler data
   - Verify AI references building class, GFA, cost summary, risks

2. **Test Procurement Generation**
   - Project with mixed tender stages
   - Verify AI correctly summarizes each discipline/trade status

3. **Test Cost Planning Generation**
   - Project with variations and invoices
   - Verify AI references budget, forecast, variation summary

4. **Compare Before/After**
   - Generate report with current system
   - Generate with enhanced orchestrator
   - Evaluate richness and accuracy improvement
