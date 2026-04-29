---
name: financial-reporting
tier: 2
description: Monthly cost report and contingency register template for post-contract financial tracking. Finance Agent populates from project data in SQLite and PROJECT_MEMORY.
agent: finance
---

# Skill: Financial Reporting

**Tier 2 — Scaffold skill.** Provides the monthly cost report structure and contingency register. Finance Agent populates with current project data.

## When to Load This Skill

Load when the user asks for:
- Monthly cost report / cost update
- Contingency status / register
- Variation cost summary
- Budget position
- "Where are we financially?"
- Any post-contract financial reporting

## Required Inputs

Pull from `project.db` and `PROJECT_MEMORY.md`:
- Contract sum (from `progress_claims` or PROJECT_MEMORY)
- Approved variation amounts (from `variation_register`)
- Pending variation assessed values (from `variation_register`)
- Progress claims certified to date (from `progress_claims`)
- Budget / Total Development Cost (from PROJECT_MEMORY Key Metrics)
- Contingency original amount and drawdown (from PROJECT_MEMORY or cost plan)
- Programme % complete (from Program Agent / PROJECT_MEMORY)

## Monthly Cost Report Template

```
MONTHLY COST REPORT
─────────────────────────────────────────────────────────
Project:     [Name]
Report No:   MCR-[XXX]
Period:      [Month YYYY]
Prepared:    Finance Agent  |  Date: [DD Month YYYY]
Contract:    [AS4000 / AS2124 / AS4902 / ABIC]
Contractor:  [Name]
─────────────────────────────────────────────────────────

1. CONTRACT SUM POSITION
   Original Contract Sum:                      $[amount]
   Approved Variations (cumulative):          +$[amount]  ([X] variations)
   ──────────────────────────────────────────────────────
   Adjusted Contract Sum:                      $[amount]

   Pending Variations (assessed, unapproved): +$[amount]  ([X] variations)
   ──────────────────────────────────────────────────────
   Forecast Contract Sum:                      $[amount]

2. CONTINGENCY POSITION
   Original Contingency:                       $[amount]  ([X]% of contract sum)
   Drawn — Approved Variations:               -$[amount]
   Drawn — Provisional Sum Adjustments:       -$[amount]
   ──────────────────────────────────────────────────────
   Contingency Remaining:                      $[amount]  ([X]% remaining)

   Programme % complete:                       [X]%
   Contingency % consumed:                     [X]%
   Variance (consumed vs programme):           [X]% [AHEAD/BEHIND/ON TRACK]

   ⚠ STATUS: [GREEN / AMBER / RED / CRITICAL]
   [Note if contingency consumption is ahead of programme % — flag severity per thresholds]

3. PROGRESS CLAIMS
   ─────────────────────────────────────────────────────────────────────
   Claim  | Period    | Claimed    | Certified  | Paid  | Payment Date
   ─────────────────────────────────────────────────────────────────────
   PC-001 | [period]  | $[amount]  | $[amount]  | [Y/N] | [date]
   PC-002 | [period]  | $[amount]  | $[amount]  | [Y/N] | [date]
   ...
   ─────────────────────────────────────────────────────────────────────
   Total Certified to Date:                    $[amount]
   Total Paid to Date:                         $[amount]
   Retention Held:                             $[amount]  ([X]%)
   Current Period Claim:                       $[amount]  (PC-[XXX])

4. VARIATIONS SUMMARY
   ─────────────────────────────────────────────────────────────────────────
   Ref   | Description                  | Status   | Claimed  | Assessed
   ─────────────────────────────────────────────────────────────────────────
   VAR-001| [description]               | APPROVED | $[amount]| $[amount]
   VAR-002| [description]               | PENDING  | $[amount]| $[amount]
   VAR-003| [description]               | REJECTED | $[amount]| $0
   ...
   ─────────────────────────────────────────────────────────────────────────
   Approved (cumulative):               $[amount]  ([X.X]% of contract sum)
   Pending (assessed):                  $[amount]
   Total Variation Exposure:            $[amount]

   ⚠ VARIATION RATE: [X.X]% cumulative [GREEN / AMBER / RED / CRITICAL]
   [Flag against threshold: Amber 5%, Red 8%, Critical 12%]

5. BUDGET RECONCILIATION
   Total Development Budget:            $[amount]
   Construction contract (forecast):    $[amount]
   Professional fees (forecast):        $[amount]
   Authority charges (forecast):        $[amount]
   Finance costs (forecast):            $[amount]
   Contingency (remaining):             $[amount]
   Other costs:                         $[amount]
   ──────────────────────────────────────────────
   Forecast Total Development Cost:     $[amount]
   ──────────────────────────────────────────────
   Budget Variance:                     $[amount]  ([+/-X.X]%)

   ⚠ BUDGET VARIANCE: [X.X]% [GREEN / AMBER / RED / CRITICAL]
   [Flag against threshold: Amber 3%, Red 5%, Critical 10%]

6. WATCHDOG ALERTS (current period)
   [List any active alerts from Finance Agent's watchdog monitoring]
   [State: metric, current value, threshold, severity, trend, recommended action]
   [If no alerts: "No financial watchdog alerts this period."]

7. RECOMMENDED ACTIONS
   [List 2-3 prioritised financial management actions for the next period]
   [Based on the data above — specific, actionable, referenced to amounts]
```

## Contingency Register (separate document)

Maintain alongside the cost report. Shows every draw on contingency with justification:

```
CONTINGENCY REGISTER
─────────────────────────────────────────────────────────────────────────────────
Project: [Name]   Original Contingency: $[amount]   Last Updated: [Date]
─────────────────────────────────────────────────────────────────────────────────
Date    | Ref    | Description                    | Amount    | Running Balance
─────────────────────────────────────────────────────────────────────────────────
[date]  | VAR-001| [description]                  | -$[amount]| $[balance]
[date]  | PS-001 | Provisional sum adjustment     | -$[amount]| $[balance]
[date]  | —      | Recovery — deleted scope        | +$[amount]| $[balance]
─────────────────────────────────────────────────────────────────────────────────
CURRENT BALANCE:                                                $[balance]
As % of original:  [X]% remaining
─────────────────────────────────────────────────────────────────────────────────
```

## Output Files

Save to: `outputs/reports/`
- `cost-report-[MCR-XXX]-[month-year].xlsx` — monthly cost report
- `contingency-register-[project]-[date].xlsx` — contingency register (maintained, not regenerated)

Include tabs in cost report .xlsx:
1. **Dashboard** — key numbers, traffic lights, watchdog status
2. **Contract Position** — sections 1–3
3. **Variations** — section 4 detail
4. **Budget** — section 5
5. **Contingency Register** — as above

## UPDATE the PROJECT_MEMORY Key Metrics after every cost report:

```
## Key Metrics
- **Contract Sum:** $[updated]
- **Approved Variations to Date:** $[updated]
- **Adjusted Contract Sum:** $[updated]
- **Contingency Remaining:** $[amount] ([X]%)
- **Budget Variance:** [X]%
```

Add activity log entry:
`[DATE] [FINANCE] — Cost Report MCR-[XXX] issued. Contract sum $[X]. Contingency [X]% consumed vs [X]% programme complete. [Alert description if any.]`
