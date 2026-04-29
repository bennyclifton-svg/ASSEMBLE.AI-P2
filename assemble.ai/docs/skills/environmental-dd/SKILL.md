---
name: environmental-dd
tier: 2
description: Environmental due diligence checklist and desktop contamination assessment framework. Covers flood, bushfire, heritage, biodiversity, contamination, Aboriginal heritage, and geotechnical risk. Feasibility Agent applies general knowledge within this structure.
agent: feasibility
---

# Skill: Environmental Due Diligence

**Tier 2 — Scaffold skill.** Provides the due diligence checklist structure, desktop contamination assessment framework, and environmental risk summary format. Feasibility Agent applies to the specific site using available data and research.

## When to Load This Skill

Load when the user asks for:
- Environmental due diligence
- Contamination assessment (preliminary/desktop)
- Flood / bushfire / heritage / biodiversity check
- Full DD checklist status
- "What are the environmental risks?"

## Due Diligence Master Checklist

Work through all items. Update status as information becomes available.

```
ENVIRONMENTAL & SITE DUE DILIGENCE CHECKLIST
Project: [Name]    Site: [Address]    Date: [DD Month YYYY]
─────────────────────────────────────────────────────────────────────────────
ITEM                          | STATUS           | ACTION REQUIRED
─────────────────────────────────────────────────────────────────────────────
TITLE & LEGAL
☐ Title search                | [Available/TBC]  | [Order from NSW LRS if needed]
☐ Section 10.7 certificate    | [Available/TBC]  | [Order from council]
☐ Survey                      | [Available/TBC]  | [Commission if needed]
☐ Easements review            | [Done/TBC]       | [Flag items for legal review]
☐ Restrictive covenants review| [Done/TBC]       | [Flag items for legal review]

PLANNING
☐ Zoning confirmed (LEP)      | [Confirmed]      | [Check planning portal]
☐ Planning controls extracted | [Confirmed]      | [See planning-risk skill output]
☐ Section 10.7 planning cert  | [Available/TBC]  | [Order from council]
☐ Outstanding DAs on site     | [Checked]        | [List if any]

FLOOD
☐ Flood map check             | [Status]         | [Check council/DPIE flood maps]
☐ Flood planning level        | [FPL: Xm AHD]    | [If flood-affected — detail category]
☐ Flood certificate ordered   | [Status]         | [If required by council]

BUSHFIRE
☐ Bushfire prone land check   | [Prone/Not prone]| [Check NSW RFS mapping portal]
☐ BAL assessment required     | [Yes/No]         | [If prone — state BAL category if known]

HERITAGE
☐ State Heritage Register     | [Listed/Not]     | [Check NSW Heritage portal]
☐ Local heritage item (LEP)   | [Listed/Not]     | [Check LEP Schedule 5]
☐ Heritage conservation area  | [In area/Not]    | [Check LEP maps]
☐ Heritage advisor required   | [Yes/No]         | [If listed — engage heritage architect]

ABORIGINAL HERITAGE
☐ AHIMS search                | [Not done — flag]| [Formal search request required]
⚠ Cannot confirm Aboriginal   |                  | [Order from DPE — 2-3 weeks, fee $X]
  heritage status without      |
  formal AHIMS search          |

CONTAMINATION
☐ EPA register check          | [On/Not on reg]  | [Check NSW EPA "find contaminated land"]
☐ Site history research       | [Done/TBC]       | [Historical aerials, council records]
☐ Preliminary desktop assess  | [Done/TBC]       | [See contamination section below]
☐ PSI recommended?            | [Yes/No]         | [See contamination section below]

BIODIVERSITY
☐ Biodiversity values map     | [Status]         | [Check NSW BVM portal]
☐ Vegetation on site          | [Status]         | [Note significant trees, TPO]
☐ Biodiversity cert required? | [Yes/No]         | [If high biodiversity — complex pathway]

GEOTECHNICAL
☐ Geotech report              | [Available/TBC]  | [Commission if not available]
☐ Known ground conditions     | [Status]         | [Local knowledge, comparable projects]

ACOUSTIC
☐ Acoustic environment        | [Status]         | [Near traffic/rail/industrial? Note]
☐ Acoustic assessment req'd   | [Yes/No]         | [If near noise sources]

TRAFFIC
☐ Traffic assessment req'd    | [Yes/No]         | [Based on scale and access]
☐ Site access suitable        | [Suitable/Issues]| [From site assessment]

SERVICES
☐ Sewer connection            | [Connected/TBC]  | [From site assessment / Sydney Water]
☐ Water connection            | [Connected/TBC]  | [From site assessment]
☐ Electrical capacity         | [Adequate/TBC]   | [For intended use]
☐ Gas                         | [Available/Not]  |
─────────────────────────────────────────────────────────────────────────────
```

## Preliminary Desktop Contamination Assessment

Conduct for any site with industrial, commercial, or unknown history.

### Site History Research

Investigate the site's historical land use using:
- Historical aerial photographs (Google Earth historical view, NearMap if available)
- Council DA records and rate records
- Industry sector databases
- Adjacent land use (source migration risk)

```
CONTAMINATION — PRELIMINARY DESKTOP ASSESSMENT
─────────────────────────────────────────────────────────
Site:             [Address]
Current use:      [Description]
Historical use:   [Research findings — describe uses going back as far as possible]
Adjacent land:    [Uses that could be source of migration contamination]

Contaminants of Concern (CoC):
Based on site history, the following CoC are identified:
  [List potential contaminants based on identified uses]
  e.g., Heavy metals (from metal fabrication)
       Hydrocarbons (from fuel storage, machinery)
       Asbestos (building age pre-1990)
       Chlorinated solvents (from dry cleaning, degreasing)
       Pesticides/herbicides (from horticulture, market garden)
       Lead paint (from industrial use, older residential)

EPA Register Status:
  [On EPA contaminated land register: YES — [details] / NO — Note: absence
   from register does not confirm clean status]

Contamination Risk Rating:
  [LOW / MODERATE / HIGH / VERY HIGH]
  Basis: [explanation]

RECOMMENDATION:
  [PROCEED without further investigation — low risk basis stated]
  [Recommend PSI before exchange — if moderate to high risk]
  [Do not proceed without remediation plan — if very high risk]

If PSI recommended:
  Cost estimate:    $[X,XXX]–$[X,XXX] (scope-dependent)
  Timeframe:        [X] weeks
  Potential outcomes:
    a) Clean site — no further action
    b) Minor contamination — limited remediation $[X]–$[X]
    c) Significant contamination — major remediation $[X]–$[X]
  → Flag to Finance Agent: include $[X] contingency in development budget
─────────────────────────────────────────────────────────
```

## Environmental Risk Summary

After completing all checklist items:

```
ENVIRONMENTAL RISK SUMMARY
─────────────────────────────────────────────────────────
                     RISK LEVEL    KEY ISSUE
Flood:               [GREEN/AMBER/RED]    [detail]
Bushfire:            [GREEN/AMBER/RED]    [detail]
Heritage:            [GREEN/AMBER/RED]    [detail]
Aboriginal heritage: [UNASSESSED — AHIMS required]
Contamination:       [GREEN/AMBER/RED]    [detail]
Biodiversity:        [GREEN/AMBER/RED]    [detail]
Geotechnical:        [GREEN/AMBER/RED]    [detail]
Acoustic:            [GREEN/AMBER/RED]    [detail]

OVERALL ENVIRONMENTAL RISK: [LOW / MODERATE / HIGH]

PRIORITY DUE DILIGENCE ACTIONS (before exchange):
1. [Highest priority action]
2. [Second priority]
3. [Third priority]

OUTSTANDING ITEMS (post-exchange):
[Items that can wait until after exchange but before construction]
─────────────────────────────────────────────────────────
```

## Inputs to Other Agents

After completing environmental DD:

```
→ FINANCE AGENT: Environmental cost contingencies
  - Contamination remediation: $[X]–$[X] contingency
  - Asbestos removal: $[X]–$[X] contingency
  - Geotech risk premium: $[X] contingency
  Total environmental contingency: $[X]–$[X]

→ PROGRAM AGENT: Environmental timeline inputs
  - PSI (if required): +[X] weeks before exchange
  - AHIMS search: +[X] weeks (can run concurrently)
  - Biodiversity certification (if required): +[X] weeks during design
```
