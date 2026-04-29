---
name: risk-schedule
tier: 1
description: Tier 1 skill — schedule risk assessment. Program Agent uses general knowledge to identify, assess, and prioritise schedule risks from project context. No scaffold required.
agent: program
---

# Skill: Risk Schedule

**Tier 1 — No scaffold required.** The Program Agent assesses schedule risks using its training knowledge and project context. This skill is a reference document, not a loaded scaffold.

## When This Skill Applies

- Identifying schedule risks for a new project or phase
- Reviewing risk exposure at a gate review
- Answering "what are the biggest schedule risks?"
- Preparing a risk register entry for programme risks

## What the Program Agent Does

1. **Review** the project context from PROJECT_MEMORY (type, phase, jurisdiction, key dates)
2. **Identify** schedule risks relevant to the project type and current stage
3. **Assess** each risk on likelihood and impact (HIGH/MEDIUM/LOW)
4. **Prioritise** the top risks by expected impact on programme
5. **Recommend** mitigation actions for high-rated risks

## Common Schedule Risks by Phase

### Feasibility / Pre-Construction
- Site acquisition delays (title, negotiation, finance approval)
- Planning / DA delays — council referrals, objections, JRPP, LEC
- Heritage or environmental assessment delays
- Design scope uncertainty causing programme extension
- Key consultant availability / appointment delays

### Design Phase
- DA determination taking longer than programmed (common — flag if <5% float)
- Design changes by Principal increasing documentation time
- Coordination issues between consultants delaying drawing issue
- Council conditions requiring additional design work post-DA
- Long-lead equipment requiring early procurement (lifts, HVAC plant, switchboards)

### Procurement Phase
- Insufficient tenderers — re-tender required
- Tender price exceeding budget — value engineering delay
- Contract negotiation and execution delays
- Key subcontractor availability (tight market)

### Delivery Phase
- Weather delays exceeding programme allowance
- Subcontractor insolvency or withdrawal
- Material supply / lead time issues
- Rock or contamination encountered (if geotech was uncertain)
- Superintendent instruction delays causing contractor idle time
- Progress claims disputes causing contractor to slow work
- Unforeseen authority requirements post-DA

## Risk Assessment Format

```
SCHEDULE RISK REGISTER — [Project Name]
Prepared: Program Agent  |  Date: [DD Month YYYY]
─────────────────────────────────────────────────────────────────────────────────────
#  | Risk                        | Phase      | Likelihood | Impact  | Rating | Mitigation
─────────────────────────────────────────────────────────────────────────────────────
1  | [description]               | [phase]    | HIGH/MED/LOW | HIGH/MED/LOW | H/M/L | [action]
2  | [description]               | [phase]    | HIGH/MED/LOW | HIGH/MED/LOW | H/M/L | [action]
...
─────────────────────────────────────────────────────────────────────────────────────

Rating = Likelihood × Impact:
  HIGH × HIGH = Critical (🔴)
  HIGH × MEDIUM or MEDIUM × HIGH = High (🟠)
  MEDIUM × MEDIUM or HIGH × LOW = Medium (🟡)
  LOW × LOW or LOW × MEDIUM = Low (🟢)

TOP 3 PROGRAMME RISKS:
1. [Highest rated risk + programme impact in weeks if it crystallises]
2. [Second highest]
3. [Third highest]

RECOMMENDED ACTIONS:
[For each HIGH/CRITICAL risk — specific action to reduce likelihood or impact]
```

## Output

Risk schedule is typically embedded in the programme report or feasibility/gate documents, not a standalone output. If a standalone document is requested, save to:
`outputs/reports/risk-schedule-[project]-[date].md`
