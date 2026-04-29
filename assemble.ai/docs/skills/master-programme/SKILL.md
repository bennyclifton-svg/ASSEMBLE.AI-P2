---
name: master-programme
tier: 2
description: Master programme creation and update scaffold. Template for milestone-level programme covering full project lifecycle (20-50 activities). Logic rules, baseline setting, and Excel Gantt structure.
agent: program
---

# Skill: Master Programme

**Tier 2 — Scaffold skill.** Provides the programme structure, activity hierarchy, logic rules, and output formats. Program Agent builds the specific programme for this project within this framework.

## When to Load This Skill

Load when the user asks to:
- Create a master programme
- Build the project programme
- Update or revise the master programme
- Add activities or logic to the programme
- Set the baseline programme

## Required Inputs

| Input | Source |
|-------|--------|
| Project type (residential / commercial / mixed use) | Project settings |
| Current phase | PROJECT_MEMORY |
| Key known dates (site settlement, target PC) | User / Feasibility Agent |
| DA lodgement and determination dates (if known) | Design Agent / USER |
| Contract form and duration basis (calendar/working days) | settings.json |
| Construction period estimate | Finance Agent / User |
| Any known constraints (Christmas shutdowns, approval lead times) | User |

## Programme Build Process

### Step 1: Select Applicable Activities

Start from the full activity list below. **Remove** activities that do not apply to this project type. **Add** project-specific activities where needed.

Full activity library:
```
ID   PHASE         ACTIVITY                              TYPICAL DURATION
─────────────────────────────────────────────────────────────────────────
F01  FEASIBILITY   Site identification & assessment      2-4 weeks
F02  FEASIBILITY   Financial feasibility / pro forma     1-2 weeks
F03  FEASIBILITY   Planning pathway assessment           1-2 weeks
F04  FEASIBILITY   Environmental & due diligence         3-6 weeks
F05  FEASIBILITY   Site acquisition / exchange           4-12 weeks
F06  FEASIBILITY   Site settlement                       0 days (milestone)

D01  DESIGN        Consultant appointments               2-4 weeks
D02  DESIGN        Concept design                        4-8 weeks
D03  DESIGN        Schematic design                      6-10 weeks
D04  DESIGN        DA lodgement preparation              4-6 weeks
D05  DESIGN        DA lodgement                          0 days (milestone)
D06  DESIGN        DA determination period               12-26 weeks (council-dependent)
D07  DESIGN        DA determination                      0 days (milestone)
D08  DESIGN        Design development                    6-10 weeks
D09  DESIGN        Construction documentation            8-14 weeks
D10  DESIGN        Tender documents finalised            0 days (milestone)

P01  PROCUREMENT   Procurement strategy                  1-2 weeks
P02  PROCUREMENT   EOI / prequalification                4-6 weeks
P03  PROCUREMENT   Tender issue                          0 days (milestone)
P04  PROCUREMENT   Tender period                         4-6 weeks
P05  PROCUREMENT   Tender evaluation                     2-3 weeks
P06  PROCUREMENT   Contract negotiation                  1-3 weeks
P07  PROCUREMENT   Contract execution                    0 days (milestone)

C01  DELIVERY      Site possession / mobilisation        1-2 weeks
C02  DELIVERY      Early works / demolition              (project-specific)
C03  DELIVERY      Bulk excavation                       (project-specific)
C04  DELIVERY      Substructure                          (project-specific)
C05  DELIVERY      Superstructure                        (project-specific)
C06  DELIVERY      Facade / envelope                     (project-specific)
C07  DELIVERY      Services rough-in                     (project-specific)
C08  DELIVERY      Internal fitout                       (project-specific)
C09  DELIVERY      External works / landscaping          (project-specific)
C10  DELIVERY      Commissioning                         2-4 weeks
C11  DELIVERY      Practical completion                  0 days (milestone)
C12  DELIVERY      Defects liability period              [contract DLP — typically 12-24 months]
C13  DELIVERY      Final completion                      0 days (milestone)
```

### Step 2: Assign Dates

For each activity, determine:
- **Start date:** Based on predecessor logic + any lead/lag
- **Duration:** In calendar or working days (per `settings.json duration_basis`)
- **Finish date:** Start + Duration (adjusted for non-working days)
- **Status:** Not started / In progress / Complete / Milestone

### Step 3: Apply Logic Links

Default logic (finish-to-start unless noted):
```
F01 → F02 → F03 → F04 (concurrent with F02-F03) → F05 → F06
F06 → D01
D01 → D02 → D03 → D04 → D05 → D06 → D07
D03 SS+lag → D04  (DA prep can start before schematic complete)
D07 → D08 (concurrent with D09)
D08 SS+lag → D09  (CD can overlap with DD)
D09 → D10 → P01 → P02 → P03 → P04 → P05 → P06 → P07
P07 → C01 → [construction activities in logic sequence] → C11 → C12 → C13
```

Flag any **SS (start-to-start)** or **FF (finish-to-finish)** links used and explain why.

### Step 4: Identify Critical Path

Determine the critical path — the longest chain from project start to completion with zero float. All critical path activities should be clearly flagged.

State:
- Critical path activities (list by ID)
- Total project duration from start to PC
- Key float positions on non-critical paths

### Step 5: Build Non-Working Days Calendar

Per `settings.json jurisdiction` and project dates, identify:
- Christmas/New Year shutdown dates
- Easter dates
- State public holidays
- RDOs (if construction phase active)

These non-working periods reduce available working time in the programme.

### Step 6: Set Baseline

Once the programme is reviewed and approved by the user:
- Record baseline dates for all activities
- State: "Baseline set on [date]. This baseline does not change — all future updates compare against this baseline."

## Programme Output Format

### Text Summary (for PROJECT_MEMORY / quick reference)

```
MASTER PROGRAMME SUMMARY — [Project Name]
Baseline set: [Date]  |  Duration basis: [Calendar / Working days]

PHASE          | START      | FINISH     | STATUS
───────────────────────────────────────────────────────
Feasibility    | [date]     | [date]     | [Complete / Active / Not started]
Design         | [date]     | [date]     | [Complete / Active / Not started]
Procurement    | [date]     | [date]     | [Complete / Active / Not started]
Delivery       | [date]     | [date]     | [Complete / Active / Not started]

KEY MILESTONES
DA Lodgement:         [Baseline]  /  [Forecast]  /  [Actual if achieved]
DA Determination:     [Baseline]  /  [Forecast]  /  [Actual if achieved]
Contract Execution:   [Baseline]  /  [Forecast]  /  [Actual if achieved]
Site Possession:      [Baseline]  /  [Forecast]  /  [Actual if achieved]
Practical Completion: [Baseline]  /  [Forecast]  /  [Actual if achieved]

OVERALL DURATION: [X] months from [start date] to PC [PC date]
CRITICAL PATH: [F01 → ... → D07 → ... → C11] — [X] months total
```

### Excel Gantt (.xlsx)

Generate an Excel Gantt chart with:
- Columns: ID | Activity | Duration | Start | Finish | Predecessor | Float | Status
- Gantt bars by phase (colour-coded: Feasibility=blue, Design=green, Procurement=orange, Delivery=red)
- Critical path activities in bold red
- Baseline dates as grey bars behind current forecast bars
- Diamond markers (◆) for milestones (zero-duration activities)
- Non-working periods shaded grey
- Summary rows for each phase

Save to: `outputs/trackers/master-programme-[project]-[date].xlsx`

### Microsoft Project (.mpp)

When generating the .mpp file (requires Python-mpp library or equivalent):
- Summary tasks for each phase
- Project calendar set to match `settings.json duration_basis`
- Non-working periods added to calendar
- Baseline saved within the .mpp file
- Logic links preserved as finish-to-start (or as designed)

Save to: `outputs/trackers/master-programme-[project]-[date].mpp`

## Updating the Programme

When a milestone is achieved or a forecast changes:
1. Record the actual date (flag as "(A)")
2. Recalculate downstream forecast dates
3. Recalculate float for affected activities
4. Check if critical path has shifted
5. Compare all forecasts to baseline — calculate variance
6. Update `milestone-tracking` data
7. Write to PROJECT_MEMORY Activity Log:
   `[DATE] [PROGRAM] — [Activity name] achieved/forecast updated. [Downstream impact summary.]`

When EOT is granted:
- Update the baseline PC date (and affected downstream milestones)
- Note: "Baseline revised per EOT-[XXX] granted [date]. New baseline PC: [date]."
