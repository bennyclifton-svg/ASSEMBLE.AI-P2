---
name: critical-path-delay
tier: 2
description: Critical path and delay analysis scaffold. Provides the structured method for delay assessment, critical path checking, and EOT schedule impact support. Program Agent applies to project specifics.
agent: program
---

# Skill: Critical Path & Delay Analysis

**Tier 2 — Scaffold skill.** Provides the structured delay analysis method and EOT schedule impact process. Program Agent applies to the specific delay event and programme.

## When to Load This Skill

Load when the user asks for:
- Delay analysis
- Critical path assessment
- EOT (extension of time) schedule impact
- Programme impact of a specific event
- "Is this on the critical path?"
- "How does this delay affect completion?"

## Delay Analysis Method

Keep it simple: **planned vs actual comparison with critical path check.**

This system does NOT perform complex forensic delay analysis (TIA, windows analysis, as-planned vs as-built). That is the domain of specialist programming consultants for formal disputes. This analysis is practical, client-side assessment.

### Step 1: Define the Delay Event

```
DELAY EVENT DETAILS
─────────────────────────────────────────────────
Event description:    [What happened]
Date of occurrence:   [DD Month YYYY]
Reported by:          [Contractor / Delivery Agent / Program Agent observation]
Reference:            [VAR-XXX / IN-XXX / notice reference if applicable]
Claimed cause:        [Contractor's stated cause]
Contract clause:      [Relevant clause if EOT claim]
─────────────────────────────────────────────────
```

### Step 2: Identify Affected Activities

From the master programme, identify which activities are affected by this delay event:

```
AFFECTED ACTIVITIES
─────────────────────────────────────────────────────────────────────
ID    | Activity              | Planned Start | Impact      | Critical?
─────────────────────────────────────────────────────────────────────
[ID]  | [activity name]       | [date]        | [describe]  | [YES/NO]
[ID]  | [activity name]       | [date]        | [describe]  | [YES/NO]
─────────────────────────────────────────────────────────────────────
```

### Step 3: Check Critical Path Position

For each affected activity, determine its float position:

```
FLOAT ANALYSIS
─────────────────────────────────────────────────────────────────────
Activity:         [name]
Current float:    [X days] (from last programme update)
On critical path: [YES — zero or negative float / NO — positive float]

If YES (critical path):
  → The delay directly impacts the project completion date
  → Delay duration flows through to practical completion
  → EOT entitlement assessment: merit is present for schedule impact

If NO (not on critical path):
  → Delay duration vs available float:
    Available float: [X days]
    Claimed delay:   [X days]
    Delay absorbed:  [X days] (up to available float)
    Delay flowing to completion: [max(0, claimed - float)] days
```

### Step 4: Calculate Programme Impact

```
PROGRAMME IMPACT ASSESSMENT
─────────────────────────────────────────────────────────────────────
Delay event duration (claimed):          [X days]
Days on critical path:                   [X days]
Float available to absorb delay:         [X days]
Net delay to practical completion:       [X days]

Current forecast PC:                     [date]
Revised forecast PC (if delay flows):    [date]
Programme variance — current:            [+X days vs baseline]
Programme variance — post event:         [+X days vs baseline]
─────────────────────────────────────────────────────────────────────
```

### Step 5: Concurrent Delay Assessment

Check whether the project was already delayed by a separately caused event occurring at the same time:

```
CONCURRENT DELAY CHECK
─────────────────────────────────────────────────────────────────────
Are there other delays occurring concurrently? [YES / NO]
If YES: describe the concurrent delay event(s) and their cause
  Concurrent event: [description]
  Caused by:        [Principal / Superintendent / Contractor / neutral event]

Concurrent delay finding:
  [If contractor-caused concurrent delay exists — note that the net EOT entitlement
   may be reduced depending on the contract form. Flag for Delivery Agent review.]
  [If Principal-caused concurrent event — note this supports contractor's EOT claim.]
  [This assessment is a schedule analysis only. The Delivery Agent makes the 
   contractual determination on EOT entitlement.]
─────────────────────────────────────────────────────────────────────
```

### Step 6: Programme Agent Assessment Summary

```
SCHEDULE IMPACT ASSESSMENT — [Delay Event Reference]
─────────────────────────────────────────────────────────────────────
Prepared by:    Program Agent
Date:           [DD Month YYYY]
Event:          [Brief description]
Contract ref:   [Clause — if EOT]

FINDINGS:
1. The delay event affects [activity(ies)] in the [phase] phase.
2. The affected [activity / activities] [is / is not] on the critical path.
3. Available float at time of delay: [X days].
4. Net delay flowing to Practical Completion: [X days / Nil].
5. Revised forecast Practical Completion: [date] (was [previous forecast]).
6. [If concurrent delay identified: note concurrent delay finding.]

RECOMMENDATION TO DELIVERY AGENT:
[Based on the schedule analysis, the Program Agent's assessment is:]
  a) A net delay to Practical Completion of [X days] is identified.
  b) The Delivery Agent should [consider / not consider] an EOT of up to [X days]
     based on the schedule impact. The contractual determination remains with the 
     Delivery Agent.

NOTE: This is a schedule impact assessment only. Contractual entitlement to an 
EOT (including cause, notice compliance, and contract conditions) is determined 
by the Delivery Agent under the contract.
─────────────────────────────────────────────────────────────────────
```

## Delay Report (Monthly)

During delivery phase, produce a consolidated delay report as part of the monthly programme report. Structure:

```
DELAY EVENTS LOG — [Month YYYY]
─────────────────────────────────────────────────────────────────────────────────────────────
Ref    | Description              | Cause     | Claimed  | Assessed | Status     | CP?
─────────────────────────────────────────────────────────────────────────────────────────────
DE-001 | [description]            | [type]    | [X days] | [X days] | EOT Granted| YES
DE-002 | [description]            | [type]    | [X days] | [X days] | Assessed   | NO
DE-003 | [description]            | [type]    | [X days] | TBC      | Received   | TBC
─────────────────────────────────────────────────────────────────────────────────────────────

Total EOT granted to date:  [X days]
Programme remaining float (critical path): [X days]
Current forecast PC:        [date]  (baseline: [date], variance: [+X days])
```

## Output Files

Save to: `outputs/reports/`
- `delay-assessment-[ref]-[date].md` — individual delay event assessments
- `delay-report-[month-year].xlsx` — monthly consolidated delay log (included in programme report)

## Notes on Cause Classification

| Cause | EOT Entitlement Implication |
|-------|---------------------------|
| Principal / Superintendent act or omission | Strong entitlement basis |
| Act of Prevention (Principal-caused) | Likely entitlement — may also give rise to damages |
| Neutral event (e.g., weather, unforeseeable) | Entitlement to time but not usually cost |
| Contractor-caused | No EOT entitlement |
| Concurrent — mixed cause | Reduced or nil entitlement depending on contract form |

This classification guides the Delivery Agent's contractual assessment — the Program Agent identifies the schedule impact, the Delivery Agent determines the contractual outcome.
