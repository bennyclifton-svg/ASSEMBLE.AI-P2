---
name: stakeholder-mapping
tier: 2
description: Stakeholder identification and engagement strategy scaffold. Identifies stakeholders by category, assesses interest/influence, and recommends engagement strategy and timing. Feasibility Agent applies within this structure.
agent: feasibility
---

# Skill: Stakeholder Mapping

**Tier 2 — Scaffold skill.** Provides the stakeholder identification framework, influence/interest assessment, and engagement strategy template. Feasibility Agent populates with project-specific stakeholders.

## When to Load This Skill

Load when the user asks for:
- Stakeholder analysis or mapping
- Community engagement strategy
- "Who do we need to engage?"
- "Who could object to this development?"
- Engagement plan for a specific phase

## Step 1: Identify Stakeholders

Work through each category and identify specific stakeholders for this project:

### Category 1: Statutory Authorities (always engage)
```
Council (planning department):
  Contact: [Assessment officer or planning counter]
  Role: DA assessment, conditions, referrals
  Interest: Development quality, compliance, community impact

Council (development contributions):
  Contact: [Contributions officer]
  Role: Section 7.11/7.12 contributions, infrastructure levies

State agencies (project-specific — check which apply):
  - DPIE (Housing) — if State Significant Development threshold
  - Transport for NSW (RMS) — if traffic generation significant
  - Sydney Water — utility infrastructure
  - Ausgrid / Essential Energy — electrical infrastructure
  - NPWS — if adjacent to national park or nature reserve
  - Heritage NSW — if heritage-listed or near heritage items
  - Land and Environment Court — appeal authority (not engagement target,
    but flag if litigation risk)
```

### Category 2: Adjacent Landowners
```
Immediate neighbours — identify and assess:
  [Direction] — [address]: [description of property, likely interests/concerns]
  [Direction] — [address]: [description of property, likely interests/concerns]

Key concern types:
  - Overshadowing (southern neighbours most affected in Australia)
  - Privacy and overlooking
  - Noise during construction and operation
  - Traffic and parking during construction and operation
  - Heritage character impacts
  - Loss of view (limited legal protection but often motivates objections)
```

### Category 3: Community and Organised Groups
```
Local community groups: [Residents' associations, precinct committees]
  Identify: [Research local area — are there active residents groups?]
  Likely stance: [Supportive / Neutral / Opposed]

Heritage advocacy groups: [Local heritage societies if heritage-sensitive area]

Business associations: [If commercial development, local business groups]

Environmental groups: [If biodiversity or environmental sensitivity present]
```

### Category 4: Project Stakeholders (internal)
```
Client / Principal: [Name and role]
  Interest: Maximum return, smooth approval process, programme certainty

Financier / Bank: [If engaged]
  Interest: Security, feasibility, DA approval, valuations

Legal counsel: [Conveyancers, planning lawyers if complex]

Marketing team: [If residential sales — presales programme impacts design brief]

Future purchasers / tenants: [Market research informs the brief]
```

## Step 2: Influence and Interest Assessment

Map stakeholders on a 2x2 matrix:

```
STAKEHOLDER INFLUENCE / INTEREST MATRIX

                    LOW INTEREST        HIGH INTEREST
                 ┌──────────────────┬──────────────────┐
HIGH INFLUENCE   │  KEEP SATISFIED  │  MANAGE CLOSELY  │
                 │  [stakeholders]  │  [stakeholders]  │
                 ├──────────────────┼──────────────────┤
LOW INFLUENCE    │    MONITOR       │  KEEP INFORMED   │
                 │  [stakeholders]  │  [stakeholders]  │
                 └──────────────────┴──────────────────┘

Manage Closely (High interest, High influence):
  [List]

Keep Satisfied (Low interest, High influence):
  [List]

Keep Informed (High interest, Low influence):
  [List]

Monitor (Low interest, Low influence):
  [List]
```

## Step 3: Engagement Strategy

For each key stakeholder group, recommend when and how to engage:

```
ENGAGEMENT STRATEGY
─────────────────────────────────────────────────────────
PRIORITY 1 — Before acquisition / exchange:

a) Council pre-lodgement meeting (RECOMMENDED)
   Who: Planning department + urban design officer
   When: Before acquisition (confirm planning pathway) or early design
   Purpose: Confirm planning controls, discuss design approach, identify referrals
   What to bring: Site plan, proposed concept massing, yield assumption
   Expected outcome: Planning officer confirms pathway, identifies key issues
   → Via: Formal letter or email request (Correspondence Agent)

b) Southern neighbour (if significant overshadowing/privacy concern)
   Who: [Address — occupant or owner via title search]
   When: Before acquisition — early flag of intention
   Purpose: Establish relationship before they become an objector
   Approach: Informal introductory meeting — not a design presentation
   Note: Do not make commitments before design is resolved

PRIORITY 2 — During design phase:

c) Council design review / design panel (if required)
   Who: Council urban design staff or independent design review panel
   When: Concept/Schematic stage
   Purpose: Design quality review before DA lodgement
   Note: Mandatory for some councils and development types

d) Community consultation (if politically sensitive or large development)
   Who: Local residents, community groups
   When: Pre-DA lodgement
   Purpose: Get ahead of objections, demonstrate responsiveness
   Method: Information letter to adjacent owners, public meeting if large development

PRIORITY 3 — DA lodgement and assessment:

e) Standard DA notification
   Who: Adjacent owners and occupiers (council notifies)
   When: During DA exhibition period
   Purpose: Statutory requirement
   Response: Address submissions in SEE addendum or letter

f) Assessment officer liaison
   Who: Allocated council assessment officer
   When: Throughout DA assessment
   Purpose: Respond to queries, manage RFIs, understand concerns
   → Via: Correspondence Agent (COR or email series)
─────────────────────────────────────────────────────────
```

## Step 4: Political Sensitivity Assessment

```
POLITICAL SENSITIVITY ASSESSMENT
─────────────────────────────────────────────────────────
Is this development likely to attract:
  ☐ Significant community opposition (scale, character impact)
  ☐ Heritage controversy (significant heritage context)
  ☐ Environmental controversy (significant trees, biodiversity)
  ☐ Media attention (prominent site, controversial use)
  ☐ Councillor intervention (politically active neighbourhood)

Political sensitivity rating: [LOW / MODERATE / HIGH]

If MODERATE or HIGH:
  → Recommend briefing local councillor(s) before DA lodgement
  → Consider community information session
  → Prepare communications strategy with PR/communications advice
  → Engage experienced town planner with local council relationships
─────────────────────────────────────────────────────────
```

## Stakeholder Register

Maintain a simple register of key stakeholders and engagement actions:

```
STAKEHOLDER REGISTER
─────────────────────────────────────────────────────────────────────────────
Stakeholder          | Role/Interest      | Priority | Last Contact | Next Action
─────────────────────────────────────────────────────────────────────────────
Council planning     | Assessment         | HIGH     | [date]       | [action]
Southern neighbour   | Overshadowing      | HIGH     | [date]       | [action]
[other stakeholders]
─────────────────────────────────────────────────────────────────────────────
```

## Output

Stakeholder mapping is embedded in the feasibility report. If a standalone document is requested:
Save to: `outputs/reports/stakeholder-map-[project]-[date].md` or `.xlsx`

Add key stakeholder contact details to the `contacts` table in `project.db` via the Correspondence Agent's contact management function.
