# Profiler Module Expansion Specification

**Version:** 1.0
**Status:** Draft - Pending Review
**Created:** 2026-01-24
**Updated:** 2026-01-24
**Extends:** 019-profiler

---

## 1. Overview

This specification expands the Profiler module from 6 building classes with 47 subclasses to 8 building classes with 110+ subclasses, achieving comprehensive coverage of all construction project types encountered by PM consultancies across Australia, UK, US, and New Zealand markets.

### 1.1 Goals

- **Expand** existing building classes with additional subclasses (Residential +4, Commercial +6, Industrial +6, Institution +7, Infrastructure +9)
- **Add** new Agricultural/Rural building class (11 subclasses)
- **Add** new Defense/Secure building class (10 subclasses)
- **Implement** work scope definitions for NEW and ADVISORY project types
- **Add** global complexity dimensions applicable across all building classes
- **Add** new risk flags for specialized project conditions
- **Expand** Marine/Coastal, Aviation, and Telecommunications sectors
- **Enable** multi-region support for AU, NZ, UK, and US markets

### 1.2 Non-Goals

- Changes to the core profiler UI architecture (handled by 019-profiler)
- Migration of existing projects (separate migration if needed)
- Changes to objectives generation logic
- Full internationalization/localization (only building codes and approval pathways)

### 1.3 Success Metrics

| Metric | Target |
|--------|--------|
| Building Classes | 8 (from 6) |
| Total Subclasses | 110+ (from 47) |
| Work Scope Project Types | 5 (+ NEW, ADVISORY) |
| Complexity Dimensions | ~50 (from ~30) |
| Risk Flags | 15+ (from 5) |
| Region Support | 4 markets (AU, NZ, UK, US) |

---

## 2. Phase 1: Expand Existing Building Classes

**Priority:** HIGH | **Impact:** HIGH | **Effort:** MEDIUM

### 2.1 Residential Additions (+4 subclasses)

Add to `buildingClasses.residential.subclasses`:

```json
{ "value": "coliving", "label": "Co-living / Shared Housing" },
{ "value": "manufactured_modular", "label": "Manufactured/Modular Housing" },
{ "value": "caravan_park", "label": "Caravan Parks / MHE" },
{ "value": "heritage_conversion", "label": "Heritage Conversion (Adaptive Reuse)" }
```

**Scale Fields:**

| Subclass | Scale Inputs |
|----------|--------------|
| `coliving` | beds, shared_spaces_sqm, gfa_sqm, common_kitchens |
| `manufactured_modular` | dwellings, factory_percent, site_percent, gfa_sqm |
| `caravan_park` | sites, permanent_dwellings, amenity_blocks, site_area_ha |
| `heritage_conversion` | gfa_sqm, heritage_floor_area_sqm, new_build_sqm, units |

**Complexity Options for Co-living:**

```json
"coliving": {
  "shared_ratio": [
    { "value": "low", "label": "Low (20-30% shared)" },
    { "value": "medium", "label": "Medium (30-50% shared)" },
    { "value": "high", "label": "High (50%+ shared)" }
  ],
  "demographics": [
    { "value": "students", "label": "Students" },
    { "value": "professionals", "label": "Young Professionals" },
    { "value": "mixed", "label": "Mixed Demographics" }
  ],
  "operator_model": [
    { "value": "owner_operated", "label": "Owner Operated" },
    { "value": "managed", "label": "Third-party Managed" },
    { "value": "build_to_rent", "label": "Build-to-Rent Model" }
  ]
}
```

### 2.2 Commercial Additions (+6 subclasses)

Add to `buildingClasses.commercial.subclasses`:

```json
{ "value": "flex_office", "label": "Flex/Hybrid Office" },
{ "value": "life_sciences", "label": "Life Sciences/Biotech Labs" },
{ "value": "medical_office", "label": "Medical Office Building (MOB)" },
{ "value": "showroom", "label": "Showroom/Trade Display" },
{ "value": "entertainment_precinct", "label": "Entertainment Precinct" },
{ "value": "convention_centre", "label": "Convention/Exhibition Centre" }
```

**Scale Fields:**

| Subclass | Scale Inputs |
|----------|--------------|
| `life_sciences` | lab_nla_sqm, pc_level (1-4), cold_storage_sqm, write_up_sqm, gfa_sqm |
| `medical_office` | consulting_rooms, procedure_rooms, imaging_suites, gfa_sqm |
| `convention_centre` | exhibition_sqm, plenary_seats, breakout_rooms, gfa_sqm |
| `flex_office` | nla_sqm, hot_desks, private_offices, meeting_rooms, gfa_sqm |
| `showroom` | display_sqm, storage_sqm, gfa_sqm, customer_parking |
| `entertainment_precinct` | venues, total_capacity, f_and_b_outlets, gfa_sqm |

**Complexity Options for Life Sciences:**

```json
"life_sciences": {
  "containment_level": [
    { "value": "pc1", "label": "PC1 (Low Risk)" },
    { "value": "pc2", "label": "PC2 (Moderate)" },
    { "value": "pc3", "label": "PC3 (High Risk) (+40%)" },
    { "value": "pc4", "label": "PC4 (Maximum) (+80%)" }
  ],
  "gmp_grade": [
    { "value": "none", "label": "Non-GMP" },
    { "value": "grade_d", "label": "GMP Grade D (ISO 8)" },
    { "value": "grade_c", "label": "GMP Grade C (ISO 7)" },
    { "value": "grade_b", "label": "GMP Grade B (ISO 5-7) (+25%)" },
    { "value": "grade_a", "label": "GMP Grade A (ISO 5) (+50%)" }
  ]
}
```

### 2.3 Industrial Additions (+6 subclasses)

Add to `buildingClasses.industrial.subclasses`:

```json
{ "value": "heavy_manufacturing", "label": "Heavy Manufacturing (Foundry/Smelter)" },
{ "value": "food_processing", "label": "Food Processing / Cold Chain" },
{ "value": "pharmaceutical_gmp", "label": "Pharmaceutical/GMP Manufacturing" },
{ "value": "cleanroom", "label": "Clean Rooms (ISO Grade)" },
{ "value": "battery_manufacturing", "label": "Battery Manufacturing / Energy Storage" },
{ "value": "waste_to_energy", "label": "Waste-to-Energy Facility" }
```

**Scale Fields for Cleanroom:**

```json
[
  { "key": "cleanroom_sqm", "label": "Cleanroom Area (m²)", "placeholder": "500-10000" },
  { "key": "iso_class", "label": "ISO Class", "type": "integer", "min": 4, "max": 8 },
  { "key": "gfa_sqm", "label": "Total GFA (m²)", "placeholder": "1000-50000" },
  { "key": "change_rooms", "label": "Gowning/Change Rooms", "type": "integer" }
]
```

**Complexity Options for Cleanroom:**

```json
"cleanroom": {
  "iso_class": [
    { "value": "iso_8", "label": "ISO 8 (100,000 particles)" },
    { "value": "iso_7", "label": "ISO 7 (10,000 particles)" },
    { "value": "iso_6", "label": "ISO 6 (1,000 particles) (+30%)" },
    { "value": "iso_5", "label": "ISO 5 (100 particles) (+50%)" },
    { "value": "iso_4", "label": "ISO 4 (10 particles) (+100%)" }
  ]
}
```

### 2.4 Institution Additions (+7 subclasses)

Add to `buildingClasses.institution.subclasses`:

```json
{ "value": "correctional", "label": "Correctional/Justice Facility" },
{ "value": "emergency_services", "label": "Emergency Services (Fire/Police/Ambulance)" },
{ "value": "library_community", "label": "Library / Community Centre" },
{ "value": "museum_gallery", "label": "Museum / Gallery" },
{ "value": "performing_arts", "label": "Performing Arts Centre / Theatre" },
{ "value": "sports_recreation", "label": "Sports & Recreation Facility" },
{ "value": "research_lab", "label": "Research Laboratory" }
```

**Scale Fields for Sports & Recreation:**

```json
[
  { "key": "seating_capacity", "label": "Seating Capacity", "placeholder": "500-80000" },
  { "key": "playing_surface_sqm", "label": "Playing Surface (m²)", "placeholder": "2000-20000" },
  { "key": "wet_area_sqm", "label": "Aquatic/Wet Areas (m²)", "placeholder": "200-5000" },
  { "key": "change_rooms", "label": "Change Rooms", "type": "integer" },
  { "key": "gfa_sqm", "label": "Total GFA (m²)", "placeholder": "2000-100000" }
]
```

**Complexity Options for Research Lab:**

```json
"research_lab": {
  "biosafety_level": [
    { "value": "bsl_1", "label": "BSL-1 (Standard)" },
    { "value": "bsl_2", "label": "BSL-2 (Moderate Hazard)" },
    { "value": "bsl_3", "label": "BSL-3 (High Risk) (+60%)" },
    { "value": "bsl_4", "label": "BSL-4 (Maximum Containment) (+150%)" }
  ]
}
```

### 2.5 Infrastructure Additions (+9 subclasses)

Add to `buildingClasses.infrastructure.subclasses`:

```json
{ "value": "mining_resources", "label": "Mining & Resources Processing" },
{ "value": "oil_gas", "label": "Oil & Gas (Upstream/Midstream/Downstream)" },
{ "value": "lng_facility", "label": "LNG Facility" },
{ "value": "hydrogen", "label": "Hydrogen Facility (Green/Blue)" },
{ "value": "solar_farm", "label": "Solar Farm (Utility Scale)" },
{ "value": "wind_farm", "label": "Wind Farm (Onshore/Offshore)" },
{ "value": "substation_grid", "label": "Substation / Grid Infrastructure" },
{ "value": "desalination", "label": "Desalination Plant" },
{ "value": "waste_management", "label": "Waste Management Facility" }
```

**Scale Fields:**

| Subclass | Scale Inputs |
|----------|--------------|
| `solar_farm` | capacity_mw, panels_count, battery_mwh, site_area_ha |
| `wind_farm` | capacity_mw, turbines, hub_height_m, site_area_ha |
| `mining_resources` | production_capacity_tpa, site_area_ha, processing_sqm |
| `desalination` | capacity_ml_day, intake_type, gfa_sqm |
| `hydrogen` | capacity_mw, production_tonnes_day, storage_capacity_tonnes |

---

## 3. Phase 2: Agricultural/Rural Building Class

**Priority:** HIGH | **Impact:** HIGH | **Effort:** MEDIUM

This sector is completely missing from the current system and is critical for rural PM consultancies.

### 3.1 Building Class Definition

Add new building class to `buildingClasses`:

```json
"agricultural": {
  "label": "Agricultural / Rural",
  "icon": "tractor",
  "subclasses": [
    { "value": "farm_buildings", "label": "Farm Buildings (Barns/Sheds)" },
    { "value": "equestrian", "label": "Equestrian Facilities" },
    { "value": "winery_brewery", "label": "Winery / Brewery / Distillery" },
    { "value": "food_processing_rural", "label": "Food Processing (Rural)" },
    { "value": "aquaculture", "label": "Aquaculture" },
    { "value": "vertical_farming", "label": "Vertical Farming / CEA" },
    { "value": "rural_tourism", "label": "Rural Tourism (Farmstay/Eco-lodge)" },
    { "value": "irrigation_infrastructure", "label": "Irrigation Infrastructure" },
    { "value": "grain_storage", "label": "Grain Storage / Silos" },
    { "value": "livestock", "label": "Livestock Facilities (Dairy/Piggery/Poultry)" },
    { "value": "other", "label": "Other" }
  ]
}
```

### 3.2 Scale Fields

**Winery/Brewery:**

```json
[
  { "key": "production_litres", "label": "Production (L/year)", "placeholder": "50000-5000000" },
  { "key": "cellar_door_sqm", "label": "Cellar Door (m²)", "placeholder": "50-500" },
  { "key": "barrel_storage_sqm", "label": "Barrel Storage (m²)", "placeholder": "200-2000" },
  { "key": "restaurant_seats", "label": "Restaurant Seats", "placeholder": "0-200" },
  { "key": "gfa_sqm", "label": "Total GFA (m²)", "placeholder": "500-10000" }
]
```

**Vertical Farming:**

```json
[
  { "key": "growing_area_sqm", "label": "Growing Area (m²)", "placeholder": "1000-50000" },
  { "key": "growing_levels", "label": "Growing Levels", "placeholder": "3-20" },
  { "key": "production_tonnes_year", "label": "Production (t/year)", "placeholder": "100-10000" },
  { "key": "gfa_sqm", "label": "Total GFA (m²)", "placeholder": "2000-100000" }
]
```

**Livestock Facilities:**

```json
[
  { "key": "head_capacity", "label": "Head Capacity", "placeholder": "100-50000" },
  { "key": "shed_sqm", "label": "Shed Area (m²)", "placeholder": "500-20000" },
  { "key": "milking_bays", "label": "Milking Bays", "placeholder": "0-80" },
  { "key": "effluent_ml", "label": "Effluent Storage (ML)", "placeholder": "1-50" }
]
```

### 3.3 Complexity Options

```json
"agricultural": {
  "complexityOptions": {
    "default": {
      "water_source": [
        { "value": "town_water", "label": "Town Water" },
        { "value": "bore", "label": "Bore/Groundwater" },
        { "value": "dam_catchment", "label": "Dam/Catchment" },
        { "value": "river_allocation", "label": "River Allocation" },
        { "value": "recycled", "label": "Recycled Water" }
      ],
      "power_source": [
        { "value": "grid", "label": "Grid Connected" },
        { "value": "off_grid_solar", "label": "Off-Grid Solar" },
        { "value": "hybrid", "label": "Hybrid (Grid + Solar)" },
        { "value": "diesel_backup", "label": "Diesel Backup Required" }
      ],
      "remoteness": [
        { "value": "peri_urban", "label": "Peri-Urban" },
        { "value": "regional", "label": "Regional" },
        { "value": "remote", "label": "Remote (+20%)" },
        { "value": "very_remote", "label": "Very Remote (+40%)" }
      ],
      "environmental": [
        { "value": "standard", "label": "Standard" },
        { "value": "waterway_buffer", "label": "Waterway Buffer Zone" },
        { "value": "vegetation_clearing", "label": "Vegetation Clearing Required" },
        { "value": "protected_habitat", "label": "Protected Habitat (+30%)" }
      ]
    }
  }
}
```

---

## 4. Phase 3: Defense/Secure Building Class

**Priority:** MEDIUM | **Impact:** MEDIUM | **Effort:** MEDIUM

Specialized sector for government and defense projects requiring security classifications.

### 4.1 Building Class Definition

```json
"defense_secure": {
  "label": "Defense / Secure",
  "icon": "shield",
  "subclasses": [
    { "value": "military_base", "label": "Military Base" },
    { "value": "aviation_defense", "label": "Aviation (Hangars/Runways)" },
    { "value": "naval", "label": "Naval Facilities" },
    { "value": "secure_government", "label": "Secure Government (Embassy/Court)" },
    { "value": "data_sovereignty", "label": "Data Sovereignty Facility" },
    { "value": "detention", "label": "Immigration Detention" },
    { "value": "border_facility", "label": "Border Control Facility" },
    { "value": "armory_magazine", "label": "Armory / Ammunition Magazine" },
    { "value": "training_facility", "label": "Training Facility" },
    { "value": "other", "label": "Other" }
  ]
}
```

### 4.2 Complexity Options (Security-Focused)

```json
"defense_secure": {
  "complexityOptions": {
    "default": {
      "security_classification": [
        { "value": "unclassified", "label": "Unclassified" },
        { "value": "protected", "label": "Protected" },
        { "value": "secret", "label": "Secret (+30%)" },
        { "value": "top_secret", "label": "Top Secret (+60%)" },
        { "value": "sci", "label": "SCI/SAP (+100%)" }
      ],
      "physical_security": [
        { "value": "standard", "label": "Standard" },
        { "value": "pspf_zone_1", "label": "PSPF Zone 1" },
        { "value": "pspf_zone_2", "label": "PSPF Zone 2" },
        { "value": "pspf_zone_3", "label": "PSPF Zone 3" },
        { "value": "scif", "label": "SCIF Standard (+50%)" }
      ],
      "clearance_requirement": [
        { "value": "baseline", "label": "Baseline Clearance" },
        { "value": "nv1", "label": "NV1" },
        { "value": "nv2", "label": "NV2" },
        { "value": "pv", "label": "Positive Vetting (+15%)" }
      ]
    }
  }
}
```

---

## 5. Phase 4: Work Scope Expansion (NEW and ADVISORY)

**Priority:** HIGH | **Impact:** HIGH | **Effort:** MEDIUM

Currently work scope only exists for refurb, remediation, extend. This adds comprehensive work scope definitions for NEW and ADVISORY project types.

### 5.1 Work Scope for NEW Builds

```json
"new": {
  "enabling_works": {
    "label": "Enabling Works",
    "items": [
      { "value": "demolition", "label": "Demolition", "consultants": ["Demolition Consultant", "Hazmat Consultant"] },
      { "value": "site_clearance", "label": "Site Clearance", "consultants": ["Civil Engineer"] },
      { "value": "decontamination", "label": "Decontamination", "consultants": ["Environmental Consultant"], "riskFlag": "contaminated_land" },
      { "value": "bulk_earthworks", "label": "Bulk Earthworks", "consultants": ["Civil Engineer", "Geotechnical Engineer"] },
      { "value": "temporary_works", "label": "Temporary Works", "consultants": ["Structural Engineer"] },
      { "value": "utility_diversions", "label": "Utility Diversions", "consultants": ["Civil Engineer", "Services Engineer"] }
    ]
  },
  "civil_works": {
    "label": "Civil Works",
    "items": [
      { "value": "earthworks_detailed", "label": "Detailed Earthworks", "consultants": ["Civil Engineer"] },
      { "value": "site_drainage", "label": "Site Drainage", "consultants": ["Civil Engineer", "Hydraulic Engineer"] },
      { "value": "stormwater_management", "label": "Stormwater Management", "consultants": ["Civil Engineer"] },
      { "value": "internal_roads", "label": "Internal Roads/Pavements", "consultants": ["Civil Engineer", "Traffic Engineer"] },
      { "value": "retaining_walls", "label": "Retaining Walls", "consultants": ["Structural Engineer", "Civil Engineer"] }
    ]
  },
  "structure": {
    "label": "Structure",
    "items": [
      { "value": "substructure", "label": "Substructure/Foundations", "consultants": ["Structural Engineer", "Geotechnical Engineer"] },
      { "value": "superstructure", "label": "Superstructure", "consultants": ["Structural Engineer"] },
      { "value": "post_tensioning", "label": "Post-Tensioning", "consultants": ["Structural Engineer"], "complexityPoints": 1 },
      { "value": "precast_elements", "label": "Precast Elements", "consultants": ["Structural Engineer"] },
      { "value": "steel_frame", "label": "Structural Steel Frame", "consultants": ["Structural Engineer"] },
      { "value": "timber_mass", "label": "Mass Timber Structure", "consultants": ["Structural Engineer", "Fire Engineer"], "complexityPoints": 2 }
    ]
  },
  "envelope": {
    "label": "Building Envelope",
    "items": [
      { "value": "facade_system", "label": "Facade System", "consultants": ["Facade Engineer", "Architect"] },
      { "value": "curtain_wall", "label": "Curtain Wall", "consultants": ["Facade Engineer"] },
      { "value": "roofing", "label": "Roofing System", "consultants": ["Architect"] },
      { "value": "glazing", "label": "Glazing/Windows", "consultants": ["Facade Engineer"] },
      { "value": "waterproofing", "label": "Waterproofing", "consultants": ["Waterproofing Consultant"] }
    ]
  },
  "services": {
    "label": "Building Services",
    "items": [
      { "value": "mechanical_hvac", "label": "Mechanical/HVAC", "consultants": ["Services Engineer (Mechanical)"] },
      { "value": "electrical_power", "label": "Electrical/Power", "consultants": ["Services Engineer (Electrical)"] },
      { "value": "hydraulic_plumbing", "label": "Hydraulic/Plumbing", "consultants": ["Services Engineer (Hydraulic)"] },
      { "value": "fire_services", "label": "Fire Services", "consultants": ["Fire Engineer"] },
      { "value": "vertical_transport", "label": "Vertical Transport", "consultants": ["Vertical Transport Consultant"] },
      { "value": "bms_controls", "label": "BMS/Controls", "consultants": ["BMS Consultant"] },
      { "value": "security_systems", "label": "Security Systems", "consultants": ["Security Consultant"] },
      { "value": "ict_structured_cabling", "label": "ICT/Structured Cabling", "consultants": ["ICT Consultant"] }
    ]
  },
  "fitout": {
    "label": "Internal Fitout",
    "items": [
      { "value": "partitions_walls", "label": "Partitions/Internal Walls", "consultants": ["Architect"] },
      { "value": "ceilings", "label": "Ceilings", "consultants": ["Architect"] },
      { "value": "flooring", "label": "Flooring", "consultants": ["Architect", "Interior Designer"] },
      { "value": "joinery", "label": "Joinery/Cabinetry", "consultants": ["Interior Designer"] },
      { "value": "specialist_fitout", "label": "Specialist Fitout (Lab/Kitchen)", "consultants": ["Specialist Consultant"], "complexityPoints": 1 }
    ]
  },
  "external_works": {
    "label": "External Works",
    "items": [
      { "value": "landscaping", "label": "Landscaping", "consultants": ["Landscape Architect"] },
      { "value": "car_parking", "label": "Car Parking", "consultants": ["Civil Engineer", "Traffic Engineer"] },
      { "value": "signage_wayfinding", "label": "Signage/Wayfinding", "consultants": ["Signage Consultant"] },
      { "value": "external_lighting", "label": "External Lighting", "consultants": ["Lighting Designer"] },
      { "value": "fencing_gates", "label": "Fencing/Gates", "consultants": ["Security Consultant", "Architect"] }
    ]
  }
}
```

### 5.2 Work Scope for ADVISORY Projects

```json
"advisory": {
  "due_diligence": {
    "label": "Due Diligence",
    "items": [
      { "value": "technical_dd", "label": "Technical Due Diligence", "consultants": ["Building Consultant", "Structural Engineer"] },
      { "value": "building_condition", "label": "Building Condition Assessment", "consultants": ["Building Consultant"] },
      { "value": "environmental_dd", "label": "Environmental Due Diligence", "consultants": ["Environmental Consultant"] },
      { "value": "compliance_audit", "label": "Compliance Audit", "consultants": ["Building Certifier", "Fire Engineer"] },
      { "value": "capex_assessment", "label": "CapEx Assessment", "consultants": ["Quantity Surveyor"] },
      { "value": "services_assessment", "label": "Services Assessment", "consultants": ["Services Engineer"] }
    ]
  },
  "feasibility": {
    "label": "Feasibility Studies",
    "items": [
      { "value": "highest_best_use", "label": "Highest & Best Use Study", "consultants": ["Town Planner", "Architect"] },
      { "value": "development_feasibility", "label": "Development Feasibility", "consultants": ["Quantity Surveyor", "Town Planner"] },
      { "value": "massing_study", "label": "Massing/Yield Study", "consultants": ["Architect", "Town Planner"] },
      { "value": "cost_benefit", "label": "Cost-Benefit Analysis", "consultants": ["Quantity Surveyor"] }
    ]
  },
  "design_review": {
    "label": "Design Review",
    "items": [
      { "value": "design_audit", "label": "Design Audit", "consultants": ["Project Manager", "Architect"] },
      { "value": "value_engineering", "label": "Value Engineering", "consultants": ["Quantity Surveyor", "Architect"] },
      { "value": "constructability_review", "label": "Constructability Review", "consultants": ["Construction Manager"] },
      { "value": "peer_review", "label": "Peer Review (Structural/Services)", "consultants": ["Structural Engineer", "Services Engineer"] }
    ]
  },
  "procurement_support": {
    "label": "Procurement Support",
    "items": [
      { "value": "procurement_strategy", "label": "Procurement Strategy", "consultants": ["Project Manager"] },
      { "value": "tender_documentation", "label": "Tender Documentation Review", "consultants": ["Quantity Surveyor"] },
      { "value": "tender_evaluation", "label": "Tender Evaluation", "consultants": ["Quantity Surveyor", "Project Manager"] },
      { "value": "contract_negotiation", "label": "Contract Negotiation Support", "consultants": ["Project Manager"] }
    ]
  },
  "contract_administration": {
    "label": "Contract Administration",
    "items": [
      { "value": "superintendent_services", "label": "Superintendent Services", "consultants": ["Project Manager"] },
      { "value": "progress_certification", "label": "Progress Certification", "consultants": ["Quantity Surveyor"] },
      { "value": "variation_assessment", "label": "Variation Assessment", "consultants": ["Quantity Surveyor"] },
      { "value": "eot_assessment", "label": "EOT Assessment", "consultants": ["Project Manager", "Programming Consultant"] },
      { "value": "defects_management", "label": "Defects Management", "consultants": ["Project Manager"] }
    ]
  },
  "dispute_resolution": {
    "label": "Dispute Resolution",
    "items": [
      { "value": "claim_assessment", "label": "Claim Assessment", "consultants": ["Quantity Surveyor"], "complexityPoints": 2 },
      { "value": "delay_analysis", "label": "Delay Analysis", "consultants": ["Programming Consultant"], "complexityPoints": 2 },
      { "value": "expert_determination", "label": "Expert Determination", "consultants": ["Expert Witness"], "complexityPoints": 3 },
      { "value": "arbitration_support", "label": "Arbitration/Litigation Support", "consultants": ["Expert Witness"], "complexityPoints": 3 }
    ]
  }
}
```

---

## 6. Phase 5: Global Complexity Dimensions

**Priority:** MEDIUM | **Impact:** HIGH | **Effort:** LOW

Add cross-cutting complexity dimensions that apply across all building classes.

### 6.1 Universal Complexity Dimensions

Add to every building class's `complexityOptions.default`:

```json
{
  "contamination_level": [
    { "value": "nil", "label": "Nil/Clean Site" },
    { "value": "minor", "label": "Minor (Spot Treatment)" },
    { "value": "significant", "label": "Significant (+10-20%)" },
    { "value": "heavily_contaminated", "label": "Heavily Contaminated (+30-50%)" }
  ],
  "access_constraints": [
    { "value": "unrestricted", "label": "Unrestricted Access" },
    { "value": "urban_constrained", "label": "Urban/Constrained" },
    { "value": "restricted_hours", "label": "Restricted Hours" },
    { "value": "remote", "label": "Remote Site (+15-30%)" }
  ],
  "operational_constraints": [
    { "value": "vacant", "label": "Vacant/Unoccupied" },
    { "value": "partial_occupation", "label": "Partial Occupation" },
    { "value": "live_environment", "label": "Live Environment (+10-20%)" },
    { "value": "24_7_occupied", "label": "24/7 Occupied (+20-30%)" }
  ],
  "procurement_route": [
    { "value": "traditional", "label": "Traditional (Lump Sum)" },
    { "value": "design_construct", "label": "Design & Construct" },
    { "value": "eci", "label": "Early Contractor Involvement" },
    { "value": "managing_contractor", "label": "Managing Contractor" },
    { "value": "alliance", "label": "Alliance (+5-10%)" },
    { "value": "ppp", "label": "PPP" }
  ],
  "stakeholder_complexity": [
    { "value": "single_owner", "label": "Single Owner" },
    { "value": "strata", "label": "Strata Ownership" },
    { "value": "government", "label": "Government Client" },
    { "value": "multiple_agencies", "label": "Multiple Agencies (+10-20%)" }
  ],
  "environmental_sensitivity": [
    { "value": "standard", "label": "Standard" },
    { "value": "sensitive", "label": "Environmentally Sensitive" },
    { "value": "protected_habitat", "label": "Protected Habitat (+20%)" },
    { "value": "aboriginal_heritage", "label": "Aboriginal Heritage (+15%)" }
  ]
}
```

---

## 7. Phase 6: New Risk Flags

**Priority:** MEDIUM | **Impact:** MEDIUM | **Effort:** LOW

Add to `workScopeOptions.riskDefinitions`:

```json
{
  "high_security": {
    "severity": "warning",
    "title": "High Security Classification",
    "description": "Top Secret/SCI facilities require SCIF construction, cleared workforce, and extended approval timelines."
  },
  "remote_site": {
    "severity": "warning",
    "title": "Very Remote Location",
    "description": "Very remote sites add 40%+ to construction costs. Consider modular/prefabrication strategies."
  },
  "live_operations": {
    "severity": "info",
    "title": "Live Operational Environment",
    "description": "Works in live environments require careful staging, safety protocols, and operational coordination."
  },
  "biosafety_3_plus": {
    "severity": "critical",
    "title": "BSL-3+ Laboratory",
    "description": "High containment laboratories require specialized design, certification, and security protocols."
  },
  "gmp_manufacturing": {
    "severity": "warning",
    "title": "GMP Manufacturing",
    "description": "Good Manufacturing Practice facilities require validation protocols and TGA/FDA compliance pathways."
  },
  "heritage_adaptive_reuse": {
    "severity": "warning",
    "title": "Heritage Adaptive Reuse",
    "description": "Adaptive reuse of heritage buildings requires heritage consultant, conservation management plan, and approvals."
  },
  "critical_infrastructure": {
    "severity": "warning",
    "title": "Critical Infrastructure",
    "description": "Critical infrastructure projects require SOCI Act compliance and enhanced security measures."
  },
  "multi_jurisdictional": {
    "severity": "info",
    "title": "Multi-Jurisdictional",
    "description": "Projects spanning jurisdictions require coordination across multiple regulatory frameworks."
  },
  "native_title": {
    "severity": "warning",
    "title": "Native Title Considerations",
    "description": "Sites with native title claims require Indigenous Land Use Agreement (ILUA) or consent processes."
  },
  "flood_overlay": {
    "severity": "warning",
    "title": "Flood Overlay",
    "description": "Flood-prone land requires hydraulic study, flood-compatible design, and resilience measures."
  }
}
```

---

## 8. Phase 7: Marine/Coastal Sector Expansion

**Priority:** HIGH | **Impact:** HIGH | **Effort:** MEDIUM

### 8.1 Marine/Coastal Subclasses

Update `buildingClasses.infrastructure.subclasses`:

```json
{ "value": "marina", "label": "Marina / Boat Harbor" },
{ "value": "seawall_revetment", "label": "Seawall / Revetment" },
{ "value": "jetty_wharf", "label": "Jetty / Wharf / Pier" },
{ "value": "boat_ramp", "label": "Boat Ramp / Launching Facility" },
{ "value": "coastal_protection", "label": "Coastal Protection / Beach Nourishment" },
{ "value": "dredging", "label": "Dredging / Channel Maintenance" },
{ "value": "offshore_platform", "label": "Offshore Platform / Structure" },
{ "value": "aquaculture_marine", "label": "Marine Aquaculture (Ocean-based)" },
{ "value": "ferry_terminal", "label": "Ferry Terminal" },
{ "value": "cruise_terminal", "label": "Cruise Ship Terminal" }
```

### 8.2 Scale Fields for Marine

```json
{
  "marina": [
    { "key": "berths", "label": "Berths", "placeholder": "50-500" },
    { "key": "wet_berths", "label": "Wet Berths", "placeholder": "30-400" },
    { "key": "dry_stack", "label": "Dry Stack Capacity", "placeholder": "0-200" },
    { "key": "max_vessel_loa_m", "label": "Max Vessel LOA (m)", "placeholder": "10-50" },
    { "key": "land_area_ha", "label": "Land Area (ha)", "placeholder": "1-20" },
    { "key": "water_area_ha", "label": "Water Area (ha)", "placeholder": "2-50" }
  ],
  "seawall_revetment": [
    { "key": "length_m", "label": "Length (m)", "placeholder": "100-5000" },
    { "key": "crest_height_m", "label": "Crest Height (m AHD)", "placeholder": "2-8" },
    { "key": "design_life_years", "label": "Design Life (years)", "placeholder": "50-100" },
    { "key": "wave_height_m", "label": "Design Wave Height (m)", "placeholder": "1-5" }
  ],
  "jetty_wharf": [
    { "key": "length_m", "label": "Length (m)", "placeholder": "50-500" },
    { "key": "width_m", "label": "Width (m)", "placeholder": "10-50" },
    { "key": "deck_area_sqm", "label": "Deck Area (m²)", "placeholder": "500-25000" },
    { "key": "design_load_kpa", "label": "Design Load (kPa)", "placeholder": "10-50" },
    { "key": "water_depth_m", "label": "Water Depth (m)", "placeholder": "3-15" }
  ]
}
```

### 8.3 Complexity Options for Marine

```json
{
  "environment": [
    { "value": "sheltered", "label": "Sheltered Waters" },
    { "value": "semi_exposed", "label": "Semi-Exposed" },
    { "value": "exposed", "label": "Exposed Coastline (+30%)" },
    { "value": "cyclonic", "label": "Cyclonic Region (+50%)" }
  ],
  "seabed_conditions": [
    { "value": "sand", "label": "Sand/Gravel" },
    { "value": "rock", "label": "Rock" },
    { "value": "coral", "label": "Coral/Reef (+40%)" },
    { "value": "soft_sediment", "label": "Soft Sediment (Piling Required)" }
  ],
  "environmental_approvals": [
    { "value": "standard", "label": "Standard" },
    { "value": "eis_required", "label": "EIS Required" },
    { "value": "epbc_referral", "label": "EPBC Referral (Federal)" },
    { "value": "marine_park", "label": "Marine Park (+60%)" }
  ],
  "tidal_range": [
    { "value": "micro", "label": "Micro-tidal (<2m)" },
    { "value": "meso", "label": "Meso-tidal (2-4m)" },
    { "value": "macro", "label": "Macro-tidal (>4m) (+20%)" }
  ]
}
```

---

## 9. Phase 8: Aviation Sector Expansion

**Priority:** HIGH | **Impact:** HIGH | **Effort:** MEDIUM

### 9.1 Aviation Subclasses

Update `buildingClasses.infrastructure.subclasses`:

```json
{ "value": "airport_terminal", "label": "Airport Terminal" },
{ "value": "airfield_runway", "label": "Airfield / Runway" },
{ "value": "hangar_maintenance", "label": "Hangar / Maintenance Facility" },
{ "value": "cargo_freight", "label": "Cargo / Freight Terminal" },
{ "value": "heliport", "label": "Heliport / Helipad" },
{ "value": "air_traffic_control", "label": "Air Traffic Control Tower" },
{ "value": "fuel_farm", "label": "Aviation Fuel Farm" },
{ "value": "ground_support", "label": "Ground Support Equipment Facility" },
{ "value": "vip_lounge", "label": "VIP / First Class Lounge" },
{ "value": "regional_airport", "label": "Regional Airport" }
```

### 9.2 Scale Fields for Aviation

```json
{
  "airport_terminal": [
    { "key": "passengers_mppa", "label": "Passengers (MPPA)", "placeholder": "1-100" },
    { "key": "terminal_sqm", "label": "Terminal GFA (m²)", "placeholder": "10000-500000" },
    { "key": "gates", "label": "Gates", "placeholder": "5-100" },
    { "key": "aerobridge_gates", "label": "Aerobridge Gates", "placeholder": "2-80" },
    { "key": "check_in_counters", "label": "Check-in Counters", "placeholder": "20-200" },
    { "key": "security_lanes", "label": "Security Lanes", "placeholder": "5-50" }
  ],
  "airfield_runway": [
    { "key": "runway_length_m", "label": "Runway Length (m)", "placeholder": "1500-4500" },
    { "key": "runway_width_m", "label": "Runway Width (m)", "placeholder": "30-60" },
    { "key": "pcn", "label": "PCN Rating", "placeholder": "30-100" },
    { "key": "taxiways", "label": "Taxiways", "placeholder": "2-10" },
    { "key": "apron_sqm", "label": "Apron Area (m²)", "placeholder": "10000-500000" }
  ],
  "hangar_maintenance": [
    { "key": "hangar_sqm", "label": "Hangar Area (m²)", "placeholder": "2000-50000" },
    { "key": "door_span_m", "label": "Door Span (m)", "placeholder": "30-120" },
    { "key": "clear_height_m", "label": "Clear Height (m)", "placeholder": "15-30" },
    { "key": "aircraft_capacity", "label": "Aircraft Capacity", "placeholder": "1-10" },
    { "key": "mro_bays", "label": "MRO Bays", "placeholder": "1-20" }
  ]
}
```

### 9.3 Complexity Options for Aviation

```json
{
  "aircraft_code": [
    { "value": "code_a", "label": "Code A (Light Aircraft)" },
    { "value": "code_b", "label": "Code B (Regional)" },
    { "value": "code_c", "label": "Code C (Narrow Body)" },
    { "value": "code_e", "label": "Code E (Wide Body) (+30%)" },
    { "value": "code_f", "label": "Code F (A380) (+50%)" }
  ],
  "security_level": [
    { "value": "regional", "label": "Regional (Standard)" },
    { "value": "domestic", "label": "Domestic" },
    { "value": "international", "label": "International (+40%)" },
    { "value": "high_security", "label": "High Security (+60%)" }
  ],
  "operations": [
    { "value": "vfr_only", "label": "VFR Only" },
    { "value": "ifr_non_precision", "label": "IFR Non-Precision" },
    { "value": "ifr_precision", "label": "IFR Precision (ILS)" },
    { "value": "cat_iii", "label": "CAT III All-Weather (+25%)" }
  ],
  "regulatory": [
    { "value": "casa", "label": "CASA (Australia)" },
    { "value": "faa", "label": "FAA (USA)" },
    { "value": "caa", "label": "CAA (UK)" },
    { "value": "icao", "label": "ICAO Standards" }
  ]
}
```

---

## 10. Phase 9: Telecommunications Sector Expansion

**Priority:** HIGH | **Impact:** HIGH | **Effort:** MEDIUM

### 10.1 Telecommunications Subclasses

Update `buildingClasses.infrastructure.subclasses`:

```json
{ "value": "telecom_tower", "label": "Telecommunications Tower / Monopole" },
{ "value": "5g_small_cell", "label": "5G Small Cell Network" },
{ "value": "data_centre_colo", "label": "Data Centre (Colocation)" },
{ "value": "data_centre_hyperscale", "label": "Data Centre (Hyperscale)" },
{ "value": "data_centre_edge", "label": "Data Centre (Edge/Modular)" },
{ "value": "fibre_network", "label": "Fibre Network (FTTH/FTTB)" },
{ "value": "submarine_cable", "label": "Submarine Cable Landing Station" },
{ "value": "exchange_facility", "label": "Exchange / Central Office" },
{ "value": "broadcast_facility", "label": "Broadcast Facility (TV/Radio)" },
{ "value": "satellite_ground", "label": "Satellite Ground Station" }
```

### 10.2 Scale Fields for Telecommunications

```json
{
  "telecom_tower": [
    { "key": "height_m", "label": "Tower Height (m)", "placeholder": "30-200" },
    { "key": "antenna_platforms", "label": "Antenna Platforms", "placeholder": "2-6" },
    { "key": "tenants", "label": "Tenant Capacity", "placeholder": "1-5" },
    { "key": "equipment_shelter_sqm", "label": "Equipment Shelter (m²)", "placeholder": "20-100" }
  ],
  "5g_small_cell": [
    { "key": "nodes", "label": "Node Count", "placeholder": "10-1000" },
    { "key": "coverage_km2", "label": "Coverage Area (km²)", "placeholder": "1-50" },
    { "key": "backhaul_type", "label": "Backhaul Type", "type": "select" }
  ],
  "fibre_network": [
    { "key": "route_km", "label": "Route Length (km)", "placeholder": "10-10000" },
    { "key": "fibre_count", "label": "Fibre Count", "placeholder": "24-288" },
    { "key": "premises_passed", "label": "Premises Passed", "placeholder": "1000-100000" },
    { "key": "nodes", "label": "Active Nodes", "placeholder": "10-500" }
  ],
  "data_centre_hyperscale": [
    { "key": "it_load_mw", "label": "IT Load (MW)", "placeholder": "20-200" },
    { "key": "white_space_sqm", "label": "White Space (m²)", "placeholder": "10000-100000" },
    { "key": "pue_target", "label": "PUE Target", "placeholder": "1.1-1.4" },
    { "key": "phases", "label": "Build Phases", "placeholder": "1-5" }
  ]
}
```

### 10.3 Complexity Options for Telecommunications

```json
{
  "network_tier": [
    { "value": "tier_1", "label": "Tier 1 (Carrier Grade)" },
    { "value": "tier_2", "label": "Tier 2 (Enterprise)" },
    { "value": "tier_3", "label": "Tier 3 (Regional)" }
  ],
  "redundancy": [
    { "value": "n", "label": "N (Single Path)" },
    { "value": "n_plus_1", "label": "N+1" },
    { "value": "2n", "label": "2N (Full Redundancy) (+40%)" },
    { "value": "2n_plus_1", "label": "2N+1 (+60%)" }
  ],
  "technology": [
    { "value": "4g_lte", "label": "4G LTE" },
    { "value": "5g_sub6", "label": "5G Sub-6GHz" },
    { "value": "5g_mmwave", "label": "5G mmWave (+25%)" },
    { "value": "6g_ready", "label": "6G Ready (+40%)" }
  ],
  "deployment_type": [
    { "value": "greenfield", "label": "Greenfield" },
    { "value": "colocation", "label": "Colocation" },
    { "value": "rooftop", "label": "Rooftop" },
    { "value": "street_furniture", "label": "Street Furniture" }
  ]
}
```

---

## 11. Phase 10: Multi-Region Support Architecture

**Priority:** HIGH | **Impact:** HIGH | **Effort:** HIGH

Design the system to support Australia, UK, US, and New Zealand markets with region-specific building codes, approval pathways, and cost benchmarks.

### 11.1 Region Configuration Structure

Add to `profile-templates.json`:

```json
{
  "regionConfig": {
    "AU": {
      "label": "Australia",
      "buildingCodeSystem": "NCC/BCA",
      "approvalPathways": ["CDC", "Complying Development", "DA", "State Significant"],
      "costBenchmarkSource": "Rawlinsons",
      "currency": "AUD",
      "measurementSystem": "metric"
    },
    "NZ": {
      "label": "New Zealand",
      "buildingCodeSystem": "NZBC",
      "approvalPathways": ["Building Consent", "Resource Consent", "Fast-track"],
      "costBenchmarkSource": "Rawlinsons NZ",
      "currency": "NZD",
      "measurementSystem": "metric"
    },
    "UK": {
      "label": "United Kingdom",
      "buildingCodeSystem": "Building Regulations",
      "approvalPathways": ["Building Notice", "Full Plans", "Prior Approval", "Permitted Development"],
      "costBenchmarkSource": "BCIS/RICS",
      "currency": "GBP",
      "measurementSystem": "metric"
    },
    "US": {
      "label": "United States",
      "buildingCodeSystem": "IBC/IRC",
      "approvalPathways": ["Building Permit", "Zoning Variance", "Special Use Permit"],
      "costBenchmarkSource": "RSMeans",
      "currency": "USD",
      "measurementSystem": "imperial"
    }
  }
}
```

### 11.2 Region-Specific Building Code Mappings

```json
{
  "buildingCodeMappings": {
    "residential": {
      "AU": { "house": "Class 1a", "apartments": "Class 2", "hotel": "Class 3" },
      "NZ": { "house": "Housing", "apartments": "Multi-unit", "hotel": "Communal Residential" },
      "UK": { "house": "Dwelling", "apartments": "Flat", "hotel": "Residential Institution" },
      "US": { "house": "R-3", "apartments": "R-2", "hotel": "R-1" }
    },
    "commercial": {
      "AU": { "office": "Class 5", "retail": "Class 6" },
      "NZ": { "office": "Commercial", "retail": "Commercial" },
      "UK": { "office": "B1", "retail": "A1/E(a)" },
      "US": { "office": "B", "retail": "M" }
    },
    "industrial": {
      "AU": { "warehouse": "Class 7b", "manufacturing": "Class 8", "dangerous_goods": "Class 7a" },
      "NZ": { "warehouse": "Industrial", "manufacturing": "Industrial" },
      "UK": { "warehouse": "B8", "manufacturing": "B2" },
      "US": { "warehouse": "S-1", "manufacturing": "F-1/F-2" }
    },
    "institution": {
      "AU": { "hospital": "Class 9a", "school": "Class 9b", "aged_care": "Class 9c" },
      "NZ": { "hospital": "Healthcare", "school": "Crowd", "aged_care": "Care/Detention" },
      "UK": { "hospital": "C2", "school": "D1", "aged_care": "C2" },
      "US": { "hospital": "I-2", "school": "E", "aged_care": "I-1/I-2" }
    }
  }
}
```

### 11.3 Region-Specific Approval Pathways

```json
{
  "approval_pathway": {
    "AU": [
      { "value": "cdc_exempt", "label": "CDC/Exempt (4 weeks)" },
      { "value": "complying_dev", "label": "Complying Development (20 days)" },
      { "value": "standard_da", "label": "Standard DA (60-120 days)" },
      { "value": "regional_da", "label": "Regional DA (6 months)" },
      { "value": "state_significant", "label": "State Significant (12+ months)" }
    ],
    "NZ": [
      { "value": "building_consent", "label": "Building Consent (20 working days)" },
      { "value": "resource_consent", "label": "Resource Consent (20+ working days)" },
      { "value": "fast_track", "label": "Fast-track Consenting" },
      { "value": "requiring_authority", "label": "Requiring Authority (Govt)" }
    ],
    "UK": [
      { "value": "permitted_dev", "label": "Permitted Development (8 weeks)" },
      { "value": "prior_approval", "label": "Prior Approval (56 days)" },
      { "value": "full_plans", "label": "Full Plans Application (8-13 weeks)" },
      { "value": "planning_permission", "label": "Full Planning Permission (8-13 weeks)" },
      { "value": "major_project", "label": "Major Project (16+ weeks)" }
    ],
    "US": [
      { "value": "building_permit", "label": "Building Permit (2-8 weeks)" },
      { "value": "zoning_variance", "label": "Zoning Variance (3-6 months)" },
      { "value": "special_use", "label": "Special Use Permit (3-6 months)" },
      { "value": "environmental_review", "label": "Environmental Review (NEPA)" }
    ]
  }
}
```

### 11.4 Region-Specific Cost Benchmarks

```json
{
  "costBenchmarks": {
    "AU": {
      "source": "Rawlinsons 2025",
      "residential_apartments": { "low": 2800, "mid": 3500, "high": 4500, "premium": 6000 },
      "commercial_office": { "b_grade": 2500, "a_grade": 3500, "premium": 4500, "trophy": 5500 },
      "industrial_warehouse": { "basic": 800, "enhanced": 1200, "high_spec": 1600 }
    },
    "NZ": {
      "source": "Rawlinsons NZ 2025",
      "multiplier": 1.05
    },
    "UK": {
      "source": "BCIS 2025",
      "residential_apartments": { "low": 1800, "mid": 2500, "high": 3500, "premium": 5000 },
      "commercial_office": { "b_grade": 2000, "a_grade": 2800, "premium": 3800, "trophy": 5000 }
    },
    "US": {
      "source": "RSMeans 2025",
      "note": "Regional multipliers apply (1.3x coastal, 0.8x midwest)"
    }
  }
}
```

### 11.5 UI Changes for Multi-Region

1. Add region selector in project setup (before profile configuration)
2. Display region-specific building code labels in ContextChips
3. Show region-appropriate approval pathways in complexity options
4. Display cost benchmarks in local currency
5. Support imperial units for US market (automatic conversion)
6. Region-aware tooltip content

---

## 12. Data Model Updates

### 12.1 Updated Project Profiles Table

```sql
ALTER TABLE project_profiles ADD COLUMN region TEXT DEFAULT 'AU';
ALTER TABLE project_profiles ADD CONSTRAINT region_check CHECK (region IN ('AU', 'NZ', 'UK', 'US'));

-- Index for region-based queries
CREATE INDEX idx_profiles_region ON project_profiles(region);
```

### 12.2 Updated Enum Definitions

```typescript
export const buildingClassEnum = pgEnum('building_class', [
  'residential',
  'commercial',
  'industrial',
  'institution',
  'mixed',
  'infrastructure',
  'agricultural',      // NEW
  'defense_secure'     // NEW
]);

export const projectTypeEnum = pgEnum('project_type_v2', [
  'refurb',
  'extend',
  'new',
  'remediation',
  'advisory'
]);

export const regionEnum = pgEnum('region', [
  'AU',
  'NZ',
  'UK',
  'US'
]);
```

---

## 13. Files to Modify

### 13.1 Primary Files

| File | Changes |
|------|---------|
| `src/lib/data/profile-templates.json` | Add all new subclasses, scale fields, complexity options, work scope items, region config |
| `src/types/profiler.ts` | Update BUILDING_CLASSES array to add 'agricultural', 'defense_secure'; add region type |
| `src/types/profile.ts` | Update buildingClass enum validation |
| `src/lib/db/schema.ts` | Update buildingClass enum if using strict DB validation |
| `src/lib/db/pg-schema.ts` | Update buildingClass enum for PostgreSQL |

### 13.2 Secondary Files

| File | Changes |
|------|---------|
| `src/components/profiler/ConsultantPreview.tsx` | Add discipline mappings for new subclasses |
| `src/components/profiler/RiskFlags.tsx` | Add new risk flag detection logic |
| `src/components/profiler/ComplexityScore.tsx` | Add multipliers for new complexity dimensions |
| `src/components/profiler/ProfileSection.tsx` | Add icons for new building classes |
| `src/components/profiler/ContextChips.tsx` | Add region-aware building code display |

---

## 14. Implementation Sequence

| Week | Phase | Description |
|------|-------|-------------|
| 1-2 | Phase 1 | Expand existing building classes (+32 subclasses) |
| 3 | Phase 2 | Add Agricultural/Rural class (11 subclasses) |
| 4 | Phase 3 | Add Defense/Secure class (10 subclasses) |
| 5 | Phase 4 | Work scope for NEW and ADVISORY project types |
| 6 | Phase 5-6 | Global complexity dimensions + new risk flags |
| 7 | Phase 7 | Marine/Coastal expansion (10 subclasses) |
| 8 | Phase 8 | Aviation sector expansion (10 subclasses) |
| 9 | Phase 9 | Telecommunications expansion (10 subclasses) |
| 10-11 | Phase 10 | Multi-region support architecture |

---

## 15. Verification Plan

### 15.1 Unit Tests

- [ ] Validate all new subclasses load correctly from JSON
- [ ] Test complexity score calculation with new dimensions
- [ ] Test work scope → consultant derivation for all new items
- [ ] Test region-specific approval pathway filtering
- [ ] Test building code mapping for each region

### 15.2 Integration Tests

- [ ] Profile API accepts all new building classes
- [ ] Save/load profile with new subclasses
- [ ] Work scope items appear for NEW and ADVISORY project types
- [ ] Region selection persists and affects downstream options
- [ ] Cost benchmarks display in correct currency

### 15.3 Manual Testing

- [ ] Walk through profile creation for each new subclass
- [ ] Verify scale fields are appropriate per subclass
- [ ] Confirm complexity options make sense per sector
- [ ] Check ConsultantPreview shows relevant disciplines
- [ ] Verify RiskFlags trigger appropriately
- [ ] Test each region selection end-to-end

---

## 16. Success Criteria

### 16.1 Coverage Metrics

- [ ] **Coverage**: Every Australian NCC/BCA building class has corresponding subclasses
- [ ] **Completeness**: Every subclass has appropriate scale fields and complexity options
- [ ] **Integration**: All work scope items linked to relevant consultants
- [ ] **Usability**: <3 clicks to configure any project type

### 16.2 Data Accuracy

- [ ] Cost multipliers reflect Rawlinsons 2025 data (AU)
- [ ] UK cost benchmarks aligned with BCIS 2025
- [ ] US cost benchmarks aligned with RSMeans 2025
- [ ] Building code mappings verified against official sources

---

## Appendix A: Sources & References

- NCC Building Classifications (Australia)
- ASCE Infrastructure Categories
- Uptime Institute Data Center Tiers
- BICSI Data Center Standards
- GMP Cleanroom Grades (TGA/FDA)
- Life Sciences Facility Design Standards
- Agricultural Building Types (RIRDC)
- UK Building Regulations Part A-P
- IBC Building Classifications (USA)
- NZ Building Code Categories
- Rawlinsons Australian Construction Handbook 2025
- BCIS Building Cost Information Service 2025
- RSMeans Construction Data 2025

---

## Appendix B: Consultant Discipline Mappings (New Subclasses)

| Subclass | Primary Consultants | Secondary Consultants |
|----------|---------------------|----------------------|
| Life Sciences | Lab Planner, PC Consultant | Fire Engineer, HVAC Specialist |
| Cleanroom | Cleanroom Specialist, HVAC | Fire Engineer, ESD Consultant |
| Data Centre (Hyperscale) | Critical Systems Engineer | Electrical Engineer, Fire Engineer |
| Marina | Coastal Engineer, Marine Surveyor | Environmental Consultant |
| Airport Terminal | Aviation Planner | Security Consultant, Wayfinding |
| Winery/Brewery | Process Engineer | Food Safety Consultant |
| Defense/Secure | Security Consultant | SCIF Specialist, Fire Engineer |

---

## Appendix C: Risk Flag Trigger Conditions

| Risk Flag | Trigger Condition |
|-----------|-------------------|
| `high_security` | security_classification IN ('top_secret', 'sci') |
| `remote_site` | remoteness = 'very_remote' |
| `live_operations` | operational_constraints IN ('live_environment', '24_7_occupied') |
| `biosafety_3_plus` | biosafety_level IN ('bsl_3', 'bsl_4') |
| `gmp_manufacturing` | gmp_grade IN ('grade_b', 'grade_a') |
| `heritage_adaptive_reuse` | subclass = 'heritage_conversion' OR heritage = 'heritage_listed' |
| `critical_infrastructure` | subclass IN infrastructure critical list |
| `flood_overlay` | site_conditions = 'flood_overlay' |
| `native_title` | aboriginal_heritage = 'aboriginal_heritage' |
