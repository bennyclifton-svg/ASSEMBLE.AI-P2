---
name: consultant-brief-mgmt
tier: 2
description: Consultant brief preparation, scope of services, longlist/shortlist evaluation, fee comparison, and appointment management. Design Agent applies within this structure.
agent: design
---

# Skill: Consultant Brief & Management

**Tier 2 — Scaffold skill.** Provides the brief structure, scope of services template, fee comparison matrix format, and appointment workflow. Design Agent populates from project brief and feasibility outputs.

## When to Load This Skill

Load when the user asks for:
- Project brief preparation or update
- Scope of services for a consultant discipline
- "Who do we need on the design team?"
- Consultant longlist, shortlist, or selection
- Fee comparison or recommendation
- Appointment letter or engagement confirmation
- Design meeting agenda or minutes template

## Step 1: Project Brief

Draft from feasibility outputs; refine with user input before issuing to consultants.

```
PROJECT BRIEF
─────────────────────────────────────────────────────────
Project:          [Name]
Address:          [Address]
Client:           [Name]
Date:             [DD Month YYYY]
Brief Version:    [1.0 — draft / 2.0 — issued to consultants]
─────────────────────────────────────────────────────────

1. PROJECT VISION
   [Client objectives, project aspirations, 2-3 sentences]

2. SITE CONTEXT
   Address:        [Full address]
   LGA:            [Council]
   Site area:      [m²]
   Zone:           [Zone code and name]
   Constraints:    [Key planning overlays, heritage, flood, etc.]
   Source:         Feasibility Agent output [date]

3. PLANNING CONTROLS
   Height limit:   [Xm (X storeys)]
   FSR:            [X:1 → max GFA Xm²]
   Setbacks:       [Front Xm, Side Xm, Rear Xm]
   Special reqs:   [SEPP 65 / BASIX / NatHERS / heritage controls]

4. AREA SCHEDULE
   Target GFA:     [X,XXXm²]
   Target NLA/GFA: [~X%]
   
   Unit Mix (if residential):
   ┌──────────┬──────┬───────────┬──────────┐
   │ Type     │ No.  │ Avg size  │ Total    │
   ├──────────┼──────┼───────────┼──────────┤
   │ Studio   │  X   │   Xm²     │  XXXm²   │
   │ 1-bed    │  X   │   Xm²     │  XXXm²   │
   │ 2-bed    │  X   │   Xm²     │  XXXm²   │
   │ 3-bed    │  X   │   Xm²     │  XXXm²   │
   ├──────────┼──────┼───────────┼──────────┤
   │ TOTAL    │  X   │    —      │  XXXm²   │
   └──────────┴──────┴───────────┴──────────┘
   
   Communal open space: [Xm² minimum per DCP]
   Deep soil zone:      [Xm² minimum (X% of site)]
   Car parking:         [X spaces (X resident + X visitor)]
   Bicycle parking:     [X spaces per DCP]

5. DESIGN PARAMETERS
   Quality level:       [Standard / Medium / High / Prestige]
   Materials palette:   [Client preferences if known]
   Sustainability:      [BASIX minimum / Green Star target / NatHERS X stars]
   Special features:    [Rooftop terrace, ground-floor retail, end-of-trip, etc.]

6. FUNCTIONAL REQUIREMENTS
   [Room types, key adjacencies, operational requirements]
   [Any non-standard requirements — oversized apartments, accessible units, etc.]

7. BUDGET PARAMETERS
   Total project budget:    $[X,XXX,XXX]
   Construction cost target: $[X,XXX,XXX] (~$[X,XXX]/m² GFA)
   Cost plan reference:     Finance Agent [stage] cost plan, [date]
   Note: [Flag if budget is fixed or aspirational]

8. PROGRAMME PARAMETERS
   Design milestones:       [From Program Agent]
   DA lodgement target:     [Date]
   Construction start:      [Date]
   PC target:               [Date]
   Critical path note:      [Any design timeline constraints]

9. COMPLIANCE REQUIREMENTS
   NCC classification:      [Class X — e.g., Class 2 residential flat building]
   BCA requirements:        [Key BCA provisions — fire, access, energy]
   DDA compliance:          [Required — note adaptable/accessible unit mix]
   BASIX/NatHERS:           [BASIX certificate required / NatHERS X-star target]
   Heritage requirements:   [If applicable]

10. CONSULTANT SCOPE SUMMARY
    Lead architect:         Required — see scope of services
    Structural engineer:    Required
    Civil engineer:         Required
    Mechanical engineer:    Required
    Electrical engineer:    Required
    Hydraulic engineer:     Required
    Fire engineer:          [Required / TBC at DA stage]
    Landscape architect:    Required
    Town planner:           Required
    Acoustic engineer:      [Required if near noise sources]
    Traffic engineer:       [Required if significant traffic generation]
    BCA consultant:         Required (DD stage)
    Access consultant:      Required (DD stage)
    ESD consultant:         Required (BASIX/NatHERS)

11. APPROVALS REQUIRED
    Development Application (DA): [Council — estimated lodgement Date]
    Construction Certificate (CC): [Council or private certifier]
    BASIX certificate:            [Required]
    Occupation Certificate (OC):  [On completion]
    Strata plan:                  [If applicable]
─────────────────────────────────────────────────────────
```

### Brief Change Log

```
BRIEF CHANGE REGISTER
─────────────────────────────────────────────────────────
Version | Date   | Change               | Reason          | Impact
─────────────────────────────────────────────────────────
1.0     | [date] | Initial draft        | —               | —
1.1     | [date] | [what changed]       | [why]           | [cost/program flags]
─────────────────────────────────────────────────────────
```

For each brief change: flag to Finance Agent (if cost impact) and Program Agent (if programme impact).

---

## Step 2: Scope of Services

Issue a scope of services to longlisted consultants for each discipline.

```
SCOPE OF SERVICES — [DISCIPLINE]
─────────────────────────────────────────────────────────
Project:        [Name]
Consultant:     [Organisation]
Discipline:     [Architect / Structural Engineer / etc.]
Date:           [DD Month YYYY]
─────────────────────────────────────────────────────────

1. PROJECT DESCRIPTION
   [Brief project description — use brief Section 1-3]

2. DELIVERABLES BY DESIGN STAGE

   2.1 CONCEPT DESIGN
       ☐ [Specific deliverable 1]
       ☐ [Specific deliverable 2]
       ☐ [Drawing list or sketch list]

   2.2 SCHEMATIC DESIGN
       ☐ [Specific deliverable 1]
       ☐ [Specific deliverable 2]
       ☐ [Drawing list — scale, format]

   2.3 DESIGN DEVELOPMENT (DA-READY)
       ☐ [Specific deliverable 1]
       ☐ [Drawing list — DA submission format, scale]
       ☐ Reports / calculations required for DA:
         [List any required consultant reports, e.g., BASIX, acoustic]

   2.4 CONSTRUCTION DOCUMENTATION
       ☐ [Specific deliverable 1]
       ☐ [Drawing list — for-construction, revision control]
       ☐ [Specification sections required]
       ☐ [Schedules — door, hardware, finishes, etc.]

3. COORDINATION REQUIREMENTS
   - Attend [X] design coordination meetings per month
   - Respond to Design Agent coordination queries within [2] business days
   - Issue drawings in [DXF + PDF / IFC + PDF] format
   - Drawing naming convention: [state convention]
   - All drawings via transmittal (Correspondence Agent will issue)

4. DA PACKAGE CONTRIBUTION
   [Specific reports or drawings required for DA lodgement]
   DA target lodgement date: [Date]

5. CONSTRUCTION PHASE SERVICES (if required)
   ☐ RFI responses
   ☐ Site visits: [frequency]
   ☐ Inspection and test plan (ITP) review
   ☐ As-built certification

6. PROGRAMME
   Concept design due:     [Date]
   Schematic due:          [Date]
   DD/DA-ready due:        [Date]
   Construction docs due:  [Date]

7. FEE SUBMISSION
   Please provide:
   a) Lump sum fee by design stage
   b) Hourly rates for variation and construction phase services
   c) Disbursements and reimbursables (travel, printing, etc.)
   d) Professional indemnity insurance details
   e) Confirmation of capacity to meet programme
   f) Relevant experience — [X] examples of comparable projects
   
   Fee submission due: [Date]
─────────────────────────────────────────────────────────
```

---

## Step 3: Consultant Longlist

Research and document 4–6 consultants per discipline before fee invitation.

```
CONSULTANT LONGLIST — [DISCIPLINE]
─────────────────────────────────────────────────────────
Organisation         | Prior projects      | Local exp. | Note
─────────────────────────────────────────────────────────
[Name 1]             | [2x Class 2, 150u]  | Yes        | Strong ADG track record
[Name 2]             | [Class 5 office]    | Yes        | High-end fitout focus
[Name 3]             | [Mixed use, 80u]    | No         | Sydney CBD based
[Name 4]             | [Townhouses]        | Yes        | Smaller residential
[Name 5]             | [Class 2, 200u]     | Yes        | Recently completed similar
[Name 6]             | [Mixed use]         | No         | Based elsewhere
─────────────────────────────────────────────────────────
Recommend inviting: [Names 1, 3, 5] — strongest comparable experience
```

---

## Step 4: Fee Comparison Matrix

Populate after fee proposals received.

```
FEE COMPARISON — [DISCIPLINE]
─────────────────────────────────────────────────────────
                     | [Consultant A] | [Consultant B] | [Consultant C]
─────────────────────────────────────────────────────────
Concept design       | $XX,XXX        | $XX,XXX        | $XX,XXX
Schematic            | $XX,XXX        | $XX,XXX        | $XX,XXX
Design Development   | $XX,XXX        | $XX,XXX        | $XX,XXX
Construction Docs    | $XX,XXX        | $XX,XXX        | $XX,XXX
DA management        | $X,XXX         | $X,XXX         | $X,XXX
─────────────────────────────────────────────────────────
TOTAL FEE            | $XXX,XXX       | $XXX,XXX       | $XXX,XXX
─────────────────────────────────────────────────────────
Hourly rate (PM)     | $XXX           | $XXX           | $XXX
PI insurance         | $XM            | $XM            | $XM
Programme commitment | ✓              | ✓              | ✗ flagged
Comparable exp.      | Strong         | Moderate       | Strong
─────────────────────────────────────────────────────────
RECOMMENDATION: [Consultant A] — [brief reasoning]
  Fee: $[X] ([X]% below/above/comparable to others)
  Key factors: [experience, programme certainty, local relationships]
─────────────────────────────────────────────────────────
```

Save fee comparison as: `outputs/trackers/fee-comparison-[discipline]-[date].xlsx`

---

## Step 5: Appointment

After user confirms selection, draft appointment letter via Correspondence Agent.

```
APPOINTMENT BRIEF → CORRESPONDENCE AGENT
─────────────────────────────────────────────────────────
Type:         Formal letter — appointment
To:           [Consultant contact name], [Organisation]
Subject:      Appointment — [Discipline] — [Project Name]
Content:
  - Confirm appointment for [discipline] services
  - Reference scope of services document [date]
  - Confirm fee: $[X,XXX] (lump sum by stage as per proposal [date])
  - Start date: [Date]
  - Key programme milestones: [list]
  - Request countersigned copy within [5] business days
  - Attach: scope of services, fee proposal, PI insurance certificate
Urgency: Routine
─────────────────────────────────────────────────────────
```

After appointment confirmed, update `consultants` table in `project.db`:

```sql
INSERT INTO consultants (
  discipline, organisation, contact_name, contact_email,
  fee_total, appointment_date, status, scope_reference
) VALUES (
  '[discipline]', '[org]', '[name]', '[email]',
  [fee], '[YYYY-MM-DD]', 'ACTIVE', '[scope doc reference]'
);
```

Notify Finance Agent: new consultant fee commitment of $[X].
Notify Program Agent: consultant mobilisation date confirmed — milestone deliverables scheduled.

---

## Design Coordination Meeting Agenda Template

```
DESIGN COORDINATION MEETING
Project: [Name]   Date: [DD Month YYYY]   Time: [HH:MM]
Venue: [Location / Teams/Zoom link]
Chair: [Name]
─────────────────────────────────────────────────────────

1. ATTENDANCE AND APOLOGIES (2 min)

2. PREVIOUS MINUTES — ACTION ITEMS (5 min)
   Review outstanding actions from last meeting.

3. DESIGN STAGE UPDATE (10 min)
   Current stage:   [Concept / Schematic / DD / Constr. Docs]
   Gate status:     [Open / Approaching / Closed]
   Key issues:      [Top 2-3 items since last meeting]

4. DISCIPLINE UPDATES (15 min)
   Architecture:    [Status and key issues]
   Structural:      [Status]
   Civil:           [Status]
   Mechanical:      [Status]
   Electrical:      [Status]
   Hydraulic:       [Status]
   Landscape:       [Status]
   Other:           [Status]

5. COORDINATION ISSUES (15 min)
   [List open coordination issues — discipline, description, required action]
   Issue 1: [Description — A/S/M/E coordination conflict]
   Issue 2: [Description]

6. DA LODGEMENT / APPROVALS STATUS (5 min)
   DA target: [Date]
   Outstanding items for DA package: [list]

7. PROGRAMME CHECK (5 min)
   Next milestone: [Description — due date]
   At-risk items:  [Any milestone at risk]

8. NEW ACTIONS (5 min)
   ┌────┬──────────────────────────────┬──────────────┬────────────┐
   │ No │ Action                       │ Responsible  │ Due date   │
   ├────┼──────────────────────────────┼──────────────┼────────────┤
   │ 1  │ [Action description]         │ [Name]       │ [Date]     │
   └────┴──────────────────────────────┴──────────────┴────────────┘

9. DATE OF NEXT MEETING
─────────────────────────────────────────────────────────
```

## Output

- Project Brief: `outputs/reports/project-brief-[project]-[version].docx`
- Scope of Services: `outputs/reports/scope-[discipline]-[project]-[date].docx`
- Fee Comparison: `outputs/trackers/fee-comparison-[discipline]-[date].xlsx`
- Appointment letter: via Correspondence Agent → COR series
- Meeting agenda/minutes: `outputs/reports/design-meeting-[date].md`
