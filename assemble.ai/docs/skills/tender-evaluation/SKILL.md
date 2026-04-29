---
name: tender-evaluation
tier: 2
description: Tender evaluation scaffold for head contractor and trade package assessments. Price and non-price criteria, weighted and unweighted methodologies, evaluation matrix templates, interview scoring, tender evaluation report structure.
agents: [procurement, delivery]
---

# Tender Evaluation Skill

## When to Load

Load this skill when:
- Tender submissions have been received and need to be evaluated
- Preparing an evaluation methodology before issuing an RFT (so criteria can be published)
- Conducting tender interviews
- Preparing a Tender Evaluation Report for user sign-off

---

## Step 1: Choose the Evaluation Methodology

Before evaluating, confirm the methodology with the user. This should align with what was published in the tender documents.

### Weighted vs Unweighted

**Use weighted scoring when:**
- Complex projects where non-price factors significantly differentiate tenderers
- Client has specific capability requirements (e.g., specialist façade contractor)
- Closely priced tenders where non-price factors will drive the recommendation
- Projects where safety record or programme capability is a key risk

**Use unweighted (narrative) assessment when:**
- Straightforward projects where price is the primary differentiator
- All shortlisted contractors are known to be capable
- Small or simple packages where evaluation complexity isn't warranted
- Trade packages where price comparison is the main output

---

## Step 2: Non-Price Assessment

### Criteria and Typical Weightings (Head Contractor)

| Criterion | Typical Weight | What to Assess |
|-----------|--------------|----------------|
| Relevant experience | 25% | Similar projects (type, scale, complexity) completed in last 5 years. Quality of examples, not just quantity. |
| Key personnel | 20% | Project manager and site manager — experience on similar projects, stated availability and commitment to this project. |
| Methodology | 15% | Construction approach, staging logic, risk management. Is it realistic and project-specific, or a generic submission? |
| Programme | 10% | Realistic duration, critical path understanding, resource plan, long-lead allowances. |
| Capacity | 10% | Current workload, financial capacity, bonding capacity, subcontractor relationships. |
| Safety | 10% | LTIFR and TRIFR (last 3 years), safety management system, safe work method statement examples. |
| Subcontractor management | 5% | Approach to sub-procurement, nominated subcontractors with firm pricing vs allowances. |
| References | 5% | Referee feedback from 2–3 recent similar projects. Call references — don't rely on written statements alone. |
| **TOTAL** | **100%** | |

### Criteria and Typical Weightings (Trade Package)

| Criterion | Typical Weight | What to Assess |
|-----------|--------------|----------------|
| Relevant experience | 40% | Similar trade packages in last 3 years. Scale and complexity match. |
| Key personnel | 20% | Site supervisor/foreman experience. Will be on site daily. |
| Safety | 20% | Safety record, SWMS quality, WHS management system. |
| Capacity / programme | 20% | Current workload, can they start and sustain the required programme? |
| **TOTAL** | **100%** | |

*Adjust weights to project requirements — document the rationale.*

### Scoring Scale

Use a consistent scale across all evaluators:

| Score | Description |
|-------|------------|
| 5 | Excellent — exceeds requirements, very strong evidence |
| 4 | Good — meets requirements, solid evidence |
| 3 | Satisfactory — meets minimum requirements, adequate evidence |
| 2 | Below standard — partially meets requirements, weak evidence |
| 1 | Poor — does not meet requirements |
| 0 | No submission / disqualifying deficiency |

### Non-Price Assessment Matrix Template

```
NON-PRICE ASSESSMENT MATRIX
Project: [Name] | Package: [description]
Date: [date] | Evaluator: [name]

CRITERIA WEIGHTS:
Relevant experience:     [X]%
Key personnel:           [X]%
Methodology:             [X]%
Programme:               [X]%
Capacity:                [X]%
Safety:                  [X]%
Subcontractor mgmt:      [X]%
References:              [X]%

SCORING:
                     | Weight | [Tenderer A] |       | [Tenderer B] |       | [Tenderer C] |       |
Criterion            |        | Raw (0-5)    | Wtd   | Raw (0-5)    | Wtd   | Raw (0-5)    | Wtd   |
---------------------|--------|--------------|-------|--------------|-------|--------------|-------|
Relevant experience  | [X]%   |              |       |              |       |              |       |
Key personnel        | [X]%   |              |       |              |       |              |       |
Methodology          | [X]%   |              |       |              |       |              |       |
Programme            | [X]%   |              |       |              |       |              |       |
Capacity             | [X]%   |              |       |              |       |              |       |
Safety               | [X]%   |              |       |              |       |              |       |
Subcontractor mgmt   | [X]%   |              |       |              |       |              |       |
References           | [X]%   |              |       |              |       |              |       |
---------------------|--------|--------------|-------|--------------|-------|--------------|-------|
NON-PRICE TOTAL      | 100%   |              | /500  |              | /500  |              | /500  |
Normalised (0-100)   |        |              |       |              |       |              |       |

NARRATIVE NOTES (per tenderer):
[Tenderer A]: [key strengths and weaknesses]
[Tenderer B]: [key strengths and weaknesses]
[Tenderer C]: [key strengths and weaknesses]
```

---

## Step 3: Price Assessment

### Price Comparison Table

```
PRICE ASSESSMENT
Project: [Name] | Package: [description]
Tender close: [date]

PRE-TENDER ESTIMATE (Finance Agent): $[amount]

| Item                          | [Tenderer A] | [Tenderer B] | [Tenderer C] |
|-------------------------------|-------------|-------------|-------------|
| Submitted tender price (excl GST) | $       | $           | $           |
| Adjustments for qualifications | $          | $           | $           |
| Adjusted comparable price     | $           | $           | $           |
| Variance from pre-tender estimate | [X]%    | [X]%        | [X]%        |
| Rank (price)                  | [1/2/3]     | [1/2/3]     | [1/2/3]     |

PRICING BREAKDOWN COMPARISON:
| Trade                | Budget | [Tenderer A] | [Tenderer B] | [Tenderer C] |
|----------------------|--------|-------------|-------------|-------------|
| Preliminaries        | $      | $           | $           | $           |
| [Trade 1]            | $      | $           | $           | $           |
| [Trade 2]            | $      | $           | $           | $           |
| [Trade 3]            | $      | $           | $           | $           |
| Provisional sums     | $      | $           | $           | $           |
| Margin               | $      | $           | $           | $           |
| TOTAL                | $      | $           | $           | $           |

ANOMALIES AND FLAGS:
- [Tenderer X]: Preliminaries are [X]% [above/below] the others — [note reason if known]
- [Tenderer X]: [Trade] allowance appears [low/high] — risk of variation claims
- [Tenderer X]: Margin of [X]% is [below market] — sustainability risk
- [Tenderer X]: Significant qualifications on [item] — adjusted price excludes $[amount]
```

### Price Flags to Investigate

| Flag | What it Signals | Action |
|------|----------------|--------|
| Preliminary rate very low | Contractor may be front-loading or underpricing time-related costs | Ask in interview — how are they resourced? |
| Margin below 5% | Unsustainable — risk of disputes, cost-cutting on site, insolvency | Treat with caution regardless of price ranking |
| One trade item very low | Scope misunderstanding, or relying on back-charges / variations | Clarify in interview |
| Provisional sums differ | May be interpreting PS scope differently | Normalise before comparing totals |
| Heavy qualifications/exclusions | Adjusted price may be higher than it appears | Normalise all before comparing |
| Front-loading | Large payments early, low late — cashflow risk to client | Discuss with Finance Agent |

---

## Step 4: Combined Scoring (Weighted Method)

```
COMBINED ASSESSMENT — WEIGHTED
Project: [Name]

Non-price weighting: [X]% | Price weighting: [X]%
(Typical split: 50/50 or 40 price / 60 non-price for complex projects)

PRICE SCORING METHOD:
Lowest adjusted price scores 100. Others scored proportionally:
Price Score = (Lowest Price / Tenderer Price) × 100

|                          | [Tenderer A] | [Tenderer B] | [Tenderer C] |
|--------------------------|-------------|-------------|-------------|
| Non-price score (0-100)  |             |             |             |
| Non-price weighted       |             |             |             |
| Price score (0-100)      |             |             |             |
| Price weighted           |             |             |             |
| COMBINED SCORE           |             |             |             |
| RANK                     |             |             |             |
```

---

## Step 5: Reference Checks

Conduct reference checks on the preferred tenderer (at minimum) before recommending award.

### Reference Check Template

```
REFERENCE CHECK
Tenderer: [name]
Referee: [name, title, organisation]
Project referenced: [name, value, year]
Conducted by: [name] | Date: [date]

Questions:
1. Was the project completed on time? If not, what caused the delay and how was it managed?
   Response: 

2. Were there significant cost variations? How did the contractor manage variations?
   Response: 

3. How did the contractor manage quality? Were there defect issues?
   Response: 

4. How did the contractor communicate and manage the relationship?
   Response: 

5. Were there any safety incidents? How was safety managed on site?
   Response: 

6. Would you use this contractor again? Why / why not?
   Response: 

Overall assessment: [Positive / Neutral / Negative]
Notes: 
```

---

## Step 6: Tender Interviews

Conduct structured interviews for shortlisted tenderers (typically top 2–3).

### Interview Agenda Template

```
TENDER INTERVIEW AGENDA
Project: [Name] | Package: [description]
Tenderer: [name]
Date / Time / Location: [details]
Duration: 60–90 minutes

Panel members (Principal side): [names and roles]
Tenderer attendees requested: Project Director, Proposed PM, Proposed Site Manager

AGENDA:
00:00 — Introduction (5 min)
  - Project overview
  - Interview purpose and process
  - Ground rules (no commercially sensitive information about other tenderers)

00:05 — Tenderer Presentation (15 min)
  - Their approach, team, and methodology
  - No slides required — conversational

00:20 — Key Personnel (15 min)
  - Meet proposed PM and site manager
  - Availability and commitment to this project
  - Relevant experience

00:35 — Programme Deep-Dive (10 min)
  - Walk through their programme logic
  - Critical path identification
  - Key risks and mitigation

00:45 — Tender Clarifications (15 min)
  - Specific questions on pricing, qualifications, exclusions

01:00 — Safety and Quality (10 min)
  - Safety record and management approach
  - Quality management approach

01:10 — Tenderer Questions (10 min)
  - Contractor's questions about the project

01:20 — Close
```

### Interview Scoring Sheet

```
INTERVIEW SCORING SHEET
Project: [Name] | Tenderer: [name] | Date: [date]

| Area              | Notes from Interview                    | Score Adjustment |
|-------------------|-----------------------------------------|-----------------|
| Key personnel     |                                         | +/- [points]    |
| Programme logic   |                                         | +/- [points]    |
| Pricing clarity   |                                         | +/- [points]    |
| Safety culture    |                                         | +/- [points]    |
| Qualifications resolved |                                   | +/- [points]    |
| Overall impression |                                        | +/- [points]    |

POST-INTERVIEW ASSESSMENT ADJUSTMENT:
Pre-interview score: [X]
Adjustment: [+/-X] — [reason]
Post-interview score: [X]

Key observations:
```

---

## Step 7: Tender Evaluation Report

The formal output — prepared for user sign-off before award.

```
TENDER EVALUATION REPORT
=====================================
Project: [Name]
Package: [Head Contract / TP-XX]
Procurement method: [Select tender with EOI / Direct select / etc.]
Contract form: [AS 4000 / AS 2124 / AS 4902 / ABIC / Subcontract]
Report date: [date]
Prepared by: [Procurement Agent / Delivery Agent]

1. EXECUTIVE SUMMARY AND RECOMMENDATION
   Recommended tenderer: [name]
   Recommended contract value (excl GST): $[amount]
   Basis of recommendation: [2–3 sentences]

2. PROCUREMENT PROCESS SUMMARY
   EOI issued: [date] | Submissions received: [X]
   Shortlist approved: [date] | Tenderers shortlisted: [names]
   RFT issued: [date] | Tender close: [date]
   Tenders received: [X] | Addenda issued: [X]
   Site inspection: [date] | Interviews conducted: [yes/no, date]
   Evaluation methodology: [weighted/unweighted, split]

3. COMPLIANCE CHECK
   | Tenderer | Form signed | Addenda ack'd | All docs provided | Compliant |
   |----------|------------|---------------|-------------------|-----------|
   | [A]      | ✓          | ✓             | ✓                 | Yes       |

4. NON-PRICE ASSESSMENT
   [Insert completed non-price assessment matrix]
   Summary narrative per tenderer.

5. PRICE ASSESSMENT
   [Insert price comparison table]
   Variance from pre-tender estimate: [analysis]
   Anomalies identified and resolved: [list]

6. COMBINED ASSESSMENT
   [Insert combined scoring table]
   Overall ranking: 1st [name], 2nd [name], 3rd [name]

7. INTERVIEW OUTCOMES (if conducted)
   [Summary of each interview, score adjustments]

8. FINANCE AGENT VALIDATION
   Preferred tender price: $[amount]
   Finance Agent confirmation: [fits within cost plan / variance of $X noted]
   Cost plan impact: [nil / requires [X] drawdown of contingency]

9. RISK ASSESSMENT — PREFERRED TENDERER
   [Key risks and proposed mitigation]

10. RECOMMENDATION
    Award to: [name]
    Contract value (excl GST): $[amount]
    Conditions of award: [list any conditions, e.g., key personnel locked in, 
    programme to be submitted within 14 days of award]

⚠ This report requires your approval before award proceeds.
→ Would you like me to draft the award letter and unsuccessful 
  tenderer notifications? (via Correspondence Agent)
```

---

## Finance Agent Validation Step

Before finalising the report, trigger Finance Agent validation:

```
FINANCE AGENT REQUEST:
Please confirm that the preferred tender price of $[amount] (excl GST) 
for [package description] fits within the current cost plan.

Current cost plan allowance for this package: $[amount from cost plan]
Variance: $[amount / X%]

Please advise: (a) whether the price is within budget, and 
(b) whether contingency drawdown is required.
```

The Finance Agent's response is included in Section 8 of the Tender Evaluation Report.
