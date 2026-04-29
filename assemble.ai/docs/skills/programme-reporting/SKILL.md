---
name: programme-reporting
tier: 2
description: Monthly programme status report template. Combines delay report, milestone tracker, watchdog status, and non-working days register into a single monthly programme report.
agent: program
---

# Skill: Programme Reporting

**Tier 2 — Scaffold skill.** Provides the monthly programme report structure. Program Agent populates with current project data from the master programme and milestone register.

## When to Load This Skill

Load when the user asks for:
- Programme report / schedule report
- Monthly programme update
- Programme status
- "Where are we on the programme?"
- Any formal programme reporting output

## Required Inputs

Pull from master programme (outputs/trackers/) and PROJECT_MEMORY:
- Baseline dates for all milestones
- Actual dates for achieved milestones
- Current forecast dates for future milestones
- Non-working days register
- Delay events log (if any)
- Watchdog alert status

## Monthly Programme Report Template

```
MONTHLY PROGRAMME REPORT
─────────────────────────────────────────────────────────
Project:      [Name]
Report No:    PPR-[XXX]
Period:       [Month YYYY]
Prepared:     Program Agent  |  Date: [DD Month YYYY]
─────────────────────────────────────────────────────────

1. EXECUTIVE SUMMARY

   Programme Status:    [ON PROGRAMME / MINOR DELAY / SIGNIFICANT DELAY / CRITICAL DELAY]
   Forecast PC:         [date]  (baseline: [date])
   Variance:            [+/- X days / X weeks]
   Critical Path:       [Key critical path activities in current period]
   Outlook:             [1-2 sentences on programme risk going forward]

2. MILESTONE STATUS TABLE

   | Milestone                  | Baseline    | Actual/Forecast | Variance   | Status        |
   |----------------------------|-------------|-----------------|------------|---------------|
   | [milestone — achieved]     | [date]      | [date] (A)      | [+/-X days]| ✅ COMPLETE    |
   | [milestone — current/near] | [date]      | [date] (F)      | [+/-X days]| ⚠ AMBER       |
   | [milestone — future]       | [date]      | [date] (F)      | [+/-X days]| ✅ ON TRACK    |
   [Continue for all milestones in master programme]

   (A) = Actual achieved | (F) = Current forecast

3. PROGRESS THIS PERIOD

   Milestones achieved this period:
   - [Milestone name] — achieved [date] ([on time / X days early / X days late])
   
   Key activities progressing:
   - [Activity] — [brief status note]
   
   Items behind programme:
   - [Activity] — [X days behind] — [brief cause note]

4. CRITICAL PATH ANALYSIS

   Current critical path activities:
   [List key activities on the critical path with their forecast dates]
   
   Critical path float: [X days] (was [X days] last period — [improving/stable/worsening])
   
   Critical path risk: [LOW / MODERATE / HIGH]
   [1-2 sentences on what could shift the critical path]

5. DELAY EVENTS

   [If no delay events: "No new delay events this period."]
   
   New delay events this period:
   | Ref   | Description           | Cause    | Claimed  | Assessed | Status    |
   |-------|-----------------------|----------|----------|----------|-----------|
   | DE-XXX| [description]         | [cause]  | [X days] | [X days] | [status]  |
   
   Cumulative EOT granted: [X days]
   Cumulative EOT claimed but unresolved: [X days]

6. NON-WORKING DAYS REGISTER

   | Type        | Allowance (days) | Used to Date | Remaining | Status    |
   |-------------|-----------------|--------------|-----------|-----------|
   | Christmas   | [X]             | [X]          | [X]       | [status]  |
   | Easter      | [X]             | [X]          | [X]       | [status]  |
   | Public Hols | [X]             | [X]          | [X]       | [status]  |
   | RDOs        | [X]             | [X]          | [X]       | [status]  |
   | Weather     | [X]             | [X]          | [X]       | [status]  |
   
   [Note any weather day claims received and status]

7. WATCHDOG ALERTS (programme)

   [List any active programme watchdog alerts with severity]
   [If none: "No programme watchdog alerts this period."]

8. OUTLOOK — NEXT PERIOD

   Upcoming milestones at risk:
   [List any milestones due in next 30 days with less than [X] days confidence margin]
   
   Long-lead items to monitor:
   [Any procurement or approval items that could affect the programme]
   
   Programme actions required:
   [List 2-3 specific actions to maintain/recover programme]
```

## Output Files

Save to: `outputs/reports/`
- `programme-report-PPR-[XXX]-[month-year].xlsx` — monthly programme report + milestone tracker Gantt
- `programme-report-PPR-[XXX]-[month-year].md` — narrative version for PROJECT_MEMORY reference

## UPDATE PROJECT_MEMORY after every programme report:

```markdown
## Key Metrics (updated)
- **Target Completion:** [baseline PC date]
- **Current Forecast Completion:** [current forecast PC date]
- **Programme Variance:** [+/- X days / X weeks — GREEN/AMBER/RED/CRITICAL]
```

Activity log entry:
`[DATE] [PROGRAM] — Programme Report PPR-[XXX] issued. Forecast PC [date] vs baseline [date] ([+/-X days]). [Key alert if any.]`
