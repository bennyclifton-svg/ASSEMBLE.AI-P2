---
name: planning-risk
tier: 2
description: Planning risk assessment scaffold — planning controls analysis, DCP extraction, risk matrix (green/amber/red), and precedent DA analysis. Feasibility Agent applies general knowledge within this structure for the specific LGA and project type.
agent: feasibility
---

# Skill: Planning Risk

**Tier 2 — Scaffold skill.** Provides the planning risk assessment structure, risk matrix format, and DA precedent analysis process. Feasibility Agent applies knowledge of Australian planning systems and researches specific council controls.

## When to Load This Skill

Load when the user asks for:
- Planning assessment or planning risk analysis
- Zoning analysis and development potential
- DCP controls summary
- Planning risk rating
- "Can we develop this site?"
- "What are the planning risks?"

## Required Inputs

| Input | Source |
|-------|--------|
| Site address | User |
| Proposed development type | User (or infer from feasibility context) |
| LGA identified | From site assessment |
| Site area | From site assessment |

## Step 1: Identify Applicable Planning Controls

Search the relevant planning instruments for the LGA:

```
PLANNING CONTROLS SUMMARY
─────────────────────────────────────────────────────────
LEP:          [Council LEP name and year]
Zone:         [Zone code] — [Zone name]
               (e.g., R3 Medium Density Residential)

Permissible uses:
  Proposed use ([residential flat building / commercial / mixed use]):
  [PERMISSIBLE WITH CONSENT / PERMISSIBLE WITHOUT CONSENT / PROHIBITED]

Development standards:
  Max Height:      [X]m (approx [X]–[X] storeys)
  Max FSR:         [X:1] → Max GFA: [site area] × [FSR] = [X,XXX]m²
  Min Lot Size:    [X]m² — [compliant ✓ / non-compliant ✗: site = Xm²]
  Floor Space Ratio Exception clause: [applicable/not applicable]

Overlays and constraints:
  Heritage:        [Listed as heritage item / In heritage conservation area / Not heritage]
  Flood:           [Flood affected — [category] / Not flood-affected]
  Bushfire:        [Bushfire prone land — [category] / Not bushfire-prone]
  Contamination:   [On EPA register / Not on EPA register / Industrial history — assess]
  Biodiversity:    [Biodiversity-sensitive area / No constraint]
  Acid sulfate:    [Class X / No constraint]
  Aircraft noise:  [ANEF contour / No constraint]
  Coastal:         [Coastal management area / No constraint]

Special legislation:
  SEPP 65 (RFDC/ADG): [Applicable / Not applicable]
  SEPP Housing:    [Applicable / Not applicable]
  BASIX:           [Applicable — [residential type] / Not applicable]
  NatHERS:         [Applicable / Not applicable]
─────────────────────────────────────────────────────────
```

## Step 2: Extract Key DCP Controls

Research the council DCP for the most relevant provisions:

```
DCP CONTROLS — KEY PROVISIONS
([Council] DCP [Year] — Part [X], [Chapter name])
─────────────────────────────────────────────────────────
Front setback:      [X]m minimum (or consistent with streetscape character)
Side setbacks:      [X]m (habitable) / [X]m (non-habitable) / [varies by storey]
Rear setback:       [X]m minimum (at upper levels)
Building separation:[Per ADG / DCP specific: Xm habitable-to-habitable]
Car parking:        [X spaces per [dwelling type / 100m² GFA]]
  Visitor parking:  [X% of total]
  Bicycle parking:  [As required by DCP cl.X]
Deep soil zone:     [X% of site area = Xm²]
Communal open space:[X% of site area = Xm²]
Private open space: [Xm² per bedroom or per dwelling type]
Solar access:       [X% of dwellings to receive Xhr sun at [date]]
Cross-ventilation:  [X% of dwellings]
Apartment mix:      [Minimum X% X-bedroom, etc.]
Facade articulation:[Per DCP design principles]
─────────────────────────────────────────────────────────
```

## Step 3: Develop Potential Assessment

Based on the planning controls, calculate the potential yield:

```
DEVELOPMENT POTENTIAL
─────────────────────────────────────────────────────────
Maximum permissible GFA:  [site area × FSR] = [X,XXX]m²
Practical GFA estimate:   ~[X,XXX]m² (allow [X]% reduction for
  circulation, structure, setback compliance, deep soil, etc.)
Estimated yield:
  [Residential]: ~[X] dwellings at [average Xm² per unit]
  [Commercial]:  ~[X,XXX]m² NLA
  [Mixed use]:   ~[X] dwellings + [X,XXX]m² commercial
Height envelope: [X] storeys (max [X]m)
Site coverage:   ~[X]% (estimated)
─────────────────────────────────────────────────────────
NOTE: This is a desktop assessment. Yield is subject to design
resolution of setbacks, DCP controls, and building separation.
A range of ±10-15% yield should be assumed at this stage.
```

## Step 4: Planning Risk Matrix

Assess each control category as GREEN / AMBER / RED:

```
PLANNING RISK ASSESSMENT
─────────────────────────────────────────────────────────
✓ LOW RISK — Green (compliant or straightforward):
  [List items and brief explanation]

⚠ MODERATE RISK — Amber (achievable with careful design):
  [List items and brief explanation of what careful design must address]

✗ HIGH RISK — Red (potential deal-breaker or significant cost/time impact):
  [List items and brief explanation of consequence if not resolved]
─────────────────────────────────────────────────────────
OVERALL PLANNING RISK: [LOW / MODERATE / HIGH]
Key risk factors: [top 2-3]
Recommended actions: [specific actions to reduce risk before acquisition]
```

## Step 5: Precedent DA Analysis

Search the NSW Planning Portal (or state equivalent) for comparable DAs:

```
COMPARABLE DEVELOPMENT APPLICATIONS
─────────────────────────────────────────────────────────
Search: [LGA] planning portal, [development type], [zone], [X years]

1. DA/[YYYY]/[XXXX] — [address]
   [Description: units/m², storeys, zone, FSR]
   Outcome: [APPROVED / REFUSED / PENDING] — [X weeks determination]
   Relevance: [How this DA informs risk for the subject site]

2. DA/[YYYY]/[XXXX] — [address]
   [As above]

3. DA/[YYYY]/[XXXX] — [address]
   [As above]
─────────────────────────────────────────────────────────
PRECEDENT FINDINGS:
- [Key conclusion from comparable DAs — typical determination time, key issues]
- [Any refusals in the area — note the grounds, assess whether same issues apply]
- [Any approvals with conditions — likely conditions for similar project]
```

## Step 6: Planning Pathway Recommendation

```
RECOMMENDED PLANNING PATHWAY
─────────────────────────────────────────────────────────
Application type:    [Local DA / Complying Development / State Significant Dev]
Pre-lodgement:       [Required / Recommended / Not required]
  Reason:            [Complex design / heritage / significant development]
JRPP referral:       [Required if development cost > $X / Not required]
State agency refs:   [RMS / Sydney Water / DPIE / Other — if applicable]
Likely determination:[X–X weeks based on comparable DAs and LGA benchmarks]
Key risks to timeline:[Council referrals, objections, political sensitivity]
─────────────────────────────────────────────────────────
→ INPUTS TO PROGRAM AGENT:
  DA lodgement target: [approximate date based on design timeline]
  DA determination:    [+X weeks from lodgement]
  Flag: [any specific timeline risks]
```

## Output

Planning risk assessment is embedded in the feasibility report or quick summary. If a standalone document is requested:
Save to: `outputs/reports/planning-risk-[project]-[date].md`

Also maintain as a section in: `outputs/reports/feasibility-report-[project]-[date].docx`
