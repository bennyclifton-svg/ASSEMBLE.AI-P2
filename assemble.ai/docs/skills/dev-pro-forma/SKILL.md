---
name: dev-pro-forma
tier: 2
description: Development pro forma scaffold — structured template for residual land value (RLV) and margin on cost analysis, with sensitivity matrix. Finance Agent applies financial logic within this structure.
agent: finance
---

# Skill: Development Pro Forma

**Tier 2 — Scaffold skill.** Provides the structure and required sections. Finance Agent applies rates, assumptions, and calculations within this framework.

## When to Load This Skill

Load when the user asks for any of:
- Development pro forma
- Feasibility financial analysis
- Residual land value (RLV)
- Margin on cost / development margin
- Development returns analysis
- "Does this stack up financially?"

## Required Inputs

Gather these before starting. Ask the user if not already in PROJECT_MEMORY.md:

| Input | Source |
|-------|--------|
| Site area (m²) | User / Feasibility Agent |
| Gross Floor Area (GFA) by use (m²) | User / Design Agent |
| Project type (residential / commercial / mixed use) | Project settings |
| Land cost (if known) | User |
| Acquisition costs (stamp duty rate, legal fees) | User / project settings |
| Revenue assumptions ($/m² saleable, or rental yield + cap rate) | User |
| Target development margin (%) | User |
| Finance rate and term (months) | User |
| Location (for rate selection) | Project settings |

## Pro Forma Structure

Work through all sections in order. Do not skip sections — flag "TBC" with a note if data is not yet available.

### SECTION 1: Project Parameters

```
Project:         [Project Name]
Address:         [Site Address]
Project Type:    [Residential / Commercial / Mixed Use]
Jurisdiction:    [NSW / VIC / QLD etc.]
Date:            [DD Month YYYY]
Prepared by:     Finance Agent
Basis:           Feasibility-stage estimate (±15-20% accuracy)

Site Area:       [X,XXX] m²
GFA — Residential: [X,XXX] m²
GFA — Commercial:  [X,XXX] m²  (if applicable)
GFA — Basement:    [X,XXX] m²  (if applicable)
Total GFA:         [X,XXX] m²
Saleable Area:     [X,XXX] m²  (residential: ~85-90% of GFA)
```

### SECTION 2: Development Costs

```
A. CONSTRUCTION COST
   Residential:  [GFA m²] × $[rate/m²] =    $[amount]
   Commercial:   [GFA m²] × $[rate/m²] =    $[amount]
   Basement:     [GFA m²] × $[rate/m²] =    $[amount]
   External works / landscaping:             $[amount]
   ─────────────────────────────────────────────────────
   Construction Cost Subtotal:              $[amount]

   Rate source: [Rawlinsons YYYY / estimated] | Accuracy: ±15-20%
   Location adjustment: [factor applied]
   Market adjustment: [escalation % applied]

B. PROFESSIONAL FEES
   Architects (typically 6-10% of construction):  $[amount]
   Structural / civil:                            $[amount]
   Mechanical / electrical / hydraulic:           $[amount]
   Project manager / superintendent:              $[amount]
   Quantity surveyor:                             $[amount]
   Other consultants:                             $[amount]
   ─────────────────────────────────────────────────────
   Professional Fees Subtotal:                   $[amount]
   As % of construction:                         [X.X]%

C. AUTHORITY CHARGES
   Council DA fees (estimated):                  $[amount]
   Council contributions (S7.11 / S7.12):        $[amount]
   Infrastructure levy / s94:                    $[amount]
   Building certification:                       $[amount]
   Utility connections:                          $[amount]
   ─────────────────────────────────────────────────────
   Authority Charges Subtotal:                   $[amount]

D. FINANCE COSTS
   Construction loan interest:                   $[amount]
   Loan establishment fee:                       $[amount]
   Bank fees / monitoring:                       $[amount]
   Basis: [rate]% p.a. over [X] months on [X]% drawdown curve
   ─────────────────────────────────────────────────────
   Finance Costs Subtotal:                       $[amount]

E. LAND COST & ACQUISITION
   Land purchase price:                          $[amount]
   Stamp duty (estimated at [X]%):               $[amount]
   Legal fees — acquisition:                     $[amount]
   Due diligence:                                $[amount]
   ─────────────────────────────────────────────────────
   Land & Acquisition Subtotal:                  $[amount]

F. CONTINGENCY
   Design contingency ([X]% of construction):    $[amount]
   Construction contingency ([X]% of construction): $[amount]
   ─────────────────────────────────────────────────────
   Contingency Subtotal:                         $[amount]

G. MARKETING & SELLING COSTS
   Agent commission ([X]% of GRV):               $[amount]
   Marketing / display:                          $[amount]
   Legal fees — sales:                           $[amount]
   ─────────────────────────────────────────────────────
   Marketing & Selling Subtotal:                 $[amount]

─────────────────────────────────────────────────────────
TOTAL DEVELOPMENT COST (ex. developer's margin):  $[amount]
─────────────────────────────────────────────────────────
```

### SECTION 3: Revenue

```
GROSS REALISATION VALUE (GRV)
   Residential: [X] units × $[avg sale price] =   $[amount]
     or: [saleable m²] × $[rate/m²] =             $[amount]
   Commercial: [NLA m²] × $[rate/m²] =            $[amount]
   Carparking: [X] spaces × $[price] =            $[amount]
   ─────────────────────────────────────────────────────
   Gross Realisation Value:                       $[amount]

   Assumptions:
   - [Residential rate source and basis]
   - [Any presales or lettings assumed]
```

### SECTION 4: Financial Analysis

```
RESIDUAL LAND VALUE (RLV) METHOD
   Gross Realisation Value:                $[amount]
   Less: Total Development Cost:          ($[amount])
   Less: Developer's Margin ([X]% TDC):   ($[amount])
   ─────────────────────────────────────────────────
   Residual Land Value:                    $[amount]
   Land Cost Assumed:                     ($[amount])
   ─────────────────────────────────────────────────
   RLV Surplus / (Deficit):               $[amount]

MARGIN ON COST METHOD
   Gross Realisation Value:                $[amount]
   Total Development Cost (inc. land):    ($[amount])
   ─────────────────────────────────────────────────
   Developer's Profit:                     $[amount]
   Margin on Cost:                         [X.X]%
   Target Margin:                          [X]%
   Margin (Surplus) / Deficit:             [X.X]%

ASSESSMENT:
   [State whether the project is financially viable, marginally viable, or not viable]
   [Note the key risk factors affecting viability]
   [Recommend whether to proceed, refine assumptions, or reconsider]
```

### SECTION 5: Sensitivity Analysis

Present as a matrix for both Margin on Cost and RLV.

```
SENSITIVITY — MARGIN ON COST (%)

                        Revenue
                  -10%    -5%    Base   +5%    +10%
Construction  +10%  [X]    [X]    [X]    [X]    [X]
Cost          +5%   [X]    [X]    [X]    [X]    [X]
              Base  [X]    [X]    [X]    [X]    [X]
              -5%   [X]    [X]    [X]    [X]    [X]
              -10%  [X]    [X]    [X]    [X]    [X]

Colour code: ≥ target margin = green | 0% to target = amber | < 0% = red

KEY SENSITIVITIES:
- Programme extension +3 months: margin → [X]% (impact: $[X] in extra holding costs)
- Programme extension +6 months: margin → [X]% (impact: $[X])
- Interest rate +0.5%: margin → [X]%
- Interest rate +1.0%: margin → [X]%
```

## Output File

Save to: `outputs/reports/pro-forma-[project-abbreviated]-[date].xlsx`

Include tabs:
1. **Summary** — Section 4 financial analysis (dashboard view)
2. **Pro Forma** — Sections 1–3 in full
3. **Sensitivity** — Section 5 matrices
4. **Assumptions** — All rate sources, dates, and key assumptions documented

## Notes on Rate Application

**Rawlinsons construction rates (typical range — verify against current edition):**
- Low-rise residential (2-3 storeys, timber/concrete): $2,800–$3,800/m² GFA
- Medium-rise residential (4-8 storeys, concrete): $3,500–$4,800/m² GFA
- High-rise residential (9+ storeys): $4,500–$6,500/m² GFA
- Commercial office (fitout-by-others): $2,500–$3,500/m² GFA
- Basement carpark: $4,000–$6,000/m² GFA

> **Important:** These are indicative training-knowledge ranges only. Always flag accuracy level and recommend verification against current Rawlinsons data for the specific project type and location before any financial commitment.

**Typical professional fee rates (% of construction cost):**
- Small projects (<$5M): 12–18% total fees
- Medium projects ($5M–$20M): 8–14% total fees
- Large projects (>$20M): 6–10% total fees

**Contingency guidance:**
- Feasibility stage (conceptual): 15–20% of construction
- Concept design: 10–15%
- Schematic/DD: 7.5–10%
- Tender-ready documents: 5–7.5%
