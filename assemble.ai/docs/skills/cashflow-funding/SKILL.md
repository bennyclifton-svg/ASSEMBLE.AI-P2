---
name: cashflow-funding
tier: 2
description: Cashflow projection and funding facility tracking. Template for monthly cashflow drawdown, equity/debt split, and facility utilisation monitoring.
agent: finance
---

# Skill: Cashflow & Funding

**Tier 2 — Scaffold skill.** Provides the cashflow template structure and drawdown methodology. Finance Agent applies project-specific amounts and timing.

## When to Load This Skill

Load when the user asks for:
- Cashflow projection / forecast
- Monthly drawdown schedule
- Funding facility status
- Equity vs debt drawdown
- Interest cost projection
- "When do we need the money?"

## Required Inputs

| Input | Source |
|-------|--------|
| Total Development Cost (from pro forma) | dev-pro-forma output |
| Contract start date and programme dates | Program Agent / PROJECT_MEMORY |
| Funding structure (equity %, debt %, facility limit) | User |
| Interest rate and establishment fee | User |
| Payment terms (contractor — monthly progress claims) | Contract / settings |
| Retention % and release schedule | Contract settings |

## Drawdown Methodology

### Cost Categories and Typical Drawdown Curves

```
CATEGORY                    | DRAWDOWN PROFILE
────────────────────────────────────────────────────────────────
Land purchase               | 100% at settlement (month 0 or -X)
Professional fees           | Spread over design + delivery (S-curve)
Authority fees              | Lumpy — DA lodgement, approval, consent
Construction cost           | S-curve over construction period
  Months 1-3 (mobilisation) | 5-10% of construction cost
  Months 4-7 (substructure) | 15-25% cumulative
  Months 8-14 (superstructure)| 40-60% cumulative
  Months 15-20 (fitout)     | 70-90% cumulative
  Months 21-24 (completion) | 95-100% cumulative
Finance costs               | Calculated monthly on outstanding balance
Marketing & selling         | Front-loaded (marketing) + at settlement (agent fees)
Contingency                 | Lumpy — as drawn
```

### S-Curve Construction Drawdown

Use the following S-curve factors to distribute construction cost by month. Adjust for the actual construction period:

```python
# S-curve factors for a 24-month construction period (cumulative %)
s_curve = [
    2, 4, 7, 11, 16, 22, 29, 37, 45, 53,
    60, 67, 73, 79, 84, 88, 91, 94, 96, 97.5, 98.5, 99, 99.5, 100
]
# Scale these to your actual construction period
# Monthly drawdown = (cum_pct[month] - cum_pct[month-1]) / 100 * total_construction_cost
```

## Cashflow Projection Template

```
PROJECT CASHFLOW PROJECTION
Project:  [Name]   Contract Start: [Date]   PC Date: [Date]
Prepared: [Date]   By: Finance Agent        Rev: [X]

                        MONTH
                 | Pre | 1  | 2  | 3  | 4  | 5  | ... | Total
─────────────────────────────────────────────────────────────────
EXPENDITURE
Land (ex stamp)  | $   |    |    |    |    |    |     | $
Stamp duty       | $   |    |    |    |    |    |     | $
Due diligence    | $   |    |    |    |    |    |     | $
Professional fees|     | $  | $  | $  | $  | $  |     | $
Authority fees   | $   | $  |    |    | $  |    |     | $
Construction     |     |    | $  | $  | $  | $  |     | $
 (S-curve applied)
Contingency drawn|     |    |    |    | $  |    |     | $
Marketing        | $   |    | $  |    |    |    |     | $
Finance costs    |     | $  | $  | $  | $  | $  |     | $
Selling costs    |     |    |    |    |    |    |     | $
─────────────────────────────────────────────────────────────────
TOTAL EXPENDITURE| $   | $  | $  | $  | $  | $  |     | $

FUNDING
Equity           | $   | $  |    |    |    |    |     | $
Debt drawdown    |     |    | $  | $  | $  | $  |     | $
─────────────────────────────────────────────────────────────────
TOTAL FUNDING    | $   | $  | $  | $  | $  | $  |     | $

CASHFLOW
Surplus / (Deficit)|  |    |    |    |    |    |     |
Cumulative       | $   | $  | $  | $  | $  | $  |     |

FUNDING FACILITY
Facility Limit   |     |    |    |    |    |    |     | $
Debt Drawn (cum) |     | $  | $  | $  | $  | $  |     | $
% Facility Drawn |     |X%  |X%  |X%  |X%  |X%  |     |
Remaining Headroom|    | $  | $  | $  | $  | $  |     | $
```

## Interest Calculation

Calculate monthly interest on the outstanding loan balance:

```
Monthly Interest = Outstanding Balance × (Annual Rate / 12)
Outstanding Balance = Cumulative Debt Drawn at start of month
```

Add monthly interest to the cumulative loan balance (capitalised interest — typical for construction loans).

Show the peak debt requirement and when it occurs.

## Funding Facility Watchdog

Alert the Finance Agent's watchdog system when:
- **Amber:** Facility drawn to 80%
- **Red:** Facility drawn to 90%
- **Critical:** Facility drawn to 95%+

If any month's projection shows facility breach (expenditure > facility limit):
1. Flag immediately in the cashflow output
2. Quantify the shortfall: "$X required in Month Y — $Z above facility limit"
3. Recommend options: equity injection, facility increase, cost reduction, programme delay
4. Write to PROJECT_MEMORY watchdog alerts

## Output File

Save to: `outputs/reports/cashflow-[project-abbreviated]-[date].xlsx`

Include tabs:
1. **Summary** — peak debt, total interest, funding utilisation chart
2. **Monthly Cashflow** — full template above
3. **Construction Drawdown** — S-curve chart with monthly bars
4. **Facility Utilisation** — % drawn over time, showing headroom
5. **Assumptions** — all rates, timing, drawdown curves

## Updating the Cashflow

After each monthly progress claim is certified, update:
1. Actual construction drawdown vs projected
2. Revise forward forecast if S-curve is tracking ahead or behind
3. Recalculate peak debt and interest costs
4. Update watchdog metrics
5. Note variance from previous projection and explain
