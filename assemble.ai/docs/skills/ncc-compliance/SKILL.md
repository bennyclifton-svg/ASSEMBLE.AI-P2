---
name: ncc-compliance
tier: 3
description: NCC/BCA preliminary compliance review skill. Building classification rules, section-by-section DTS checklist (Sections A-J), compliance output template. NSW default. Based on NCC 2022 (current edition).
agents: [design]
---

# NCC Compliance Review Skill

## Tier 3 — NCC Reference Material Loaded

This skill contains NCC 2022 section structure, building classification rules, and Deemed-to-Satisfy (DTS) checklist items. It provides a **preliminary compliance review only** — not a substitute for a formal BCA consultant assessment.

**Edition:** NCC 2022 (National Construction Code, effective 1 May 2023)  
**Volumes used:** Volume One (Class 2–9 buildings) and Volume Two (Class 1 and 10 buildings)  
**Jurisdiction:** National (with NSW variations noted where applicable)

**Required disclaimer on every NCC review output:**
> "This is a preliminary NCC compliance review. It is not a substitute for a formal assessment by a registered BCA consultant. The accuracy of this review depends on the quality and format of the drawings provided. Always obtain a formal BCA assessment before lodging a CC or relying on compliance for contractual purposes."

---

## When to Load

Load this skill when:
- The user asks for an NCC or BCA compliance review
- A DA or CC application is being prepared and compliance needs to be assessed
- Design review comments relate to fire, egress, accessibility, or energy efficiency
- The DXF parser skill has extracted drawing data and NCC checking is needed

---

## Step 1: Determine Building Classification

Before any NCC compliance work, confirm the building classification. This determines which NCC sections apply.

### NCC Building Classifications

| Class | Description | Typical Buildings |
|-------|------------|------------------|
| **Class 1a** | Single dwelling | House, townhouse |
| **Class 1b** | Boarding house / guest house | Up to 12 residents, up to 300m² |
| **Class 2** | Multi-unit residential | Apartments (2+ storeys with sole-occupancy units) |
| **Class 3** | Residential other | Hotels, motels, hostels, backpackers |
| **Class 4** | Dwelling within a non-residential building | Caretaker's residence within a commercial building |
| **Class 5** | Office | Professional, business |
| **Class 6** | Shop / retail | Shops, restaurants, cafés, supermarkets |
| **Class 7a** | Car park | Parking structures |
| **Class 7b** | Storage / warehouse | Warehouses, factories |
| **Class 8** | Laboratory / production | Factories, workshops, labs |
| **Class 9a** | Health care building | Hospitals, day surgery |
| **Class 9b** | Assembly building | Cinemas, schools, churches, sports stadiums |
| **Class 9c** | Aged care | Residential aged care |
| **Class 10a** | Non-habitable building | Garages, carports, sheds |
| **Class 10b** | Structure | Fences, masts, retaining walls, swimming pools |
| **Class 10c** | Private bushfire shelter | |

### Mixed-Use / Mixed-Class Buildings

Many projects have multiple classifications:
- Apartment building with ground floor retail = **Class 2** (upper floors) + **Class 6** (ground floor)
- The most onerous requirements from each class apply to their respective parts
- Separation between classes (fire compartmentation, exits) is a key compliance issue

**Confirm classification with user before proceeding.**

---

## Step 2: Section-by-Section DTS Checklist

Work through each relevant NCC section. Not all sections apply to all building classes — note which are not applicable.

---

### Section A — General Provisions

**Applies to:** All buildings

| Item | Check | Notes |
|------|-------|-------|
| A1.1 Building classification confirmed | ☐ | Confirm against intended use |
| A2.2 Performance requirements met (DTS or Performance Solution path declared) | ☐ | DTS is standard; Performance Solutions require specialist involvement |
| A5.2 Documentation of Performance Solutions (if any) | ☐ | Must be documented before work |
| A6 Evidence of suitability for non-standard products | ☐ | Required if proprietary products used for structural/fire elements |

**Common issues:**
- Mixed classifications not identified
- Assumption that DTS is achievable when Performance Solution is actually needed (common for fire egress in complex layouts)

---

### Section B — Structure

**Applies to:** All buildings

| Item | Check | Notes |
|------|-------|-------|
| B1.2 Structural reliability (AS 1170 series compliance) | ☐ | Structural engineer's responsibility — confirm appointment |
| B1.3 Resistance to actions (gravity, wind, seismic, snow) | ☐ | Structural engineer designs to AS 1170 |
| B1.4 Resistance to earthquakes (AS 1170.4) | ☐ | NSW: Hazard Factor Z = 0.08 (Sydney metro) |
| B1.5 Progressive collapse avoidance | ☐ | Relevant for Class 5+ buildings |

**Typical assessment:** Structural compliance is largely the structural engineer's domain. Your role is to confirm the structural engineer is appointed and their scope covers all structural elements.

---

### Section C — Fire Resistance

**Applies to:** Class 2–9 buildings (most significant for multi-storey)

| Item | Check | Notes |
|------|-------|-------|
| C1.1 Type of construction required | ☐ | Based on class + rise in storeys — see C1.1 table |
| C2.2 Fire compartment sizes | ☐ | Maximum floor area per compartment by class/type |
| C2.6 Vertical separation of openings in external walls | ☐ | Spandrel requirements between floors |
| C3.2 Protection of openings (FRL-rated doors/windows) | ☐ | Required where fire-rated construction contains openings |
| C3.3 Smoke sealing | ☐ | Around penetrations in fire-rated construction |
| C3.4 Penetrations in fire-rated construction | ☐ | Mechanical, electrical, hydraulic penetrations |

**Type of Construction Table (simplified):**
| Class | Rise in Storeys | Required Type |
|-------|----------------|---------------|
| 2, 3 | 1-3 storeys | Type C |
| 2, 3 | 4-8 storeys | Type B |
| 2, 3 | 9+ storeys | Type A |
| 5, 6 | 1-3 storeys | Type C |
| 5, 6 | 4-8 storeys | Type B |
| 5, 6 | 9+ storeys | Type A |

**Common issues:**
- Penetrations through fire-rated slabs/walls not identified on drawings
- External wall spandrel requirements missed
- Fire door ratings not specified on door schedule

---

### Section D — Access and Egress

**Applies to:** All buildings (most critical for Class 2+)

| Item | Check | Notes |
|------|-------|-------|
| D1.2 Number of exits required | ☐ | Based on floor area and number of persons |
| D1.3 Travel distance to exits | ☐ | 20m unsprinklered / 40m sprinklered (Class 2); varies by class |
| D1.4 Distance between exits | ☐ | Must be separated by at least 1/3 of the maximum diagonal dimension of the floor |
| D1.5 Dimensions of exits | ☐ | Minimum 750mm clear width per exit |
| D1.6 Discharge from exits | ☐ | Must discharge to a road or open space |
| D1.7 Travel via fire-isolated passageways | ☐ | Applies where exits are fire-isolated stairs |
| D2.12 Ramps | ☐ | Maximum gradient 1:8 (general), 1:14 (accessible) |
| D2.13 Landings | ☐ | Required at top and bottom of each stair flight |
| D3.1 Accessible features (DDA) | ☐ | Access to and within buildings for people with disabilities |

**Key NCC 2022 Change — Liveable Housing Design:**
NCC 2022 introduced mandatory liveable housing requirements (Section H) for Class 1a and Class 2 buildings. See Section H below.

**Travel Distance Limits by Class:**
| Class | Unsprinklered | Sprinklered |
|-------|--------------|-------------|
| Class 2 | 20m | 40m |
| Class 5 | 40m | 80m |
| Class 6 | 20m | 40m |
| Class 9b | 20m | 40m |

**Checking with DXF data:**
If DXF is available, trace corridor polylines from furthest point to nearest exit using the dxf-parser skill distance calculation. Compare against limits above.

---

### Section E — Services and Equipment

**Applies to:** Class 2–9 buildings (specific requirements per class)

| Item | Check | Notes |
|------|-------|-------|
| E1.3 Fire sprinkler systems | ☐ | Required: Class 2 >4 storeys, Class 3 all, Class 5-9 per occupancy/area |
| E1.5 Smoke hazard management | ☐ | Mechanical ventilation or pressurisation of fire-isolated stairs |
| E1.6 Automatic fire detection and alarm | ☐ | Class 2: smoke alarms in each SOU and common areas |
| E1.8 Sprinklers | ☐ | AS 2118 series |
| E2.2 Smoke alarms | ☐ | Class 2 dwellings: interconnected smoke alarms |
| E3.2 Emergency lighting | ☐ | Required in buildings requiring exits or paths of travel to exits |
| E4.2 Exit signs | ☐ | Required in Class 5+ and where exits are required |

**NSW Variation:**
NSW has additional requirements under the Environmental Planning and Assessment Regulation for fire safety. Confirm with fire engineer / BCA consultant for any building requiring an Annual Fire Safety Statement.

**Common issues:**
- Sprinkler system coverage gaps identified in fire protection consultant's report
- Emergency lighting and exit sign layouts not shown on electrical drawings

---

### Section F — Health and Amenity

**Applies to:** Class 2–9 buildings (most provisions), Class 1b

| Item | Check | Notes |
|------|-------|-------|
| F1.3 Damp and weatherproofing | ☐ | External walls, roofs, wet areas |
| F1.6 Rising damp | ☐ | DPC required at ground level |
| F2.3 Facilities for personal hygiene (sanitary) | ☐ | Number and type of sanitary facilities per occupancy load |
| F2.4 Accessible sanitary facilities | ☐ | Required for Class 6, 9, 5 buildings |
| F3.3 Natural light | ☐ | Habitable rooms require natural light (minimum area per floor area) |
| F3.4 Artificial lighting | ☐ | Minimum lux levels per space type |
| F4.5 Natural ventilation | ☐ | Habitable rooms require openable area ≥ 5% of floor area |
| F4.6 Mechanical ventilation | ☐ | Where natural ventilation not provided |
| F5.2 Sound insulation | ☐ | Between SOUs in Class 2; between SOUs and common areas |

**Sound Insulation — Class 2 (apartments):**
- Floor/ceiling assemblies between SOUs: Rw+Ctr ≥ 50 (airborne); Lnw ≤ 62 (impact)
- Walls between SOUs: Rw+Ctr ≥ 50 (airborne)
- Check that construction details (wall type, floor build-up) achieve required ratings

---

### Section G — Ancillary Provisions

**Applies to:** All buildings (where relevant)

| Item | Check | Notes |
|------|-------|-------|
| G1.2 Swimming pools | ☐ | Safety barriers required; AS 1926 series |
| G3.2 Roof spaces | ☐ | Access hatch, lighting, working platform if >3m² of roof equipment |
| G4.1 Alpine areas | ☐ | Only relevant if project in alpine area |

---

### Section H — Liveable Housing Design

**Applies to:** Class 1a and Class 2 buildings — **NEW in NCC 2022**

This is a new mandatory section introduced in NCC 2022. All new Class 1a and Class 2 buildings must meet Liveable Housing Design (LHD) requirements.

**Silver Level (minimum — mandatory for all):**

| Item | Requirement | Check |
|------|------------|-------|
| H6D2 Step-free path from street to entrance | No steps between street/parking and dwelling entry | ☐ |
| H6D3 Step-free path at entry | Threshold ≤ 5mm at all entries; 820mm clear width at entry door | ☐ |
| H6D4 Internal doors | 820mm minimum clear width for all internal doors | ☐ |
| H6D5 Bathroom | At least one bathroom at entry level with step-free shower (reinforced walls for future grab rails) | ☐ |
| H6D6 Reinforced bathroom walls | Wall reinforcement for future grab rail installation | ☐ |
| H6D7 Stairways | If multi-storey: stair width ≥ 1000mm, landing ≥ 1000mm | ☐ |

**Gold Level (applicable where required by state/territory):**
NSW has adopted Silver level as mandatory minimum. Check if the specific project or council requires Gold level.

**Common issues with NCC 2022 LHD requirements:**
- Entry threshold details not shown on drawings (5mm max)
- Door schedules not updated to show 820mm clear widths
- Bathroom layouts not providing step-free shower access
- Stair widths below 1000mm

---

### Section J — Energy Efficiency

**Applies to:** Class 2–9 buildings (Volume One); Class 1 covered by BASIX in NSW

| Item | Check | Notes |
|------|-------|-------|
| J1.2 Building fabric (thermal performance) | ☐ | R-values for roofs, walls, floors |
| J1.3 External glazing | ☐ | SHGC and U-value limits by climate zone |
| J2.4 Air infiltration | ☐ | Sealing requirements |
| J3.2 Artificial lighting — power | ☐ | Maximum lighting power density (W/m²) |
| J5.2 HVAC | ☐ | Minimum CoP / efficiency ratings |
| J6.2 Hot water systems | ☐ | Minimum efficiency |
| J7.2 Swimming pools and spas | ☐ | Pool covers, pump efficiency |

**Climate Zones (NSW):**
| Zone | Area |
|------|------|
| Zone 5 | Sydney, Newcastle, Wollongong (warm temperate) |
| Zone 6 | Southern Tablelands (mild temperate) |
| Zone 7 | Snowy Mountains area (cool temperate) |

**NSW Class 2 Note:**
For Class 2 apartments in NSW, BASIX handles energy efficiency — Section J thermal provisions for the SOU are satisfied via BASIX certificate. Section J still applies to common areas and non-residential parts of the building.

---

## Step 3: Review Output Template

Use this template for all NCC compliance review outputs:

```
NCC PRELIMINARY COMPLIANCE REVIEW
=====================================
Project: [Name]
Site: [Address]
Drawing reference: [Drawing numbers and revisions reviewed]
Drawing format: [PDF / DXF / IFC — confidence level: Low / Medium / High]
NCC Edition: NCC 2022
Review date: [Date]
Jurisdiction: NSW

BUILDING CLASSIFICATION
Classification: Class [X] [+ Class Y if mixed-use]
Rise in storeys: [X]
Required type of construction: Type [A/B/C]

SECTION-BY-SECTION ASSESSMENT

Section A — General Provisions
  Status: ✓ COMPLIANT / ✗ NON-COMPLIANT / ⚠ WARNING / — NOT ASSESSABLE
  Notes: [details if not compliant or not assessable]

Section B — Structure
  Status: ✓ COMPLIANT (pending structural engineer certification)
  Notes: Structural engineer [name] appointed / not yet appointed.

Section C — Fire Resistance
  Status: [status]
  Type of construction required: Type [X]. Proposed construction: [describe].
  Issues identified: [list any gaps, missing FRL specifications, unrated penetrations]

Section D — Access and Egress
  Status: [status]
  Exit count: [X] exits provided. Required: [X].
  Travel distance: [X]m measured. Maximum: [X]m for this class.
  Issues identified: [list any travel distance exceedances, missing exits, egress route gaps]

Section E — Services and Equipment
  Status: [status]
  Sprinkler system: Required / Not required / Provided / Not shown
  Smoke alarms: [status]
  Emergency lighting / exit signs: [status]
  Issues identified: [list]

Section F — Health and Amenity
  Status: [status]
  Natural light / ventilation: [status for habitable rooms]
  Sound insulation: [status — note wall/floor types from drawings]
  Issues identified: [list]

Section G — Ancillary Provisions
  Status: [status / N/A]

Section H — Liveable Housing Design (Class 2 only)
  Status: [status]
  Step-free access path: [provided / not shown]
  Entry door clear width: [measured or not shown]
  Bathroom: [step-free shower provided / not shown / gap identified]
  Internal door widths: [measured or not shown]
  Issues identified: [list]

Section J — Energy Efficiency
  Status: [status / BASIX applies for Class 2 SOUs in NSW]
  BASIX certificate: [provided / not provided / expired]
  Common areas Section J assessment: [status]

SUMMARY
-------
Critical non-compliances (must resolve before CC):
  1. [item]
  2. [item]

Warnings (investigate with consultants):
  1. [item]

Items requiring consultant input:
  1. [consultant] — [specific check needed]
  2. [consultant] — [specific check needed]

Items not assessable from available drawings:
  1. [item] — reason not assessable

RESOLUTION PLAN
---------------
[Recommended sequence of consultant actions to resolve non-compliances]
1. Appoint [consultant] to assess [item] — required before [milestone]
2. Architect to update [drawing] to show [requirement]
3. Structural engineer to confirm [item]
...

⚠ DISCLAIMER
This is a preliminary NCC compliance review prepared by the Design Agent.
It is not a substitute for a formal assessment by a registered BCA consultant.
Accuracy depends on the quality and completeness of the drawings provided.
[Drawing format confidence level stated above.]
Always obtain a formal BCA assessment before lodging for a Construction Certificate.
```

---

## Performance Solutions

If a DTS solution cannot be achieved, a **Performance Solution** may be possible. This is a more complex path:

1. **Identify the performance requirement** that the DTS solution addresses
2. **Engage a fire engineer or specialist BCA consultant** to develop the Performance Solution
3. **Prepare a Fire Engineering Brief (FEB)** — documents the scope and methodology
4. **Conduct the analysis** — typically CFD modelling, evacuation modelling
5. **Prepare a Fire Engineering Report (FER)** — documents the solution and evidence
6. **Submit to council** with the CC application — may require peer review
7. **Document in building's Fire Safety Schedule**

**Always flag:** Performance Solutions add time, cost, and complexity. Advise user early if DTS compliance appears unachievable — don't let this be a late discovery.

---

## Interaction with DXF Parser Skill

When DXF data is available from the dxf-parser skill:
- Use extracted room areas to check Section F minimum dimensions
- Use extracted travel distance calculations for Section D egress compliance
- Use fire-rated wall layer identification for Section C compartmentation review
- Use door block dimensions for Section D and H door width compliance
- Use corridor width measurements for Section D accessibility

When only PDF drawings are available:
- State confidence level as Low on all dimensional assessments
- Flag all dimensional items as "verify with DXF or formal consultant assessment"
- Focus review on text-readable items (notes, schedules, specifications)
