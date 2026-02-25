# Pillar 4: Coaching Engine - Comprehensive Design

**Date**: 2026-02-21
**Status**: Design complete, pending approval
**Depends on**: Pillar 1 (Knowledge Domains), Pillar 2 (Context Orchestrator)

---

## Table of Contents

1. [UI Integration Mapping](#1-ui-integration-mapping)
2. [Comprehensive Checklist Definitions](#2-comprehensive-checklist-definitions)
3. [Q&A System Design](#3-qa-system-design)
4. [Coaching Persona and Tone](#4-coaching-persona-and-tone)
5. [Project Health Score and Progress Tracking](#5-project-health-score-and-progress-tracking)
6. [Integration with Other Pillars](#6-integration-with-other-pillars)
7. [Database Schema Design](#7-database-schema-design)
8. [Edge Cases and Pitfalls](#8-edge-cases-and-pitfalls)
9. [Refined Implementation Approach](#9-refined-implementation-approach)

---

## 1. UI Integration Mapping

### 1.1 Design Principle

Coaching elements are injected **per-module, at the point of work**. Every module panel gets:

- **A collapsible checklist banner** at the top of its content area (below sub-tabs, above data)
- **A Q&A trigger icon** in the module header area (rightmost position in the tab bar or toolbar)

The Q&A panel is a **shared slide-out drawer** that renders from the right edge of the center panel. It is a single component instance managed at the `ProcurementCard` level, with module context passed as props when opened.

### 1.2 Module-by-Module Integration

#### A. Cost Planning Module (`CostPlanPanel.tsx`)

**Current structure:**
```
<Tabs> (Cost Plan | Variations | Invoices | Payment Schedule)
  <TabsList> (sub-tab bar with tab-aurora-sub styling, pl-[20%])
  <TabsContent> per sub-tab
```

**Checklist insertion point:** Inside each `<TabsContent>`, as the first child element above `<CostPlanSpreadsheet>`, `<VariationsPanel>`, etc. The checklist banner is a self-contained collapsible component that takes `projectId`, `module='cost_plan'`, and `subModule` (e.g., `'budget'`, `'variations'`, `'invoices'`, `'payment_schedule'`).

**Q&A trigger:** Add a sparkle/question icon button to the **right side of the TabsList**, after the last tab trigger. This matches the existing pattern where the tab bar has `pl-[20%]` left padding and tabs start from there -- the Q&A icon sits at the far right with `ml-auto`.

**Layout impact:** The checklist banner is 0px when collapsed (just a thin clickable strip), ~120-200px when expanded. The cost plan spreadsheet's `flex-1 min-h-0 overflow-hidden` handles this gracefully because the banner sits above it in the flex column.

**Responsive:** At narrow widths (<768px), the checklist banner collapses to show only the title + progress count (e.g., "3/7 complete") as a single line. The Q&A icon remains visible. The sub-tabs may wrap; the Q&A icon stays anchored right.

#### B. Program Module (`ProgramPanel.tsx`)

**Current structure:**
```
<div> flex column
  <div h-10 spacer/>
  <ProgramToolbar> (zoom controls, add activity)
  <div flex-1> <ProgramTable/> </div>
```

**Checklist insertion point:** Between the spacer div and `ProgramToolbar`. The checklist renders as a collapsible panel above the toolbar. Because the program is a Gantt chart that needs maximum vertical space, the checklist defaults to **collapsed** on this module.

**Q&A trigger:** Add to the `ProgramToolbar` component, rightmost position after the zoom toggle. The ProgramToolbar already has a flex row layout with controls, so the icon slots in naturally.

**Responsive:** The Gantt chart is inherently wide -- on narrow screens the program uses horizontal scroll. The checklist banner stacks vertically and compresses to single-line mode at small widths.

#### C. Procurement Module (ConsultantGallery / ContractorGallery)

**Current structure:**
```
ProcurementCard renders:
  <Tabs> (sub-tabs per discipline/trade, tab-aurora-sub)
    <TabsContent> per stakeholder
      <ConsultantGallery> or <ContractorGallery>
        (FirmCards, RFT sections, Evaluation sections, etc.)
```

**Checklist insertion point:** At the top of each `<ConsultantGallery>` and `<ContractorGallery>` component, before the firm cards. The checklist filters to show items relevant to the current procurement stage (brief, tender, evaluation, award) based on the stakeholder's tender status.

**Q&A trigger:** Added to the **procurement sub-tab bar** (the per-discipline/trade tabs), at the far right with `ml-auto`. A single Q&A icon that opens the panel pre-loaded with the active discipline/trade as context.

**Responsive:** Procurement already handles wrapping tab names. The Q&A icon stays anchored right of the tab row. Checklists compress to single-line at narrow widths.

#### D. Notes Module (`NotesPanel.tsx`)

**Current structure:**
```
<NotesPanel>
  (NoteCard grid with expandable single-note panels)
```

**Checklist insertion point:** Above the notes grid. Notes checklists focus on documentation completeness -- "Have you captured meeting minutes?", "Are key decisions documented?", etc.

**Q&A trigger:** In the notes panel header area, top-right.

**Responsive:** Notes already use a responsive card grid. Checklist compresses to single-line.

#### E. Meetings & Reports Module (`MeetingsReportsContainer.tsx`)

**Current structure:**
```
<MeetingsReportsContainer>
  <MeetingsPanel> and <ReportsPanel> side by side
```

**Checklist insertion point:** At the top of the container, spanning both columns. Reports-specific checklists ("Have you reviewed all section content?", "Is the reporting period correct?").

**Q&A trigger:** Top-right of the container, next to any existing toolbar controls.

**Responsive:** At narrow widths, meetings and reports stack vertically. The checklist banner spans full width above the stack.

#### F. Stakeholders Module (`StakeholderPanel`)

**Checklist insertion point:** Above the stakeholder table. Checklists here focus on stakeholder completeness -- "Have all consultant disciplines been added?", "Are authority submission requirements documented?"

**Q&A trigger:** In the stakeholder panel header.

### 1.3 Shared Q&A Slide-Out Panel

The `AskAboutThisPanel` is a **single component instance** rendered at the `ProcurementCard` level (the center panel wrapper). It is controlled by state:

```typescript
const [qaOpen, setQaOpen] = useState(false);
const [qaContext, setQaContext] = useState<QAContext>({
  module: 'cost_plan',
  subModule: undefined,
  stakeholderId: undefined,
});
```

When any module's Q&A trigger icon is clicked, it calls `setQaOpen(true)` and `setQaContext({ module, ... })`.

**Panel behavior:**
- Slides in from the right edge of the center panel (not the full window)
- Width: 400px (or 100% on mobile)
- Overlays the module content with a semi-transparent backdrop
- Does NOT displace or resize the module -- it overlays
- Close button (X) and click-outside-to-close

**Styling:** Uses the Aurora theme. Background: `var(--color-bg-secondary)`. Border-left: `var(--color-border)`. Header uses the aurora gradient for the title area. Messages use the same card styling as existing panels.

### 1.4 Collapsible Checklist Banner Component

```
┌─ GuidedChecklist ──────────────────────────────────────────────────┐
│ [v] Cost Plan Setup  ···································  3/7  [?] │
│                                                                     │
│  [ ] Confirm provisional sums are itemized                         │
│      PS items should be broken down, not lump sum                  │
│  [x] Verify PC allowances are realistic                            │
│      Prime cost items should reflect actual market prices          │
│  [x] Ensure contingency is 5-10%                                   │
│      Standard contingency for residential new builds               │
│  ...                                                                │
└─────────────────────────────────────────────────────────────────────┘
```

**Collapsed state (default):** Single line showing title, progress fraction, and the Q&A shortcut icon. Height: 36px. Background: subtle `var(--color-accent-copper-tint)` strip.

**Expanded state:** Full checklist with items, descriptions, checkboxes. Max height: 280px with internal scroll. Items use the existing `Checkbox` component from `src/components/ui/checkbox.tsx`.

**Toggle:** Chevron icon (ChevronDown/ChevronRight) on the left of the title. Click anywhere on the collapsed bar to expand.

**Persistence:** Expanded/collapsed state is stored in localStorage per module per project, so users' preferences stick across sessions.

---

## 2. Comprehensive Checklist Definitions

### 2.1 Architecture: Project Type Grouping

The app has 14 project types in the initiator, but the profiler uses 5 project types (`refurb`, `extend`, `new`, `remediation`, `advisory`) and 8 building classes. For checklists, we group the 14 initiator types into **6 coaching categories** to avoid a combinatorial explosion while keeping checklists specific:

| Coaching Category | Initiator Types Mapped | Profiler Project Type |
|---|---|---|
| `residential` | house, townhouses | new, refurb, extend |
| `multi_residential` | apartments, apartments-btr, student-housing, retirement-living | new, refurb |
| `commercial` | office, retail | new, refurb, extend |
| `industrial` | industrial | new |
| `fitout` | fitout, refurbishment | refurb |
| `advisory` | due-diligence, feasibility, remediation | advisory, remediation |

Each checklist template specifies which coaching categories it applies to. The system resolves the project's initiator type to its coaching category at runtime.

### 2.2 Lifecycle Stages

Checklists are tagged with a lifecycle stage so they appear at the right time:

| Stage | StagingSection Mapping | Description |
|---|---|---|
| `initiation` | Stage 1 Initiation | Project setup, profiling, stakeholder identification |
| `design` | Stage 2 Scheme Design + Stage 3 Detail Design | Design development, consultant procurement |
| `procurement` | Stage 4 Procurement | Tendering, evaluation, award |
| `delivery` | Stage 5 Delivery | Construction, invoices, variations, practical completion |
| `closeout` | (post Stage 5) | Defects, final account, handover |
| `always` | All stages | Items relevant regardless of stage |

The system checks the project's current stage (from `projectStages` table) and shows checklists for the current stage plus one stage ahead (look-ahead).

### 2.3 Checklist Definitions by Module

#### COST PLAN MODULE

**CP-01: Budget Establishment** (Stages: initiation, design | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Confirm cost plan sections match project structure | FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY sections should reflect your procurement route |
| 2 | Verify each cost line has a budget value | Lines with $0 budget create misleading reports -- enter estimates or mark as TBC |
| 3 | Check contingency percentage is appropriate | Residential: 5-10%, Commercial: 8-10%, Remediation: 20-30% |
| 4 | Confirm currency and GST settings | Check project settings for AUD/NZD and GST-inclusive/exclusive |
| 5 | Link cost lines to stakeholders | Each line should map to a consultant discipline or contractor trade |
| 6 | Enter approved contract values for awarded disciplines | Approved contract column should reflect signed contracts |

**CP-02: Cost Monitoring** (Stages: delivery | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Review forecast vs budget variance | Flag any line item where forecast exceeds budget by >5% |
| 2 | Confirm all approved variations are entered | Cross-check variation register against correspondence |
| 3 | Verify invoice amounts match progress claims | Invoice total per contractor should align with certified claims |
| 4 | Check contingency drawdown rate | If >50% contingency spent before 50% construction complete, escalate |
| 5 | Review provisional sum reconciliation | PS items should be reconciled as actual costs become known |
| 6 | Update forecast completion cost | Ensure forecast = approved contract + approved variations + anticipated variations |

**CP-03: Residential-Specific Cost Checks** (Stages: design, procurement | residential only)
| # | Item | Description |
|---|------|-------------|
| 1 | Confirm PC allowances are realistic for finishes | Kitchen ($15k-40k), Bathrooms ($10k-25k), Flooring ($5k-15k) -- confirm with client selections |
| 2 | Verify provisional sums are itemized, not lump | PS for site costs, landscaping, and services should be broken down |
| 3 | Check landscape budget is adequate | Typically 3-8% of construction cost for residential |
| 4 | Review site preparation allowance | Account for demolition, tree removal, excavation, retaining walls |
| 5 | Confirm authority fee allowances | DA fees, CC fees, long service levy (0.35% in NSW), Section 94/7.12 contributions |

**CP-04: Multi-Residential Cost Checks** (Stages: design, procurement | multi_residential only)
| # | Item | Description |
|---|------|-------------|
| 1 | Verify cost plan reflects unit mix and areas | Cross-check GFA and apartment count against architects area schedule |
| 2 | Check demolition and site remediation allowances | Multi-res sites often have existing structures and contamination risk |
| 3 | Confirm services infrastructure costs | Substation contribution, sewer augmentation, water main upgrade |
| 4 | Review fire services cost allowance | SEPP 65 compliance, sprinklers (mandatory >25m effective height) |
| 5 | Check basement/parking cost per space | Typically $50-80k per space for basement parking |
| 6 | Verify facade cost rate against design intent | Unitised curtain wall vs. conventional cladding cost differential |

**CP-05: Commercial / Industrial Cost Checks** (Stages: design, procurement | commercial, industrial)
| # | Item | Description |
|---|------|-------------|
| 1 | Verify base building vs. fitout cost split | Ensure tenant works are excluded from base build cost plan |
| 2 | Check ESD cost premium is included | Green Star / NABERS compliance typically adds 3-8% |
| 3 | Confirm lift strategy cost alignment | Number of lifts, speed, and type (passenger/goods) affect cost significantly |
| 4 | Review BMS and smart building allowances | Building management system costs for commercial: $40-80/m2 |
| 5 | Check loading dock and access infrastructure | Industrial: loading dock height, turning circles, hardstand spec |

**CP-06: Fitout Cost Checks** (Stages: design, procurement | fitout only)
| # | Item | Description |
|---|------|-------------|
| 1 | Confirm landlord make-good obligations vs. new fitout scope | Clarify existing conditions and what stays/goes |
| 2 | Separate FF&E budget from construction budget | Furniture, fixtures, and equipment should be tracked independently |
| 3 | Verify AV/ICT allowance reflects specifications | Meeting rooms, collaboration spaces, AV infrastructure |
| 4 | Check after-hours access and construction constraints | After-hours work typically adds 20-40% labour premium |
| 5 | Review ceiling grid and services coordination | Existing plenum height may constrain services routing |

**CP-07: Advisory / Remediation Cost Checks** (Stages: always | advisory only)
| # | Item | Description |
|---|------|-------------|
| 1 | Confirm fee estimates for all consultant scopes | Due diligence typically involves multiple specialist consultants |
| 2 | Verify contingency reflects uncertainty level | Pre-acquisition: 25-40%, Post-RAP: 15-25% |
| 3 | Check disposal cost rates are current | Contaminated soil disposal: check EPA levy rates and landfill capacity |
| 4 | Include long-term monitoring cost allowance | Post-remediation monitoring can span 2-5 years |
| 5 | Verify insurance and bond requirements | Performance bonds (5-10% of contract), professional indemnity |

#### PROCUREMENT MODULE

**PR-01: Pre-Tender Preparation** (Stages: design, procurement | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Define scope of services for each discipline/trade | Brief services field should be complete before issuing RFT |
| 2 | Set fee/price expectations in brief | Brief fee or scope price should reference budget allowance |
| 3 | Identify minimum 3 firms per discipline/trade | Competition requires at least 3 tenderers; 4-5 preferred |
| 4 | Verify insurance requirements are documented | PI, PL, WC minimums must be specified in RFT |
| 5 | Confirm evaluation criteria and weightings | Price/non-price split defined before tender issue (typically 60/40 or 70/30) |
| 6 | Prepare document set for RFT | Select relevant project documents to include in tender package |

**PR-02: During Tender Period** (Stages: procurement | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Log all tender queries | Use addenda to issue formal responses to tenderer questions |
| 2 | Issue addenda for scope clarifications | Material changes must be formally communicated to all tenderers |
| 3 | Check tender closing date hasn't passed | Ensure you evaluate before the window closes |
| 4 | Confirm all shortlisted firms have submitted | Follow up with non-responsive firms before closing date |

**PR-03: Tender Evaluation** (Stages: procurement | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Complete non-price evaluation for all firms | Score methodology, experience, key personnel, program |
| 2 | Complete price evaluation and normalize lump sums | Ensure all submissions are compared on same basis (incl/excl) |
| 3 | Check for qualifications and exclusions | Flag any conditional pricing or scope exclusions in submissions |
| 4 | Verify reference checks are completed | Minimum 2 references checked per recommended firm |
| 5 | Prepare Tender Recommendation Report | TRR must document evaluation process and justify recommendation |
| 6 | Compare recommended tender against budget | Ensure the recommended price is within cost plan allowance |

**PR-04: Award and Appointment** (Stages: procurement | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Confirm contract form is appropriate | AS4000, AS4902, ABIC, or bespoke -- match to project risk profile |
| 2 | Verify insurance certificates received | Current certificates for PI, PL, WC before signing |
| 3 | Confirm security/bond arrangements | Bank guarantee or retention as per contract |
| 4 | Update cost plan with approved contract value | Replace budget with actual contracted amounts |
| 5 | Notify unsuccessful tenderers | Professional courtesy and compliance with some procurement policies |

**PR-05: Residential Builder Checks** (Stages: procurement | residential only)
| # | Item | Description |
|---|------|-------------|
| 1 | Verify builder's license (QBCC/VBA/NSW Fair Trading) | License must be current and cover the project value |
| 2 | Check Home Building Compensation Fund cover | Mandatory in NSW for residential work >$20,000 |
| 3 | Review fixed-price vs. cost-plus contract structure | Residential clients generally prefer fixed-price for certainty |
| 4 | Verify payment schedule complies with SOPA | Progress payments must align with Security of Payment Act |
| 5 | Check defect liability period terms | Residential: minimum 6 months, ideally 12 months |

**PR-06: Multi-Residential / Commercial Procurement** (Stages: procurement | multi_residential, commercial)
| # | Item | Description |
|---|------|-------------|
| 1 | Confirm head contractor prequalification requirements | Financial capacity, project value threshold, safety record |
| 2 | Verify subcontractor procurement approach | Head contractor-managed or client-nominated subcontractors |
| 3 | Check construction program is attached to contract | Program must be a contract document |
| 4 | Confirm liquidated damages rate is appropriate | Typically $500-5,000/day depending on project value and type |
| 5 | Review design responsibility allocation | Confirm D&C vs. traditional split in contract |

#### PROGRAM MODULE

**PG-01: Program Setup** (Stages: initiation, design | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Create WBS with appropriate hierarchy | Activities should be grouped by phase/trade, not just listed flat |
| 2 | Set project start and target completion dates | Anchor the program to known milestones (DA lodgement, lease start, etc.) |
| 3 | Define critical path activities | Identify the longest chain of dependent activities |
| 4 | Add key milestones | DA approval, CC issue, site possession, practical completion |
| 5 | Set dependencies between activities | Finish-to-start dependencies capture real sequencing |
| 6 | Confirm program aligns with cost plan stages | Each cost line's master stage should map to program phases |

**PG-02: Program Monitoring** (Stages: delivery | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Update actual start/finish dates weekly | Keep program current to track real progress |
| 2 | Review critical path for delays | Any delay on critical path = project delay |
| 3 | Check float consumption on non-critical activities | Negative float indicates slippage risk |
| 4 | Verify contractor program aligns with master program | Subcontractor programs should nest within the master program |
| 5 | Document delay events with causes | Record weather, supply chain, design change delays formally |

**PG-03: Residential Program Milestones** (Stages: always | residential only)
| # | Item | Description |
|---|------|-------------|
| 1 | DA/CDC approval date set | Critical gate -- all design must be approved before construction |
| 2 | CC issuance tracked | Construction Certificate required before physical works begin |
| 3 | Slab pour milestone | First major construction milestone -- triggers progress claim |
| 4 | Frame and roof milestone | Lock-up stage imminent after framing complete |
| 5 | Lock-up stage | Weatherproof building -- typically 40-50% of construction period |
| 6 | Fixing stage | Internal linings, cabinetry, tiling |
| 7 | Practical completion | Building ready for occupation |
| 8 | Defect liability period end | Typically 6-12 months post-PC |

**PG-04: Multi-Residential / Commercial Program Milestones** (Stages: always | multi_residential, commercial, industrial)
| # | Item | Description |
|---|------|-------------|
| 1 | DA determination date | Track actual vs. estimated DA timeline |
| 2 | CC/BA issue date | Construction commencement gate |
| 3 | Demolition and site preparation completion | Often a separate early works contract |
| 4 | Structural completion (top-out) | Highest floor slab poured -- major milestone |
| 5 | Facade completion | Building envelope sealed -- enables internal works |
| 6 | Services rough-in completion | Mechanical, electrical, hydraulic, fire |
| 7 | Fit-out and finishes | Internal completion by zone or floor |
| 8 | Practical completion | Building ready for occupation |
| 9 | Defect liability period end | Typically 12 months for commercial |
| 10 | Final completion | All defects resolved, bonds released |

#### DOCUMENTS MODULE

**DC-01: Document Management** (Stages: always | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Establish document category structure | Categories should reflect project disciplines and procurement stages |
| 2 | Upload all RFT documents before tender issue | Tenderers need complete information -- check document set |
| 3 | Maintain current drawing register | Latest revision of all drawings should be uploaded and categorized |
| 4 | Index all received tender submissions | Each firm's submission should be uploaded and linked to their profile |
| 5 | File all consultant reports | Design reports, specialist reports, authority correspondence |
| 6 | Ensure document sets are synced for RAG | Documents in knowledge repos should show "synced" status |

**DC-02: Due Diligence / Advisory Documents** (Stages: always | advisory only)
| # | Item | Description |
|---|------|-------------|
| 1 | Upload site survey/title search | Certificate of title, survey plan, easement details |
| 2 | Upload contamination assessment reports | Phase 1 and Phase 2 ESA reports |
| 3 | Upload planning certificates (149/10.7) | Section 10.7 certificate from council |
| 4 | Upload existing condition reports | Building condition assessment, structural assessment |
| 5 | Upload heritage assessment if applicable | Statement of Heritage Impact |
| 6 | Upload lease documents if tenant project | Lease terms, make-good provisions, landlord requirements |

#### REPORTS MODULE

**RP-01: Report Preparation** (Stages: always | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Set correct reporting period dates | Reports should cover a specific reporting period (typically monthly) |
| 2 | Review all section content before issuing | Read through each section for accuracy and completeness |
| 3 | Cross-check cost figures against cost plan | Report cost commentary must match the actual cost plan data |
| 4 | Verify program commentary reflects current status | Dates and progress percentages should be current |
| 5 | Confirm risk register is up to date | Report risk section should reflect current risk assessment |
| 6 | Include photographs if construction stage | Site photos should be dated and captioned |

**RP-02: Meeting Preparation** (Stages: always | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Set meeting date and attendees | Confirm stakeholder attendance before distributing agenda |
| 2 | Attach previous meeting minutes for reference | Continuity requires referencing prior actions |
| 3 | Prepare agenda sections for each discipline | Each active discipline/trade should have a discussion point |
| 4 | Include project documents in transmittal | Meeting participants need access to referenced documents |
| 5 | Flag items requiring decision | Decision items should be prominently marked in agenda |

#### STAKEHOLDERS MODULE

**SH-01: Stakeholder Setup** (Stages: initiation | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Add all client-side stakeholders | Owner, project manager, superintendent, QS |
| 2 | Add all relevant authorities | Council, fire (FRNSW), transport, EPA, heritage |
| 3 | Add all required consultant disciplines | Architecture, structural, services, specialist as needed |
| 4 | Add all required contractor trades | Head contractor and/or trade packages as per procurement route |
| 5 | Confirm contact details are complete | Name, email, phone for each stakeholder |
| 6 | Set tender status for each procurement stakeholder | Initialize at "Brief" stage for new consultants/contractors |

**SH-02: Authority Management** (Stages: design, procurement | All categories)
| # | Item | Description |
|---|------|-------------|
| 1 | Document submission requirements per authority | What each authority needs (DA, CC, BCA report, access report) |
| 2 | Track submission dates and reference numbers | Submission ref and date should be entered for each lodgement |
| 3 | Monitor approval status | Track pending/approved/rejected for each authority submission |
| 4 | Flag conditions of consent | DA conditions that affect design or construction must be tracked |

### 2.4 Checklist Summary Matrix

| Module | Checklist ID | Title | Categories | Stages |
|--------|-------------|-------|------------|--------|
| cost_plan | CP-01 | Budget Establishment | ALL | initiation, design |
| cost_plan | CP-02 | Cost Monitoring | ALL | delivery |
| cost_plan | CP-03 | Residential Cost Checks | residential | design, procurement |
| cost_plan | CP-04 | Multi-Residential Cost Checks | multi_residential | design, procurement |
| cost_plan | CP-05 | Commercial / Industrial Cost Checks | commercial, industrial | design, procurement |
| cost_plan | CP-06 | Fitout Cost Checks | fitout | design, procurement |
| cost_plan | CP-07 | Advisory / Remediation Cost Checks | advisory | always |
| procurement | PR-01 | Pre-Tender Preparation | ALL | design, procurement |
| procurement | PR-02 | During Tender Period | ALL | procurement |
| procurement | PR-03 | Tender Evaluation | ALL | procurement |
| procurement | PR-04 | Award and Appointment | ALL | procurement |
| procurement | PR-05 | Residential Builder Checks | residential | procurement |
| procurement | PR-06 | Multi-Res / Commercial Procurement | multi_residential, commercial | procurement |
| program | PG-01 | Program Setup | ALL | initiation, design |
| program | PG-02 | Program Monitoring | ALL | delivery |
| program | PG-03 | Residential Program Milestones | residential | always |
| program | PG-04 | Multi-Res / Commercial Milestones | multi_residential, commercial, industrial | always |
| documents | DC-01 | Document Management | ALL | always |
| documents | DC-02 | Due Diligence Documents | advisory | always |
| reports | RP-01 | Report Preparation | ALL | always |
| reports | RP-02 | Meeting Preparation | ALL | always |
| stakeholders | SH-01 | Stakeholder Setup | ALL | initiation |
| stakeholders | SH-02 | Authority Management | ALL | design, procurement |

Total: **23 pre-built checklists** with **~130 individual items**.

### 2.5 Dynamic Checklist Rules

Checklists are not static — items can be hidden, highlighted, reordered, or auto-checked based on real-time project state. This prevents clutter (hiding irrelevant items) and rewards progress (auto-checking items the user has already satisfied).

#### Rule Types

```typescript
interface ChecklistRule {
  itemId: string;               // Target checklist item (e.g., 'CP-01-5')
  condition: ChecklistCondition;
  conditionValue?: string;      // Parameter for the condition (e.g., stage name, threshold)
  action: ChecklistAction;
  message?: string;             // Optional tooltip/message explaining the rule
}

type ChecklistCondition =
  | 'has_ps_items'              // Project has provisional sum lines in cost plan
  | 'has_authorities'           // Project has authority stakeholders
  | 'state_is'                  // Stakeholder tender state matches conditionValue
  | 'stage_is'                  // Project lifecycle stage matches conditionValue
  | 'cost_line_has_contract'    // Cost line has an approved contract value > 0
  | 'contingency_below'         // Contingency % is below conditionValue threshold
  | 'has_variations';           // Project has approved variations

type ChecklistAction =
  | 'hide'          // Remove item from visible list (not applicable to this project)
  | 'highlight'     // Add visual emphasis (amber border) to draw attention
  | 'move_to_top'   // Reorder item to the top of its checklist
  | 'auto_check'    // Automatically mark as checked (with "Auto-verified" label)
  | 'show_warning'; // Display a warning badge with the rule's message
```

#### Example Rules

| Rule | Condition | Action | Rationale |
|------|-----------|--------|-----------|
| Hide "Verify PS reconciliation" | `!has_ps_items` | `hide` | No provisional sums → item is irrelevant |
| Highlight "Review contingency" | `contingency_below: '5'` | `highlight` + `show_warning` | Below 5% triggers attention |
| Auto-check "Link cost lines to stakeholders" | `cost_line_has_contract` (all lines) | `auto_check` | All lines have contracts → already done |
| Hide "Document authority submissions" | `!has_authorities` | `hide` | No authorities → not applicable |
| Move "Update forecast" to top | `stage_is: 'delivery'` | `move_to_top` | Most critical during delivery |
| Auto-check "Enter approved contract values" | `state_is: 'award'` (for stakeholder) | `auto_check` | Award stage implies contracts entered |

#### Evaluation Flow

```
1. Load checklist template items
2. For each item, evaluate all matching rules
3. Apply actions in priority order: hide > auto_check > move_to_top > highlight > show_warning
4. If 'hide' fires, item is removed from the visible list entirely
5. If 'auto_check' fires, item is displayed as checked with "Auto-verified" tag
6. Remaining actions are additive (an item can be highlighted AND have a warning)
```

#### Rule Storage

Rules are defined alongside checklist templates in `src/lib/constants/coaching-checklists.ts`, NOT in the database. This keeps rules co-located with the items they affect and avoids a complex rule engine. Rules are evaluated at render time using fresh project data from the SWR cache.

```typescript
// In coaching-checklists.ts
export const CHECKLIST_RULES: ChecklistRule[] = [
  {
    itemId: 'CP-02-5',
    condition: 'has_ps_items',
    conditionValue: undefined,  // Negated in evaluator: if !has_ps_items → hide
    action: 'hide',
    message: 'No provisional sum items in this project',
  },
  {
    itemId: 'CP-02-4',
    condition: 'contingency_below',
    conditionValue: '5',
    action: 'highlight',
    message: 'Contingency is below 5% — review recommended',
  },
  // ... more rules
];
```

---

## 3. Q&A System Design

### 3.1 Core Architecture

The "Ask About This" Q&A system is a **per-project, per-module conversational AI panel**. It is NOT a general chatbot -- it is a context-aware advisor that knows the current module state, the project data, and the knowledge domain content.

### 3.2 Conversation Management: Hybrid Persistence

**Decision: Per-project persistent with session-level threads.**

- Each project has a persistent Q&A history (stored in `coaching_conversations` table)
- Each "session" (when the user opens the panel and asks questions) creates a new conversation thread
- Threads are preserved so users can review past Q&A sessions
- The AI receives the last 3 messages in the current thread as conversation context (not all history)
- Threads are grouped by module for easy browsing: "Cost Plan questions", "Procurement questions"

**Rationale:** Session-only conversations lose valuable institutional knowledge. Fully persistent conversations with long context windows are expensive and slow. The hybrid approach -- persist threads but only send recent context to the AI -- balances value with performance.

### 3.3 Conversation Flow

```
User opens Q&A panel from Cost Plan module:

┌─────────────────────────────────────────────────┐
│  Ask About This  ·  Cost Plan           [X]     │
│─────────────────────────────────────────────────│
│                                                   │
│  Suggested questions:                             │
│  ┌───────────────────────────────────────┐       │
│  │ Is my contingency adequate for this   │       │
│  │ project type?                          │       │
│  └───────────────────────────────────────┘       │
│  ┌───────────────────────────────────────┐       │
│  │ Which cost lines are at risk of       │       │
│  │ overrun based on current invoicing?   │       │
│  └───────────────────────────────────────┘       │
│  ┌───────────────────────────────────────┐       │
│  │ How does my budget compare to         │       │
│  │ benchmarks for this building class?   │       │
│  └───────────────────────────────────────┘       │
│                                                   │
│  ── Previous threads ──────────────────────────  │
│  > 18 Feb: "Variation tracking questions" (3)    │
│  > 12 Feb: "Budget setup guidance" (5)           │
│                                                   │
│─────────────────────────────────────────────────│
│  [Ask a question about your cost plan...]   [>]  │
└─────────────────────────────────────────────────┘
```

After asking a question:

```
┌─────────────────────────────────────────────────┐
│  Ask About This  ·  Cost Plan           [X]     │
│─────────────────────────────────────────────────│
│                                                   │
│  You: Is my contingency adequate?                │
│                                                   │
│  ┌─ AI ────────────────────────────────────────┐│
│  │ Your current contingency is **$85,000**     ││
│  │ (6.2% of construction cost). For a          ││
│  │ residential new build (Class 1a), industry  ││
│  │ guidance recommends **5-10%** contingency.  ││
│  │                                              ││
│  │ At 6.2%, you're within the recommended      ││
│  │ range. However, note:                        ││
│  │ - You have 3 provisional sum items totaling ││
│  │   $42,000 that haven't been reconciled yet  ││
│  │ - No variations have been approved to date  ││
│  │                                              ││
│  │ **Recommendation:** Maintain current level. ││
│  │ Review PS reconciliation before drawing      ││
│  │ down contingency.                            ││
│  │                                              ││
│  │ Sources:                                     ││
│  │ · Cost Plan data (6 lines in CONTINGENCY)   ││
│  │ · Cost Management Guide (contingency rates) ││
│  │ · Project profile (Class 1a residential)    ││
│  └──────────────────────────────────────────────┘│
│                                                   │
│  [Save answer] [Copy]                             │
│                                                   │
│─────────────────────────────────────────────────│
│  [Ask a follow-up question...]              [>]  │
└─────────────────────────────────────────────────┘
```

### 3.4 Citation and Source Attribution

Every AI answer includes a **Sources** section at the bottom that lists where the information came from:

**Source types and display format:**

| Source Type | Display Format | Example |
|---|---|---|
| Module data | `[Module icon] Module name (specific detail)` | `Cost Plan data (6 lines in CONTINGENCY)` |
| Knowledge domain | `[Book icon] Domain name (topic)` | `Cost Management Guide (contingency rates)` |
| RAG document | `[File icon] Document name (page/section)` | `Structural Report Rev B (Section 3.2)` |
| Project profile | `[Profile icon] Project profile (specific field)` | `Project profile (Class 1a residential)` |
| Checklist | `[Check icon] Checklist name` | `Budget Establishment checklist` |

**Implementation:** The coaching-qa API endpoint returns structured source metadata alongside the answer text:

```typescript
interface CoachingQAResponse {
  answer: string;          // Markdown-formatted answer
  sources: {
    type: 'module_data' | 'knowledge_domain' | 'rag_document' | 'project_profile' | 'checklist';
    name: string;
    detail: string;
    documentId?: string;   // For RAG documents, enables "view source" link
    relevanceScore?: number;
  }[];
  suggestedFollowUps: string[];  // 2-3 suggested follow-up questions
  relatedChecklistItems?: {      // If the answer relates to a checklist item
    checklistId: string;
    itemId: string;
    label: string;
  }[];
}
```

### 3.5 Suggested Starter Questions

**Strategy: Dynamic generation based on project state, with static fallbacks.**

The system generates starter questions through a lightweight analysis:

1. **Check project completeness:** If cost plan has 0 lines, suggest "How should I structure my cost plan for a [building class] project?"
2. **Check current stage:** If in procurement stage, suggest procurement-focused questions
3. **Check data anomalies:** If contingency is <3%, suggest "Is my contingency adequate?"
4. **Fall back to static templates:** Module-specific default questions if no state-driven ones apply

**Static fallback questions per module:**

**Cost Plan:**
- "How does my budget compare to benchmarks for this building class?"
- "Which cost lines should I be monitoring most closely?"
- "What contingency percentage is appropriate for this project?"

**Procurement:**
- "What should I include in the scope of services for [current discipline]?"
- "How should I structure my evaluation criteria?"
- "What insurance requirements should I specify?"

**Program:**
- "What are the typical milestones for a [project type] project?"
- "Is my construction timeline realistic for this building class?"
- "What dependencies am I likely missing?"

**Documents:**
- "What documents should I have uploaded by this stage?"
- "Are there any critical documents missing for my project type?"

**Reports:**
- "What should I cover in my next project report?"
- "Are there any risks I should highlight in the report?"

**Stakeholders:**
- "What consultant disciplines do I need for a [building class] project?"
- "What authority approvals will this project require?"

### 3.6 Follow-Up Questions and Conversation Context

When the user sends a follow-up question, the API receives:

```typescript
{
  projectId: string;
  question: string;
  module: string;
  threadId: string;         // Existing thread to continue
  previousMessages: {       // Last 3 message pairs from the thread
    role: 'user' | 'assistant';
    content: string;
  }[];
}
```

The system prompt includes: "The user may ask follow-up questions that reference your previous answer. Maintain context from the conversation. If they say 'what about for commercial?' after a residential contingency question, understand they want the same analysis for a different building class."

### 3.7 How Q&A Differs from SmartContextPanel

| Feature | SmartContextPanel | AskAboutThis Q&A |
|---|---|---|
| Purpose | Show RAG sources used for report generation | Answer user questions with AI |
| Interaction | Read-only source list with toggle include/exclude | Conversational input/output |
| Scope | Per-section of a report | Per-module across whole project |
| Data sources | RAG document chunks only | Module data + Knowledge Domains + RAG + Profile |
| Persistence | None (ephemeral display) | Persistent threads per project |
| AI generation | None (just displays retrieved chunks) | Full Claude generation with coaching persona |

They are fundamentally different components. SmartContextPanel is a **transparency tool** (showing the AI's sources), while AskAboutThis is an **advisory tool** (generating new insights).

### 3.8 Saving and Sharing Answers

**Save:** Users can click "Save answer" to bookmark a Q&A exchange. Saved answers are stored with a `isSaved: true` flag in the conversation messages table. A "Saved Answers" section in the Q&A panel shows all bookmarked answers.

**Copy:** A "Copy" button copies the answer text (markdown) to clipboard. This allows pasting into notes, reports, or external documents.

**Sharing is NOT included in V1.** It adds complexity (permissions, link generation, notification) with limited initial value. If users want to share, they copy and paste.

### 3.9 Pinning Important Insights

Users may receive a Q&A answer that contains a critical insight they want to retain across sessions — e.g., "Your contingency drawdown rate suggests you'll exhaust reserves by month 8." The **pin** feature allows users to mark specific assistant messages as pinned, making them persistently visible and available as context for future Q&A interactions.

**UI behavior:**
- Each assistant message in the Q&A panel has a **pin icon** (📌) alongside the existing Save and Copy buttons
- Pinned messages display a subtle amber left-border and a "Pinned" badge
- A **"Pinned Insights"** section appears at the top of the Q&A panel (above suggested questions), showing all pinned messages for the current module as condensed cards
- Pinned insights are collapsible (default: expanded if ≤3 items, collapsed if >3)
- Clicking a pinned insight expands it to show the full answer with source attribution

**Cross-session retention:**
- Pinned messages are persisted in the database via the `isPinned` flag on `coaching_messages`
- When opening the Q&A panel, pinned insights are fetched independently of conversation threads
- Pinned insights from the current module are included as context in the AI prompt for new Q&A interactions:

```
PINNED INSIGHTS (user has flagged these as important):
{{#each pinnedInsights}}
- [{{createdAt}}] {{content | truncate:200}}
{{/each}}
```

This gives the AI awareness of what the user considers important, enabling more relevant follow-up answers.

**API additions:**
- `PATCH /api/projects/[projectId]/coaching/conversations/[conversationId]/messages/[messageId]`
  - Body: `{ isPinned: boolean }`
  - Toggles pin state
- `GET /api/projects/[projectId]/coaching/pinned-insights?module=cost_plan`
  - Returns all pinned messages for a module, ordered by `created_at DESC`

**Limits:** Maximum 10 pinned insights per module per project. If the user tries to pin an 11th, show: "You've reached the pin limit. Unpin an existing insight to pin this one." This prevents unbounded prompt size growth.

---

## 4. Coaching Persona and Tone

### 4.1 Persona: "The Senior PM"

The coaching AI adopts the same persona as the existing `BASE_SYSTEM_PROMPT` -- an experienced construction project management professional working in Australia. This is critical for consistency with report generation, note generation, and all other AI features.

**Specific coaching additions to the persona:**

```
COACHING CONTEXT:
You are acting as a senior project management advisor helping a colleague
manage their project using the Assemble.ai platform. You have access to
their actual project data and can give specific, data-grounded advice.

COACHING RULES:
- Lead with the specific data point, then provide guidance
- Always reference actual project figures when available (e.g., "Your
  contingency is $85,000 / 6.2%") rather than speaking generically
- When the data suggests a problem, flag it directly: "This is below
  the recommended range"
- When the data is incomplete, say what's missing and why it matters
- Suggest specific next actions ("Update your cost plan to reflect the
  new contract value")
- Reference Assemble.ai features when suggesting actions ("Use the
  Variations panel to track this change")
- Do NOT lecture. Keep answers focused and actionable
- If you don't have enough data to answer confidently, say so
```

### 4.2 Tone: Direct, Specific, Actionable

**Not a chatbot.** Not friendly/casual. Not a compliance checker that just says "you must do X." The tone is that of a trusted senior colleague who gives you straight answers backed by data:

- "Your contingency is 6.2%. That's within range for residential, but watch the 3 unreconciled PS items."
- "You have 4 disciplines at Brief stage and tender release is in 3 weeks. You need to accelerate scope definition."
- "Based on your project profile (Class 1a, new build, Sydney metro), typical construction cost is $3,500-5,500/m2. Your budget of $4,200/m2 sits in the lower-middle range."

### 4.3 Adaptive Experience Level

**Not in V1.** Adaptive experience detection adds complexity with minimal initial payoff. The system assumes a mid-level PM audience. The existing `BASE_SYSTEM_PROMPT` already handles this well: professional, specific, no filler.

Future consideration: track how often a user asks basic vs. advanced questions, and adjust detail level. But this is a V2 feature.

### 4.4 Proactive Suggestions

**Not in V1 as push notifications, but built into suggested questions.** The "suggested starter questions" system already functions as proactive coaching -- it surfaces questions the user should be asking based on project state. This is proactive guidance without the UX complexity of notifications or alerts.

Future consideration: A "coaching alerts" badge on the Q&A icon that shows a count when the system detects issues (e.g., contingency below threshold, overdue milestones). But again, V2.

---

## 5. Project Health Score and Progress Tracking

### 5.1 Module Coaching Progress

Each module shows its checklist completion progress in the collapsed banner: "3/7 complete". This is purely factual -- no gamification, no badges, no rewards.

**Rationale:** Construction project managers are professionals managing complex, high-stakes projects. Gamification (badges, points, leaderboards) would feel patronizing and undermine the professional tone of the platform.

### 5.2 Project-Level Health Indicator

On the left panel (`PlanningCard`), add a small "Project Health" indicator that aggregates checklist completion across all modules. This appears below the existing staging section.

**Display:**
```
Project Health
[========------] 62%
  Cost Plan:    5/7  ✓
  Procurement:  3/6
  Program:      4/4  ✓
  Documents:    2/5
  Stakeholders: 3/4
```

**Calculation:** Simple percentage of checked items across all active checklists for the project. Only checklists relevant to the project's current coaching category and lifecycle stage are included.

**Color coding:**
- 0-40%: `var(--color-accent-coral)` (red)
- 41-70%: `var(--color-accent-yellow)` (amber)
- 71-100%: `var(--color-accent-green)` (green)

### 5.3 Team-Wide Metrics

**Not in V1.** Team dashboards require multi-user, multi-project views that don't exist yet. The coaching engine is per-project, per-user initially.

---

## 6. Integration with Other Pillars

### 6.1 Pillar 1: Knowledge Domains Feed Coaching Content

**How it works:** When the Q&A panel generates an answer, it calls the Context Orchestrator (Pillar 2), which in turn calls `retrieveFromDomains()` (Pillar 1) to find relevant knowledge domain content. This means:

- A question about contingency pulls from the "Cost Management Principles" knowledge domain
- A question about builder licensing pulls from the "Residential Construction Guide" domain
- A question about SEPP 65 compliance pulls from the "Regulatory" domain (when available)

**Checklist enhancement from domains:** In a future version, if a knowledge domain contains checklist-like content (e.g., a company's internal quality assurance procedure), the system could extract checklist items from it and present them as "Custom checklists from [Domain Name]". This is out of scope for V1 but the `source: 'knowledge-domain'` field in the schema supports it.

### 6.2 Pillar 2: Context Orchestrator Provides Q&A Data

The Q&A API endpoint calls `assembleContext()` with `contextType: 'coaching-qa'`:

```typescript
const context = await assembleContext({
  projectId,
  task: question,
  contextType: 'coaching-qa',
  sectionKey: module,
  includeKnowledgeDomains: true,
  domainTags: inferDomainTags(question, module),
});
```

The orchestrator uses `auto` mode to infer which modules to query based on the question keywords. This means Q&A answers automatically include:

- Cost plan summary if the question mentions budget/cost/contingency
- Program status if the question mentions schedule/timeline/milestones
- Procurement status if the question mentions tender/contractor/consultant
- Project profile always (building class, project type, complexity)

### 6.3 Pillar 3: `//` Instructions Can Reference Coaching

When a user types `// what does the coaching checklist say about contingency?` in a note or report, the `execute-instruction` API uses the same Context Orchestrator. The orchestrator's `coaching-qa` context strategy includes checklist data. So `//` instructions can implicitly access coaching content.

No special integration needed -- the shared orchestrator handles the routing.

### 6.4 Integration with Existing Report Generation

The report context orchestrator already fetches cross-module data. Coaching checklists add a new data source: the AI can reference unchecked coaching items as "areas requiring attention" in report sections.

For example, if the Brief section orchestrator sees that the "PR-01: Pre-Tender Preparation" checklist has 3 unchecked items, it can include that context:

```
COACHING STATUS:
Pre-Tender Preparation checklist: 3 of 6 items incomplete
- Insurance requirements not yet documented
- Evaluation criteria not yet defined
- Document set for RFT not yet prepared
```

This gives the AI report generator awareness of what the PM hasn't done yet, enabling more targeted report commentary.

### 6.5 Cross-Pillar: Inline Instructions → Checklist Auto-Suggestion

When a user executes a `//` inline instruction (Pillar 3) that produces output related to a checklist item, the system suggests marking that item as complete. This creates a natural feedback loop: doing work via `//` instructions automatically progresses the coaching checklist.

**How it works:**

1. User types `// summarize current cost plan status` in a note
2. The `execute-instruction` API processes the instruction and returns the generated content
3. After successful execution, a lightweight post-processor scans the instruction text and output against unchecked checklist items for the current module
4. If a match is found, a subtle toast notification appears: *"This may complete checklist item: 'Review forecast vs budget variance' — Mark as done?"*
5. The toast includes a one-click "Mark done" button and a "Dismiss" option

**Matching logic:**

```typescript
// src/lib/services/coaching-suggestions.ts (addition)

interface ChecklistSuggestion {
  checklistId: string;
  itemId: string;
  itemLabel: string;
  confidence: 'high' | 'medium';
}

/**
 * After a // instruction executes successfully, check if any unchecked
 * checklist items in the current module are semantically related.
 * Uses keyword overlap — NOT an AI call (too expensive for a suggestion).
 */
export function matchInstructionToChecklists(
  instruction: string,
  output: string,
  uncheckedItems: { checklistId: string; itemId: string; label: string; description: string }[]
): ChecklistSuggestion[] {
  const combined = `${instruction} ${output}`.toLowerCase();
  const matches: ChecklistSuggestion[] = [];

  for (const item of uncheckedItems) {
    const keywords = extractKeywords(item.label + ' ' + item.description);
    const matchCount = keywords.filter(kw => combined.includes(kw)).length;
    const confidence = matchCount >= 3 ? 'high' : matchCount >= 2 ? 'medium' : null;

    if (confidence) {
      matches.push({
        checklistId: item.checklistId,
        itemId: item.itemId,
        itemLabel: item.label,
        confidence,
      });
    }
  }

  return matches.slice(0, 2); // Max 2 suggestions to avoid noise
}
```

**UX constraints:**
- Maximum 2 suggestions per instruction execution (avoid suggestion fatigue)
- Only suggest for `high` and `medium` confidence matches
- Suggestions appear as a dismissible toast, NOT a blocking modal
- If the user dismisses a suggestion 3 times for the same item, stop suggesting it (tracked in localStorage)
- Suggestions only fire for modules that have active (non-dismissed) checklists

**Integration point:** The `execute-instruction` API response includes an optional `checklistSuggestions` field. The editor component renders the toast if suggestions are present.

---

## 7. Database Schema Design

### 7.1 coaching_checklists Table

```sql
CREATE TABLE coaching_checklists (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  template_id       TEXT NOT NULL,           -- e.g., 'CP-01', 'PR-03'
  module            TEXT NOT NULL,           -- 'cost_plan' | 'procurement' | 'program' | 'documents' | 'reports' | 'stakeholders'
  title             TEXT NOT NULL,
  coaching_category TEXT NOT NULL,           -- 'residential' | 'multi_residential' | 'commercial' | 'industrial' | 'fitout' | 'advisory'
  lifecycle_stages  TEXT[] NOT NULL,         -- ['initiation', 'design'] etc.
  items             JSONB NOT NULL DEFAULT '[]',
  source            TEXT NOT NULL DEFAULT 'prebuilt',  -- 'prebuilt' | 'knowledge_domain' | 'ai_generated'
  domain_id         TEXT,                    -- FK to knowledge domain if source = 'knowledge_domain'
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_dismissed      BOOLEAN NOT NULL DEFAULT false,   -- user dismissed this checklist
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_checklists_project ON coaching_checklists(project_id);
CREATE INDEX idx_checklists_module ON coaching_checklists(project_id, module);
CREATE UNIQUE INDEX idx_checklists_template ON coaching_checklists(project_id, template_id);
```

**items JSONB structure:**
```typescript
interface ChecklistItem {
  id: string;           // Stable item ID (e.g., 'CP-01-1')
  label: string;        // Short action label
  description: string;  // Detailed guidance text
  isChecked: boolean;
  checkedAt: string | null;    // ISO timestamp
  checkedBy: string | null;    // User ID
  linkedModule?: string;       // If checking opens another module (future)
  linkedAction?: string;       // Deep link action (future)
}
```

### 7.2 coaching_conversations Table

```sql
CREATE TABLE coaching_conversations (
  id              TEXT PRIMARY KEY,
  project_id      TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module          TEXT NOT NULL,
  title           TEXT,                    -- Auto-generated from first question
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_project ON coaching_conversations(project_id);
CREATE INDEX idx_conversations_module ON coaching_conversations(project_id, module);
```

### 7.3 coaching_messages Table

```sql
CREATE TABLE coaching_messages (
  id                TEXT PRIMARY KEY,
  conversation_id   TEXT NOT NULL REFERENCES coaching_conversations(id) ON DELETE CASCADE,
  role              TEXT NOT NULL,          -- 'user' | 'assistant'
  content           TEXT NOT NULL,          -- Markdown text
  sources           JSONB,                 -- Source attribution array (for assistant messages)
  suggested_followups TEXT[],              -- Suggested follow-up questions (for assistant messages)
  related_checklist_items JSONB,           -- Related checklist references (for assistant messages)
  is_saved          BOOLEAN DEFAULT false, -- User bookmarked this answer
  is_pinned         BOOLEAN DEFAULT false, -- User pinned this insight for cross-session retention
  tokens_used       INTEGER,               -- Token count for cost tracking
  created_at        TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON coaching_messages(conversation_id);
CREATE INDEX idx_messages_saved ON coaching_messages(conversation_id, is_saved) WHERE is_saved = true;
CREATE INDEX idx_messages_pinned ON coaching_messages(conversation_id, is_pinned) WHERE is_pinned = true;
```

### 7.4 Drizzle ORM Schema

```typescript
// In drizzle-pg/schema.ts or src/lib/db/rag-schema.ts

export const coachingChecklists = pgTable('coaching_checklists', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  templateId: text('template_id').notNull(),
  module: text('module', {
    enum: ['cost_plan', 'procurement', 'program', 'documents', 'reports', 'stakeholders']
  }).notNull(),
  title: text('title').notNull(),
  coachingCategory: text('coaching_category', {
    enum: ['residential', 'multi_residential', 'commercial', 'industrial', 'fitout', 'advisory']
  }).notNull(),
  lifecycleStages: text('lifecycle_stages').array().notNull(),
  items: jsonb('items').notNull().default([]),
  source: text('source', {
    enum: ['prebuilt', 'knowledge_domain', 'ai_generated']
  }).notNull().default('prebuilt'),
  domainId: text('domain_id'),
  sortOrder: integer('sort_order').notNull().default(0),
  isDismissed: boolean('is_dismissed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_checklists_project').on(table.projectId),
  index('idx_checklists_module').on(table.projectId, table.module),
  uniqueIndex('idx_checklists_template').on(table.projectId, table.templateId),
]);

export const coachingConversations = pgTable('coaching_conversations', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  module: text('module', {
    enum: ['cost_plan', 'procurement', 'program', 'documents', 'reports', 'stakeholders']
  }).notNull(),
  title: text('title'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
  index('idx_conversations_project').on(table.projectId),
  index('idx_conversations_module').on(table.projectId, table.module),
]);

export const coachingMessages = pgTable('coaching_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull().references(() => coachingConversations.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  sources: jsonb('sources'),
  suggestedFollowups: text('suggested_followups').array(),
  relatedChecklistItems: jsonb('related_checklist_items'),
  isSaved: boolean('is_saved').default(false),
  isPinned: boolean('is_pinned').default(false),
  tokensUsed: integer('tokens_used'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_messages_conversation').on(table.conversationId),
  index('idx_messages_pinned').on(table.conversationId, table.isPinned),
]);
```

---

## 8. Edge Cases and Pitfalls

### 8.1 Checklist Edge Cases

**No project type set:** If the user hasn't completed the profiler (no building class or project type), we cannot determine the coaching category. **Solution:** Show a minimal "universal" checklist (CP-01, PR-01, PG-01, DC-01, SH-01) and display a prompt: "Complete your project profile to get tailored coaching checklists."

**Project type changes after checklists are created:** If the user changes from `house` to `apartments`, the coaching category changes from `residential` to `multi_residential`. **Solution:** On project type change, run a reconciliation: mark category-specific checklists as dismissed (don't delete -- they may have checked items), and create new checklists for the new category. Universal checklists persist.

**Multiple applicable checklists for one module:** A residential project in procurement stage would see CP-01 (universal budget) AND CP-03 (residential cost checks). **Solution:** Stack them in the banner. The collapsed state shows a combined count. Expanded state shows each checklist as a separate section.

**Checklist items that are not applicable:** Some items may not apply to every project within a category (e.g., "basement parking" for a single-storey warehouse). **Solution:** Items include a "Not applicable" option alongside check/uncheck. N/A items count as "complete" in progress calculations.

### 8.2 Q&A Edge Cases

**Empty project (no data):** If the user opens Q&A on a project with no cost lines, no stakeholders, no documents, the AI has nothing to reference. **Solution:** The AI acknowledges the empty state: "I don't see any data in your cost plan yet. Here's how to get started: [guidance]." Suggested questions shift to setup-oriented ones.

**Question outside the module scope:** User asks about procurement from the cost plan Q&A panel. **Solution:** The AI answers anyway (the Context Orchestrator pulls cross-module data), but notes: "That's a procurement question -- I've pulled the relevant data for you. You can also ask directly from the Procurement tab for more targeted suggestions."

**Long conversations:** Thread grows beyond useful context window. **Solution:** Only the last 3 message pairs (6 messages) are sent to the AI. Older messages are preserved in the database for user review but not included in the prompt.

**Rate limiting:** AI calls cost money. **Solution:** Implement a per-project, per-hour rate limit (e.g., 20 questions/hour). Display remaining quota in the Q&A panel footer. This prevents abuse while being generous enough for normal use.

**Hallucination risk:** The AI might state incorrect cost figures or regulatory requirements. **Solution:** (a) Always include source attribution so users can verify, (b) The coaching system prompt includes: "When citing project data, use the exact figures provided in context. Do not estimate or infer figures that aren't in the data. When referencing regulations, cite the specific standard or act."

### 8.3 Performance Edge Cases

**Slow context assembly:** The Context Orchestrator may take 2-5 seconds to assemble cross-module data for Q&A. **Solution:** Show a typing indicator with "Checking your project data..." message. Stream the response if using Claude streaming API.

**Large checklists loading on every tab switch:** If the user switches between cost plan sub-tabs, the checklist banner should not re-fetch. **Solution:** Use SWR caching with `revalidateOnFocus: false`. Cache key: `coaching-checklists-${projectId}-${module}`.

**Migration for existing projects:** When coaching launches, all existing projects will have zero checklists. **Solution:** Lazy initialization -- checklists are created on first access via the GET endpoint. The API checks if checklists exist for the project; if not, it creates them from templates based on the project's type.

### 8.4 UI/UX Pitfalls

**Checklist fatigue:** Users may find the banners annoying if they appear every time. **Solution:** (a) Default to collapsed, (b) Remember expanded/collapsed per module in localStorage, (c) Allow "Dismiss" to hide a checklist entirely (isDismissed flag), (d) Show a "Show dismissed" option for recovery.

**Q&A panel blocking work:** The slide-out panel overlays the module content. **Solution:** (a) Panel is dismissible with click-outside or Escape, (b) Panel width is constrained to 400px on desktop so module content is still partially visible, (c) On mobile it goes full-width with a clear back button.

**Stale checklist data:** If two team members are working on the same project, one might check items that the other doesn't see. **Solution:** SWR polling interval of 30 seconds for checklist data. Optimistic updates for checking/unchecking with server reconciliation.

---

## 9. Refined Implementation Approach

### Phase 3A: Checklist Infrastructure (3-4 days)

**Step 1: Database migration**
- Add `coaching_checklists` table to `drizzle-pg/schema.ts`
- Run `npm run db:push` to apply migration
- Files: `drizzle-pg/schema.ts`

**Step 2: Checklist template definitions**
- Create `src/lib/constants/coaching-checklists.ts` with all 23 templates and ~130 items
- Include coaching category mapping function: `getCoachingCategory(projectType: string): CoachingCategory`
- Include lifecycle stage resolution function: `getCurrentStage(projectId: string): LifecycleStage`
- Files: `src/lib/constants/coaching-checklists.ts`

**Step 3: Checklist API**
- Create `src/app/api/projects/[projectId]/coaching/checklists/route.ts`
  - `GET`: Returns checklists for project, lazy-initializing from templates if needed
  - `PATCH`: Updates item check state
- Create `src/app/api/projects/[projectId]/coaching/checklists/[checklistId]/route.ts`
  - `PATCH`: Dismiss/undismiss a checklist
- Files: `src/app/api/projects/[projectId]/coaching/checklists/route.ts`, `src/app/api/projects/[projectId]/coaching/checklists/[checklistId]/route.ts`

**Step 4: Checklist hook**
- Create `src/lib/hooks/use-coaching-checklists.ts`
- SWR-based hook: `useCoachingChecklists(projectId, module)`
- Returns: checklists, toggleItem, dismissChecklist, isLoading
- Files: `src/lib/hooks/use-coaching-checklists.ts`

### Phase 3B: Checklist UI (2-3 days)

**Step 5: GuidedChecklist component**
- Create `src/components/coaching/GuidedChecklist.tsx`
- Collapsible banner with Aurora theme styling
- Uses existing `Checkbox` component
- Handles collapsed/expanded state with localStorage persistence
- Shows progress fraction and color-coded bar
- Files: `src/components/coaching/GuidedChecklist.tsx`

**Step 6: Integrate into module panels**
- Modify `src/components/cost-plan/CostPlanPanel.tsx` -- add GuidedChecklist inside each TabsContent
- Modify `src/components/program/ProgramPanel.tsx` -- add above ProgramToolbar
- Modify `src/components/consultants/ConsultantGallery.tsx` -- add above firm cards
- Modify `src/components/contractors/ContractorGallery.tsx` -- add above firm cards
- Modify `src/components/notes-meetings-reports/NotesMeetingsReportsContainer.tsx` -- add above panels
- Modify `src/components/notes-meetings-reports/MeetingsReportsContainer.tsx` -- add above panels
- Files: 6 component files

### Phase 3C: Q&A Infrastructure (3-4 days)

**Step 7: Database migration for conversations**
- Add `coaching_conversations` and `coaching_messages` tables
- Files: `drizzle-pg/schema.ts`

**Step 8: Q&A API endpoint**
- Create `src/app/api/ai/coaching-qa/route.ts`
  - `POST`: Takes question + module context, calls Context Orchestrator, returns answer with sources
  - Uses coaching-specific system prompt layer
- Create `src/app/api/projects/[projectId]/coaching/conversations/route.ts`
  - `GET`: List conversations for project (optionally filtered by module)
  - `POST`: Create new conversation thread
- Create `src/app/api/projects/[projectId]/coaching/conversations/[conversationId]/route.ts`
  - `GET`: Get conversation with messages
  - `DELETE`: Delete conversation
- Create `src/app/api/projects/[projectId]/coaching/conversations/[conversationId]/messages/route.ts`
  - `PATCH`: Toggle isSaved on a message
- Files: 4 API route files

**Step 9: Coaching system prompt**
- Add `COACHING_SYSTEM_LAYER` to `src/lib/prompts/system-prompts.ts`
- Add coaching-qa context strategy to Context Orchestrator
- Files: `src/lib/prompts/system-prompts.ts`, `src/lib/services/context-orchestrator.ts` (if it exists by then)

**Step 10: Suggested questions generator**
- Create `src/lib/services/coaching-suggestions.ts`
- Analyzes project state (cost plan line count, stakeholder count, current stage) to generate relevant starter questions
- Falls back to static questions per module
- Files: `src/lib/services/coaching-suggestions.ts`

### Phase 3D: Q&A UI (3-4 days)

**Step 11: AskAboutThis panel component**
- Create `src/components/coaching/AskAboutThisPanel.tsx`
- Slide-out panel with conversation interface
- Message bubbles with source attribution
- Suggested questions as clickable chips
- Previous threads list
- Save/copy buttons on assistant messages
- Files: `src/components/coaching/AskAboutThisPanel.tsx`

**Step 12: Q&A trigger icon component**
- Create `src/components/coaching/CoachingQATrigger.tsx`
- Small icon button (sparkle or question-mark-circle)
- Matches Aurora theme accent color
- Files: `src/components/coaching/CoachingQATrigger.tsx`

**Step 13: Wire Q&A into ProcurementCard**
- Add AskAboutThisPanel to ProcurementCard (single instance)
- Add Q&A state management (open/close, module context)
- Pass setQaOpen/setQaContext to each module panel
- Add CoachingQATrigger to each module's header/toolbar area
- Files: `src/components/dashboard/ProcurementCard.tsx` (main integration point)

### Phase 3E: Project Health Indicator (1 day)

**Step 14: Project health aggregation**
- Create `src/lib/hooks/use-coaching-health.ts`
- Aggregates checklist completion across all modules
- Returns percentage and per-module breakdown
- Files: `src/lib/hooks/use-coaching-health.ts`

**Step 15: Health indicator in PlanningCard**
- Add small progress indicator below staging section in PlanningCard
- Uses existing ProgressBar component with coaching colors
- Files: `src/components/dashboard/PlanningCard.tsx`

### Total estimated effort: 12-16 days

### Implementation dependencies:
- Phase 3A and 3B are **independent of Pillars 1 and 2** -- they can ship standalone
- Phase 3C and 3D depend on **Pillar 2 (Context Orchestrator)** for rich Q&A answers
- Phase 3C benefits from **Pillar 1 (Knowledge Domains)** but works without it (just no domain-specific RAG)

### Recommended build order:
1. Ship 3A + 3B first (checklists only) -- immediate value, no AI dependency
2. Ship 3C + 3D after Pillar 2 is complete (Q&A with full context)
3. Ship 3E last (health indicator, depends on checklists being in use)

---

## Files Created/Modified Summary

| Action | File | Phase |
|--------|------|-------|
| Modify | `drizzle-pg/schema.ts` | 3A |
| Create | `src/lib/constants/coaching-checklists.ts` | 3A |
| Create | `src/app/api/projects/[projectId]/coaching/checklists/route.ts` | 3A |
| Create | `src/app/api/projects/[projectId]/coaching/checklists/[checklistId]/route.ts` | 3A |
| Create | `src/lib/hooks/use-coaching-checklists.ts` | 3A |
| Create | `src/components/coaching/GuidedChecklist.tsx` | 3B |
| Modify | `src/components/cost-plan/CostPlanPanel.tsx` | 3B |
| Modify | `src/components/program/ProgramPanel.tsx` | 3B |
| Modify | `src/components/consultants/ConsultantGallery.tsx` | 3B |
| Modify | `src/components/contractors/ContractorGallery.tsx` | 3B |
| Modify | `src/components/notes-meetings-reports/NotesMeetingsReportsContainer.tsx` | 3B |
| Modify | `src/components/notes-meetings-reports/MeetingsReportsContainer.tsx` | 3B |
| Create | `src/app/api/ai/coaching-qa/route.ts` | 3C |
| Create | `src/app/api/projects/[projectId]/coaching/conversations/route.ts` | 3C |
| Create | `src/app/api/projects/[projectId]/coaching/conversations/[conversationId]/route.ts` | 3C |
| Create | `src/app/api/projects/[projectId]/coaching/conversations/[conversationId]/messages/route.ts` | 3C |
| Modify | `src/lib/prompts/system-prompts.ts` | 3C |
| Create | `src/lib/services/coaching-suggestions.ts` | 3C |
| Create | `src/components/coaching/AskAboutThisPanel.tsx` | 3D |
| Create | `src/components/coaching/CoachingQATrigger.tsx` | 3D |
| Modify | `src/components/dashboard/ProcurementCard.tsx` | 3D |
| Create | `src/lib/hooks/use-coaching-health.ts` | 3E |
| Modify | `src/components/dashboard/PlanningCard.tsx` | 3E |
