# Inference Rules Research Output

**Research Date**: 2026-01-27
**Researcher**: Claude Opus 4.5
**Purpose**: Comprehensive expansion of inference rules for Assemble.ai intelligent report generation

---

## Executive Summary

This document contains the research output for expanding the inference rules from 33 existing rules to comprehensive coverage. The rules are organized by category and include JSON definitions ready for integration into `inference-rules.json`.

### Current State
| Category | Existing Rules |
|----------|---------------|
| Functional & Quality Objectives | 6 |
| Planning & Compliance Objectives | 7 |
| Client Stakeholders | 3 |
| Authority Stakeholders | 5 |
| Consultant Stakeholders | 8 |
| Contractor Stakeholders | 4 |
| **Total** | **33** |

### Target State
| Category | Target Rules | New Rules |
|----------|-------------|-----------|
| Functional & Quality Objectives | 30+ | 24+ |
| Planning & Compliance Objectives | 50+ | 43+ |
| Client Stakeholders | 8 | 5 |
| Authority Stakeholders | 25+ | 20+ |
| Consultant Stakeholders | 25+ | 17+ |
| Contractor Stakeholders | 25+ | 21+ |
| **Total** | **163+** | **130+** |

---

## 1. Stakeholder Rules

### 1.1 Consultant Stakeholders (New Rules)

The following 17 consultant disciplines are not currently covered. Research findings and rule definitions:

#### Town Planner (sco-021)
**Trigger Analysis**: Required for DA pathways, rezoning applications, and State Significant developments. Essential for navigating planning instruments, LEP/DCP compliance, and strategic merit assessments.

```json
{
  "id": "sco-021",
  "description": "Town Planner for development applications",
  "condition": {
    "or": [
      { "profiler": { "complexity": { "approval_pathway": ["standard_da", "regional_da", "state_significant"] } } },
      { "profiler": { "project_type": "new" } }
    ]
  },
  "infer": [{ "name": "Town Planning", "subgroup": "Other", "reason": "Planning strategy and DA coordination", "confidence": "high" }],
  "priority": 92,
  "source": "inferred"
}
```

#### Traffic Engineer (sco-022)
**Trigger Analysis**: Required when development generates significant traffic (typically 50+ car spaces or uses like retail, commercial, industrial). TfNSW and Council require traffic impact assessments for threshold developments.

```json
{
  "id": "sco-022",
  "description": "Traffic for traffic generating developments",
  "condition": {
    "or": [
      { "profiler": { "scale": { "car_spaces": { "min": 50 } } } },
      { "profiler": { "scale": { "gfa_sqm": { "min": 2500 } } } },
      { "profiler": { "building_class": ["commercial", "industrial"] } },
      { "profiler": { "subclass": ["retail", "shopping_centre", "warehouse", "logistics"] } }
    ]
  },
  "infer": [{ "name": "Traffic", "subgroup": "Traffic", "reason": "Traffic impact assessment", "confidence": "high" }],
  "priority": 78,
  "source": "inferred"
}
```

#### Landscape Architect (sco-023)
**Trigger Analysis**: Required for projects with external works scope, public spaces, or where DA conditions require landscape plans. Essential for commercial, institutional, and multi-residential developments.

```json
{
  "id": "sco-023",
  "description": "Landscape for external works",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["landscaping", "external_lighting", "car_parking"] } },
      { "profiler": { "building_class": ["commercial", "institution"] } },
      { "profiler": { "subclass": ["apartments", "mixed_use", "retail", "hotel"] } },
      { "profiler": { "scale": { "gfa_sqm": { "min": 1000 } } } }
    ]
  },
  "infer": [{ "name": "Landscape", "subgroup": "Landscape", "reason": "Landscape design and external works", "confidence": "high" }],
  "priority": 72,
  "source": "inferred"
}
```

#### Acoustic Consultant (sco-024)
**Trigger Analysis**: Required for mixed-use developments, entertainment venues, industrial near residential, transport corridors, and projects with noise-sensitive uses (healthcare, education, residential).

```json
{
  "id": "sco-024",
  "description": "Acoustic for noise-sensitive developments",
  "condition": {
    "or": [
      { "profiler": { "building_class": "mixed" } },
      { "profiler": { "subclass": ["entertainment", "hotel", "apartments", "education", "healthcare", "manufacturing"] } },
      { "profiler": { "complexity": { "site_conditions": "infill" } } },
      { "and": [
        { "profiler": { "building_class": "residential" } },
        { "profiler": { "scale": { "units": { "min": 10 } } } }
      ]}
    ]
  },
  "infer": [{ "name": "Acoustic", "subgroup": "Acoustic", "reason": "Acoustic assessment and noise control", "confidence": "high" }],
  "priority": 68,
  "source": "inferred"
}
```

#### Facade Engineer (sco-025)
**Trigger Analysis**: Required for curtain wall systems, complex facade systems, and tall buildings (8+ storeys) where facade performance is critical for weathertightness, thermal, and structural adequacy.

```json
{
  "id": "sco-025",
  "description": "Facade for complex building envelopes",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["curtain_wall", "facade_system"] } },
      { "profiler": { "scale": { "storeys": { "min": 8 } } } },
      { "and": [
        { "profiler": { "building_class": "commercial" } },
        { "profiler": { "complexity": { "quality_tier": ["high", "premium"] } } }
      ]}
    ]
  },
  "infer": [{ "name": "Facade", "subgroup": "Facade", "reason": "Facade design and performance", "confidence": "high" }],
  "priority": 76,
  "source": "inferred"
}
```

#### Lighting Designer (sco-026)
**Trigger Analysis**: Required for premium commercial, public buildings, entertainment venues, retail, and hospitality where lighting is a design feature beyond functional requirements.

```json
{
  "id": "sco-026",
  "description": "Lighting for feature lighting",
  "condition": {
    "or": [
      { "profiler": { "subclass": ["entertainment", "hotel", "retail", "museum_gallery", "performing_arts"] } },
      { "profiler": { "complexity": { "quality_tier": "premium" } } },
      { "and": [
        { "profiler": { "building_class": "commercial" } },
        { "profiler": { "complexity": { "quality_tier": "high" } } }
      ]}
    ]
  },
  "infer": [{ "name": "Lighting", "subgroup": "Other", "reason": "Feature and architectural lighting design", "confidence": "medium" }],
  "priority": 55,
  "source": "inferred"
}
```

#### Vertical Transport Consultant (sco-027)
**Trigger Analysis**: Required for buildings with lifts (typically 4+ storeys, or any building with accessibility lift requirements). Essential for high-rise, hospitals, and buildings with complex vertical circulation.

```json
{
  "id": "sco-027",
  "description": "Vertical Transport for lift design",
  "condition": {
    "or": [
      { "profiler": { "scale": { "storeys": { "min": 4 } } } },
      { "profiler": { "work_scope_includes": ["vertical_transport"] } },
      { "profiler": { "subclass": ["healthcare", "hotel", "apartments"] } }
    ]
  },
  "infer": [{ "name": "Vertical Transport", "subgroup": "Other", "reason": "Lift design and traffic analysis", "confidence": "high" }],
  "priority": 74,
  "source": "inferred"
}
```

#### BMS Consultant (sco-028)
**Trigger Analysis**: Required for commercial buildings with complex HVAC systems, large scale developments (2000+ sqm), and buildings requiring integrated building management.

```json
{
  "id": "sco-028",
  "description": "BMS for building automation",
  "condition": {
    "or": [
      { "profiler": { "scale": { "gfa_sqm": { "min": 2000 } } } },
      { "profiler": { "work_scope_includes": ["bms_controls"] } },
      { "profiler": { "subclass": ["data_centre", "healthcare", "hotel", "shopping_centre"] } }
    ]
  },
  "infer": [{ "name": "BMS", "subgroup": "Other", "reason": "Building management system design", "confidence": "medium" }],
  "priority": 62,
  "source": "inferred"
}
```

#### Security Consultant (sco-029)
**Trigger Analysis**: Required for secure facilities, retail (theft prevention), schools (CPTED), healthcare (duress), commercial (access control), and any building with security classification requirements.

```json
{
  "id": "sco-029",
  "description": "Security for security design",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["security_systems"] } },
      { "profiler": { "subclass": ["retail", "shopping_centre", "education", "healthcare", "correctional", "emergency_services"] } },
      { "profiler": { "building_class": ["defense"] } },
      { "and": [
        { "profiler": { "building_class": "commercial" } },
        { "profiler": { "scale": { "gfa_sqm": { "min": 2000 } } } }
      ]}
    ]
  },
  "infer": [{ "name": "Security", "subgroup": "Other", "reason": "Security design and CPTED", "confidence": "high" }],
  "priority": 65,
  "source": "inferred"
}
```

#### ICT Consultant (sco-030)
**Trigger Analysis**: Required for commercial buildings, data centres, smart buildings, and buildings with structured cabling and technology infrastructure requirements.

```json
{
  "id": "sco-030",
  "description": "ICT for technology infrastructure",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["ict_structured_cabling"] } },
      { "profiler": { "subclass": ["data_centre", "office", "flex_office", "education"] } },
      { "and": [
        { "profiler": { "building_class": "commercial" } },
        { "profiler": { "scale": { "gfa_sqm": { "min": 1500 } } } }
      ]}
    ]
  },
  "infer": [{ "name": "ICT", "subgroup": "Other", "reason": "ICT and structured cabling design", "confidence": "medium" }],
  "priority": 58,
  "source": "inferred"
}
```

#### Quantity Surveyor (sco-031)
**Trigger Analysis**: Required for virtually all projects for cost planning, budgeting, and cost control. Universal consultant that should be suggested for any building project.

```json
{
  "id": "sco-031",
  "description": "Cost Planning for cost management",
  "condition": {
    "or": [
      { "profiler": { "building_class": ["residential", "commercial", "industrial", "institution", "mixed", "infrastructure"] } },
      { "profiler": { "project_type": ["new", "refurb", "fitout"] } }
    ]
  },
  "infer": [{ "name": "Cost Planning", "subgroup": "Other", "reason": "Cost planning and management", "confidence": "high" }],
  "priority": 93,
  "source": "inferred"
}
```

#### Building Certifier / PCA (sco-032)
**Trigger Analysis**: Required for all projects requiring Construction Certificate and Occupation Certificate in Australia. Universal requirement for building works.

```json
{
  "id": "sco-032",
  "description": "Building Certifier for certification",
  "condition": {
    "and": [
      { "profiler": { "region": "AU" } },
      { "or": [
        { "profiler": { "project_type": ["new", "refurb"] } },
        { "profiler": { "building_class": ["residential", "commercial", "industrial", "institution", "mixed"] } }
      ]}
    ]
  },
  "infer": [{ "name": "Building Certifier", "subgroup": "BCA", "reason": "CC and OC certification", "confidence": "high" }],
  "priority": 94,
  "source": "inferred"
}
```

#### Surveyor (sco-033)
**Trigger Analysis**: Required for all new builds (site survey, setout), subdivisions, strata, and boundary disputes. Essential for accurate site information.

```json
{
  "id": "sco-033",
  "description": "Survey for site survey and setout",
  "condition": {
    "or": [
      { "profiler": { "project_type": "new" } },
      { "profiler": { "work_scope_includes": ["bulk_earthworks", "site_clearance"] } },
      { "profiler": { "subclass": ["apartments", "townhouse", "subdivision"] } }
    ]
  },
  "infer": [{ "name": "Survey", "subgroup": "Surveyor", "reason": "Site survey and construction setout", "confidence": "high" }],
  "priority": 88,
  "source": "inferred"
}
```

#### Arborist (sco-034)
**Trigger Analysis**: Required when sites have significant trees, tree preservation orders, or where DA conditions require arborist reports. Often triggered by Council tree registers or site vegetation.

```json
{
  "id": "sco-034",
  "description": "Arborist for tree assessment",
  "condition": {
    "or": [
      { "profiler": { "complexity": { "site_conditions": ["greenfield", "infill"] } } },
      { "profiler": { "work_scope_includes": ["site_clearance", "landscaping"] } }
    ]
  },
  "infer": [{ "name": "Arborist", "subgroup": "Other", "reason": "Tree assessment and protection", "confidence": "medium" }],
  "priority": 52,
  "source": "inferred"
}
```

#### Wind Engineer (sco-035)
**Trigger Analysis**: Required for tall buildings (15+ storeys), exposed coastal sites, and developments where wind effects impact pedestrian comfort, facade design, or structural loads.

```json
{
  "id": "sco-035",
  "description": "Wind for tall buildings",
  "condition": {
    "or": [
      { "profiler": { "scale": { "storeys": { "min": 15 } } } },
      { "profiler": { "complexity": { "site_conditions": "coastal" } } },
      { "and": [
        { "profiler": { "building_class": "commercial" } },
        { "profiler": { "scale": { "storeys": { "min": 10 } } } }
      ]}
    ]
  },
  "infer": [{ "name": "Wind", "subgroup": "Other", "reason": "Wind impact assessment", "confidence": "high" }],
  "priority": 66,
  "source": "inferred"
}
```

#### ESD Consultant (sco-036)
**Trigger Analysis**: Required for Green Star targets, NABERS commitments, BASIX compliance, and premium/high quality commercial developments with sustainability targets.

```json
{
  "id": "sco-036",
  "description": "ESD for sustainability",
  "condition": {
    "or": [
      { "profiler": { "complexity": { "sustainability_rating": ["green_star", "nabers_5", "nabers_6"] } } },
      { "profiler": { "complexity": { "quality_tier": "premium" } } },
      { "and": [
        { "profiler": { "building_class": "commercial" } },
        { "profiler": { "complexity": { "quality_tier": "high" } } }
      ]},
      { "profiler": { "subclass": ["data_centre"] } }
    ]
  },
  "infer": [{ "name": "ESD", "subgroup": "Other", "reason": "Sustainability and ESD design", "confidence": "high" }],
  "priority": 64,
  "source": "inferred"
}
```

#### Interior Designer (sco-037)
**Trigger Analysis**: Required for fitout projects, hospitality, retail, premium commercial, and residential with high/premium finishes where interior design drives the outcome.

```json
{
  "id": "sco-037",
  "description": "Interior Designer for fitout and finishes",
  "condition": {
    "or": [
      { "profiler": { "project_type": "fitout" } },
      { "profiler": { "subclass": ["hotel", "retail", "restaurant", "entertainment"] } },
      { "profiler": { "work_scope_includes": ["specialist_fitout", "joinery"] } },
      { "and": [
        { "profiler": { "building_class": ["commercial", "residential"] } },
        { "profiler": { "complexity": { "quality_tier": ["high", "premium"] } } }
      ]}
    ]
  },
  "infer": [{ "name": "Interior Designer", "subgroup": "Interior Design", "reason": "Interior design and FF&E", "confidence": "high" }],
  "priority": 69,
  "source": "inferred"
}
```

### 1.2 Contractor Stakeholders (New Rules)

The following 19 trade contractors are not currently covered. Research findings and rule definitions:

#### Structural Steel Contractor (str-011)
**Trigger Analysis**: Required when steel frame is specified in work scope, or for commercial/industrial buildings where steel is the primary structural system.

```json
{
  "id": "str-011",
  "description": "Structural Steel for steel structure",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["steel_frame"] } },
      { "profiler": { "subclass": ["warehouse", "logistics", "manufacturing"] } }
    ]
  },
  "infer": [{ "name": "Structural Steel", "subgroup": "Structure", "reason": "Steel fabrication and erection", "confidence": "high" }],
  "priority": 82,
  "source": "inferred"
}
```

#### Concrete Contractor (str-012)
**Trigger Analysis**: Required for in-situ concrete works, multi-storey construction, and any project with significant concrete elements.

```json
{
  "id": "str-012",
  "description": "Concrete for concrete works",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["substructure", "superstructure"] } },
      { "profiler": { "scale": { "storeys": { "min": 2 } } } },
      { "profiler": { "scale": { "basement_levels": { "min": 1 } } } }
    ]
  },
  "infer": [{ "name": "Concrete", "subgroup": "Structure", "reason": "Concrete supply and placement", "confidence": "high" }],
  "priority": 83,
  "source": "inferred"
}
```

#### Formwork Contractor (str-013)
**Trigger Analysis**: Required for multi-storey concrete construction, basement works, and complex concrete structures requiring formwork systems.

```json
{
  "id": "str-013",
  "description": "Formwork for concrete structure",
  "condition": {
    "or": [
      { "profiler": { "scale": { "storeys": { "min": 3 } } } },
      { "profiler": { "scale": { "basement_levels": { "min": 1 } } } },
      { "profiler": { "work_scope_includes": ["post_tensioning"] } }
    ]
  },
  "infer": [{ "name": "Formwork", "subgroup": "Structure", "reason": "Formwork systems", "confidence": "high" }],
  "priority": 81,
  "source": "inferred"
}
```

#### Mechanical Services Contractor (str-014)
**Trigger Analysis**: Required for any project with HVAC scope, commercial buildings, and buildings with mechanical ventilation requirements.

```json
{
  "id": "str-014",
  "description": "Mechanical for HVAC systems",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["mechanical_hvac"] } },
      { "profiler": { "building_class": ["commercial", "institution"] } },
      { "profiler": { "scale": { "gfa_sqm": { "min": 500 } } } }
    ]
  },
  "infer": [{ "name": "Mechanical", "subgroup": "Mechanical", "reason": "HVAC installation", "confidence": "high" }],
  "priority": 84,
  "source": "inferred"
}
```

#### Electrical Services Contractor (str-015)
**Trigger Analysis**: Required for virtually all building projects with electrical scope. Universal trade.

```json
{
  "id": "str-015",
  "description": "Electrical for power and lighting",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["electrical_power"] } },
      { "profiler": { "building_class": ["residential", "commercial", "industrial", "institution", "mixed"] } }
    ]
  },
  "infer": [{ "name": "Electrical", "subgroup": "Electrical", "reason": "Electrical installation", "confidence": "high" }],
  "priority": 86,
  "source": "inferred"
}
```

#### Hydraulic Services Contractor (str-016)
**Trigger Analysis**: Required for any project with plumbing scope, wet areas, or sanitary facilities.

```json
{
  "id": "str-016",
  "description": "Hydraulic for plumbing and drainage",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["hydraulic_plumbing"] } },
      { "profiler": { "building_class": ["residential", "commercial", "institution"] } }
    ]
  },
  "infer": [{ "name": "Hydraulic", "subgroup": "Hydraulic", "reason": "Plumbing installation", "confidence": "high" }],
  "priority": 85,
  "source": "inferred"
}
```

#### Fire Services Contractor (str-017)
**Trigger Analysis**: Required for projects with fire services scope, multi-storey buildings, and commercial/institutional buildings requiring fire systems.

```json
{
  "id": "str-017",
  "description": "Fire Services for fire protection",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["fire_services"] } },
      { "profiler": { "scale": { "storeys": { "min": 2 } } } },
      { "profiler": { "building_class": ["commercial", "institution"] } }
    ]
  },
  "infer": [{ "name": "Fire Services", "subgroup": "Fire", "reason": "Fire system installation", "confidence": "high" }],
  "priority": 80,
  "source": "inferred"
}
```

#### Lift Installation Contractor (str-018)
**Trigger Analysis**: Required for projects with vertical transport scope, buildings 4+ storeys, or any building requiring accessibility lifts.

```json
{
  "id": "str-018",
  "description": "Lift for vertical transport",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["vertical_transport"] } },
      { "profiler": { "scale": { "storeys": { "min": 4 } } } },
      { "profiler": { "subclass": ["healthcare", "hotel", "apartments"] } }
    ]
  },
  "infer": [{ "name": "Lift", "subgroup": "Vertical Transport", "reason": "Lift installation", "confidence": "high" }],
  "priority": 74,
  "source": "inferred"
}
```

#### Glazing Contractor (str-019)
**Trigger Analysis**: Required for curtain wall, shopfronts, and commercial buildings with significant glazing.

```json
{
  "id": "str-019",
  "description": "Glazing for windows and curtain wall",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["curtain_wall", "glazing"] } },
      { "profiler": { "subclass": ["retail", "shopping_centre", "office"] } }
    ]
  },
  "infer": [{ "name": "Glazing", "subgroup": "Glazing", "reason": "Glazing installation", "confidence": "high" }],
  "priority": 72,
  "source": "inferred"
}
```

#### Roofing Contractor (str-020)
**Trigger Analysis**: Required for projects with roofing scope, new builds, and any building with significant roof area.

```json
{
  "id": "str-020",
  "description": "Roofing for roof coverage",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["roofing"] } },
      { "profiler": { "project_type": "new" } },
      { "profiler": { "subclass": ["warehouse", "industrial", "house"] } }
    ]
  },
  "infer": [{ "name": "Roofing", "subgroup": "Roofing", "reason": "Roof installation", "confidence": "high" }],
  "priority": 73,
  "source": "inferred"
}
```

#### Waterproofing Contractor (str-021)
**Trigger Analysis**: Required for projects with waterproofing scope, wet areas, below-ground structures, and buildings with podiums/rooftop terraces.

```json
{
  "id": "str-021",
  "description": "Waterproofing for wet areas and structure",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["waterproofing"] } },
      { "profiler": { "scale": { "basement_levels": { "min": 1 } } } },
      { "profiler": { "subclass": ["apartments", "hotel"] } }
    ]
  },
  "infer": [{ "name": "Waterproofing", "subgroup": "Waterproofing", "reason": "Waterproofing installation", "confidence": "high" }],
  "priority": 71,
  "source": "inferred"
}
```

#### Fitout Contractor (str-022)
**Trigger Analysis**: Required for fitout projects, internal works, and commercial/retail tenancies.

```json
{
  "id": "str-022",
  "description": "Fitout for internal works",
  "condition": {
    "or": [
      { "profiler": { "project_type": "fitout" } },
      { "profiler": { "work_scope_includes": ["partitions_walls", "specialist_fitout"] } },
      { "profiler": { "subclass": ["office", "retail"] } }
    ]
  },
  "infer": [{ "name": "Fitout", "subgroup": "Fitout", "reason": "Internal fitout works", "confidence": "high" }],
  "priority": 70,
  "source": "inferred"
}
```

#### Joinery Contractor (str-023)
**Trigger Analysis**: Required for custom joinery, kitchens, and premium residential/commercial with bespoke cabinetry.

```json
{
  "id": "str-023",
  "description": "Joinery for cabinetry",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["joinery"] } },
      { "profiler": { "complexity": { "quality_tier": ["high", "premium"] } } },
      { "profiler": { "subclass": ["hotel", "restaurant", "retail"] } }
    ]
  },
  "infer": [{ "name": "Joinery", "subgroup": "Joinery", "reason": "Custom joinery fabrication", "confidence": "high" }],
  "priority": 65,
  "source": "inferred"
}
```

#### Flooring Contractor (str-024)
**Trigger Analysis**: Required for projects with flooring scope, internal fitout, and commercial/residential with specified floor finishes.

```json
{
  "id": "str-024",
  "description": "Flooring for floor finishes",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["flooring"] } },
      { "profiler": { "project_type": ["new", "refurb", "fitout"] } }
    ]
  },
  "infer": [{ "name": "Flooring", "subgroup": "Flooring", "reason": "Floor finish installation", "confidence": "medium" }],
  "priority": 62,
  "source": "inferred"
}
```

#### Ceiling Contractor (str-025)
**Trigger Analysis**: Required for projects with ceiling scope, commercial fitout, and buildings with suspended ceiling systems.

```json
{
  "id": "str-025",
  "description": "Ceilings for suspended ceilings",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["ceilings"] } },
      { "profiler": { "building_class": ["commercial", "institution"] } },
      { "profiler": { "project_type": "fitout" } }
    ]
  },
  "infer": [{ "name": "Ceilings", "subgroup": "Ceilings", "reason": "Ceiling installation", "confidence": "medium" }],
  "priority": 60,
  "source": "inferred"
}
```

#### Painting Contractor (str-026)
**Trigger Analysis**: Required for virtually all building projects with internal finishes.

```json
{
  "id": "str-026",
  "description": "Painting for finishes",
  "condition": {
    "or": [
      { "profiler": { "project_type": ["new", "refurb", "fitout"] } },
      { "profiler": { "work_scope_includes": ["partitions_walls", "internal_fitout"] } }
    ]
  },
  "infer": [{ "name": "Painting", "subgroup": "Painting", "reason": "Painting and finishes", "confidence": "high" }],
  "priority": 58,
  "source": "inferred"
}
```

#### Landscaping Contractor (str-027)
**Trigger Analysis**: Required for projects with landscaping scope, external works, and developments with outdoor areas.

```json
{
  "id": "str-027",
  "description": "Landscaping for external works",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["landscaping"] } },
      { "profiler": { "building_class": ["commercial", "institution"] } },
      { "profiler": { "subclass": ["apartments", "mixed_use", "hotel"] } }
    ]
  },
  "infer": [{ "name": "Landscaping", "subgroup": "Landscaping", "reason": "Landscape installation", "confidence": "high" }],
  "priority": 56,
  "source": "inferred"
}
```

#### Signage Contractor (str-028)
**Trigger Analysis**: Required for commercial, retail, and hospitality projects with signage and wayfinding requirements.

```json
{
  "id": "str-028",
  "description": "Signage for wayfinding",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["signage_wayfinding"] } },
      { "profiler": { "subclass": ["retail", "shopping_centre", "hotel", "office"] } },
      { "profiler": { "building_class": "institution" } }
    ]
  },
  "infer": [{ "name": "Signage", "subgroup": "Signage", "reason": "Signage and wayfinding installation", "confidence": "medium" }],
  "priority": 50,
  "source": "inferred"
}
```

#### Precast Contractor (str-029)
**Trigger Analysis**: Required for projects with precast elements, industrial buildings, and multi-storey construction using precast systems.

```json
{
  "id": "str-029",
  "description": "Precast for concrete elements",
  "condition": {
    "or": [
      { "profiler": { "work_scope_includes": ["precast_elements"] } },
      { "profiler": { "subclass": ["warehouse", "logistics", "manufacturing"] } }
    ]
  },
  "infer": [{ "name": "Precast", "subgroup": "Structure", "reason": "Precast fabrication and erection", "confidence": "high" }],
  "priority": 78,
  "source": "inferred"
}
```

---

## 2. Building Class Rules

### 2.1 Industrial Building Class

#### Functional & Quality Objectives - Industrial

```json
{
  "id": "ofq-030",
  "description": "Warehouse floor specifications",
  "condition": { "profiler": { "subclass": ["warehouse", "logistics"] } },
  "infer": [
    { "text": "Industrial floor slab with {{scale.floor_load_kpa}} kPa capacity", "category": "Structure", "confidence": "high" },
    { "text": "Floor flatness to FM2/FM3 specification", "category": "Structure", "confidence": "medium" },
    { "text": "Clear height {{scale.clear_height_m}}m to underside of structure", "category": "Structure", "confidence": "high" }
  ],
  "priority": 85,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-031",
  "description": "Manufacturing facility requirements",
  "condition": { "profiler": { "subclass": "manufacturing" } },
  "infer": [
    { "text": "Production floor area {{scale.production_sqm}} sqm", "category": "Functional", "confidence": "high" },
    { "text": "Heavy vehicle access and hardstand", "category": "Access", "confidence": "high" },
    { "text": "Three-phase power supply", "category": "Services", "confidence": "high" }
  ],
  "priority": 80,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-032",
  "description": "Cold storage requirements",
  "condition": { "profiler": { "subclass": "cold_storage" } },
  "infer": [
    { "text": "Refrigerated storage {{scale.cold_storage_sqm}} sqm", "category": "Functional", "confidence": "high" },
    { "text": "Temperature-controlled dock levellers", "category": "Functional", "confidence": "high" },
    { "text": "Insulated panel construction", "category": "Structure", "confidence": "high" },
    { "text": "Ammonia or CO2 refrigeration system", "category": "Services", "confidence": "medium" }
  ],
  "priority": 82,
  "source": "inferred"
}
```

```json
{
  "id": "ofq-033",
  "description": "Cleanroom requirements",
  "condition": { "profiler": { "subclass": "cleanroom" } },
  "infer": [
    { "text": "ISO Class {{complexity.iso_class}} cleanroom environment", "category": "Functional", "confidence": "high" },
    { "text": "HEPA filtration and positive pressure", "category": "Services", "confidence": "high" },
    { "text": "Gowning and airlock facilities", "category": "Functional", "confidence": "high" },
    { "text": "Clean build protocols", "category": "Construction", "confidence": "high" }
  ],
  "priority": 85,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-034",
  "description": "Data centre requirements",
  "condition": { "profiler": { "subclass": ["data_centre", "data_centre_colo", "data_centre_hyperscale"] } },
  "infer": [
    { "text": "Uptime Institute Tier {{complexity.uptime_tier}} design", "category": "Reliability", "confidence": "high" },
    { "text": "IT load capacity {{scale.it_load_mw}} MW", "category": "Power", "confidence": "high" },
    { "text": "N+1 redundant cooling systems", "category": "Services", "confidence": "high" },
    { "text": "UPS and generator backup", "category": "Power", "confidence": "high" },
    { "text": "PUE target {{complexity.pue_target}}", "category": "Efficiency", "confidence": "medium" }
  ],
  "priority": 88,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-035",
  "description": "Dangerous goods facility",
  "condition": { "profiler": { "complexity": { "dangerous_goods": ["class_3", "class_4", "class_5", "class_6", "class_8"] } } },
  "infer": [
    { "text": "Dangerous goods storage Class {{complexity.dangerous_goods}}", "category": "Safety", "confidence": "high" },
    { "text": "Bunded storage areas", "category": "Safety", "confidence": "high" },
    { "text": "Fire-rated separation", "category": "Safety", "confidence": "high" },
    { "text": "Emergency shower and eyewash stations", "category": "Safety", "confidence": "medium" }
  ],
  "priority": 90,
  "source": "inferred"
}
```

#### Planning & Compliance Objectives - Industrial

```json
{
  "id": "opc-030",
  "description": "EPA licensing for industrial",
  "condition": {
    "or": [
      { "profiler": { "subclass": ["manufacturing", "heavy_manufacturing", "waste_to_energy", "food_processing"] } },
      { "profiler": { "complexity": { "dangerous_goods": ["class_3", "class_4", "class_5", "class_6", "class_8"] } } }
    ]
  },
  "infer": [
    { "text": "EPA Environment Protection Licence", "category": "Environmental", "confidence": "high" },
    { "text": "Pollution Incident Response Management Plan", "category": "Environmental", "confidence": "high" }
  ],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "opc-031",
  "description": "WorkSafe requirements for industrial",
  "condition": { "profiler": { "building_class": "industrial" } },
  "infer": [
    { "text": "Work Health and Safety compliance", "category": "Safety", "confidence": "high" },
    { "text": "Plant and equipment registration", "category": "Safety", "confidence": "medium" }
  ],
  "priority": 75,
  "source": "inferred"
}
```

```json
{
  "id": "opc-032",
  "description": "Food safety requirements",
  "condition": { "profiler": { "subclass": ["food_processing", "cold_storage"] } },
  "infer": [
    { "text": "Food Standards Australia New Zealand (FSANZ) compliance", "category": "Food Safety", "confidence": "high" },
    { "text": "HACCP certification requirements", "category": "Food Safety", "confidence": "high" },
    { "text": "Food premises registration", "category": "Licensing", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "opc-033",
  "description": "TGA/GMP requirements for pharmaceutical",
  "condition": { "profiler": { "subclass": ["pharmaceutical_gmp", "cleanroom"] } },
  "infer": [
    { "text": "Therapeutic Goods Administration (TGA) licensing", "category": "Regulatory", "confidence": "high" },
    { "text": "Good Manufacturing Practice (GMP) certification", "category": "Quality", "confidence": "high" },
    { "text": "Validation and qualification protocols (IQ/OQ/PQ)", "category": "Quality", "confidence": "high" }
  ],
  "priority": 90,
  "source": "inferred"
}
```

```json
{
  "id": "opc-034",
  "description": "NCC Class 7/8 compliance",
  "condition": {
    "and": [
      { "profiler": { "region": "AU" } },
      { "profiler": { "building_class": "industrial" } }
    ]
  },
  "infer": [
    { "text": "NCC Class 7a/7b or Class 8 compliance", "category": "Building Code", "confidence": "high" },
    { "text": "Fire compartmentation requirements", "category": "Fire Safety", "confidence": "high" }
  ],
  "priority": 92,
  "source": "inferred"
}
```

#### Authority Stakeholders - Industrial

```json
{
  "id": "sa-010",
  "description": "EPA for industrial facilities",
  "condition": {
    "or": [
      { "profiler": { "subclass": ["manufacturing", "heavy_manufacturing", "waste_to_energy"] } },
      { "profiler": { "complexity": { "dangerous_goods": ["class_3", "class_4", "class_5", "class_6", "class_8"] } } }
    ]
  },
  "infer": [{ "name": "Environment Protection Authority", "subgroup": "EPA", "role": "Environment Protection Licence", "reason": "Scheduled activity licensing", "confidence": "high" }],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "sa-011",
  "description": "SafeWork for high-risk plant",
  "condition": {
    "or": [
      { "profiler": { "subclass": ["manufacturing", "heavy_manufacturing"] } },
      { "profiler": { "work_scope_includes": ["mechanical_hvac"] } }
    ]
  },
  "infer": [{ "name": "SafeWork NSW", "subgroup": "Other", "role": "High Risk Plant Registration", "reason": "Plant and equipment compliance", "confidence": "medium" }],
  "priority": 65,
  "source": "inferred"
}
```

```json
{
  "id": "sa-012",
  "description": "Food Authority for food facilities",
  "condition": { "profiler": { "subclass": ["food_processing", "cold_storage"] } },
  "infer": [{ "name": "NSW Food Authority", "subgroup": "Other", "role": "Food Premises Licence", "reason": "Food safety compliance", "confidence": "high" }],
  "priority": 80,
  "source": "inferred"
}
```

#### Consultant Stakeholders - Industrial

```json
{
  "id": "sco-040",
  "description": "Industrial process engineer",
  "condition": { "profiler": { "subclass": ["manufacturing", "heavy_manufacturing", "food_processing", "pharmaceutical_gmp"] } },
  "infer": [{ "name": "Process Engineer", "subgroup": "Other", "reason": "Manufacturing process design", "confidence": "high" }],
  "priority": 78,
  "source": "inferred"
}
```

```json
{
  "id": "sco-041",
  "description": "Refrigeration engineer for cold storage",
  "condition": { "profiler": { "subclass": "cold_storage" } },
  "infer": [{ "name": "Refrigeration Engineer", "subgroup": "Mechanical", "reason": "Refrigeration system design", "confidence": "high" }],
  "priority": 82,
  "source": "inferred"
}
```

```json
{
  "id": "sco-042",
  "description": "Validation specialist for GMP",
  "condition": { "profiler": { "subclass": ["pharmaceutical_gmp", "cleanroom"] } },
  "infer": [{ "name": "Validation Specialist", "subgroup": "Other", "reason": "GMP validation protocols", "confidence": "high" }],
  "priority": 80,
  "source": "inferred"
}
```

```json
{
  "id": "sco-043",
  "description": "Data centre specialist",
  "condition": { "profiler": { "subclass": ["data_centre", "data_centre_colo", "data_centre_hyperscale"] } },
  "infer": [
    { "name": "Data Centre Design Consultant", "subgroup": "Other", "reason": "Data centre architecture", "confidence": "high" },
    { "name": "Critical Power Engineer", "subgroup": "Electrical", "reason": "UPS and power systems", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

### 2.2 Institutional Building Class

#### Functional & Quality Objectives - Institutional

```json
{
  "id": "ofq-040",
  "description": "Education facility requirements",
  "condition": { "profiler": { "subclass": "education" } },
  "infer": [
    { "text": "Classroom accommodation for {{scale.students}} students", "category": "Capacity", "confidence": "high" },
    { "text": "Learning spaces per DET Educational Facilities Standards", "category": "Design", "confidence": "high" },
    { "text": "Outdoor play areas and covered assembly", "category": "Amenity", "confidence": "high" },
    { "text": "CPTED principles for student safety", "category": "Security", "confidence": "medium" }
  ],
  "priority": 85,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-041",
  "description": "Healthcare facility requirements",
  "condition": { "profiler": { "subclass": "healthcare" } },
  "infer": [
    { "text": "{{scale.beds}} bed capacity", "category": "Capacity", "confidence": "high" },
    { "text": "Clinical areas per Health Infrastructure guidelines", "category": "Design", "confidence": "high" },
    { "text": "Infection control measures", "category": "Clinical", "confidence": "high" },
    { "text": "Medical gas and suction systems", "category": "Services", "confidence": "high" },
    { "text": "Nurse call and patient monitoring systems", "category": "Services", "confidence": "high" }
  ],
  "priority": 88,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-042",
  "description": "Correctional facility requirements",
  "condition": { "profiler": { "subclass": "correctional" } },
  "infer": [
    { "text": "{{scale.beds}} bed secure accommodation", "category": "Capacity", "confidence": "high" },
    { "text": "Security zoning and controlled access", "category": "Security", "confidence": "high" },
    { "text": "Anti-ligature fixtures and fittings", "category": "Safety", "confidence": "high" },
    { "text": "CCTV and monitoring systems throughout", "category": "Security", "confidence": "high" }
  ],
  "priority": 90,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-043",
  "description": "Emergency services station requirements",
  "condition": { "profiler": { "subclass": "emergency_services" } },
  "infer": [
    { "text": "Appliance bays for {{scale.appliance_bays}} vehicles", "category": "Functional", "confidence": "high" },
    { "text": "Turnout response areas", "category": "Operational", "confidence": "high" },
    { "text": "Watch room and communications", "category": "Operational", "confidence": "high" },
    { "text": "Amenities and rest areas", "category": "Amenity", "confidence": "medium" }
  ],
  "priority": 82,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-044",
  "description": "Performing arts venue requirements",
  "condition": { "profiler": { "subclass": "performing_arts" } },
  "infer": [
    { "text": "Auditorium seating for {{scale.seating_capacity}} patrons", "category": "Capacity", "confidence": "high" },
    { "text": "Stage and backstage facilities", "category": "Functional", "confidence": "high" },
    { "text": "Acoustic isolation and treatment", "category": "Acoustic", "confidence": "high" },
    { "text": "Theatre lighting and rigging systems", "category": "Services", "confidence": "high" }
  ],
  "priority": 80,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-045",
  "description": "Sports and recreation requirements",
  "condition": { "profiler": { "subclass": "sports_recreation" } },
  "infer": [
    { "text": "Playing surface {{scale.playing_surface_sqm}} sqm", "category": "Functional", "confidence": "high" },
    { "text": "Spectator seating for {{scale.seating_capacity}}", "category": "Capacity", "confidence": "high" },
    { "text": "Player amenities and change rooms", "category": "Amenity", "confidence": "high" },
    { "text": "Sports lighting to competition standard", "category": "Services", "confidence": "medium" }
  ],
  "priority": 78,
  "source": "explicit"
}
```

#### Planning & Compliance Objectives - Institutional

```json
{
  "id": "opc-040",
  "description": "NCC Class 9 compliance",
  "condition": {
    "and": [
      { "profiler": { "region": "AU" } },
      { "profiler": { "building_class": "institution" } }
    ]
  },
  "infer": [
    { "text": "NCC Class 9a/9b compliance", "category": "Building Code", "confidence": "high" },
    { "text": "Emergency egress and fire safety requirements", "category": "Fire Safety", "confidence": "high" }
  ],
  "priority": 92,
  "source": "inferred"
}
```

```json
{
  "id": "opc-041",
  "description": "DET requirements for schools",
  "condition": {
    "and": [
      { "profiler": { "region": "AU" } },
      { "profiler": { "subclass": "education" } }
    ]
  },
  "infer": [
    { "text": "Department of Education standards compliance", "category": "Education", "confidence": "high" },
    { "text": "Educational Facilities Standards and Guidelines", "category": "Design", "confidence": "high" },
    { "text": "Working with Children Check requirements", "category": "Compliance", "confidence": "high" }
  ],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "opc-042",
  "description": "Health Infrastructure requirements",
  "condition": { "profiler": { "subclass": "healthcare" } },
  "infer": [
    { "text": "Health Infrastructure design guidelines", "category": "Health", "confidence": "high" },
    { "text": "Australasian Health Facility Guidelines (AHFG)", "category": "Health", "confidence": "high" },
    { "text": "Clinical services plan alignment", "category": "Planning", "confidence": "medium" }
  ],
  "priority": 90,
  "source": "inferred"
}
```

```json
{
  "id": "opc-043",
  "description": "Corrective Services requirements",
  "condition": { "profiler": { "subclass": "correctional" } },
  "infer": [
    { "text": "Corrective Services NSW design standards", "category": "Security", "confidence": "high" },
    { "text": "Security classification requirements", "category": "Security", "confidence": "high" },
    { "text": "Custodial facility operational requirements", "category": "Operational", "confidence": "high" }
  ],
  "priority": 92,
  "source": "inferred"
}
```

#### Authority Stakeholders - Institutional

```json
{
  "id": "sa-020",
  "description": "Health authorities for healthcare",
  "condition": { "profiler": { "subclass": "healthcare" } },
  "infer": [
    { "name": "Health Infrastructure NSW", "subgroup": "Other", "role": "Design Review", "reason": "Healthcare design compliance", "confidence": "high" },
    { "name": "Ministry of Health", "subgroup": "Other", "role": "Clinical Planning", "reason": "Service model approval", "confidence": "medium" }
  ],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "sa-021",
  "description": "Education authorities for schools",
  "condition": { "profiler": { "subclass": "education" } },
  "infer": [{ "name": "School Infrastructure NSW", "subgroup": "Other", "role": "Design Review", "reason": "Educational facility compliance", "confidence": "high" }],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "sa-022",
  "description": "Corrective Services for correctional",
  "condition": { "profiler": { "subclass": "correctional" } },
  "infer": [{ "name": "Corrective Services NSW", "subgroup": "Other", "role": "Security Review", "reason": "Custodial security requirements", "confidence": "high" }],
  "priority": 95,
  "source": "inferred"
}
```

#### Consultant Stakeholders - Institutional

```json
{
  "id": "sco-050",
  "description": "Healthcare planner",
  "condition": { "profiler": { "subclass": "healthcare" } },
  "infer": [
    { "name": "Healthcare Planner", "subgroup": "Other", "reason": "Clinical services planning", "confidence": "high" },
    { "name": "Medical Equipment Planner", "subgroup": "Other", "reason": "Medical equipment specification", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "sco-051",
  "description": "Education planner",
  "condition": { "profiler": { "subclass": "education" } },
  "infer": [{ "name": "Education Planner", "subgroup": "Other", "reason": "Educational facilities planning", "confidence": "medium" }],
  "priority": 72,
  "source": "inferred"
}
```

```json
{
  "id": "sco-052",
  "description": "Theatre consultant for performing arts",
  "condition": { "profiler": { "subclass": "performing_arts" } },
  "infer": [
    { "name": "Theatre Consultant", "subgroup": "Other", "reason": "Theatre systems design", "confidence": "high" },
    { "name": "Acoustic Consultant", "subgroup": "Acoustic", "reason": "Auditorium acoustics", "confidence": "high" }
  ],
  "priority": 80,
  "source": "inferred"
}
```

```json
{
  "id": "sco-053",
  "description": "Security consultant for correctional",
  "condition": { "profiler": { "subclass": "correctional" } },
  "infer": [
    { "name": "Custodial Security Consultant", "subgroup": "Other", "reason": "Custodial security design", "confidence": "high" },
    { "name": "Electronic Security Consultant", "subgroup": "Other", "reason": "Access control and CCTV", "confidence": "high" }
  ],
  "priority": 90,
  "source": "inferred"
}
```

### 2.3 Infrastructure Building Class

#### Functional & Quality Objectives - Infrastructure

```json
{
  "id": "ofq-050",
  "description": "Road infrastructure requirements",
  "condition": { "profiler": { "subclass": ["roads", "civil"] } },
  "infer": [
    { "text": "Road length {{scale.length_km}} km", "category": "Scale", "confidence": "high" },
    { "text": "Pavement design to Austroads standards", "category": "Design", "confidence": "high" },
    { "text": "Stormwater drainage and water quality", "category": "Environment", "confidence": "high" }
  ],
  "priority": 82,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-051",
  "description": "Rail infrastructure requirements",
  "condition": { "profiler": { "subclass": "rail" } },
  "infer": [
    { "text": "Track length {{scale.track_km}} km", "category": "Scale", "confidence": "high" },
    { "text": "Signalling and communications systems", "category": "Systems", "confidence": "high" },
    { "text": "Overhead wiring/third rail power supply", "category": "Power", "confidence": "medium" }
  ],
  "priority": 85,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-052",
  "description": "Water infrastructure requirements",
  "condition": { "profiler": { "subclass": ["water", "wastewater"] } },
  "infer": [
    { "text": "Treatment capacity {{scale.capacity_ml_day}} ML/day", "category": "Capacity", "confidence": "high" },
    { "text": "Process equipment and instrumentation", "category": "Systems", "confidence": "high" },
    { "text": "Environmental discharge compliance", "category": "Environment", "confidence": "high" }
  ],
  "priority": 85,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-053",
  "description": "Solar farm requirements",
  "condition": { "profiler": { "subclass": "solar_farm" } },
  "infer": [
    { "text": "Generation capacity {{scale.capacity_mw}} MW", "category": "Power", "confidence": "high" },
    { "text": "{{scale.panels_count}} solar panels", "category": "Scale", "confidence": "high" },
    { "text": "Grid connection and substation", "category": "Power", "confidence": "high" },
    { "text": "Battery storage {{scale.battery_mwh}} MWh", "category": "Storage", "confidence": "medium" }
  ],
  "priority": 82,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-054",
  "description": "Wind farm requirements",
  "condition": { "profiler": { "subclass": "wind_farm" } },
  "infer": [
    { "text": "Generation capacity {{scale.capacity_mw}} MW", "category": "Power", "confidence": "high" },
    { "text": "{{scale.turbines}} wind turbines", "category": "Scale", "confidence": "high" },
    { "text": "Hub height {{scale.hub_height_m}}m", "category": "Scale", "confidence": "high" },
    { "text": "Grid connection infrastructure", "category": "Power", "confidence": "high" }
  ],
  "priority": 82,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-055",
  "description": "Marina requirements",
  "condition": { "profiler": { "subclass": "marina" } },
  "infer": [
    { "text": "{{scale.berths}} berths capacity", "category": "Capacity", "confidence": "high" },
    { "text": "Maximum vessel LOA {{scale.max_vessel_loa_m}}m", "category": "Design", "confidence": "high" },
    { "text": "Fuel and pump-out facilities", "category": "Services", "confidence": "medium" },
    { "text": "Marina amenities building", "category": "Facilities", "confidence": "medium" }
  ],
  "priority": 78,
  "source": "explicit"
}
```

#### Planning & Compliance Objectives - Infrastructure

```json
{
  "id": "opc-050",
  "description": "SOCI Act requirements",
  "condition": {
    "or": [
      { "profiler": { "subclass": ["data_centre_hyperscale", "water", "wastewater", "substation_grid"] } },
      { "profiler": { "complexity": { "critical_infrastructure": true } } }
    ]
  },
  "infer": [
    { "text": "Security of Critical Infrastructure Act 2018 compliance", "category": "Security", "confidence": "high" },
    { "text": "Risk Management Program requirements", "category": "Security", "confidence": "high" }
  ],
  "priority": 90,
  "source": "inferred"
}
```

```json
{
  "id": "opc-051",
  "description": "AEMO requirements for energy",
  "condition": { "profiler": { "subclass": ["solar_farm", "wind_farm", "substation_grid", "battery_storage"] } },
  "infer": [
    { "text": "AEMO registration and compliance", "category": "Energy", "confidence": "high" },
    { "text": "National Electricity Rules compliance", "category": "Energy", "confidence": "high" },
    { "text": "Grid connection agreement", "category": "Energy", "confidence": "high" }
  ],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "opc-052",
  "description": "Sydney Water requirements",
  "condition": {
    "and": [
      { "profiler": { "region": "AU" } },
      { "profiler": { "subclass": ["water", "wastewater"] } }
    ]
  },
  "infer": [
    { "text": "Sydney Water design standards", "category": "Utility", "confidence": "high" },
    { "text": "Section 73 compliance certificate", "category": "Utility", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "opc-053",
  "description": "Maritime Safety requirements",
  "condition": { "profiler": { "subclass": ["marina", "jetty_wharf", "seawall_revetment", "ferry_terminal"] } },
  "infer": [
    { "text": "Maritime Safety NSW compliance", "category": "Maritime", "confidence": "high" },
    { "text": "Crown Lands approval", "category": "Land", "confidence": "high" },
    { "text": "Coastal Management Act compliance", "category": "Environment", "confidence": "medium" }
  ],
  "priority": 82,
  "source": "inferred"
}
```

```json
{
  "id": "opc-054",
  "description": "ONRSR requirements for rail",
  "condition": { "profiler": { "subclass": "rail" } },
  "infer": [
    { "text": "Office of the National Rail Safety Regulator compliance", "category": "Rail Safety", "confidence": "high" },
    { "text": "Rail Infrastructure Manager accreditation", "category": "Rail Safety", "confidence": "high" },
    { "text": "Safety Management System requirements", "category": "Rail Safety", "confidence": "high" }
  ],
  "priority": 90,
  "source": "inferred"
}
```

#### Authority Stakeholders - Infrastructure

```json
{
  "id": "sa-030",
  "description": "AEMO for energy projects",
  "condition": { "profiler": { "subclass": ["solar_farm", "wind_farm", "substation_grid", "battery_storage"] } },
  "infer": [{ "name": "Australian Energy Market Operator", "subgroup": "Other", "role": "Grid Connection", "reason": "NEM registration and connection", "confidence": "high" }],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "sa-031",
  "description": "Sydney Water for water projects",
  "condition": {
    "or": [
      { "profiler": { "subclass": ["water", "wastewater"] } },
      { "profiler": { "scale": { "gfa_sqm": { "min": 2000 } } } }
    ]
  },
  "infer": [{ "name": "Sydney Water", "subgroup": "Other", "role": "Section 73 Approval", "reason": "Water and sewer connection", "confidence": "high" }],
  "priority": 80,
  "source": "inferred"
}
```

```json
{
  "id": "sa-032",
  "description": "ONRSR for rail projects",
  "condition": { "profiler": { "subclass": "rail" } },
  "infer": [{ "name": "Office of the National Rail Safety Regulator", "subgroup": "Other", "role": "Safety Accreditation", "reason": "Rail safety compliance", "confidence": "high" }],
  "priority": 90,
  "source": "inferred"
}
```

```json
{
  "id": "sa-033",
  "description": "Maritime Safety for marine projects",
  "condition": { "profiler": { "subclass": ["marina", "jetty_wharf", "seawall_revetment", "ferry_terminal"] } },
  "infer": [
    { "name": "Maritime Safety NSW", "subgroup": "Other", "role": "Navigation Review", "reason": "Maritime safety compliance", "confidence": "high" },
    { "name": "Crown Lands", "subgroup": "Other", "role": "Land Tenure", "reason": "Crown waterway approvals", "confidence": "high" }
  ],
  "priority": 82,
  "source": "inferred"
}
```

#### Consultant Stakeholders - Infrastructure

```json
{
  "id": "sco-060",
  "description": "Civil engineer for infrastructure",
  "condition": { "profiler": { "building_class": "infrastructure" } },
  "infer": [{ "name": "Civil Engineer", "subgroup": "Civil", "reason": "Civil infrastructure design", "confidence": "high" }],
  "priority": 95,
  "source": "inferred"
}
```

```json
{
  "id": "sco-061",
  "description": "Power systems engineer for energy",
  "condition": { "profiler": { "subclass": ["solar_farm", "wind_farm", "substation_grid", "battery_storage"] } },
  "infer": [
    { "name": "Power Systems Engineer", "subgroup": "Electrical", "reason": "Grid connection design", "confidence": "high" },
    { "name": "Energy Consultant", "subgroup": "Other", "reason": "Energy market and offtake", "confidence": "medium" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "sco-062",
  "description": "Rail systems engineer",
  "condition": { "profiler": { "subclass": "rail" } },
  "infer": [
    { "name": "Rail Systems Engineer", "subgroup": "Other", "reason": "Rail systems integration", "confidence": "high" },
    { "name": "Signalling Engineer", "subgroup": "Other", "reason": "Signalling design", "confidence": "high" }
  ],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "sco-063",
  "description": "Coastal engineer for marine",
  "condition": { "profiler": { "subclass": ["marina", "jetty_wharf", "seawall_revetment", "coastal_protection"] } },
  "infer": [
    { "name": "Coastal Engineer", "subgroup": "Other", "reason": "Coastal processes and design", "confidence": "high" },
    { "name": "Marine Structures Engineer", "subgroup": "Structural", "reason": "Marine structural design", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "sco-064",
  "description": "Process engineer for water",
  "condition": { "profiler": { "subclass": ["water", "wastewater", "desalination"] } },
  "infer": [
    { "name": "Process Engineer", "subgroup": "Other", "reason": "Water treatment process design", "confidence": "high" },
    { "name": "Environmental Scientist", "subgroup": "Other", "reason": "Water quality and discharge", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

### 2.4 Agricultural/Rural Building Class

#### Functional & Quality Objectives - Agricultural

```json
{
  "id": "ofq-060",
  "description": "Farm building requirements",
  "condition": { "profiler": { "subclass": "farm_buildings" } },
  "infer": [
    { "text": "Farm shed {{scale.shed_sqm}} sqm", "category": "Scale", "confidence": "high" },
    { "text": "Machinery storage and workshop", "category": "Functional", "confidence": "high" },
    { "text": "Rural fire protection measures", "category": "Safety", "confidence": "medium" }
  ],
  "priority": 72,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-061",
  "description": "Winery/brewery requirements",
  "condition": { "profiler": { "subclass": "winery_brewery" } },
  "infer": [
    { "text": "Production capacity {{scale.production_litres}} litres", "category": "Capacity", "confidence": "high" },
    { "text": "Cellar door/tasting room {{scale.cellar_door_sqm}} sqm", "category": "Hospitality", "confidence": "high" },
    { "text": "Barrel storage {{scale.barrel_storage_sqm}} sqm", "category": "Storage", "confidence": "medium" },
    { "text": "Temperature-controlled processing areas", "category": "Services", "confidence": "high" }
  ],
  "priority": 75,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-062",
  "description": "Livestock facility requirements",
  "condition": { "profiler": { "subclass": "livestock" } },
  "infer": [
    { "text": "Capacity for {{scale.head_capacity}} head", "category": "Capacity", "confidence": "high" },
    { "text": "Livestock handling facilities", "category": "Functional", "confidence": "high" },
    { "text": "Effluent management system", "category": "Environment", "confidence": "high" },
    { "text": "Water supply and storage", "category": "Services", "confidence": "high" }
  ],
  "priority": 78,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-063",
  "description": "Vertical farming requirements",
  "condition": { "profiler": { "subclass": "vertical_farming" } },
  "infer": [
    { "text": "Growing area {{scale.growing_area_sqm}} sqm over {{scale.growing_levels}} levels", "category": "Scale", "confidence": "high" },
    { "text": "LED grow lighting systems", "category": "Services", "confidence": "high" },
    { "text": "Hydroponic/aeroponic systems", "category": "Systems", "confidence": "high" },
    { "text": "Climate control and humidity management", "category": "Services", "confidence": "high" }
  ],
  "priority": 80,
  "source": "explicit"
}
```

#### Planning & Compliance Objectives - Agricultural

```json
{
  "id": "opc-060",
  "description": "Primary production exemptions",
  "condition": { "profiler": { "building_class": "agricultural" } },
  "infer": [
    { "text": "Primary production exemption assessment", "category": "Planning", "confidence": "medium" },
    { "text": "Rural zoning compliance", "category": "Planning", "confidence": "high" }
  ],
  "priority": 70,
  "source": "inferred"
}
```

```json
{
  "id": "opc-061",
  "description": "Liquor licensing for winery",
  "condition": { "profiler": { "subclass": "winery_brewery" } },
  "infer": [
    { "text": "Producer/Wholesaler liquor licence", "category": "Licensing", "confidence": "high" },
    { "text": "Cellar door trading hours approval", "category": "Licensing", "confidence": "medium" }
  ],
  "priority": 72,
  "source": "inferred"
}
```

```json
{
  "id": "opc-062",
  "description": "Livestock welfare requirements",
  "condition": { "profiler": { "subclass": "livestock" } },
  "infer": [
    { "text": "Animal welfare standards compliance", "category": "Welfare", "confidence": "high" },
    { "text": "Biosecurity management plan", "category": "Biosecurity", "confidence": "high" }
  ],
  "priority": 80,
  "source": "inferred"
}
```

```json
{
  "id": "opc-063",
  "description": "Effluent management requirements",
  "condition": { "profiler": { "subclass": ["livestock", "dairy"] } },
  "infer": [
    { "text": "EPA effluent management plan", "category": "Environment", "confidence": "high" },
    { "text": "Nutrient management planning", "category": "Environment", "confidence": "medium" }
  ],
  "priority": 78,
  "source": "inferred"
}
```

#### Authority Stakeholders - Agricultural

```json
{
  "id": "sa-040",
  "description": "DPI for agricultural facilities",
  "condition": { "profiler": { "building_class": "agricultural" } },
  "infer": [{ "name": "Department of Primary Industries", "subgroup": "Other", "role": "Agricultural Advice", "reason": "Agricultural development guidance", "confidence": "medium" }],
  "priority": 60,
  "source": "inferred"
}
```

```json
{
  "id": "sa-041",
  "description": "Liquor & Gaming for winery",
  "condition": { "profiler": { "subclass": "winery_brewery" } },
  "infer": [{ "name": "Liquor & Gaming NSW", "subgroup": "Other", "role": "Liquor Licence", "reason": "Liquor licensing compliance", "confidence": "high" }],
  "priority": 75,
  "source": "inferred"
}
```

#### Consultant Stakeholders - Agricultural

```json
{
  "id": "sco-070",
  "description": "Agricultural consultant",
  "condition": { "profiler": { "building_class": "agricultural" } },
  "infer": [{ "name": "Agricultural Consultant", "subgroup": "Other", "reason": "Agricultural systems design", "confidence": "medium" }],
  "priority": 65,
  "source": "inferred"
}
```

```json
{
  "id": "sco-071",
  "description": "Winemaker/brewing consultant",
  "condition": { "profiler": { "subclass": "winery_brewery" } },
  "infer": [{ "name": "Winemaking/Brewing Consultant", "subgroup": "Other", "reason": "Production process design", "confidence": "high" }],
  "priority": 78,
  "source": "inferred"
}
```

```json
{
  "id": "sco-072",
  "description": "Effluent management specialist",
  "condition": { "profiler": { "subclass": ["livestock", "dairy"] } },
  "infer": [{ "name": "Effluent Management Specialist", "subgroup": "Other", "reason": "Effluent system design", "confidence": "high" }],
  "priority": 75,
  "source": "inferred"
}
```

### 2.5 Defense/Secure Building Class

#### Functional & Quality Objectives - Defense

```json
{
  "id": "ofq-070",
  "description": "Military base requirements",
  "condition": { "profiler": { "subclass": "military_base" } },
  "infer": [
    { "text": "Defence operational requirements", "category": "Functional", "confidence": "high" },
    { "text": "Security zoning and controlled areas", "category": "Security", "confidence": "high" },
    { "text": "Defence-grade infrastructure resilience", "category": "Resilience", "confidence": "high" }
  ],
  "priority": 90,
  "source": "explicit"
}
```

```json
{
  "id": "ofq-071",
  "description": "SCIF requirements",
  "condition": {
    "or": [
      { "profiler": { "subclass": "secure_government" } },
      { "profiler": { "complexity": { "security_classification": ["secret", "top_secret", "sci_sap"] } } }
    ]
  },
  "infer": [
    { "text": "SCIF construction standards", "category": "Security", "confidence": "high" },
    { "text": "TEMPEST/EMSEC requirements", "category": "Security", "confidence": "high" },
    { "text": "ICD 705 compliance", "category": "Security", "confidence": "high" },
    { "text": "Sound attenuation STC 50+", "category": "Acoustic", "confidence": "high" }
  ],
  "priority": 95,
  "source": "inferred"
}
```

```json
{
  "id": "ofq-072",
  "description": "Data sovereignty requirements",
  "condition": { "profiler": { "subclass": "data_sovereignty" } },
  "infer": [
    { "text": "Australian sovereign data hosting", "category": "Security", "confidence": "high" },
    { "text": "IRAP certification requirements", "category": "Security", "confidence": "high" },
    { "text": "PROTECTED level security controls", "category": "Security", "confidence": "high" }
  ],
  "priority": 88,
  "source": "inferred"
}
```

#### Planning & Compliance Objectives - Defense

```json
{
  "id": "opc-070",
  "description": "PSPF requirements",
  "condition": { "profiler": { "building_class": "defense" } },
  "infer": [
    { "text": "Protective Security Policy Framework compliance", "category": "Security", "confidence": "high" },
    { "text": "Security zone classification", "category": "Security", "confidence": "high" }
  ],
  "priority": 92,
  "source": "inferred"
}
```

```json
{
  "id": "opc-071",
  "description": "AGSVA clearance requirements",
  "condition": {
    "or": [
      { "profiler": { "building_class": "defense" } },
      { "profiler": { "complexity": { "clearance_requirement": ["baseline", "nv1", "nv2", "positive_vetting"] } } }
    ]
  },
  "infer": [
    { "text": "Personnel security clearances required", "category": "Security", "confidence": "high" },
    { "text": "AGSVA vetting process", "category": "Security", "confidence": "high" }
  ],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "opc-072",
  "description": "ISM compliance",
  "condition": {
    "or": [
      { "profiler": { "building_class": "defense" } },
      { "profiler": { "subclass": ["secure_government", "data_sovereignty"] } }
    ]
  },
  "infer": [
    { "text": "Information Security Manual compliance", "category": "Security", "confidence": "high" },
    { "text": "Essential Eight cyber security controls", "category": "Security", "confidence": "high" }
  ],
  "priority": 90,
  "source": "inferred"
}
```

#### Authority Stakeholders - Defense

```json
{
  "id": "sa-050",
  "description": "Defence for military facilities",
  "condition": { "profiler": { "subclass": ["military_base", "aviation_defense", "naval", "armory_magazine"] } },
  "infer": [{ "name": "Department of Defence", "subgroup": "Other", "role": "Defence Approval", "reason": "Defence estate requirements", "confidence": "high" }],
  "priority": 95,
  "source": "inferred"
}
```

```json
{
  "id": "sa-051",
  "description": "ASIO/AGO for secure facilities",
  "condition": { "profiler": { "complexity": { "security_classification": ["secret", "top_secret", "sci_sap"] } } },
  "infer": [{ "name": "Australian Security Intelligence Organisation", "subgroup": "Other", "role": "Security Assessment", "reason": "High security facility approval", "confidence": "high" }],
  "priority": 98,
  "source": "inferred"
}
```

#### Consultant Stakeholders - Defense

```json
{
  "id": "sco-080",
  "description": "Defence security consultant",
  "condition": { "profiler": { "building_class": "defense" } },
  "infer": [
    { "name": "Defence Security Consultant", "subgroup": "Other", "reason": "PSPF and security design", "confidence": "high" },
    { "name": "Physical Security Consultant", "subgroup": "Other", "reason": "Physical security measures", "confidence": "high" }
  ],
  "priority": 92,
  "source": "inferred"
}
```

```json
{
  "id": "sco-081",
  "description": "SCIF specialist",
  "condition": { "profiler": { "complexity": { "security_classification": ["secret", "top_secret", "sci_sap"] } } },
  "infer": [
    { "name": "SCIF Construction Specialist", "subgroup": "Other", "reason": "SCIF design and construction", "confidence": "high" },
    { "name": "TEMPEST Engineer", "subgroup": "Other", "reason": "EMSEC compliance", "confidence": "high" }
  ],
  "priority": 95,
  "source": "inferred"
}
```

---

## 3. Regional Rules

### 3.1 New Zealand

#### Building Code Mappings

```json
{
  "id": "opc-100",
  "description": "NZ Building Code compliance",
  "condition": { "profiler": { "region": "NZ" } },
  "infer": [
    { "text": "New Zealand Building Code compliance", "category": "Building Code", "confidence": "high" },
    { "text": "Building consent required", "category": "Consent", "confidence": "high" }
  ],
  "priority": 100,
  "source": "inferred"
}
```

```json
{
  "id": "opc-101",
  "description": "NZ Resource consent",
  "condition": {
    "and": [
      { "profiler": { "region": "NZ" } },
      { "profiler": { "complexity": { "approval_pathway": ["notified_consent", "limited_notified"] } } }
    ]
  },
  "infer": [
    { "text": "Resource consent application", "category": "Planning", "confidence": "high" },
    { "text": "Assessment of Environmental Effects", "category": "Planning", "confidence": "high" }
  ],
  "priority": 95,
  "source": "inferred"
}
```

```json
{
  "id": "opc-102",
  "description": "NZ H1 Energy efficiency",
  "condition": {
    "and": [
      { "profiler": { "region": "NZ" } },
      { "profiler": { "building_class": ["residential", "commercial"] } }
    ]
  },
  "infer": [
    { "text": "NZBC H1 Energy Efficiency compliance", "category": "Sustainability", "confidence": "high" },
    { "text": "H1 calculation methodology report", "category": "Compliance", "confidence": "medium" }
  ],
  "priority": 80,
  "source": "inferred"
}
```

```json
{
  "id": "opc-103",
  "description": "NZ E2 Weathertightness",
  "condition": {
    "and": [
      { "profiler": { "region": "NZ" } },
      { "profiler": { "building_class": ["residential", "commercial"] } }
    ]
  },
  "infer": [
    { "text": "NZBC E2 External Moisture compliance", "category": "Weathertightness", "confidence": "high" },
    { "text": "E2/AS1 or alternative solution", "category": "Compliance", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

#### NZ Authority Stakeholders

```json
{
  "id": "sa-100",
  "description": "NZ Local Council",
  "condition": {
    "and": [
      { "profiler": { "region": "NZ" } },
      { "profiler": { "project_type": ["new", "refurb"] } }
    ]
  },
  "infer": [{ "name": "Local Council", "subgroup": "Council", "role": "Building Consent", "reason": "Building consent authority", "confidence": "high" }],
  "priority": 100,
  "source": "inferred"
}
```

```json
{
  "id": "sa-101",
  "description": "Fire and Emergency NZ",
  "condition": {
    "and": [
      { "profiler": { "region": "NZ" } },
      { "or": [
        { "profiler": { "scale": { "storeys": { "min": 2 } } } },
        { "profiler": { "building_class": ["commercial", "institution"] } }
      ]}
    ]
  },
  "infer": [{ "name": "Fire and Emergency New Zealand", "subgroup": "Fire", "role": "Fire Safety Review", "reason": "Fire safety compliance", "confidence": "high" }],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "sa-102",
  "description": "Heritage NZ",
  "condition": {
    "and": [
      { "profiler": { "region": "NZ" } },
      { "profiler": { "complexity": { "heritage": "heritage_overlay" } } }
    ]
  },
  "infer": [{ "name": "Heritage New Zealand Pouhere Taonga", "subgroup": "Heritage", "role": "Heritage Authority", "reason": "Heritage building approval", "confidence": "high" }],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "sa-103",
  "description": "WorkSafe NZ",
  "condition": {
    "and": [
      { "profiler": { "region": "NZ" } },
      { "profiler": { "building_class": "industrial" } }
    ]
  },
  "infer": [{ "name": "WorkSafe New Zealand", "subgroup": "Other", "role": "Health and Safety", "reason": "Workplace safety compliance", "confidence": "medium" }],
  "priority": 70,
  "source": "inferred"
}
```

### 3.2 United Kingdom

#### Building Regulations Mappings

```json
{
  "id": "opc-110",
  "description": "UK Building Regulations",
  "condition": { "profiler": { "region": "UK" } },
  "infer": [
    { "text": "Building Regulations 2010 compliance", "category": "Building Code", "confidence": "high" },
    { "text": "Building Control approval required", "category": "Approval", "confidence": "high" }
  ],
  "priority": 100,
  "source": "inferred"
}
```

```json
{
  "id": "opc-111",
  "description": "UK Planning Permission",
  "condition": {
    "and": [
      { "profiler": { "region": "UK" } },
      { "profiler": { "complexity": { "approval_pathway": ["full_planning", "outline_planning"] } } }
    ]
  },
  "infer": [
    { "text": "Planning permission application", "category": "Planning", "confidence": "high" },
    { "text": "Design and Access Statement", "category": "Planning", "confidence": "high" }
  ],
  "priority": 95,
  "source": "inferred"
}
```

```json
{
  "id": "opc-112",
  "description": "UK Part L Energy",
  "condition": {
    "and": [
      { "profiler": { "region": "UK" } },
      { "profiler": { "building_class": ["residential", "commercial"] } }
    ]
  },
  "infer": [
    { "text": "Part L Conservation of Fuel and Power compliance", "category": "Sustainability", "confidence": "high" },
    { "text": "Energy Performance Certificate (EPC)", "category": "Compliance", "confidence": "high" },
    { "text": "SAP/SBEM calculation", "category": "Compliance", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "opc-113",
  "description": "UK Part M Accessibility",
  "condition": {
    "and": [
      { "profiler": { "region": "UK" } },
      { "profiler": { "building_class": ["commercial", "institution"] } }
    ]
  },
  "infer": [
    { "text": "Part M Access to and Use of Buildings compliance", "category": "Accessibility", "confidence": "high" },
    { "text": "Equality Act 2010 requirements", "category": "Accessibility", "confidence": "high" }
  ],
  "priority": 82,
  "source": "inferred"
}
```

```json
{
  "id": "opc-114",
  "description": "UK Listed Building Consent",
  "condition": {
    "and": [
      { "profiler": { "region": "UK" } },
      { "profiler": { "complexity": { "heritage": "heritage_overlay" } } }
    ]
  },
  "infer": [
    { "text": "Listed Building Consent required", "category": "Heritage", "confidence": "high" },
    { "text": "Heritage Impact Assessment", "category": "Heritage", "confidence": "high" },
    { "text": "Conservation Area consent if applicable", "category": "Heritage", "confidence": "medium" }
  ],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "opc-115",
  "description": "UK CDM Regulations",
  "condition": {
    "and": [
      { "profiler": { "region": "UK" } },
      { "profiler": { "project_type": ["new", "refurb"] } }
    ]
  },
  "infer": [
    { "text": "CDM Regulations 2015 compliance", "category": "Safety", "confidence": "high" },
    { "text": "Principal Designer appointment", "category": "Safety", "confidence": "high" },
    { "text": "Construction Phase Plan", "category": "Safety", "confidence": "high" }
  ],
  "priority": 90,
  "source": "inferred"
}
```

```json
{
  "id": "opc-116",
  "description": "UK Part B Fire Safety",
  "condition": {
    "and": [
      { "profiler": { "region": "UK" } },
      { "or": [
        { "profiler": { "scale": { "storeys": { "min": 2 } } } },
        { "profiler": { "building_class": ["commercial", "institution", "residential"] } }
      ]}
    ]
  },
  "infer": [
    { "text": "Part B Fire Safety compliance", "category": "Fire Safety", "confidence": "high" },
    { "text": "Fire Strategy Report", "category": "Fire Safety", "confidence": "high" }
  ],
  "priority": 92,
  "source": "inferred"
}
```

#### UK Authority Stakeholders

```json
{
  "id": "sa-110",
  "description": "UK Local Planning Authority",
  "condition": {
    "and": [
      { "profiler": { "region": "UK" } },
      { "profiler": { "project_type": ["new", "refurb"] } }
    ]
  },
  "infer": [{ "name": "Local Planning Authority", "subgroup": "Council", "role": "Planning Permission", "reason": "Planning consent authority", "confidence": "high" }],
  "priority": 100,
  "source": "inferred"
}
```

```json
{
  "id": "sa-111",
  "description": "UK Building Control",
  "condition": {
    "and": [
      { "profiler": { "region": "UK" } },
      { "profiler": { "project_type": ["new", "refurb"] } }
    ]
  },
  "infer": [{ "name": "Building Control", "subgroup": "Other", "role": "Building Regulations", "reason": "Building regulations approval", "confidence": "high" }],
  "priority": 95,
  "source": "inferred"
}
```

```json
{
  "id": "sa-112",
  "description": "Historic England",
  "condition": {
    "and": [
      { "profiler": { "region": "UK" } },
      { "profiler": { "complexity": { "heritage": "heritage_overlay" } } }
    ]
  },
  "infer": [{ "name": "Historic England", "subgroup": "Heritage", "role": "Heritage Advice", "reason": "Listed building consultation", "confidence": "high" }],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "sa-113",
  "description": "UK Fire Authority",
  "condition": {
    "and": [
      { "profiler": { "region": "UK" } },
      { "or": [
        { "profiler": { "scale": { "storeys": { "min": 3 } } } },
        { "profiler": { "building_class": ["commercial", "institution"] } }
      ]}
    ]
  },
  "infer": [{ "name": "Fire and Rescue Service", "subgroup": "Fire", "role": "Fire Safety Consultation", "reason": "Fire safety consultation", "confidence": "high" }],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "sa-114",
  "description": "UK HSE",
  "condition": {
    "and": [
      { "profiler": { "region": "UK" } },
      { "profiler": { "building_class": "industrial" } }
    ]
  },
  "infer": [{ "name": "Health and Safety Executive", "subgroup": "Other", "role": "HSE Notification", "reason": "Major hazard facilities", "confidence": "medium" }],
  "priority": 75,
  "source": "inferred"
}
```

### 3.3 United States

#### IBC/IRC Classifications

```json
{
  "id": "opc-120",
  "description": "US IBC compliance",
  "condition": { "profiler": { "region": "US" } },
  "infer": [
    { "text": "International Building Code (IBC) compliance", "category": "Building Code", "confidence": "high" },
    { "text": "Building permit required", "category": "Permit", "confidence": "high" }
  ],
  "priority": 100,
  "source": "inferred"
}
```

```json
{
  "id": "opc-121",
  "description": "US IRC for residential",
  "condition": {
    "and": [
      { "profiler": { "region": "US" } },
      { "profiler": { "subclass": ["house", "townhouse"] } }
    ]
  },
  "infer": [
    { "text": "International Residential Code (IRC) compliance", "category": "Building Code", "confidence": "high" }
  ],
  "priority": 95,
  "source": "inferred"
}
```

```json
{
  "id": "opc-122",
  "description": "US ADA accessibility",
  "condition": {
    "and": [
      { "profiler": { "region": "US" } },
      { "profiler": { "building_class": ["commercial", "institution"] } }
    ]
  },
  "infer": [
    { "text": "Americans with Disabilities Act (ADA) compliance", "category": "Accessibility", "confidence": "high" },
    { "text": "2010 ADA Standards for Accessible Design", "category": "Accessibility", "confidence": "high" }
  ],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "opc-123",
  "description": "US NFPA fire codes",
  "condition": {
    "and": [
      { "profiler": { "region": "US" } },
      { "or": [
        { "profiler": { "scale": { "storeys": { "min": 2 } } } },
        { "profiler": { "building_class": ["commercial", "institution"] } }
      ]}
    ]
  },
  "infer": [
    { "text": "NFPA 101 Life Safety Code compliance", "category": "Fire Safety", "confidence": "high" },
    { "text": "NFPA 13 sprinkler requirements", "category": "Fire Safety", "confidence": "medium" }
  ],
  "priority": 90,
  "source": "inferred"
}
```

```json
{
  "id": "opc-124",
  "description": "US IECC energy code",
  "condition": {
    "and": [
      { "profiler": { "region": "US" } },
      { "profiler": { "building_class": ["residential", "commercial"] } }
    ]
  },
  "infer": [
    { "text": "International Energy Conservation Code (IECC) compliance", "category": "Energy", "confidence": "high" },
    { "text": "Energy modeling and compliance documentation", "category": "Energy", "confidence": "medium" }
  ],
  "priority": 82,
  "source": "inferred"
}
```

```json
{
  "id": "opc-125",
  "description": "US Zoning compliance",
  "condition": {
    "and": [
      { "profiler": { "region": "US" } },
      { "profiler": { "project_type": "new" } }
    ]
  },
  "infer": [
    { "text": "Zoning ordinance compliance", "category": "Planning", "confidence": "high" },
    { "text": "Zoning variance if required", "category": "Planning", "confidence": "medium" }
  ],
  "priority": 92,
  "source": "inferred"
}
```

#### US Authority Stakeholders

```json
{
  "id": "sa-120",
  "description": "US Building Department",
  "condition": {
    "and": [
      { "profiler": { "region": "US" } },
      { "profiler": { "project_type": ["new", "refurb"] } }
    ]
  },
  "infer": [{ "name": "Building Department (AHJ)", "subgroup": "Council", "role": "Building Permit", "reason": "Building permit authority", "confidence": "high" }],
  "priority": 100,
  "source": "inferred"
}
```

```json
{
  "id": "sa-121",
  "description": "US Fire Marshal",
  "condition": {
    "and": [
      { "profiler": { "region": "US" } },
      { "or": [
        { "profiler": { "scale": { "storeys": { "min": 2 } } } },
        { "profiler": { "building_class": ["commercial", "institution"] } }
      ]}
    ]
  },
  "infer": [{ "name": "Fire Marshal", "subgroup": "Fire", "role": "Fire Review", "reason": "Fire code compliance", "confidence": "high" }],
  "priority": 88,
  "source": "inferred"
}
```

```json
{
  "id": "sa-122",
  "description": "US Planning/Zoning",
  "condition": {
    "and": [
      { "profiler": { "region": "US" } },
      { "profiler": { "project_type": "new" } }
    ]
  },
  "infer": [{ "name": "Planning and Zoning Department", "subgroup": "Council", "role": "Zoning Review", "reason": "Zoning compliance", "confidence": "high" }],
  "priority": 95,
  "source": "inferred"
}
```

```json
{
  "id": "sa-123",
  "description": "US State Historic Preservation Office",
  "condition": {
    "and": [
      { "profiler": { "region": "US" } },
      { "profiler": { "complexity": { "heritage": "heritage_overlay" } } }
    ]
  },
  "infer": [{ "name": "State Historic Preservation Office (SHPO)", "subgroup": "Heritage", "role": "Historic Review", "reason": "Historic preservation review", "confidence": "high" }],
  "priority": 85,
  "source": "inferred"
}
```

---

## 4. Complexity Dimension Rules

### 4.1 Quality Tier Rules

```json
{
  "id": "ofq-080",
  "description": "Basic quality tier implications",
  "condition": { "profiler": { "complexity": { "quality_tier": "basic" } } },
  "infer": [
    { "text": "Standard fixtures and fittings", "category": "Finishes", "confidence": "high" },
    { "text": "Builder-grade specifications", "category": "Finishes", "confidence": "high" }
  ],
  "priority": 55,
  "source": "inferred"
}
```

```json
{
  "id": "ofq-081",
  "description": "High quality tier implications",
  "condition": { "profiler": { "complexity": { "quality_tier": "high" } } },
  "infer": [
    { "text": "Premium fixtures and fittings", "category": "Finishes", "confidence": "high" },
    { "text": "Detailed architectural finishes", "category": "Finishes", "confidence": "high" },
    { "text": "Feature lighting throughout", "category": "Services", "confidence": "medium" }
  ],
  "priority": 70,
  "source": "inferred"
}
```

```json
{
  "id": "sco-090",
  "description": "Interior Designer for high/premium",
  "condition": { "profiler": { "complexity": { "quality_tier": ["high", "premium"] } } },
  "infer": [{ "name": "Interior Designer", "subgroup": "Interior Design", "reason": "Interior design coordination", "confidence": "high" }],
  "priority": 72,
  "source": "inferred"
}
```

### 4.2 Site Condition Rules

```json
{
  "id": "ofq-082",
  "description": "Sloping site considerations",
  "condition": { "profiler": { "complexity": { "site_conditions": "sloping" } } },
  "infer": [
    { "text": "Cut and fill earthworks", "category": "Site", "confidence": "high" },
    { "text": "Retaining wall structures", "category": "Structure", "confidence": "high" },
    { "text": "Drainage management", "category": "Civil", "confidence": "high" }
  ],
  "priority": 72,
  "source": "inferred"
}
```

```json
{
  "id": "ofq-083",
  "description": "Rock site considerations",
  "condition": { "profiler": { "complexity": { "site_conditions": "rock" } } },
  "infer": [
    { "text": "Rock excavation/breaking", "category": "Site", "confidence": "high" },
    { "text": "Rock anchor foundations", "category": "Structure", "confidence": "medium" }
  ],
  "priority": 70,
  "source": "inferred"
}
```

```json
{
  "id": "ofq-084",
  "description": "Flood prone site considerations",
  "condition": { "profiler": { "complexity": { "flood_overlay": true } } },
  "infer": [
    { "text": "Flood planning level compliance", "category": "Planning", "confidence": "high" },
    { "text": "Flood resilient construction", "category": "Design", "confidence": "high" },
    { "text": "Flood evacuation management", "category": "Safety", "confidence": "medium" }
  ],
  "priority": 78,
  "source": "inferred"
}
```

```json
{
  "id": "opc-080",
  "description": "Flood study requirements",
  "condition": { "profiler": { "complexity": { "flood_overlay": true } } },
  "infer": [
    { "text": "Flood impact assessment", "category": "Environment", "confidence": "high" },
    { "text": "Hydraulic study", "category": "Environment", "confidence": "high" }
  ],
  "priority": 82,
  "source": "inferred"
}
```

```json
{
  "id": "sco-091",
  "description": "Hydraulic engineer for flood sites",
  "condition": { "profiler": { "complexity": { "flood_overlay": true } } },
  "infer": [{ "name": "Hydraulic/Flooding Engineer", "subgroup": "Civil", "reason": "Flood study and mitigation", "confidence": "high" }],
  "priority": 78,
  "source": "inferred"
}
```

```json
{
  "id": "ofq-085",
  "description": "Coastal site considerations",
  "condition": { "profiler": { "complexity": { "site_conditions": "coastal" } } },
  "infer": [
    { "text": "Corrosion protection measures", "category": "Durability", "confidence": "high" },
    { "text": "Marine-grade materials", "category": "Materials", "confidence": "high" },
    { "text": "Coastal erosion setback compliance", "category": "Planning", "confidence": "medium" }
  ],
  "priority": 74,
  "source": "inferred"
}
```

### 4.3 Procurement Route Rules

```json
{
  "id": "sc-010",
  "description": "D&C procurement team",
  "condition": { "profiler": { "complexity": { "procurement_route": "design_construct" } } },
  "infer": [
    { "name": "D&C Contractor", "subgroup": "Head Contractor", "reason": "Design and construction delivery", "confidence": "high" }
  ],
  "priority": 90,
  "source": "inferred"
}
```

```json
{
  "id": "sc-011",
  "description": "ECI procurement team",
  "condition": { "profiler": { "complexity": { "procurement_route": "early_contractor_involvement" } } },
  "infer": [
    { "name": "ECI Contractor", "subgroup": "Head Contractor", "reason": "Early contractor involvement", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "sc-012",
  "description": "Managing Contractor procurement",
  "condition": { "profiler": { "complexity": { "procurement_route": "managing_contractor" } } },
  "infer": [
    { "name": "Managing Contractor", "subgroup": "Head Contractor", "reason": "Trade package management", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

```json
{
  "id": "sc-013",
  "description": "Alliance procurement team",
  "condition": { "profiler": { "complexity": { "procurement_route": "alliance" } } },
  "infer": [
    { "name": "Alliance Manager", "subgroup": "Project Manager", "reason": "Alliance facilitation", "confidence": "high" }
  ],
  "priority": 80,
  "source": "inferred"
}
```

### 4.4 Operational Constraint Rules

```json
{
  "id": "ofq-086",
  "description": "Partial occupation constraints",
  "condition": { "profiler": { "complexity": { "operational_constraints": "partial_occupation" } } },
  "infer": [
    { "text": "Staged construction works", "category": "Construction", "confidence": "high" },
    { "text": "Temporary separations and hoardings", "category": "Construction", "confidence": "high" },
    { "text": "Noise and dust management", "category": "Construction", "confidence": "high" }
  ],
  "priority": 75,
  "source": "inferred"
}
```

```json
{
  "id": "ofq-087",
  "description": "Live environment constraints",
  "condition": { "profiler": { "complexity": { "operational_constraints": "live_environment" } } },
  "infer": [
    { "text": "Out-of-hours construction works", "category": "Construction", "confidence": "high" },
    { "text": "Hot permit systems", "category": "Safety", "confidence": "high" },
    { "text": "Operational interface management", "category": "Construction", "confidence": "high" }
  ],
  "priority": 80,
  "source": "inferred"
}
```

```json
{
  "id": "ofq-088",
  "description": "24/7 operational constraints",
  "condition": { "profiler": { "complexity": { "operational_constraints": "24_7_operations" } } },
  "infer": [
    { "text": "24/7 operational continuity requirements", "category": "Operational", "confidence": "high" },
    { "text": "Redundant systems during changeover", "category": "Services", "confidence": "high" },
    { "text": "Detailed construction methodology", "category": "Construction", "confidence": "high" }
  ],
  "priority": 85,
  "source": "inferred"
}
```

---

## 5. Integration Summary

### Statistics

| Category | Existing | New | Total |
|----------|----------|-----|-------|
| Functional & Quality Objectives | 6 | 30 | 36 |
| Planning & Compliance Objectives | 7 | 38 | 45 |
| Client Stakeholders | 3 | 4 | 7 |
| Authority Stakeholders | 5 | 24 | 29 |
| Consultant Stakeholders | 8 | 27 | 35 |
| Contractor Stakeholders | 4 | 19 | 23 |
| **Total** | **33** | **142** | **175** |

### Coverage Summary

**Building Classes Covered:**
- Residential: Existing + enhanced
- Commercial: Existing + enhanced
- Industrial: Full coverage (warehouse, manufacturing, cold storage, cleanroom, data centre, dangerous goods)
- Institutional: Full coverage (education, healthcare, correctional, emergency services, performing arts, sports)
- Infrastructure: Full coverage (roads, rail, water, solar, wind, marina, marine)
- Agricultural/Rural: Full coverage (farm, winery, livestock, vertical farming)
- Defense/Secure: Full coverage (military, SCIF, data sovereignty)

**Regions Covered:**
- Australia (AU): Existing + enhanced
- New Zealand (NZ): Full coverage (NZBC, resource/building consent, authorities)
- United Kingdom (UK): Full coverage (Building Regs, planning, CDM, authorities)
- United States (US): Full coverage (IBC/IRC, ADA, NFPA, zoning, authorities)

**Complexity Dimensions Covered:**
- Quality tiers: Basic, medium, high, premium
- Site conditions: Greenfield, infill, sloping, rock, flood, coastal
- Procurement routes: Traditional, D&C, ECI, MC, Alliance
- Operational constraints: Vacant, partial, live, 24/7

### Recommendations for Next Steps

1. **Rule Validation**: Test rules against sample projects across each building class
2. **Rule Evaluation Service**: Build TypeScript service to evaluate conditions against project data
3. **Prompt Templates**: Design templates for injecting matched rules into AI generation prompts
4. **UI for Rule Management**: Consider admin interface for rule maintenance
5. **Confidence Calibration**: Establish consistent criteria:
   - High: Regulatory requirement or universal practice
   - Medium: Industry best practice, commonly required
   - Low: Optional or context-dependent

### Files to Update

1. `src/lib/data/inference-rules.json` - Add all new rules
2. `src/lib/services/rule-evaluation.ts` - Create rule evaluation service (new file)
3. `src/lib/services/report-context-orchestrator.ts` - Integrate rule evaluation

---

*Research completed: 2026-01-27*
*Total new rules defined: 142*
*Ready for integration review*
