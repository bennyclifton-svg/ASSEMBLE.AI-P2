---
name: cost-planning
tier: 3
description: Cost planning scaffold across all design stages — elemental and trade-based cost plan templates. Tier 3 stub for Phase 1. Full Rawlinsons rate data to be loaded as reference material in Phase 4.
agent: finance
phase: 1-stub
---

# Skill: Cost Planning

**Tier 3 — Full skill with reference material.**

> **Phase 1 stub:** This skill contains the template structure and process. Full Rawlinsons rate reference tables will be added as Tier 3 reference files in Phase 4. Until then, the Finance Agent applies training-knowledge rates and must flag this clearly in all outputs.

## When to Load This Skill

Load when the user asks for:
- Elemental cost estimate / order of cost
- Cost plan (any stage — concept, schematic, DD, pre-tender)
- Cost check / cost update
- Trade-based estimate
- Pre-tender estimate

## Stage Selection

First, determine the appropriate estimating stage from the project's current design phase:

| Design Stage | Estimating Stage | Method | Accuracy |
|-------------|-----------------|--------|----------|
| Feasibility | Stage 1 ($/m² GFA) | Use `dev-pro-forma` skill instead | ±20% |
| Concept design | Stage 2 (Elemental — Order of Cost) | Elemental rates | ±15% |
| Schematic / DD | Stage 3 (Elemental — Refined) | Elemental + measured qtys | ±10% |
| Construction docs | Stage 4 (Pre-Tender) | Trade-based for key trades | ±5% |
| Post-contract | Stage 5 (Cost Report) | Use `financial-reporting` skill instead | — |

## Stage 2 & 3 — Elemental Cost Plan Template

### Document Header

```
PROJECT:          [Project Name]
ADDRESS:          [Site Address]
DATE:             [DD Month YYYY]
COST PLAN STAGE:  [Stage 2 — Concept / Stage 3 — Schematic DD]
PREPARED BY:      Finance Agent
REVISION:         [Rev A / B / C]
PREVIOUS ISSUE:   [Date and amount of previous cost plan]
ACCURACY:         [±15% / ±10%]
RATE SOURCE:      [Rawlinsons YYYY edition — STUB: verify against current edition]
LOCATION:         [City/Region]
LOCATION FACTOR:  [e.g., Sydney = 1.00 (base), Melbourne = 0.95, etc.]
MARKET ADJUSTMENT: [+X% for current market conditions — state basis]
```

### Elemental Cost Plan Structure

```
ELEMENT                              | QTY  | UNIT | RATE    | AMOUNT     | $/m² GFA
─────────────────────────────────────────────────────────────────────────────────────
1. SUBSTRUCTURE
   1.1 Piling / deep foundations      |      | No.  | $       | $          |
   1.2 Basement excavation & retaining|      | m³   | $       | $          |
   1.3 Basement slab & waterproofing  |      | m²   | $       | $          |
   1.4 Ground floor slab              |      | m²   | $       | $          |
   ─────────────────────────────────────────────────────────────────────────
   Substructure Subtotal              |      |      |         | $          | $/m²

2. SUPERSTRUCTURE
   2.1 Structural frame               |      | t / m²| $      | $          |
   2.2 Upper floor construction       |      | m²   | $       | $          |
   2.3 Roof construction              |      | m²   | $       | $          |
   2.4 Stairs & balustrades           |      | Nr   | $       | $          |
   ─────────────────────────────────────────────────────────────────────────
   Superstructure Subtotal            |      |      |         | $          | $/m²

3. EXTERNAL ENVELOPE
   3.1 External walls / cladding      |      | m²   | $       | $          |
   3.2 Windows & glazing              |      | m²   | $       | $          |
   3.3 External doors                 |      | Nr   | $       | $          |
   3.4 Roofing / waterproofing        |      | m²   | $       | $          |
   ─────────────────────────────────────────────────────────────────────────
   External Envelope Subtotal         |      |      |         | $          | $/m²

4. INTERNAL CONSTRUCTION
   4.1 Internal walls & partitions    |      | m²   | $       | $          |
   4.2 Internal doors & frames        |      | Nr   | $       | $          |
   4.3 Wall finishes                  |      | m²   | $       | $          |
   4.4 Floor finishes                 |      | m²   | $       | $          |
   4.5 Ceiling finishes               |      | m²   | $       | $          |
   ─────────────────────────────────────────────────────────────────────────
   Internal Construction Subtotal     |      |      |         | $          | $/m²

5. FITTINGS & FIXTURES
   5.1 Kitchen fitout                 |      | Nr   | $       | $          |
   5.2 Bathroom fitout                |      | Nr   | $       | $          |
   5.3 Built-in wardrobes/joinery     |      | m²   | $       | $          |
   5.4 Loose FF&E (if included)       |      | Sum  | $       | $          |
   ─────────────────────────────────────────────────────────────────────────
   Fittings & Fixtures Subtotal       |      |      |         | $          | $/m²

6. SERVICES
   6.1 Mechanical (HVAC)              |      | m²   | $       | $          |
   6.2 Hydraulic (cold/hot/sewer/gas) |      | m²   | $       | $          |
   6.3 Electrical & data              |      | m²   | $       | $          |
   6.4 Fire services (detection/sprinkler) | | m²  | $       | $          |
   6.5 Lifts / escalators             |      | Nr   | $       | $          |
   6.6 ESD / solar / special systems  |      | Sum  | $       | $          |
   ─────────────────────────────────────────────────────────────────────────
   Services Subtotal                  |      |      |         | $          | $/m²

7. EXTERNAL WORKS
   7.1 Landscaping                    |      | m²   | $       | $          |
   7.2 Car parking (at grade)         |      | Nr   | $       | $          |
   7.3 Fencing & boundary works       |      | m    | $       | $          |
   7.4 Site drainage / civil          |      | Sum  | $       | $          |
   ─────────────────────────────────────────────────────────────────────────
   External Works Subtotal            |      |      |         | $          | $/m²

8. PRELIMINARIES & MARGIN
   8.1 Contractor's preliminaries ([X]%) |   | %    | $       | $          |
   8.2 Contractor's margin ([X]%)     |      | %    | $       | $          |
   ─────────────────────────────────────────────────────────────────────────
   Preliminaries & Margin Subtotal    |      |      |         | $          | $/m²

─────────────────────────────────────────────────────────────────────────────
CONSTRUCTION COST (NET)              |      |      |         | $          | $/m² GFA
─────────────────────────────────────────────────────────────────────────────

9. PROVISIONAL SUMS
   9.1 [Description]                  |      | Sum  |         | $          |
   [List each PS separately]
   ─────────────────────────────────────────────────────────────────────────
   Provisional Sums Subtotal          |      |      |         | $          |

10. CONTINGENCIES
   10.1 Design contingency ([X]%)     |      | %    |         | $          |
   10.2 Construction contingency ([X]%)|     | %    |         | $          |
   ─────────────────────────────────────────────────────────────────────────
   Contingencies Subtotal             |      |      |         | $          |

─────────────────────────────────────────────────────────────────────────────
TOTAL CONSTRUCTION COST (GROSS)      |      |      |         | $          | $/m² GFA
─────────────────────────────────────────────────────────────────────────────
```

## Stage 4 — Pre-Tender Estimate Template

For construction documentation stage, use a hybrid approach:

**Part A — Trade Breakdown (major trades estimated separately):**
```
TRADE                         | AMOUNT      | $/m² GFA | SOURCE
──────────────────────────────────────────────────────────────────
Concrete & formwork           | $           | $        | QTY-BASED
Structural steel              | $           | $        | ELEMENTAL
Facade & cladding             | $           | $        | ELEMENTAL
Mechanical (HVAC)             | $           | $        | ELEMENTAL
Electrical                    | $           | $        | ELEMENTAL
Hydraulic                     | $           | $        | ELEMENTAL
Fire services                 | $           | $        | ELEMENTAL
Lifts                         | $           | $        | ELEMENTAL
──────────────────────────────────────────────────────────────────
Major Trades Subtotal         | $           | $        |

Remaining trades (elemental)  | $           | $        | ELEMENTAL
Preliminaries                 | $           | $        | ELEMENTAL
Margin                        | $           | $        | [X]%
──────────────────────────────────────────────────────────────────
PRE-TENDER ESTIMATE TOTAL     | $           | $/m² GFA |
```

**Part B — Comparison to Previous Cost Plan:**
```
Pre-Tender Estimate:          $[amount]
Previous Cost Plan (Stage 3): $[amount]
Movement:                     $[amount] (+/-X%)
Explanation of movement:      [key changes since last cost plan]
```

## Output File

Save to: `outputs/reports/cost-plan-stage[X]-[project-abbreviated]-[date].xlsx`

Include tabs:
1. **Summary** — total construction cost, $/m², stage, key assumptions
2. **Elemental Detail** — full cost plan template above
3. **Rates & Sources** — all rates used with source and date
4. **Comparison** — movement from previous cost plan
5. **Assumptions** — all assumptions and qualifications

## Phase 4 Enhancement

In Phase 4, this skill will be upgraded to Tier 3 with full Rawlinsons rate tables loaded as reference files, including:
- `rawlinsons-residential-rates.md` — residential building rates by type and location
- `rawlinsons-commercial-rates.md` — commercial building rates
- `rawlinsons-elemental-rates.md` — elemental rates by category
- `rawlinsons-location-factors.md` — location adjustment factors

Until then, Finance Agent must:
1. Apply training-knowledge rates
2. Clearly label all rates as "estimated — verify against current Rawlinsons"
3. Provide an accuracy range on every output
4. Recommend a QS review if the cost plan will be used for financial commitment
