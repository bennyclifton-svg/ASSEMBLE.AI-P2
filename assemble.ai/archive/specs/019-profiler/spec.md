# Profiler Module Specification

**Version:** 1.3
**Status:** Draft - Pending Review
**Created:** 2026-01-20
**Updated:** 2026-01-20 - Balanced all classes, added 10x Power Features
**Replaces:** 018-project-initiator

---

## 1. Overview

The Profiler module replaces the existing Project Initiator (018) with a restructured UI paradigm. It provides a streamlined interface for defining project characteristics through Building Class, Type, Subclass, Scale, and Complexity selections, followed by AI-generated objectives that users can edit and refine.

### 1.1 Goals

- **Replace** the 14-type wizard with a flexible Class/Type/Subclass taxonomy
- **Restructure** the UI into Left Navigation + Middle Panel layout
- **Retain** the proven template-driven objectives generation system
- **Enable** more granular project profiling (scale, complexity dimensions)
- **Integrate** seamlessly with existing Cost Plan, Programme, and Procurement modules

### 1.2 Non-Goals

- Full stakeholder management (deferred to Module 2: Stakeholder)
- Migration of existing projects (separate migration script)
- Changes to Cost Plan or Programme generation logic

---

## 2. UI Architecture

### 2.1 Overall Layout

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              TOP HEADER BAR                                  │
├───────────────┬─────────────────────────────────────────────────────────────┤
│  LEFT NAV     │                    MIDDLE PANEL                             │
│  (200-280px)  │  ┌─────────────┬──────────────┬─────────────┐               │
│               │  │ Procurement │ Cost Planning│  Programme  │  (tab headers │
│ ○ Project     │  │  (dimmed)   │   (dimmed)   │  (dimmed)   │   visible but │
│   Details     │  └─────────────┴──────────────┴─────────────┘   inactive)   │
│               │                                                             │
│ ● Profile     │  ┌──────────────────────────────────────────┐               │
│   (selected)  │  │  Content for selected left nav item      │               │
│               │  │  renders here                            │               │
│ ○ Objectives  │  │                                          │               │
│               │  │                                          │               │
│ ○ Stakeholders│  └──────────────────────────────────────────┘               │
│   (Phase 2)   │                                                             │
└───────────────┴─────────────────────────────────────────────────────────────┘
```

### 2.2 Left Navigation Panel

Four sections displayed vertically:

| Section | Description | State Indicator |
|---------|-------------|-----------------|
| **Project Details** | Basic project info (name, address, code) | ✓ when complete |
| **Profile** | Class/Type + Subclass/Scale/Complexity | ✓ when all selected |
| **Objectives** | AI-generated + user-edited objectives | ✓ when reviewed |
| **Stakeholders** | Unified stakeholder management | Phase 2 (disabled) |

**Behavior:**
- Clicking a section displays its content in the Middle Panel
- Visual indicator shows completion status (empty circle → filled circle/checkmark)
- Sections are accessible in any order (non-linear workflow)

### 2.3 Middle Panel Header Tabs

Three tabs always visible at top of Middle Panel:
- **Procurement** - Dimmed/inactive during profiler workflow
- **Cost Planning** - Dimmed/inactive during profiler workflow
- **Programme** - Dimmed/inactive during profiler workflow

These become active after profiler workflow completion or when explicitly navigated to.

---

## 3. Profile Section

### 3.1 Left Nav: Class/Type Selection

When "Profile" is selected in left nav, the left nav expands or displays inline a 2-column selector:

| Column 1: Building Class | Column 2: Project Type |
|--------------------------|------------------------|
| ○ Residential | ○ Refurb |
| ○ Commercial | ○ Extend |
| ○ Industrial | ○ New |
| ○ Institution | ○ Remediation |
| ○ Mixed | ○ Advisory |
| ○ Infrastructure | |

**Behavior:**
- User must select one Class AND one Type
- Selection triggers Middle Panel content update
- Both selections required before Subclass/Scale/Complexity appear

### 3.2 Middle Panel: Subclass/Scale/Complexity

After Class + Type selection, Middle Panel displays 3 columns:

#### Column 1: Subclass (Context-Dependent)

| Building Class | Subclass Options |
|----------------|------------------|
| **Residential** | House (Class 1a), Apartments (Class 2), Townhouses (Class 1a), BTR (Build-to-Rent), Student Housing (PBSA), **Retirement Living / ILUs**, **Residential Aged Care (Class 9c)**, Social/Affordable Housing, Other |
| **Commercial** | Office (Class 5), Retail - Shopping Centre (Class 6), Retail - Standalone (Class 6), Hotel (Class 3), Food & Beverage (Class 6), Serviced Office/Coworking, Other |
| **Industrial** | Warehouse (Class 7b), Logistics/E-Commerce (Class 7b), Manufacturing (Class 8), Cold Storage (Class 7b), Data Centre (Class 7b), Dangerous Goods (Class 7a), Other |
| **Institution** | Education - Early Childhood, Education - Primary/Secondary (Class 9b), Education - Tertiary (Class 9b), Healthcare - Hospital (Class 9a), Healthcare - Medical Centre, Healthcare - Clinic/Allied, Government/Civic, Religious (Class 9b), Other |
| **Mixed** | Residential + Retail, Residential + Commercial, Hotel + Residential, Retail + Office, Build-to-Rent + Retail, Vertical Village (ILU + Aged Care), Other |
| **Infrastructure** | Roads/Highways, Rail/Metro, Water/Utilities, Energy/Renewables, Marine/Ports, Airports, Telecommunications, Other |

**Rules:**
- Always includes "Other" option with free-text input
- **Single selection for most classes; MULTIPLE selection allowed for Mixed class**
- Options load dynamically from configuration
- "Other" selections stored for AI learning (pattern analysis over time)

#### Column 2: Scale

Based on Australian construction industry standards (NCC/BCA, AIQS, Rawlinsons 2025):

**RESIDENTIAL**
| Subclass | Scale Inputs | Typical Ranges |
|----------|--------------|----------------|
| **House (Class 1a)** | GFA m², Storeys, Bedrooms, Garage Spaces | 50-800m²; 1-3 storeys; 2-6 bed |
| **Apartments (Class 2)** | Storeys, GFA m², Units, Avg Unit Size m² | Low-rise 1-3, Mid-rise 4-12, High-rise 13-40, Super-tall 40+; 50-150m²/unit |
| **Townhouses** | Dwellings, GFA m², Avg Dwelling Size m² | 3-50 dwellings; 120-250m² each |
| **BTR (Build-to-Rent)** | Storeys, Units, Amenity GFA m², Unit Mix (Studio/1B/2B/3B %) | 100-500+ units; 5-10% amenity; 15/40/35/10% typical mix |
| **Student Housing (PBSA)** | Beds, Cluster Apartments, GFA m², Common Area m² | 200-1000+ beds; 4-8 beds per cluster |
| **Retirement Living / ILUs** | ILUs (count), GFA m², Serviced Apartments, Community Facilities m², Avg ILU Size m² | 20-300+ ILUs; 60-120m² per ILU; Serviced 40-80m² |
| **Aged Care (Class 9c)** | Beds, Dementia Beds, GFA m², GFA/Bed m², Households/Wings, Beds/Household | 60-150 beds; 50-80m²/bed; 10-16 beds/household |

**COMMERCIAL**
| Subclass | Scale Inputs | Typical Ranges |
|----------|--------------|----------------|
| **Office (Class 5)** | Storeys, NLA m², Floor Plate m², Tenancies, Grade (B/A/Premium/Trophy) | 1,000-80,000+ m² NLA; 500-2,500m² floor plates |
| **Retail - Shopping Centre** | GLA m², Major Anchors, Specialties, Levels, Car Parks | Neighbourhood 5-15k, Sub-regional 15-40k, Regional 40-100k+ m² |
| **Retail - Standalone** | GLA m², Frontage m, Car Parks | 200-5,000m²; 10-50m frontage |
| **Hotel (Class 3)** | Rooms, Storeys, Star Rating (3-5★), F&B Outlets, Meeting/Conference m² | Budget 30-100, Midscale 100-250, Upscale 150-400, Luxury 80-250 rooms |
| **Food & Beverage** | Seats, GFA m², Kitchen m², Liquor License Type | 20-400 seats; kitchen 15-25% of GFA |

**INDUSTRIAL**
| Subclass | Scale Inputs | Typical Ranges |
|----------|--------------|----------------|
| **Warehouse (Class 7b)** | GFA m², Clear Height m, Dock Doors, Hardstand m², Office % | 2,000-75,000+ m²; 8-15m+ height; 3-10% office |
| **Logistics/E-Commerce** | GFA m², Clear Height m, Dock Doors, Cross-dock Bays, Automation Level | 10,000-100,000+ m²; 12-18m height; high dock ratio |
| **Manufacturing (Class 8)** | GFA m², Process Area m², Cleanroom Class (ISO 5-8), Crane Capacity t | 1,000-50,000m²; crane 5-50t |
| **Cold Storage** | GFA m², Frozen m² (<-18°C), Chilled m² (0-4°C), Ambient m², Blast Freezer Capacity t/day | 2,000-30,000m²; 2-3x standard cost |
| **Data Centre** | IT Load MW, Total GFA m², White Space m², PUE Target, Redundancy Tier (1-4) | 1-50+ MW; PUE 1.2-1.6; $15-25k/m² |

**INSTITUTION**
| Subclass | Scale Inputs | Typical Ranges |
|----------|--------------|----------------|
| **Education - Early Childhood** | Places, GFA m², Indoor m²/child, Outdoor m²/child | 30-120 places; 3.25m² indoor; 7m² outdoor min |
| **Education - Primary/Secondary** | Students, GFA m², Classrooms, Specialist Rooms, Halls/Gyms, Playing Fields | 300-2,000 students; 10-15m²/student |
| **Education - Tertiary** | Students (FTE), GFA m², Lecture Theatres, Labs, Library m² | 1,000-50,000 FTE; 15-25m²/student |
| **Healthcare - Hospital (Class 9a)** | Beds, GFA m², ED Bays, Operating Theatres, ICU Beds, Car Parks | 50-800+ beds; 100-150m²/bed; 2.5-4 parks/bed |
| **Healthcare - Medical Centre** | Consulting Rooms, GFA m², Procedure Rooms, Imaging Suites | 5-50 rooms; 25-40m²/room |
| **Healthcare - Clinic/Allied** | Practitioners, GFA m², Treatment Rooms | 2-20 practitioners; 60-100m²/practitioner |
| **Government/Civic** | GFA m², Public Areas m², Secure Areas m², Staff Count | 1,000-50,000m²; security zoning critical |
| **Religious** | Seats, GFA m², Ancillary Halls m², Car Parks | 100-2,000+ seats; 0.8-1.2m²/seat |

**MIXED USE**
| Subclass | Scale Inputs | Typical Ranges |
|----------|--------------|----------------|
| **All Mixed Types** | Total Storeys, Total GFA m², Podium Levels, Tower Levels | 5-80+ storeys |
| | Residential: Units, Avg Size m² | 50-500 units |
| | Commercial: NLA m², Tenancies | 1,000-20,000m² |
| | Retail: GLA m², Anchors | 500-10,000m² |
| | Hotel: Rooms (if applicable) | 100-300 rooms |
| | Car Parks (shared/allocated) | 0.5-1.5 per residential, 1:40m² commercial |

**INFRASTRUCTURE**
| Subclass | Scale Inputs | Typical Ranges |
|----------|--------------|----------------|
| **Roads/Highways** | Length km, Lanes, Interchanges, Bridges/Tunnels, Pavement Type | 1-100+ km; 2-8 lanes |
| **Rail/Metro** | Length km, Stations, Rolling Stock Bays, Stabling, Tunnel km | 5-50+ km; 2-20+ stations |
| **Water/Utilities** | Capacity ML/day, Pipeline km, Pump Stations, Reservoirs ML | 10-1,000+ ML/day |
| **Energy/Renewables** | Capacity MW, Panels/Turbines, Battery Storage MWh, Substation | Solar 1-500MW, Wind 10-1,000MW |
| **Marine** | Berths, Quay Length m, Draft m, Container TEU, Passenger Capacity | 2-50 berths; 8-18m draft |

**Rules:**
- At least one scale metric required per subclass
- Numeric inputs with validation (positive values, realistic bounds)
- Placeholders show typical ranges from Rawlinsons 2025
- Fields adapt dynamically based on Class + Subclass combination

#### Column 3: Complexity

Based on industry complexity assessment frameworks (CII PCAM, MCERF, Infrastructure Australia, AIQS):

**RESIDENTIAL - General**
| Dimension | Options | Impact |
|-----------|---------|--------|
| **Quality Tier** | Project Home / Standard / Premium / Luxury / Ultra-Premium | 1.0x / 1.15x / 1.4x / 1.8x / 2.5x+ |
| **Site Conditions** | Greenfield / Infill / Sloping (>15%) / Bushfire (BAL 12.5-FZ) / Flood Overlay / Coastal | Adds 5-25% complexity |
| **Heritage** | None / Heritage Overlay / Conservation Area / Heritage Listed | Listed adds 15-40% |
| **Approval Pathway** | CDC/Exempt / Low-Rise Code / Standard DA / Complex DA / State Significant | 4-40+ weeks |

**RESIDENTIAL - Retirement Living / ILUs**
| Dimension | Options | Multiplier |
|-----------|---------|------------|
| **Village Type** | Independent Living Only / Mixed (ILU + Serviced) / Integrated Care (ILU + Aged Care) / Vertical Village | 1.0x / 1.15x / 1.3x / 1.25x |
| **Unit Configuration** | Detached Villa (Class 1a) / Attached Townhouse (Class 1a) / Apartment (Class 2) / Serviced Apartment (Class 3) | NCC class determines compliance |
| **Community Facilities** | Basic (Clubhouse) / Standard (Pool, Gym, Bowls) / Premium (Full Resort) / Wellness Centre | $1-8k/ILU allocation |
| **Care Integration** | None / Home Care Ready / Onsite Care Services / Co-located Aged Care | Affects staffing & licensing |
| **Accessibility** | Livable Housing Silver / Gold / Platinum / Full AS1428.1 | Silver now mandatory (NCC 2022) |

**RESIDENTIAL - Aged Care (Class 9c)**
| Dimension | Options | Cost/Bed Range |
|-----------|---------|----------------|
| **Care Level** | Low Care / Mixed (Low-High) / High Care / Specialist Dementia | $250k-$500k/bed |
| **Accommodation Model** | Traditional (Corridors) / Household (10-16 beds) / Small House (6-12 beds) / Cottage (SDCP) | Household +20%, Small House +40% |
| **Dementia Design** | No Dedicated / Secure Memory Wing / Specialist Dementia Unit / SDCP Compliant | SDCP adds 25-35% |
| **Clinical Facilities** | Basic / Allied Health Rooms / Dialysis Capable / Palliative Care Suite | Dialysis +$1.5M typical |
| **Back-of-House** | Central Kitchen / Satellite Kitchens / Commercial Laundry / External Services | Satellite +15% |
| **Staff Accommodation** | None / Break Rooms / Onsite Accommodation / 24hr Medical Staff | Onsite adds 5-10% GFA |

**COMMERCIAL - Office**
| Dimension | Options | Impact |
|-----------|---------|--------|
| **Base Building Grade** | B Grade / A Grade / Premium / Trophy | $2,500-$5,500/m² base build |
| **Fitout Level** | Shell & Core / Warm Shell / Cat A / Cat B / Turn-key | Cat B adds $800-2,500/m² |
| **Sustainability** | Minimum Code / 5 Star Green Star / 6 Star Green Star / Triple Cert (NABERS+GS+WELL) | Triple adds 8-15% |
| **Technology** | Standard / Smart Building / Fully Integrated BMS / Digital Twin Ready | Smart adds 3-8% |
| **End-of-Trip** | Minimum Code / Enhanced (showers, lockers) / Premium (café, repair) | Premium $500-1,500/m² |

**COMMERCIAL - Retail**
| Dimension | Options | Impact |
|-----------|---------|--------|
| **Centre Type** | Neighbourhood / Sub-regional / Regional / Super-regional / Outlet | $2,500-$8,000/m² GLA |
| **Anchor Configuration** | Single Anchor / Dual Anchor / Multi-anchor / Anchor-free | Affects lease structure |
| **Specialty Mix** | Standard / Dining Precinct / Entertainment Hub / Lifestyle | F&B/Entertainment +25-40% |
| **Experience** | Traditional / Click & Collect Ready / Omnichannel / Experiential | Experiential +15-25% |
| **Car Parking** | At-grade / Multi-deck / Basement / Automated | Basement $35-50k/space |

**COMMERCIAL - Hotel**
| Dimension | Options | Impact |
|-----------|---------|--------|
| **Star Rating** | 3 Star / 4 Star / 5 Star / Luxury/Boutique | $150k-$600k+/key |
| **Brand Affiliation** | Independent / Soft Brand / Hard Brand / Franchise | Brand adds 3-8% (PIP compliance) |
| **F&B Complexity** | Breakfast Only / Restaurant + Bar / Multiple Outlets / Signature Dining | 0-$50k+/key |
| **Meeting/Events** | None / Boardrooms / Ballroom / Full Convention | Convention $8-15k/m² |
| **Wellness/Recreation** | None / Gym / Pool + Gym / Full Spa / Rooftop Amenity | Spa $3-8k/m² |

**INDUSTRIAL - Warehouse/Logistics**
| Dimension | Options | Impact |
|-----------|---------|--------|
| **Specification** | Basic Shell / Enhanced (LED, fans) / High-spec (sprinklers, solar) / Turn-key | $800-$2,000/m² |
| **Height Class** | Standard (10m) / High Bay (12-14m) / Super High (15m+) / Multi-level | Super-high +25% structure |
| **Fire Systems** | ESFR Sprinklers / In-rack / Foam / Specialist (DG) | DG adds 30-50% |
| **Hardstand** | Standard (100kPa) / Heavy Duty (200kPa) / Container Rated (400kPa) | Container +40% |
| **Automation Readiness** | Manual / Conveyor Ready / ASRS Ready / Fully Automated | ASRS infrastructure $500-1,500/m² |

**INDUSTRIAL - Data Centre**
| Dimension | Options | Impact |
|-----------|---------|--------|
| **Uptime Tier** | Tier I (99.67%) / Tier II (99.75%) / Tier III (99.98%) / Tier IV (99.99%) | $10k-$25k/m² white space |
| **Cooling** | Air Cooled / Evaporative / Chilled Water / Liquid Cooled (HPC) | Liquid adds 20-30% |
| **Power Density** | Standard (3-6kW/rack) / High (8-15kW) / Ultra (20kW+) / HPC (50kW+) | Ultra doubles infrastructure |
| **Redundancy** | N / N+1 / 2N / 2N+1 | 2N adds 40-60% |
| **Security** | Standard / Mantrap / Biometric / SCIF/Govt | SCIF adds 20-30% |

**INDUSTRIAL - Manufacturing**
| Dimension | Options | Impact |
|-----------|---------|--------|
| **Cleanroom Class** | None / ISO 8 / ISO 7 / ISO 6 / ISO 5 | ISO 5 adds $3-8k/m² |
| **Process Type** | Assembly / Fabrication / Chemical / Pharmaceutical / Food (HACCP) | Pharma/Food +40-80% |
| **Services Intensity** | Low / Medium / High / Process Critical | High adds 25%+ services |
| **Environmental Control** | Standard / Temp Controlled / Humidity + Temp / Full Cleanroom | Full adds 50%+ HVAC |
| **Crane/Material Handling** | None / 5t / 10-20t / 50t+ / Specialist | 50t+ adds $1-3k/m² structure |

**INSTITUTION - Education**
| Dimension | Options | Impact |
|-----------|---------|--------|
| **Facility Type** | Standard Classroom / STEM/Science Labs / Performing Arts / Trade/Workshop | Labs +40-80% |
| **Technology** | Standard / 1:1 Device / Hybrid Learning / Immersive (VR/AR) | Immersive +15-25% |
| **Specialist Spaces** | None / Library/LRC / Sports Hall / Aquatic / Performing Arts Centre | PAC $6-10k/m² |
| **Security** | Standard / Secure Perimeter / Access Control / Lockdown Ready | Lockdown +5-10% |
| **Sustainability** | Minimum / Living Schools / Net Zero Ready / Living Building | Net Zero +10-20% |

**INSTITUTION - Healthcare**
| Dimension | Options | Impact |
|-----------|---------|--------|
| **Service Level** | Primary Care / Secondary / Tertiary / Quaternary (Teaching) | $8k-$18k+/m² |
| **Specialization** | General / Cardiac / Oncology / Neuro / Trauma / Maternity | Specialist +20-50% |
| **Clinical Complexity** | Consulting Only / Procedures / Day Surgery / Inpatient + OR | Full hospital 2-3x clinic |
| **Imaging** | None / X-ray + Ultrasound / CT + MRI / Full Suite (PET, Cath Lab) | Cath Lab $8-15M |
| **Infection Control** | Standard / Enhanced (COVID) / Isolation Suites / Negative Pressure | Negative pressure +30-50% |
| **Accreditation** | Private Unaccredited / ACHS / JCI / Teaching Hospital | Teaching adds 10-15% |

**MIXED USE**
| Dimension | Options | Impact |
|-----------|---------|--------|
| **Integration Level** | Separate Buildings / Shared Podium / Fully Integrated Tower | Integrated +10-15% coordination |
| **Transfer Structures** | None / Single Transfer / Multiple Transfers | Each transfer $500-2,000/m² |
| **Services Strategy** | Separate Risers / Shared Plant / Fully Integrated / District | District reduces 5-10% |
| **Ownership Model** | Single Owner / Strata (Res only) / Full Strata / Ground Lease | Strata +5-8% (separation) |
| **Staging** | Single Stage / Vertical Staging / Horizontal Staging | Staging adds 3-8% prelims |

**INFRASTRUCTURE**
| Dimension | Options | Impact |
|-----------|---------|--------|
| **Environment** | Greenfield / Brownfield / Contaminated / Environmentally Sensitive / Cultural Heritage | Contaminated +15-40% |
| **Corridor** | Existing / New Acquisition / Tunnelled / Elevated | Tunnel 3-5x surface |
| **Delivery Model** | Traditional / D&C / Alliance / PPP / Availability | Alliance +5-10% (risk sharing) |
| **Significance** | Local / Regional / State Significant / Critical Infrastructure | SSD adds 6-12mo approval |
| **Stakeholder Complexity** | Single Authority / Multi-agency / Cross-jurisdictional / International | Cross-jurisdiction +20-30% |
| **Operations Interface** | Greenfield / Adjacent Operations / Live Operations / 24/7 Operational | Live ops +15-30% |

**Rules:**
- Multiple dimensions can be selected (complexity is multi-faceted)
- Each dimension affects cost multipliers and consultant scopes
- Feeds into risk assessment and contingency calculations
- "Other" inputs stored for AI learning

### 3.3 10x Power Features (Smart Logic)

These features transform the profiler from a simple form into an intelligent project setup assistant:

#### 3.3.1 Smart Defaults & Auto-Population

| Trigger | Auto-populated Fields | Source |
|---------|----------------------|--------|
| **Subclass selected** | Scale field ranges (placeholders) | Rawlinsons 2025 benchmarks |
| **Scale entered** | Suggested complexity tier | Industry norms (e.g., 500+ rooms = likely 4-5 star) |
| **Complexity selected** | Typical consultant disciplines | Project type templates |
| **Location entered** | Approval pathway, heritage overlays, hazard zones | Integrated planning data |

**Example Flow:**
```
User selects: Commercial → New → Hotel
→ Auto-shows: Star Rating complexity dimension (most impactful)
User enters: 180 rooms
→ Suggests: "4-5 Star typical for this room count"
User selects: 5 Star
→ Auto-suggests: F&B Complexity = "Multiple Outlets", Wellness = "Pool + Gym"
```

#### 3.3.2 Validation & Plausibility Alerts

Non-blocking warnings when inputs suggest unusual combinations:

| Scenario | Alert Message |
|----------|---------------|
| 5-star hotel with <80 rooms | "Luxury hotels typically have 80-250 rooms for viable F&B operations" |
| Data centre <Tier III | "Sub-Tier III rarely attracts enterprise tenants in Australian market" |
| Aged care <60 beds | "Facilities under 60 beds may face viability challenges under AN-ACC funding" |
| Retail >40,000m² with single anchor | "Regional+ centres typically require dual anchors minimum" |
| Apartments >40 storeys without Transfer | "Super-tall residential typically requires transfer structure for efficient floor plates" |

#### 3.3.3 Context Chips (Instant Insights)

Small informational chips appear next to selections showing key context:

| Selection | Chip Display |
|-----------|--------------|
| Aged Care (Class 9c) | `🏥 Class 9c` `⏱️ 12-18mo approval` `💰 $250-500k/bed` |
| Data Centre Tier IV | `⚡ 99.99% uptime` `💰 $20-25k/m²` `🔧 2N+1 redundancy` |
| 6 Star Green Star | `🌿 World Leadership` `+8-12% cost` `💡 NABERS 5.5+ typical` |
| Heritage Listed | `🏛️ S170 Register` `+15-40% cost` `⏱️ Heritage Council approval` |

#### 3.3.4 Project Complexity Score

Real-time calculated score (1-10) based on selections:

```
┌──────────────────────────────────────────────┐
│  PROJECT COMPLEXITY SCORE                    │
│                                              │
│  ████████░░  7.2 / 10  COMPLEX               │
│                                              │
│  Contributing factors:                       │
│  • Heritage Listed site (+2.0)               │
│  • 24/7 Operational interface (+1.5)         │
│  • Multi-agency stakeholders (+1.2)          │
│  • State Significant approval (+1.0)         │
│                                              │
│  Similar projects: 14-22 month programmes    │
│  Contingency suggestion: 12-15%              │
└──────────────────────────────────────────────┘
```

**Score Calculation Factors:**
| Factor | Points |
|--------|--------|
| Greenfield site | 0 |
| Infill/Constrained | +0.5 |
| Heritage overlay | +1.0 |
| Heritage listed | +2.0 |
| Live operations | +1.5 |
| Multi-stakeholder | +1.0-2.0 |
| State Significant | +1.5 |
| Specialist systems (cleanroom, DG, etc) | +1.0-2.0 |
| Transfer structures | +0.5 per transfer |
| Cross-jurisdiction | +2.0 |

#### 3.3.5 Comparable Project Indicators

After profile completion, show market context:

```
┌──────────────────────────────────────────────┐
│  MARKET CONTEXT                              │
│                                              │
│  Your project: 120-bed Aged Care (Class 9c)  │
│  Accommodation: Household model              │
│  Dementia: Secure wing (25 beds)             │
│                                              │
│  Benchmark data (Rawlinsons 2025):           │
│  • Cost range: $32M - $48M                   │
│  • Cost/bed: $270k - $400k                   │
│  • GFA: 7,200 - 9,600 m²                     │
│  • Programme: 18-24 months                   │
│                                              │
│  Recent comparable projects:                 │
│  • Similar scale: 15 projects (2023-2025)    │
│  • Your complexity tier: Upper quartile      │
└──────────────────────────────────────────────┘
```

#### 3.3.6 Consultant Scope Preview

Based on profile, show likely consultant team:

| Selection Trigger | Consultant Auto-suggested |
|-------------------|---------------------------|
| Any Class 9c | Fire Engineer, Accessibility, Acoustic |
| Dementia wing | Dementia Design Specialist |
| 6+ storeys | Façade Engineer, Wind Consultant |
| Heritage | Heritage Consultant, Conservation Architect |
| Data Centre | Critical Systems Engineer, Commissioning Agent |
| Dangerous Goods | DG Consultant, EPA Liaison |
| NABERS/Green Star | ESD Consultant, Commissioning Agent |
| Hospital | Health Planner, Medical Equipment Planner, Infection Control |
| Live operations | Staging Consultant, Operational Continuity Planner |

#### 3.3.7 Risk Flags (Auto-generated)

High-impact risks surfaced based on profile:

| Profile Combination | Auto-flagged Risk |
|--------------------|-------------------|
| Bushfire BAL-FZ + Aged Care | "BAL-FZ may preclude Class 9c. Verify with CFA/RFS early." |
| Flood overlay + Basement parking | "Flood study required. Consider alternative parking." |
| Hotel + Heritage | "PIP compliance may conflict with heritage requirements." |
| Retail >10,000m² + Heritage precinct | "Anchor tenant fit-out may require heritage approval." |
| Data Centre + Residential zone | "Planning pathway unclear. Pre-DA recommended." |

### 3.4 Profiler UX Principles

For first-impression excellence:

1. **Progressive Disclosure**: Show complexity dimensions only after subclass selected (reduce cognitive load)
2. **Sensible Defaults**: Pre-select most common options (user can override)
3. **Instant Feedback**: Context chips appear within 100ms of selection
4. **No Dead Ends**: Every path leads to a valid project profile
5. **Guided Discovery**: Tooltips explain industry terms (hover for definition)
6. **Mobile-First Fields**: Large touch targets, swipeable options on mobile
7. **Keyboard Navigation**: Tab through all fields, Enter to confirm

---

## 4. Objectives Section

### 4.1 Middle Panel: Objectives Content

When "Objectives" is selected in left nav:

```
┌──────────────────────────────────────────────────────────────────┐
│  OBJECTIVES                      [Generate] [Manual]  [Polish]   │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  FUNCTIONAL QUALITY                                              │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Simple markdown-enabled text editor                        │  │
│  │ [AI-generated text in normal font]                         │  │
│  │ [User edits displayed in accent color]                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  PLANNING & COMPLIANCE                                           │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Simple markdown-enabled text editor                        │  │
│  │ [AI-generated text in normal font]                         │  │
│  │ [User edits displayed in accent color]                     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Entry Mode Toggle:**
- **[Generate]** - AI generates objectives from Profile (default for new projects)
- **[Manual]** - User writes objectives directly (simple text editor, no AI)
- **[Polish]** - AI refines existing text (only shown if content exists)

### 4.2 Objectives Categories

Two primary objective categories (replaces FQBP structure):

| Category | Description | Generation Source |
|----------|-------------|-------------------|
| **Functional Quality** | What the project achieves and how excellence is measured | Profile selections + templates |
| **Planning & Compliance** | Timeline, approvals, regulatory requirements | Profile selections + jurisdiction data |

### 4.3 Entry Modes & AI Integration

**Manual Entry Mode:**
- Simple markdown-enabled text editor (lightweight, no heavy dependencies)
- User writes objectives directly without AI assistance
- Suitable for experienced users or projects with specific requirements
- Text saved as `source: 'manual'` in data model

**AI Generation Mode:**
- Triggered via [Generate] button (not automatic - user controls when to invoke)
- Uses template substitution with Profile selections as variables
- Templates stored in `objective-templates.json` (extended for new structure)
- Text saved as `source: 'ai_generated'` in data model

**User Editing:**
- Both AI-generated and manual text can be edited inline
- Modifications tracked with diff highlighting (accent color for changes)
- Original text preserved for comparison and AI learning

**Polish Function:**
- Only available when content exists
- Sends: Profile context + Current text + Edit history
- AI refines objectives incorporating all context
- Refined text marked as `source: 'ai_polished'`

**AI Learning from User Inputs:**
- "Other" subclass entries collected anonymously for pattern analysis
- Manual objectives analyzed for common themes by Class/Type
- Polish edits inform template improvements over time
- Learning is aggregate/anonymous, not project-specific

### 4.4 Objectives Data Model

```typescript
interface ProfilerObjectives {
  projectId: string;
  functionalQuality: {
    content: string;
    source: 'manual' | 'ai_generated' | 'ai_polished';
    originalAi: string | null;      // preserved for comparison
    editHistory: string[] | null;   // track changes for AI learning
  };
  planningCompliance: {
    content: string;
    source: 'manual' | 'ai_generated' | 'ai_polished';
    originalAi: string | null;
    editHistory: string[] | null;
  };
  profileContext: {
    buildingClass: string;
    projectType: string;
    subclass: string[];              // array for Mixed class multi-select
    scale: Record<string, number>;
    complexity: Record<string, string>; // multi-dimensional
  };
  generatedAt: string | null;
  polishedAt: string | null;
}
```

---

## 5. Data Model

### 5.1 Project Profile Table

New table `projectProfiles`:

```sql
CREATE TABLE project_profiles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  building_class TEXT NOT NULL,      -- enum: residential, commercial, industrial, institution, mixed, infrastructure
  project_type TEXT NOT NULL,        -- enum: refurb, extend, new, remediation, advisory
  subclass JSONB NOT NULL,           -- array for multi-select: ["residential", "retail"]
  subclass_other TEXT[],             -- array of free text entries if 'other' selected
  scale_data JSONB NOT NULL,         -- { levels: 5, gfa_sqm: 12000, units: 48 }
  complexity JSONB NOT NULL,         -- multi-dimensional: { quality: "premium", site: "heritage" }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Index for AI learning queries
CREATE INDEX idx_profiles_class_type ON project_profiles(building_class, project_type);
CREATE INDEX idx_profiles_subclass ON project_profiles USING GIN(subclass);
```

### 5.2 Extended Objectives Table

Extend `projectObjectives` or create new `profilerObjectives`:

```sql
CREATE TABLE profiler_objectives (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  functional_quality JSONB NOT NULL,    -- { content, source, originalAi, editHistory }
  planning_compliance JSONB NOT NULL,   -- { content, source, originalAi, editHistory }
  profile_context JSONB,                -- snapshot of profile at generation time
  generated_at TIMESTAMP,
  polished_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id)
);
```

### 5.3 AI Learning Table (Aggregate, Anonymous)

```sql
CREATE TABLE profile_patterns (
  id TEXT PRIMARY KEY,
  building_class TEXT NOT NULL,
  project_type TEXT NOT NULL,
  pattern_type TEXT NOT NULL,           -- 'subclass_other', 'objective_theme', 'polish_edit'
  pattern_value TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Upsert on pattern match
CREATE UNIQUE INDEX idx_patterns_unique ON profile_patterns(building_class, project_type, pattern_type, pattern_value);
```

### 5.4 Enum Definitions

```typescript
export const buildingClassEnum = pgEnum('building_class', [
  'residential',
  'commercial',
  'industrial',
  'institution',
  'mixed',
  'infrastructure'
]);

export const projectTypeEnum = pgEnum('project_type_v2', [
  'refurb',
  'extend',
  'new',
  'remediation',
  'advisory'
]);

export const complexityEnum = pgEnum('complexity', [
  'standard',
  'premium',
  'luxury',
  'heritage',
  'social_housing',
  'shell',
  'cat_a_fitout',
  'cat_b_fitout',
  'turn_key',
  'basic_warehouse',
  'temperature_controlled',
  'high_tech_cleanroom',
  'specialized',
  'heritage_listed',
  'integrated',
  'segregated',
  'greenfield',
  'brownfield',
  'upgrade_augmentation'
]);
```

---

## 6. API Contracts

### 6.1 Save Profile

```
POST /api/planning/{projectId}/profile
```

**Request:**
```json
{
  "buildingClass": "commercial",
  "projectType": "new",
  "subclass": "office",
  "subclassOther": null,
  "scale": {
    "levels": 12,
    "nla_sqm": 18000,
    "tenancies": 24
  },
  "complexity": "cat_a_fitout"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "profileId": "prof_abc123",
    "projectId": "proj_xyz789",
    "createdAt": "2026-01-20T10:30:00Z"
  }
}
```

### 6.2 Generate Objectives

```
POST /api/planning/{projectId}/objectives/generate
```

**Request:**
```json
{
  "profileId": "prof_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "functionalQuality": "Deliver a 12-storey commercial office building...",
    "planningCompliance": "Achieve DA approval within 16 weeks...",
    "generatedAt": "2026-01-20T10:31:00Z"
  }
}
```

### 6.3 Save Objectives Edits

```
PATCH /api/planning/{projectId}/objectives
```

**Request:**
```json
{
  "functionalQualityUser": "Updated text with user modifications...",
  "planningComplianceUser": "Updated compliance text..."
}
```

### 6.4 Polish Objectives

```
POST /api/planning/{projectId}/objectives/polish
```

**Request:**
```json
{
  "functionalQualityUser": "User's edited functional text...",
  "planningComplianceUser": "User's edited compliance text..."
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "functionalQualityPolished": "Refined functional objectives...",
    "planningCompliancePolished": "Refined compliance objectives...",
    "polishedAt": "2026-01-20T10:35:00Z"
  }
}
```

---

## 7. Template Structure

### 7.1 Profile Templates

New file: `src/lib/data/profile-templates.json`

```json
{
  "metadata": {
    "version": "1.0",
    "structure": "class → type → subclass → scale → complexity"
  },
  "buildingClasses": {
    "residential": {
      "label": "Residential",
      "icon": "home",
      "subclasses": [
        { "value": "house", "label": "House (Class 1a)" },
        { "value": "apartments", "label": "Apartments (Class 2)" },
        { "value": "townhouses", "label": "Townhouses" },
        { "value": "btr", "label": "BTR (Build-to-Rent)" },
        { "value": "student_housing", "label": "Student Housing (PBSA)" },
        { "value": "retirement_living_ilu", "label": "Retirement Living / ILUs" },
        { "value": "aged_care_9c", "label": "Residential Aged Care (Class 9c)" },
        { "value": "other", "label": "Other" }
      ],
      "scaleFields": {
        "default": [
          { "key": "levels", "label": "Levels", "type": "integer", "min": 1 },
          { "key": "gfa_sqm", "label": "GFA (m²)", "type": "decimal" },
          { "key": "units", "label": "Units", "type": "integer" }
        ],
        "retirement_living_ilu": [
          { "key": "ilus", "label": "ILUs (count)", "type": "integer", "min": 1, "placeholder": "20-300" },
          { "key": "serviced_apartments", "label": "Serviced Apartments", "type": "integer", "min": 0, "placeholder": "0-50" },
          { "key": "gfa_sqm", "label": "Total GFA (m²)", "type": "decimal" },
          { "key": "community_facilities_sqm", "label": "Community Facilities (m²)", "type": "decimal", "placeholder": "200-2000" },
          { "key": "avg_ilu_size_sqm", "label": "Avg ILU Size (m²)", "type": "decimal", "placeholder": "60-120" }
        ],
        "aged_care_9c": [
          { "key": "beds", "label": "Total Beds", "type": "integer", "min": 1, "placeholder": "60-150" },
          { "key": "dementia_beds", "label": "Dementia Beds", "type": "integer", "min": 0, "placeholder": "0-40" },
          { "key": "gfa_sqm", "label": "Total GFA (m²)", "type": "decimal" },
          { "key": "gfa_per_bed", "label": "GFA per Bed (m²)", "type": "decimal", "placeholder": "50-80" },
          { "key": "households", "label": "Households/Wings", "type": "integer", "min": 1, "placeholder": "4-12" },
          { "key": "beds_per_household", "label": "Beds per Household", "type": "integer", "placeholder": "10-16" }
        ]
      },
      "complexityOptions": {
        "default": [
          { "value": "standard", "label": "Standard" },
          { "value": "premium", "label": "Premium" },
          { "value": "luxury", "label": "Luxury" },
          { "value": "heritage", "label": "Heritage" },
          { "value": "social_housing", "label": "Social Housing" }
        ],
        "retirement_living_ilu": {
          "village_type": [
            { "value": "ilu_only", "label": "Independent Living Only" },
            { "value": "mixed_ilu_serviced", "label": "Mixed (ILU + Serviced)" },
            { "value": "integrated_care", "label": "Integrated Care (ILU + Aged Care)" },
            { "value": "vertical_village", "label": "Vertical Village" }
          ],
          "unit_config": [
            { "value": "detached_villa", "label": "Detached Villa (Class 1a)" },
            { "value": "attached_townhouse", "label": "Attached Townhouse (Class 1a)" },
            { "value": "apartment", "label": "Apartment (Class 2)" },
            { "value": "serviced_apartment", "label": "Serviced Apartment (Class 3)" }
          ],
          "community_facilities": [
            { "value": "basic", "label": "Basic (Clubhouse)" },
            { "value": "standard", "label": "Standard (Pool, Gym, Bowls)" },
            { "value": "premium", "label": "Premium (Full Resort)" },
            { "value": "wellness_centre", "label": "Wellness Centre" }
          ],
          "care_integration": [
            { "value": "none", "label": "None" },
            { "value": "home_care_ready", "label": "Home Care Ready" },
            { "value": "onsite_care", "label": "Onsite Care Services" },
            { "value": "colocated_aged_care", "label": "Co-located Aged Care" }
          ],
          "accessibility": [
            { "value": "silver", "label": "Livable Housing Silver" },
            { "value": "gold", "label": "Livable Housing Gold" },
            { "value": "platinum", "label": "Livable Housing Platinum" },
            { "value": "as1428", "label": "Full AS1428.1" }
          ]
        },
        "aged_care_9c": {
          "care_level": [
            { "value": "low_care", "label": "Low Care" },
            { "value": "mixed", "label": "Mixed (Low-High)" },
            { "value": "high_care", "label": "High Care" },
            { "value": "specialist_dementia", "label": "Specialist Dementia" }
          ],
          "accommodation_model": [
            { "value": "traditional", "label": "Traditional (Corridors)" },
            { "value": "household", "label": "Household (10-16 beds)" },
            { "value": "small_house", "label": "Small House (6-12 beds)" },
            { "value": "cottage_sdcp", "label": "Cottage (SDCP)" }
          ],
          "dementia_design": [
            { "value": "none", "label": "No Dedicated Unit" },
            { "value": "secure_wing", "label": "Secure Memory Support Wing" },
            { "value": "specialist_unit", "label": "Specialist Dementia Unit" },
            { "value": "sdcp_compliant", "label": "SDCP Compliant" }
          ],
          "clinical_facilities": [
            { "value": "basic", "label": "Basic" },
            { "value": "allied_health", "label": "Allied Health Rooms" },
            { "value": "dialysis", "label": "Dialysis Capable" },
            { "value": "palliative", "label": "Palliative Care Suite" }
          ],
          "back_of_house": [
            { "value": "central_kitchen", "label": "Central Kitchen" },
            { "value": "satellite_kitchens", "label": "Satellite Kitchens" },
            { "value": "commercial_laundry", "label": "Full Commercial Laundry" },
            { "value": "external_services", "label": "External Services" }
          ]
        }
      }
    }
    // ... other classes
  },
  "projectTypes": [
    { "value": "refurb", "label": "Refurb" },
    { "value": "extend", "label": "Extend" },
    { "value": "new", "label": "New" },
    { "value": "remediation", "label": "Remediation" },
    { "value": "advisory", "label": "Advisory" }
  ]
}
```

### 7.2 Objectives Templates (Extended)

Extend `objective-templates.json`:

```json
{
  "profiler": {
    "functionalQuality": {
      "residential": {
        "new": "Deliver a {{subclass}} development comprising {{units}} units across {{levels}} levels...",
        "refurb": "Refurbish the existing {{subclass}} to contemporary {{complexity}} standards..."
      },
      "commercial": {
        "new": "Develop a {{complexity}} commercial {{subclass}} providing {{nla_sqm}}m² NLA...",
        "refurb": "Upgrade the existing {{subclass}} to achieve {{complexity}} specification..."
      }
      // ... other combinations
    },
    "planningCompliance": {
      "residential": {
        "new": "Obtain development approval under {{approval_pathway}}. Target {{da_weeks}} weeks for determination...",
        "refurb": "Confirm approval pathway for {{complexity}} refurbishment works..."
      }
      // ... other combinations
    }
  }
}
```

---

## 8. Component Structure

### 8.1 New Components

```
src/components/profiler/
├── ProfilerLayout.tsx          # Main layout with left nav + middle panel
├── LeftNavigation.tsx          # 4-section navigation
├── ProfileSection.tsx          # Class/Type + Subclass/Scale/Complexity
├── ClassTypeSelector.tsx       # 2-column Class/Type picker
├── SubclassSelector.tsx        # Context-dependent subclass dropdown
├── ScaleInputs.tsx             # Dynamic scale fields based on class
├── ComplexitySelector.tsx      # Complexity options based on class
├── ObjectivesSection.tsx       # Objectives display + editing
├── ObjectivesEditor.tsx        # Rich text editing with color coding
├── PolishButton.tsx            # AI polish trigger
└── index.ts                    # Exports
```

### 8.2 Deprecated Components

```
src/components/project-wizard/  # Entire directory deprecated
├── ProjectWizard.tsx           # → ProfilerLayout.tsx
├── TypeSelectionStep.tsx       # → ClassTypeSelector.tsx
├── QuestionsStep.tsx           # → SubclassSelector + ScaleInputs + ComplexitySelector
└── ...
```

---

## 9. Integration Points

### 9.1 Existing System Integration

| System | Integration |
|--------|-------------|
| **Cost Plan** | Profile complexity affects cost benchmarks |
| **Programme** | Profile class/type affects phase templates |
| **Procurement** | Profile determines default consultant disciplines |
| **Reports** | Profile data included in project summaries |

### 9.2 Migration from 018

- Existing projects retain legacy `projectType` field
- New projects use `projectProfiles` table
- Backward compatibility: API falls back to legacy when profile missing
- Future migration script maps legacy types to new Class/Type/Subclass

---

## 10. Success Criteria

### 10.1 Functional Requirements

- [ ] User can select Building Class and Project Type
- [ ] Subclass options update dynamically based on Class
- [ ] **Multiple subclass selection for Mixed class**
- [ ] Scale inputs appropriate for selected Class/Subclass
- [ ] Complexity is multi-dimensional (Quality, Site, Systems, etc.)
- [ ] **User can manually enter objectives OR generate with AI**
- [ ] Simple markdown text editor for objectives
- [ ] AI generates objectives from Profile selections (on demand)
- [ ] User edits tracked with diff highlighting
- [ ] Polish button refines objectives with user feedback
- [ ] Profile data persists to database
- [ ] Objectives persist with source tracking (manual/ai_generated/ai_polished)
- [ ] "Other" inputs stored for AI learning

### 10.2 Non-Functional Requirements

- [ ] Page load < 200ms
- [ ] Profile save < 500ms
- [ ] Objectives generation < 3s
- [ ] Polish operation < 5s
- [ ] Mobile responsive (breakpoint: 768px)

---

## 11. Code Philosophy

**10x Principles - Lean, Powerful, Flowing:**

1. **Minimal Components**: Each component does ONE thing well. No god components.
2. **Data-Driven UI**: Templates drive options, not hardcoded JSX. Add new subclass = update JSON.
3. **Composition over Configuration**: Small, composable hooks and utilities.
4. **No Premature Abstraction**: Write concrete code first, abstract only when patterns emerge.
5. **Fail Fast, Recover Gracefully**: Validate at boundaries, trust internal code.
6. **Single Source of Truth**: Profile state in one place, objectives state in one place.
7. **Progressive Enhancement**: Manual mode works without AI; AI enhances, doesn't gate.

**Anti-Patterns to Avoid:**
- No wrapper hell (Provider → Context → Hook → Component → ...)
- No prop drilling beyond 2 levels (use context or composition)
- No separate files for types that are only used in one place
- No verbose error handling for impossible states
- No backwards-compat shims for unreleased code

**Target Metrics:**
- ProfilerLayout.tsx: < 100 lines
- Total new code: < 2000 lines (excluding templates)
- Dependencies: 0 new runtime deps (use existing or native)

---

## 12. Logic Flow Optimization

### 12.1 Recommended User Journey

The profiler follows a **progressive disclosure** pattern optimized for first-time users:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: CLASS + TYPE (2 clicks, <5 seconds)                              │
│ ────────────────────────────────────────────────────────────────────────│
│ User sees: 6 Building Classes × 5 Project Types                          │
│ User does: Select one of each                                            │
│ Result: Unlocks Subclass column, shows relevant options only            │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: SUBCLASS (1 click, <3 seconds)                                   │
│ ────────────────────────────────────────────────────────────────────────│
│ User sees: 5-8 subclass options filtered by Class                        │
│ User does: Select one (or multiple for Mixed)                            │
│ Result: Scale fields appear with smart placeholders                      │
│         Context chip shows NCC class + cost hint                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: SCALE (2-5 inputs, 30-60 seconds)                                │
│ ────────────────────────────────────────────────────────────────────────│
│ User sees: 4-6 scale fields with Rawlinsons-informed placeholders        │
│ User does: Enter primary metrics (GFA, units, etc.)                      │
│ Result: Complexity suggestions appear based on scale                     │
│         "Based on 180 rooms, typical: 4-5 Star"                          │
│         Plausibility alerts if unusual combination                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: COMPLEXITY (3-6 selections, 20-40 seconds)                       │
│ ────────────────────────────────────────────────────────────────────────│
│ User sees: 4-6 complexity dimensions, most impactful shown first         │
│ User does: Select options (sensible defaults pre-selected)               │
│ Result: Complexity Score updates in real-time                            │
│         Consultant suggestions appear                                    │
│         Risk flags surface if applicable                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 5: PROFILE SUMMARY (review, <10 seconds)                            │
│ ────────────────────────────────────────────────────────────────────────│
│ User sees: Market Context card with benchmarks                           │
│            Complexity Score with contributing factors                    │
│            Suggested consultants list                                    │
│            Any risk flags                                                │
│ User does: Review, optionally adjust, proceed to Objectives              │
└─────────────────────────────────────────────────────────────────────────┘
```

**Total time for experienced user: ~90 seconds**
**Total time for first-time user: ~3 minutes (with tooltips)**

### 12.2 Logic Flow Decisions

| Decision Point | Current Approach | Rationale |
|----------------|------------------|-----------|
| **Class before Type?** | Yes, Class first | Class constrains valid subclasses; Type is universal |
| **Subclass before Scale?** | Yes, Subclass first | Scale fields depend on subclass (hotel needs rooms, warehouse needs GFA) |
| **Scale before Complexity?** | Yes, Scale first | Scale informs complexity suggestions (180 rooms → likely 4-5 star) |
| **Show all complexity at once?** | No, progressive | 5-6 dimensions shown after subclass, reduces cognitive load |
| **Pre-select defaults?** | Yes, for complexity | Most common option pre-selected (user can override) |
| **Blocking validation?** | No, alerts only | Non-blocking warnings; user might have valid edge case |

### 12.3 Alternative Flows Considered & Rejected

| Alternative | Why Rejected |
|-------------|--------------|
| **Free-form entry (like a form)** | Users don't know what to enter; class/type provides structure |
| **Wizard with back/next buttons** | Feels slow; users want to jump around |
| **Single long form** | Overwhelming; too many fields visible at once |
| **Type before Class** | Type (Refurb/New) doesn't constrain options meaningfully |
| **AI-first (describe project)** | Unreliable parsing; structured input more accurate |

### 12.4 Final Tweaks Implemented

1. **Complexity dimension ordering**: Most impactful dimension shown first (e.g., Star Rating for hotels, Tier for data centres)
2. **Smart tab order**: Fields flow logically top-to-bottom, left-to-right
3. **Instant feedback**: Context chips render <100ms, complexity score updates on every change
4. **Exit anytime**: Profile can be saved incomplete; user can return later
5. **Keyboard shortcuts**: Tab navigates fields, Enter confirms selection, Escape closes dropdowns

---

## 13. Open Questions

1. ~~**Approval Pathway Integration**: Should complexity include approval pathway selection?~~ **RESOLVED: Yes, included in Residential complexity as "Approval Pathway" dimension**

2. ~~**Default Consultants**: Does Profile auto-populate consultant disciplines?~~ **RESOLVED: Yes, via Consultant Preview feature (§3.3.6)**

3. **Legacy Project Handling**: Should existing 018 projects show a "Migrate to Profiler" prompt? **RESOLVED: No, all existing projects are just test projects.  

4. ~~**Scale Validation**: What are the realistic min/max bounds for each scale metric?~~ **RESOLVED: Documented in Scale tables with Rawlinsons 2025 ranges**

5. ~~**Complexity Mapping**: How do complexity levels map to cost multipliers?~~ **RESOLVED: Documented in Complexity tables with multiplier/impact columns**

---

## Appendix A: Building Class × Project Type Matrix

| Class \ Type | Refurb | Extend | New | Remediation | Advisory |
|--------------|--------|--------|-----|-------------|----------|
| Residential | ✓ | ✓ | ✓ | ✓ | ✓ |
| Commercial | ✓ | ✓ | ✓ | ✓ | ✓ |
| Industrial | ✓ | ✓ | ✓ | ✓ | ✓ |
| Institution | ✓ | ✓ | ✓ | ✓ | ✓ |
| Mixed | ✓ | ✓ | ✓ | - | ✓ |
| Infrastructure | ✓ | ✓ | ✓ | ✓ | ✓ |

All combinations valid except Mixed × Remediation (not typical use case).

---

## Appendix B: Seniors Living Classifications (ILUs & Class 9c)

This appendix provides detailed guidance on the two seniors living building types integrated into the Profiler.

### B.1 Retirement Living / Independent Living Units (ILUs)

**Definition:** Residential accommodation designed for older Australians who can live independently but want access to community amenities, social engagement, and optional support services.

**NCC Classification (depends on configuration):**
| Configuration | NCC Class | Key Characteristics |
|---------------|-----------|---------------------|
| Detached Villa | Class 1a | Single dwelling, not above/below another |
| Attached Townhouse | Class 1a | Row housing, fire-separated, not stacked |
| Apartment Building | Class 2 | Units above/below each other |
| Serviced Apartment | Class 3 | Transient accommodation with services |

**Regulatory Framework:**
- Retirement Villages Act (varies by state/territory)
- Residential Tenancies Act may apply to some ILUs
- Design requirements: Livable Housing Australia guidelines recommended

**Typical Scale Metrics:**
| Metric | Small Village | Medium Village | Large Village |
|--------|---------------|----------------|---------------|
| ILU Count | 20-60 | 60-150 | 150-300+ |
| Avg ILU Size | 60-80m² | 80-100m² | 100-120m² |
| Serviced Apartments | 0-10 | 10-30 | 30-50 |
| Community Facilities | 200-500m² | 500-1,000m² | 1,000-2,000m² |

**Complexity Cost Multipliers:**
| Village Type | Multiplier | Notes |
|--------------|------------|-------|
| Independent Living Only | 1.0x | Baseline |
| Mixed (ILU + Serviced) | 1.15x | Additional Class 3 compliance |
| Integrated Care (ILU + Aged Care) | 1.3x | Class 9c co-location |
| Vertical Village | 1.25x | Multi-storey, lift access, fire systems |

**Key Consultant Disciplines:**
- Architect (seniors living specialist)
- Accessibility Consultant
- Retirement Living Operator Consultant
- Landscape Architect (outdoor spaces critical)
- Fire Engineer (if Class 3 components)

---

### B.2 Residential Aged Care (Class 9c)

**Definition:** NCC Class 9c buildings are residential care facilities where 10% or more of residents need physical assistance with daily activities and evacuation. This classification allows for any mix of low and high care residents.

**Key Distinction from Other Classes:**
| Class | Care Level | Typical Use |
|-------|------------|-------------|
| Class 3 | Low care, mostly independent | Hostels, boarding houses |
| Class 9a | Full-time nursing care | Hospitals, nursing homes |
| Class 9c | Mixed care (10%+ need assistance) | Aged care homes, RAC facilities |

**Regulatory Framework:**
- National Construction Code (NCC) Volume 1
- Aged Care Quality Standards (Commonwealth)
- State-specific variations (e.g., VIC Part I4)
- National Aged Care Design Principles and Guidelines
- AS1428.1 (Accessibility)

**Typical Scale Metrics:**
| Metric | Small Facility | Medium Facility | Large Facility |
|--------|----------------|-----------------|-----------------|
| Total Beds | 60-80 | 80-120 | 120-150+ |
| Dementia Beds | 10-20 | 20-40 | 40-60 |
| GFA per Bed | 50-60m² | 60-70m² | 70-80m² |
| Households/Wings | 4-6 | 6-8 | 8-12 |
| Beds per Household | 10-16 | 10-16 | 10-16 |

**Accommodation Models (Complexity):**
| Model | Description | Cost/Bed (AUD 2025) |
|-------|-------------|---------------------|
| Traditional (Corridors) | Long corridors, central nursing station | $250,000-$300,000 |
| Household (10-16 beds) | Clustered living areas, decentralized care | $300,000-$400,000 |
| Small House (6-12 beds) | Domestic-scale, home-like environment | $400,000-$450,000 |
| Cottage (SDCP) | Specialist dementia, cottage-style units | $450,000-$500,000+ |

**Dementia Design Requirements:**
- Secure perimeters with concealed exits
- Wayfinding cues (landmarks, color coding)
- Visible toilets from bedrooms
- Clustered bedrooms around central living
- Reduced corridor lengths
- Sensory gardens with walking circuits
- Movement-activated lighting

**NCC Compliance Requirements (Class 9c):**
- Bedroom doorways: minimum 900mm clear width
- Other doorways: minimum 800mm clear width
- Window sills: maximum 900mm above floor (habitable rooms)
- Grab rails: AS1428.1 compliant at all toilets, showers, baths
- General purpose outlets: 2 per wall in bedrooms

**Key Consultant Disciplines:**
- Architect (aged care specialist)
- Accessibility Consultant (AS1428.1)
- Fire Engineer (essential for Class 9c)
- Acoustic Consultant (noise control)
- Commercial Kitchen Consultant
- Infection Control Consultant
- Dementia Design Specialist (if memory support wing)

---

### B.3 Integrated Seniors Living Developments

Some developments combine ILUs with Residential Aged Care, creating a "continuum of care" campus:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INTEGRATED SENIORS LIVING CAMPUS                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────────────────┐│
│  │  ILU Villas │   │   ILU       │   │   Residential Aged Care     ││
│  │  (Class 1a) │   │ Apartments  │   │       (Class 9c)            ││
│  │             │   │  (Class 2)  │   │                             ││
│  │  60 units   │   │  40 units   │   │  120 beds (incl 30 dementia)││
│  └─────────────┘   └─────────────┘   └─────────────────────────────┘│
│                                                                      │
│  ┌───────────────────────────────────────────────────────┐          │
│  │         Shared Community & Wellness Centre            │          │
│  │    (Pool, Gym, Café, Allied Health, Admin)            │          │
│  └───────────────────────────────────────────────────────┘          │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**Classification Approach for Integrated Developments:**
- Use "Mixed" building class with multi-select subclasses
- OR create separate project profiles for each component
- Complexity dimension "Care Integration: Co-located Aged Care" applies

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Building Class** | Primary categorization of building use (Residential, Commercial, etc.) |
| **Project Type** | Nature of work (Refurb, Extend, New, Remediation, Advisory) |
| **Subclass** | Secondary categorization within a Class (Office within Commercial) |
| **Scale** | Quantitative metrics (GFA, levels, units) |
| **Complexity** | Quality/difficulty level affecting scope and cost |
| **Polish** | AI refinement of objectives incorporating user feedback |
| **FQBP** | Legacy objectives structure (Functional, Quality, Budget, Program) |
| **ILU** | Independent Living Unit - self-contained dwelling in a retirement village |
| **Class 9c** | NCC building class for residential aged care (10%+ residents need physical assistance) |
| **SDCP** | Specialist Dementia Care Program - Commonwealth program for severe BPSD |
| **BPSD** | Behavioural and Psychological Symptoms of Dementia |
| **Household Model** | Aged care design clustering 10-16 beds around shared living space |
| **RAC** | Residential Aged Care |
| **NCC** | National Construction Code (Australia) |
| **BCA** | Building Code of Australia (incorporated into NCC) |
| **AS1428.1** | Australian Standard for Design for Access and Mobility |
| **Livable Housing** | Design guidelines for accessible, adaptable housing (Silver/Gold/Platinum) |
