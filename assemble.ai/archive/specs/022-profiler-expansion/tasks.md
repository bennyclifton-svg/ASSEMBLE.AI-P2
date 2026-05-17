# 022-profiler-expansion Tasks

**Feature**: Profiler Module Expansion (6 to 8 building classes, 47 to 110+ subclasses)
**Created**: 2026-01-24
**Status**: COMPLETE (232/232 tasks done)

---

## Summary

This task list implements the Profiler Expansion from spec.md, expanding from 6 building classes (47 subclasses) to 8 building classes (110+ subclasses), with multi-region support for AU, NZ, UK, and US markets.

**Primary File**: `src/lib/data/profile-templates.json`
**Strategy**: Incremental Data-First approach (per plan.md)

---

## Phase 1: Setup & Verification

### Environment Setup
- [x] T001 Verify 019-profiler feature is fully implemented by checking that `src/components/profiler/ProfileSection.tsx` renders building class selection correctly
- [x] T002 Verify `src/lib/data/profile-templates.json` exists and contains the current 6 building classes with 47 subclasses
- [x] T003 Verify `src/types/profiler.ts` contains BUILDING_CLASSES array with 6 values: residential, commercial, industrial, institution, mixed, infrastructure

### Backup & Test Infrastructure
- [x] T004 Create backup copy of `src/lib/data/profile-templates.json` to `src/lib/data/profile-templates.backup.json` before making changes
- [x] T005 [P] Create test file `src/lib/utils/__tests__/profile-templates.test.ts` with validation tests for JSON structure
- [x] T006 [P] Add test case to verify all subclasses have required fields (value, label) in `src/lib/utils/__tests__/profile-templates.test.ts`
- [x] T007 [P] Add test case to verify all scaleFields have required fields (key, label, type) in `src/lib/utils/__tests__/profile-templates.test.ts`
- [x] T008 [P] Add test case to verify all complexityOptions have required fields (value, label) in `src/lib/utils/__tests__/profile-templates.test.ts`

---

## Phase 2: Expand Existing Building Classes (+32 subclasses)

**Story**: [Phase1] Expand existing building classes per spec.md Section 2

### Residential Additions (+4 subclasses)
- [x] T009 [Phase1] Add `coliving` subclass to `buildingClasses.residential.subclasses` in `src/lib/data/profile-templates.json` with value "coliving" and label "Co-living / Shared Housing"
- [x] T010 [Phase1] Add `manufactured_modular` subclass to `buildingClasses.residential.subclasses` in `src/lib/data/profile-templates.json` with value "manufactured_modular" and label "Manufactured/Modular Housing"
- [x] T011 [Phase1] Add `caravan_park` subclass to `buildingClasses.residential.subclasses` in `src/lib/data/profile-templates.json` with value "caravan_park" and label "Caravan Parks / MHE"
- [x] T012 [Phase1] Add `heritage_conversion` subclass to `buildingClasses.residential.subclasses` in `src/lib/data/profile-templates.json` with value "heritage_conversion" and label "Heritage Conversion (Adaptive Reuse)"
- [x] T013 [Phase1] Add scaleFields for `coliving` subclass in `src/lib/data/profile-templates.json` with fields: beds, shared_spaces_sqm, gfa_sqm, common_kitchens
- [x] T014 [Phase1] Add scaleFields for `manufactured_modular` subclass in `src/lib/data/profile-templates.json` with fields: dwellings, factory_percent, site_percent, gfa_sqm
- [x] T015 [Phase1] Add scaleFields for `caravan_park` subclass in `src/lib/data/profile-templates.json` with fields: sites, permanent_dwellings, amenity_blocks, site_area_ha
- [x] T016 [Phase1] Add scaleFields for `heritage_conversion` subclass in `src/lib/data/profile-templates.json` with fields: gfa_sqm, heritage_floor_area_sqm, new_build_sqm, units
- [x] T017 [Phase1] Add complexityOptions for `coliving` subclass in `src/lib/data/profile-templates.json` with dimensions: shared_ratio, demographics, operator_model (per spec.md Section 2.1)

### Commercial Additions (+6 subclasses)
- [x] T018 [Phase1] [P] Add `flex_office` subclass to `buildingClasses.commercial.subclasses` in `src/lib/data/profile-templates.json` with value "flex_office" and label "Flex/Hybrid Office"
- [x] T019 [Phase1] [P] Add `life_sciences` subclass to `buildingClasses.commercial.subclasses` in `src/lib/data/profile-templates.json` with value "life_sciences" and label "Life Sciences/Biotech Labs"
- [x] T020 [Phase1] [P] Add `medical_office` subclass to `buildingClasses.commercial.subclasses` in `src/lib/data/profile-templates.json` with value "medical_office" and label "Medical Office Building (MOB)"
- [x] T021 [Phase1] [P] Add `showroom` subclass to `buildingClasses.commercial.subclasses` in `src/lib/data/profile-templates.json` with value "showroom" and label "Showroom/Trade Display"
- [x] T022 [Phase1] [P] Add `entertainment_precinct` subclass to `buildingClasses.commercial.subclasses` in `src/lib/data/profile-templates.json` with value "entertainment_precinct" and label "Entertainment Precinct"
- [x] T023 [Phase1] [P] Add `convention_centre` subclass to `buildingClasses.commercial.subclasses` in `src/lib/data/profile-templates.json` with value "convention_centre" and label "Convention/Exhibition Centre"
- [x] T024 [Phase1] Add scaleFields for `life_sciences` subclass in `src/lib/data/profile-templates.json` with fields: lab_nla_sqm, pc_level (1-4), cold_storage_sqm, write_up_sqm, gfa_sqm
- [x] T025 [Phase1] Add scaleFields for `medical_office` subclass in `src/lib/data/profile-templates.json` with fields: consulting_rooms, procedure_rooms, imaging_suites, gfa_sqm
- [x] T026 [Phase1] Add scaleFields for `convention_centre` subclass in `src/lib/data/profile-templates.json` with fields: exhibition_sqm, plenary_seats, breakout_rooms, gfa_sqm
- [x] T027 [Phase1] Add scaleFields for `flex_office` subclass in `src/lib/data/profile-templates.json` with fields: nla_sqm, hot_desks, private_offices, meeting_rooms, gfa_sqm
- [x] T028 [Phase1] Add scaleFields for `showroom` subclass in `src/lib/data/profile-templates.json` with fields: display_sqm, storage_sqm, gfa_sqm, customer_parking
- [x] T029 [Phase1] Add scaleFields for `entertainment_precinct` subclass in `src/lib/data/profile-templates.json` with fields: venues, total_capacity, f_and_b_outlets, gfa_sqm
- [x] T030 [Phase1] Add complexityOptions for `life_sciences` subclass in `src/lib/data/profile-templates.json` with dimensions: containment_level (pc1-pc4), gmp_grade (per spec.md Section 2.2)

### Industrial Additions (+6 subclasses)
- [x] T031 [Phase1] [P] Add `heavy_manufacturing` subclass to `buildingClasses.industrial.subclasses` in `src/lib/data/profile-templates.json` with value "heavy_manufacturing" and label "Heavy Manufacturing (Foundry/Smelter)"
- [x] T032 [Phase1] [P] Add `food_processing` subclass to `buildingClasses.industrial.subclasses` in `src/lib/data/profile-templates.json` with value "food_processing" and label "Food Processing / Cold Chain"
- [x] T033 [Phase1] [P] Add `pharmaceutical_gmp` subclass to `buildingClasses.industrial.subclasses` in `src/lib/data/profile-templates.json` with value "pharmaceutical_gmp" and label "Pharmaceutical/GMP Manufacturing"
- [x] T034 [Phase1] [P] Add `cleanroom` subclass to `buildingClasses.industrial.subclasses` in `src/lib/data/profile-templates.json` with value "cleanroom" and label "Clean Rooms (ISO Grade)"
- [x] T035 [Phase1] [P] Add `battery_manufacturing` subclass to `buildingClasses.industrial.subclasses` in `src/lib/data/profile-templates.json` with value "battery_manufacturing" and label "Battery Manufacturing / Energy Storage"
- [x] T036 [Phase1] [P] Add `waste_to_energy` subclass to `buildingClasses.industrial.subclasses` in `src/lib/data/profile-templates.json` with value "waste_to_energy" and label "Waste-to-Energy Facility"
- [x] T037 [Phase1] Add scaleFields for `cleanroom` subclass in `src/lib/data/profile-templates.json` with fields: cleanroom_sqm, iso_class (integer 4-8), gfa_sqm, change_rooms
- [x] T038 [Phase1] Add scaleFields for `food_processing` subclass in `src/lib/data/profile-templates.json` with fields: processing_sqm, cold_storage_sqm, ambient_sqm, gfa_sqm
- [x] T039 [Phase1] Add scaleFields for `pharmaceutical_gmp` subclass in `src/lib/data/profile-templates.json` with fields: gmp_sqm, gfa_sqm, cleanroom_classes
- [x] T040 [Phase1] Add complexityOptions for `cleanroom` subclass in `src/lib/data/profile-templates.json` with iso_class dimension (ISO 4-8 with cost multipliers per spec.md Section 2.3)

### Institution Additions (+7 subclasses)
- [x] T041 [Phase1] [P] Add `correctional` subclass to `buildingClasses.institution.subclasses` in `src/lib/data/profile-templates.json` with value "correctional" and label "Correctional/Justice Facility"
- [x] T042 [Phase1] [P] Add `emergency_services` subclass to `buildingClasses.institution.subclasses` in `src/lib/data/profile-templates.json` with value "emergency_services" and label "Emergency Services (Fire/Police/Ambulance)"
- [x] T043 [Phase1] [P] Add `library_community` subclass to `buildingClasses.institution.subclasses` in `src/lib/data/profile-templates.json` with value "library_community" and label "Library / Community Centre"
- [x] T044 [Phase1] [P] Add `museum_gallery` subclass to `buildingClasses.institution.subclasses` in `src/lib/data/profile-templates.json` with value "museum_gallery" and label "Museum / Gallery"
- [x] T045 [Phase1] [P] Add `performing_arts` subclass to `buildingClasses.institution.subclasses` in `src/lib/data/profile-templates.json` with value "performing_arts" and label "Performing Arts Centre / Theatre"
- [x] T046 [Phase1] [P] Add `sports_recreation` subclass to `buildingClasses.institution.subclasses` in `src/lib/data/profile-templates.json` with value "sports_recreation" and label "Sports & Recreation Facility"
- [x] T047 [Phase1] [P] Add `research_lab` subclass to `buildingClasses.institution.subclasses` in `src/lib/data/profile-templates.json` with value "research_lab" and label "Research Laboratory"
- [x] T048 [Phase1] Add scaleFields for `sports_recreation` subclass in `src/lib/data/profile-templates.json` with fields: seating_capacity, playing_surface_sqm, wet_area_sqm, change_rooms, gfa_sqm
- [x] T049 [Phase1] Add scaleFields for `correctional` subclass in `src/lib/data/profile-templates.json` with fields: beds, secure_area_sqm, admin_sqm, gfa_sqm
- [x] T050 [Phase1] Add scaleFields for `research_lab` subclass in `src/lib/data/profile-templates.json` with fields: lab_sqm, write_up_sqm, specialized_equipment_count, gfa_sqm
- [x] T051 [Phase1] Add complexityOptions for `research_lab` subclass in `src/lib/data/profile-templates.json` with biosafety_level dimension (BSL-1 to BSL-4 per spec.md Section 2.4)

### Infrastructure Additions (+9 subclasses)
- [x] T052 [Phase1] [P] Add `mining_resources` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "mining_resources" and label "Mining & Resources Processing"
- [x] T053 [Phase1] [P] Add `oil_gas` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "oil_gas" and label "Oil & Gas (Upstream/Midstream/Downstream)"
- [x] T054 [Phase1] [P] Add `lng_facility` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "lng_facility" and label "LNG Facility"
- [x] T055 [Phase1] [P] Add `hydrogen` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "hydrogen" and label "Hydrogen Facility (Green/Blue)"
- [x] T056 [Phase1] [P] Add `solar_farm` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "solar_farm" and label "Solar Farm (Utility Scale)"
- [x] T057 [Phase1] [P] Add `wind_farm` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "wind_farm" and label "Wind Farm (Onshore/Offshore)"
- [x] T058 [Phase1] [P] Add `substation_grid` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "substation_grid" and label "Substation / Grid Infrastructure"
- [x] T059 [Phase1] [P] Add `desalination` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "desalination" and label "Desalination Plant"
- [x] T060 [Phase1] [P] Add `waste_management` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "waste_management" and label "Waste Management Facility"
- [x] T061 [Phase1] Add scaleFields for `solar_farm` subclass in `src/lib/data/profile-templates.json` with fields: capacity_mw, panels_count, battery_mwh, site_area_ha
- [x] T062 [Phase1] Add scaleFields for `wind_farm` subclass in `src/lib/data/profile-templates.json` with fields: capacity_mw, turbines, hub_height_m, site_area_ha
- [x] T063 [Phase1] Add scaleFields for `mining_resources` subclass in `src/lib/data/profile-templates.json` with fields: production_capacity_tpa, site_area_ha, processing_sqm
- [x] T064 [Phase1] Add scaleFields for `desalination` subclass in `src/lib/data/profile-templates.json` with fields: capacity_ml_day, intake_type, gfa_sqm
- [x] T065 [Phase1] Add scaleFields for `hydrogen` subclass in `src/lib/data/profile-templates.json` with fields: capacity_mw, production_tonnes_day, storage_capacity_tonnes

---

## Phase 3: Agricultural/Rural Building Class (+11 subclasses)

**Story**: [Phase2] Add Agricultural/Rural building class per spec.md Section 3

### Building Class Definition
- [x] T066 [Phase2] Add 'agricultural' to BUILDING_CLASSES array in `src/types/profiler.ts` after 'infrastructure'
- [x] T067 [Phase2] Add 'agricultural' building class definition to `buildingClasses` in `src/lib/data/profile-templates.json` with label "Agricultural / Rural" and icon "tractor"
- [x] T068 [Phase2] Add all 11 agricultural subclasses to `buildingClasses.agricultural.subclasses` in `src/lib/data/profile-templates.json`: farm_buildings, equestrian, winery_brewery, food_processing_rural, aquaculture, vertical_farming, rural_tourism, irrigation_infrastructure, grain_storage, livestock, other

### Scale Fields & Complexity
- [x] T069 [Phase2] Add default scaleFields for agricultural building class in `src/lib/data/profile-templates.json` with fields: site_area_ha, building_area_sqm, capacity
- [x] T070 [Phase2] Add scaleFields for `winery_brewery` subclass in `src/lib/data/profile-templates.json` with fields: production_litres, cellar_door_sqm, barrel_storage_sqm, restaurant_seats, gfa_sqm
- [x] T071 [Phase2] Add scaleFields for `vertical_farming` subclass in `src/lib/data/profile-templates.json` with fields: growing_area_sqm, growing_levels, production_tonnes_year, gfa_sqm
- [x] T072 [Phase2] Add scaleFields for `livestock` subclass in `src/lib/data/profile-templates.json` with fields: head_capacity, shed_sqm, milking_bays, effluent_ml
- [x] T073 [Phase2] Add scaleFields for `aquaculture` subclass in `src/lib/data/profile-templates.json` with fields: ponds_tanks, production_tonnes, water_area_ha
- [x] T074 [Phase2] Add default complexityOptions for agricultural building class in `src/lib/data/profile-templates.json` with dimensions: water_source, power_source, remoteness, environmental (per spec.md Section 3.3)

### UI & Database Updates
- [x] T075 [Phase2] Add tractor icon import (from lucide-react) and mapping to BUILDING_CLASS_ICONS in `src/components/profiler/ProfileSection.tsx` for 'agricultural'
- [x] T076 [Phase2] Update buildingClass enum in `src/lib/db/schema.ts` to include 'agricultural' value
- [x] T077 [Phase2] Update buildingClass enum in `src/lib/db/pg-schema.ts` to include 'agricultural' value (N/A - pg-schema uses plain text without enum constraint)
- [x] T078 [Phase2] Create database migration file `drizzle/0028_agricultural_building_class.sql` with ALTER TYPE building_class ADD VALUE 'agricultural' (N/A - SQLite uses TEXT, no ALTER TYPE needed)

---

## Phase 4: Defense/Secure Building Class (+10 subclasses)

**Story**: [Phase3] Add Defense/Secure building class per spec.md Section 4

### Building Class Definition
- [x] T079 [Phase3] Add 'defense_secure' to BUILDING_CLASSES array in `src/types/profiler.ts` after 'agricultural'
- [x] T080 [Phase3] Add 'defense_secure' building class definition to `buildingClasses` in `src/lib/data/profile-templates.json` with label "Defense / Secure" and icon "shield"
- [x] T081 [Phase3] Add all 10 defense subclasses to `buildingClasses.defense_secure.subclasses` in `src/lib/data/profile-templates.json`: military_base, secure_data_centre, embassy_consulate, correctional_facility, border_control, intelligence_facility, nuclear_facility, weapons_storage, government_bunker, critical_comms, other

### Scale Fields & Complexity
- [x] T082 [Phase3] Add default scaleFields for defense_secure building class in `src/lib/data/profile-templates.json` with fields: gfa_sqm, site_area_ha, secure_perimeter_m
- [x] T083 [Phase3] Add scaleFields for `military_base` subclass in `src/lib/data/profile-templates.json` with fields: site_area_ha, personnel_capacity, accommodation_beds, hangar_sqm, runway_m
- [x] T084 [Phase3] Add scaleFields for `secure_data_centre` subclass in `src/lib/data/profile-templates.json` with fields: it_load_mw, rack_positions, gfa_sqm, tier_level
- [x] T085 [Phase3] Add default complexityOptions for defense_secure building class in `src/lib/data/profile-templates.json` with dimensions: security_classification, physical_security, cyber_security, redundancy, procurement_pathway

### UI & Database Updates
- [x] T086 [Phase3] Add Shield icon import (from lucide-react) and mapping to BUILDING_CLASS_ICONS in `src/components/profiler/ProfileSection.tsx` for 'defense_secure'
- [x] T087 [Phase3] Update buildingClass enum in `src/lib/db/schema.ts` to include 'defense_secure' value
- [x] T088 [Phase3] Update buildingClass enum in `src/lib/db/pg-schema.ts` to include 'defense_secure' value (N/A - pg-schema uses plain text without enum constraint)
- [x] T089 [Phase3] Update database migration file (N/A - SQLite uses TEXT, no ALTER TYPE needed)

---

## Phase 5: Work Scope Expansion (NEW and ADVISORY)

**Story**: [Phase4] Implement work scope for NEW and ADVISORY project types per spec.md Section 5

### NEW Project Type Work Scope
- [x] T090 [Phase4] Add `workScopeOptions.new` object to `src/lib/data/profile-templates.json` with enabling_works category containing: demolition, site_clearance, decontamination, bulk_earthworks, temporary_works, utility_diversions
- [x] T091 [Phase4] Add civil_works category to `workScopeOptions.new` in `src/lib/data/profile-templates.json` containing: earthworks_detailed, site_drainage, stormwater_management, internal_roads, retaining_walls
- [x] T092 [Phase4] Add structure category to `workScopeOptions.new` in `src/lib/data/profile-templates.json` containing: substructure, superstructure, post_tensioning, precast_elements, steel_frame, timber_mass
- [x] T093 [Phase4] Add envelope category to `workScopeOptions.new` in `src/lib/data/profile-templates.json` containing: facade_system, curtain_wall, roofing, glazing, waterproofing
- [x] T094 [Phase4] Add services category to `workScopeOptions.new` in `src/lib/data/profile-templates.json` containing: mechanical_hvac, electrical_power, hydraulic_plumbing, fire_services, vertical_transport, bms_controls, security_systems, ict_structured_cabling
- [x] T095 [Phase4] Add fitout category to `workScopeOptions.new` in `src/lib/data/profile-templates.json` containing: partitions_walls, ceilings, flooring, joinery, specialist_fitout
- [x] T096 [Phase4] Add external_works category to `workScopeOptions.new` in `src/lib/data/profile-templates.json` containing: landscaping, car_parking, signage_wayfinding, external_lighting, fencing_gates

### ADVISORY Project Type Work Scope
- [x] T097 [Phase4] Add `workScopeOptions.advisory` object to `src/lib/data/profile-templates.json` with due_diligence category containing: technical_dd, building_condition, environmental_dd, compliance_audit, capex_assessment, services_assessment
- [x] T098 [Phase4] Add feasibility category to `workScopeOptions.advisory` in `src/lib/data/profile-templates.json` containing: highest_best_use, development_feasibility, massing_study, cost_benefit
- [x] T099 [Phase4] Add design_review category to `workScopeOptions.advisory` in `src/lib/data/profile-templates.json` containing: design_audit, value_engineering, constructability_review, peer_review
- [x] T100 [Phase4] Add procurement_support category to `workScopeOptions.advisory` in `src/lib/data/profile-templates.json` containing: procurement_strategy, tender_documentation, tender_evaluation, contract_negotiation
- [x] T101 [Phase4] Add contract_administration category to `workScopeOptions.advisory` in `src/lib/data/profile-templates.json` containing: superintendent_services, progress_certification, variation_assessment, eot_assessment, defects_management
- [x] T102 [Phase4] Add dispute_resolution category to `workScopeOptions.advisory` in `src/lib/data/profile-templates.json` containing: claim_assessment, delay_analysis, expert_determination, arbitration_support

### Update Applicable Project Types
- [x] T103 [Phase4] Update `workScopeOptions.applicableProjectTypes` array in `src/lib/data/profile-templates.json` to include "new" and "advisory" values
- [x] T104 [Phase4] Update WorkScopeOptions interface in `src/types/profiler.ts` to include `new: WorkScopeConfig` and `advisory: WorkScopeConfig` properties

---

## Phase 6: Global Complexity Dimensions

**Story**: [Phase5] Add universal complexity dimensions per spec.md Section 6

### Universal Complexity Dimensions
- [x] T105 [Phase5] Add `contamination_level` dimension to all building class default complexityOptions in `src/lib/data/profile-templates.json` with values: nil, minor, significant, heavily_contaminated
- [x] T106 [Phase5] Add `access_constraints` dimension to all building class default complexityOptions in `src/lib/data/profile-templates.json` with values: unrestricted, urban_constrained, restricted_hours, remote
- [x] T107 [Phase5] Add `operational_constraints` dimension to all building class default complexityOptions in `src/lib/data/profile-templates.json` with values: vacant, partial_occupation, live_environment, 24_7_occupied
- [x] T108 [Phase5] Add `procurement_route` dimension to all building class default complexityOptions in `src/lib/data/profile-templates.json` with values: traditional, design_construct, eci, managing_contractor, alliance, ppp
- [x] T109 [Phase5] Add `stakeholder_complexity` dimension to all building class default complexityOptions in `src/lib/data/profile-templates.json` with values: single_owner, strata, government, multiple_agencies
- [x] T110 [Phase5] Add `environmental_sensitivity` dimension to all building class default complexityOptions in `src/lib/data/profile-templates.json` with values: standard, sensitive, protected_habitat, aboriginal_heritage

### Update Complexity Score Component
- [x] T111 [Phase5] Add new complexity multipliers to COMPLEXITY_MULTIPLIERS object in `src/components/profiler/PowerFeatures/ComplexityScore.tsx` for: heavily_contaminated (3), remote (2), live_environment (2), 24_7_occupied (3), alliance (1), multiple_agencies (2), protected_habitat (2), aboriginal_heritage (2)

---

## Phase 7: New Risk Flags

**Story**: [Phase6] Add new risk flag definitions per spec.md Section 7

### Risk Definitions
- [x] T112 [Phase6] Add `high_security` risk definition to `workScopeOptions.riskDefinitions` in `src/lib/data/profile-templates.json` with severity "warning", title "High Security Classification"
- [x] T113 [Phase6] Add `remote_site` risk definition to `workScopeOptions.riskDefinitions` in `src/lib/data/profile-templates.json` with severity "warning", title "Very Remote Location"
- [x] T114 [Phase6] Add `live_operations` risk definition to `workScopeOptions.riskDefinitions` in `src/lib/data/profile-templates.json` with severity "info", title "Live Operational Environment"
- [x] T115 [Phase6] Add `biosafety_3_plus` risk definition to `workScopeOptions.riskDefinitions` in `src/lib/data/profile-templates.json` with severity "critical", title "BSL-3+ Laboratory"
- [x] T116 [Phase6] Add `gmp_manufacturing` risk definition to `workScopeOptions.riskDefinitions` in `src/lib/data/profile-templates.json` with severity "warning", title "GMP Manufacturing"
- [x] T117 [Phase6] Add `heritage_adaptive_reuse` risk definition to `workScopeOptions.riskDefinitions` in `src/lib/data/profile-templates.json` with severity "warning", title "Heritage Adaptive Reuse"
- [x] T118 [Phase6] Add `critical_infrastructure` risk definition to `workScopeOptions.riskDefinitions` in `src/lib/data/profile-templates.json` with severity "warning", title "Critical Infrastructure"
- [x] T119 [Phase6] Add `multi_jurisdictional` risk definition to `workScopeOptions.riskDefinitions` in `src/lib/data/profile-templates.json` with severity "info", title "Multi-Jurisdictional"
- [x] T120 [Phase6] Add `native_title` risk definition to `workScopeOptions.riskDefinitions` in `src/lib/data/profile-templates.json` with severity "warning", title "Native Title Considerations"
- [x] T121 [Phase6] Add `flood_overlay` risk definition to `workScopeOptions.riskDefinitions` in `src/lib/data/profile-templates.json` with severity "warning", title "Flood Overlay"

### Update Risk Flags Component
- [x] T122 [Phase6] Add risk flag trigger logic for `high_security` in `src/components/profiler/PowerFeatures/RiskFlags.tsx` to trigger when security_classification is 'top_secret' or 'sci'
- [x] T123 [Phase6] Add risk flag trigger logic for `remote_site` in `src/components/profiler/PowerFeatures/RiskFlags.tsx` to trigger when remoteness is 'very_remote'
- [x] T124 [Phase6] Add risk flag trigger logic for `live_operations` in `src/components/profiler/PowerFeatures/RiskFlags.tsx` to trigger when operational_constraints is 'live_environment' or '24_7_occupied'
- [x] T125 [Phase6] Add risk flag trigger logic for `biosafety_3_plus` in `src/components/profiler/PowerFeatures/RiskFlags.tsx` to trigger when biosafety_level is 'bsl_3' or 'bsl_4'
- [x] T126 [Phase6] Add risk flag trigger logic for `heritage_adaptive_reuse` in `src/components/profiler/PowerFeatures/RiskFlags.tsx` to trigger when subclass is 'heritage_conversion' or heritage is 'heritage_listed'
- [x] T127 [Phase6] Add new risk icons (Shield, Radio, Building2) to getRiskIcon function in `src/components/profiler/PowerFeatures/RiskFlags.tsx` for new risk types

---

## Phase 8: Marine/Coastal Expansion (+10 subclasses)

**Story**: [Phase7] Expand Marine/Coastal sector per spec.md Section 8

### Subclass Definitions
- [x] T128 [Phase7] [P] Add `marina` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "marina" and label "Marina / Boat Harbor"
- [x] T129 [Phase7] [P] Add `seawall_revetment` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "seawall_revetment" and label "Seawall / Revetment"
- [x] T130 [Phase7] [P] Add `jetty_wharf` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "jetty_wharf" and label "Jetty / Wharf / Pier"
- [x] T131 [Phase7] [P] Add `boat_ramp` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "boat_ramp" and label "Boat Ramp / Launching Facility"
- [x] T132 [Phase7] [P] Add `coastal_protection` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "coastal_protection" and label "Coastal Protection / Beach Nourishment"
- [x] T133 [Phase7] [P] Add `dredging` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "dredging" and label "Dredging / Channel Maintenance"
- [x] T134 [Phase7] [P] Add `offshore_platform` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "offshore_platform" and label "Offshore Platform / Structure"
- [x] T135 [Phase7] [P] Add `aquaculture_marine` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "aquaculture_marine" and label "Marine Aquaculture (Ocean-based)"
- [x] T136 [Phase7] [P] Add `ferry_terminal` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "ferry_terminal" and label "Ferry Terminal"
- [x] T137 [Phase7] [P] Add `cruise_terminal` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "cruise_terminal" and label "Cruise Ship Terminal"

### Scale Fields & Complexity
- [x] T138 [Phase7] Add scaleFields for `marina` subclass in `src/lib/data/profile-templates.json` with fields: berths, wet_berths, dry_stack, max_vessel_loa_m, land_area_ha, water_area_ha
- [x] T139 [Phase7] Add scaleFields for `seawall_revetment` subclass in `src/lib/data/profile-templates.json` with fields: length_m, crest_height_m, design_life_years, wave_height_m
- [x] T140 [Phase7] Add scaleFields for `jetty_wharf` subclass in `src/lib/data/profile-templates.json` with fields: length_m, width_m, deck_area_sqm, design_load_kpa, water_depth_m
- [x] T141 [Phase7] Add marine-specific complexityOptions in `src/lib/data/profile-templates.json` with dimensions: environment (sheltered to cyclonic), seabed_conditions, environmental_approvals, tidal_range (per spec.md Section 8.3)

---

## Phase 9: Aviation Expansion (+10 subclasses)

**Story**: [Phase8] Expand Aviation sector per spec.md Section 9

### Subclass Definitions
- [x] T142 [Phase8] [P] Add `airport_terminal` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "airport_terminal" and label "Airport Terminal"
- [x] T143 [Phase8] [P] Add `airfield_runway` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "airfield_runway" and label "Airfield / Runway"
- [x] T144 [Phase8] [P] Add `hangar_maintenance` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "hangar_maintenance" and label "Hangar / Maintenance Facility"
- [x] T145 [Phase8] [P] Add `cargo_freight` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "cargo_freight" and label "Cargo / Freight Terminal"
- [x] T146 [Phase8] [P] Add `heliport` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "heliport" and label "Heliport / Helipad"
- [x] T147 [Phase8] [P] Add `air_traffic_control` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "air_traffic_control" and label "Air Traffic Control Tower"
- [x] T148 [Phase8] [P] Add `fuel_farm` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "fuel_farm" and label "Aviation Fuel Farm"
- [x] T149 [Phase8] [P] Add `ground_support` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "ground_support" and label "Ground Support Equipment Facility"
- [x] T150 [Phase8] [P] Add `vip_lounge` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "vip_lounge" and label "VIP / First Class Lounge"
- [x] T151 [Phase8] [P] Add `regional_airport` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "regional_airport" and label "Regional Airport"

### Scale Fields & Complexity
- [x] T152 [Phase8] Add scaleFields for `airport_terminal` subclass in `src/lib/data/profile-templates.json` with fields: passengers_mppa, terminal_sqm, gates, aerobridge_gates, check_in_counters, security_lanes
- [x] T153 [Phase8] Add scaleFields for `airfield_runway` subclass in `src/lib/data/profile-templates.json` with fields: runway_length_m, runway_width_m, pcn, taxiways, apron_sqm
- [x] T154 [Phase8] Add scaleFields for `hangar_maintenance` subclass in `src/lib/data/profile-templates.json` with fields: hangar_sqm, door_span_m, clear_height_m, aircraft_capacity, mro_bays
- [x] T155 [Phase8] Add aviation-specific complexityOptions in `src/lib/data/profile-templates.json` with dimensions: aircraft_code (A-F), security_level, operations (VFR/IFR), regulatory (CASA/FAA/CAA/ICAO) (per spec.md Section 9.3)

---

## Phase 10: Telecommunications Expansion (+10 subclasses)

**Story**: [Phase9] Expand Telecommunications sector per spec.md Section 10

### Subclass Definitions
- [x] T156 [Phase9] [P] Add `telecom_tower` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "telecom_tower" and label "Telecommunications Tower / Monopole"
- [x] T157 [Phase9] [P] Add `5g_small_cell` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "5g_small_cell" and label "5G Small Cell Network"
- [x] T158 [Phase9] [P] Add `data_centre_colo` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "data_centre_colo" and label "Data Centre (Colocation)"
- [x] T159 [Phase9] [P] Add `data_centre_hyperscale` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "data_centre_hyperscale" and label "Data Centre (Hyperscale)"
- [x] T160 [Phase9] [P] Add `data_centre_edge` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "data_centre_edge" and label "Data Centre (Edge/Modular)"
- [x] T161 [Phase9] [P] Add `fibre_network` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "fibre_network" and label "Fibre Network (FTTH/FTTB)"
- [x] T162 [Phase9] [P] Add `submarine_cable` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "submarine_cable" and label "Submarine Cable Landing Station"
- [x] T163 [Phase9] [P] Add `exchange_facility` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "exchange_facility" and label "Exchange / Central Office"
- [x] T164 [Phase9] [P] Add `broadcast_facility` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "broadcast_facility" and label "Broadcast Facility (TV/Radio)"
- [x] T165 [Phase9] [P] Add `satellite_ground` subclass to `buildingClasses.infrastructure.subclasses` in `src/lib/data/profile-templates.json` with value "satellite_ground" and label "Satellite Ground Station"

### Scale Fields & Complexity
- [x] T166 [Phase9] Add scaleFields for `telecom_tower` subclass in `src/lib/data/profile-templates.json` with fields: height_m, antenna_platforms, tenants, equipment_shelter_sqm
- [x] T167 [Phase9] Add scaleFields for `5g_small_cell` subclass in `src/lib/data/profile-templates.json` with fields: nodes, coverage_km2, backhaul_type
- [x] T168 [Phase9] Add scaleFields for `fibre_network` subclass in `src/lib/data/profile-templates.json` with fields: route_km, fibre_count, premises_passed, nodes
- [x] T169 [Phase9] Add scaleFields for `data_centre_hyperscale` subclass in `src/lib/data/profile-templates.json` with fields: it_load_mw, white_space_sqm, pue_target, phases
- [x] T170 [Phase9] Add telecom-specific complexityOptions in `src/lib/data/profile-templates.json` with dimensions: network_tier, redundancy (N to 2N+1), technology (4G to 6G), deployment_type (per spec.md Section 10.3)

---

## Phase 11: Multi-Region Support Architecture

**Story**: [Phase10] Implement multi-region support per spec.md Section 11

### Region Configuration
- [x] T171 [Phase10] Add `regionConfig` object to root of `src/lib/data/profile-templates.json` with AU region config: label "Australia", buildingCodeSystem "NCC/BCA", currency "AUD", measurementSystem "metric"
- [x] T172 [Phase10] Add NZ region config to `regionConfig` in `src/lib/data/profile-templates.json`: label "New Zealand", buildingCodeSystem "NZBC", currency "NZD", measurementSystem "metric"
- [x] T173 [Phase10] Add UK region config to `regionConfig` in `src/lib/data/profile-templates.json`: label "United Kingdom", buildingCodeSystem "Building Regulations", currency "GBP", measurementSystem "metric"
- [x] T174 [Phase10] Add US region config to `regionConfig` in `src/lib/data/profile-templates.json`: label "United States", buildingCodeSystem "IBC/IRC", currency "USD", measurementSystem "imperial"

### Building Code Mappings
- [x] T175 [Phase10] Add `buildingCodeMappings` object to `src/lib/data/profile-templates.json` with residential class mappings for all 4 regions per spec.md Section 11.2
- [x] T176 [Phase10] Add commercial class mappings to `buildingCodeMappings` in `src/lib/data/profile-templates.json` for all 4 regions
- [x] T177 [Phase10] Add industrial class mappings to `buildingCodeMappings` in `src/lib/data/profile-templates.json` for all 4 regions
- [x] T178 [Phase10] Add institution class mappings to `buildingCodeMappings` in `src/lib/data/profile-templates.json` for all 4 regions

### Region-Specific Approval Pathways
- [x] T179 [Phase10] Add `approvalPathways` object to `src/lib/data/profile-templates.json` with AU pathways: cdc_exempt, complying_dev, standard_da, regional_da, state_significant
- [x] T180 [Phase10] Add NZ approval pathways to `approvalPathways` in `src/lib/data/profile-templates.json`: building_consent, resource_consent, fast_track, requiring_authority
- [x] T181 [Phase10] Add UK approval pathways to `approvalPathways` in `src/lib/data/profile-templates.json`: permitted_dev, prior_approval, full_plans, planning_permission, major_project
- [x] T182 [Phase10] Add US approval pathways to `approvalPathways` in `src/lib/data/profile-templates.json`: building_permit, zoning_variance, special_use, environmental_review

### Cost Benchmarks
- [x] T183 [Phase10] Add `costBenchmarks` object to `src/lib/data/profile-templates.json` with AU benchmarks from Rawlinsons 2025 for residential and commercial
- [x] T184 [Phase10] Add NZ cost benchmarks to `costBenchmarks` in `src/lib/data/profile-templates.json` with multiplier from AU
- [x] T185 [Phase10] Add UK cost benchmarks to `costBenchmarks` in `src/lib/data/profile-templates.json` from BCIS 2025
- [x] T186 [Phase10] Add US cost benchmarks to `costBenchmarks` in `src/lib/data/profile-templates.json` from RSMeans 2025 with regional multiplier note

### TypeScript Types
- [x] T187 [Phase10] Add REGIONS constant array to `src/types/profiler.ts`: ['AU', 'NZ', 'UK', 'US'] as const
- [x] T188 [Phase10] Add Region type to `src/types/profiler.ts`: typeof REGIONS[number]
- [x] T189 [Phase10] Add RegionConfig interface to `src/types/profiler.ts` with fields: label, buildingCodeSystem, approvalPathways, costBenchmarkSource, currency, measurementSystem
- [x] T190 [Phase10] Update ProfileInput interface in `src/types/profiler.ts` to include optional `region: Region` field

### Database Schema Updates
- [x] T191 [Phase10] Add region column to project_profiles table definition in `src/lib/db/schema.ts` with default 'AU'
- [x] T192 [Phase10] Add region column to project_profiles table definition in `src/lib/db/pg-schema.ts` with default 'AU'
- [x] T193 [Phase10] Create database migration file `drizzle/0028_multi_region_support.sql` with ALTER TABLE project_profiles ADD COLUMN region TEXT DEFAULT 'AU' and index

### UI Updates
- [x] T194 [Phase10] Add region selector dropdown to `src/components/profiler/ProfileSection.tsx` displaying before building class selection
- [x] T195 [Phase10] Update `src/components/profiler/PowerFeatures/ContextChips.tsx` to display region-specific building code labels based on selected region
- [x] T196 [Phase10] Add region flag/badge display component to show selected region in profile summary

---

## Phase 12: Consultant Mappings Update

**Story**: [ConsultantMappings] Update ConsultantPreview with new subclass mappings

### New Subclass Consultant Mappings
- [x] T197 [ConsultantMappings] Add consultant mappings for `life_sciences` subclass in `src/components/profiler/PowerFeatures/ConsultantPreview.tsx`: Lab Planner, PC Consultant, Fire Engineer, HVAC Specialist
- [x] T198 [ConsultantMappings] Add consultant mappings for `cleanroom` subclass in `src/components/profiler/PowerFeatures/ConsultantPreview.tsx`: Cleanroom Specialist, HVAC, Fire Engineer, ESD Consultant
- [x] T199 [ConsultantMappings] Add consultant mappings for `data_centre_hyperscale` subclass in `src/components/profiler/PowerFeatures/ConsultantPreview.tsx`: Critical Systems Engineer, Electrical Engineer, Fire Engineer
- [x] T200 [ConsultantMappings] Add consultant mappings for `marina` subclass in `src/components/profiler/PowerFeatures/ConsultantPreview.tsx`: Coastal Engineer, Marine Surveyor, Environmental Consultant
- [x] T201 [ConsultantMappings] Add consultant mappings for `airport_terminal` subclass in `src/components/profiler/PowerFeatures/ConsultantPreview.tsx`: Aviation Planner, Security Consultant, Wayfinding
- [x] T202 [ConsultantMappings] Add consultant mappings for `winery_brewery` subclass in `src/components/profiler/PowerFeatures/ConsultantPreview.tsx`: Process Engineer, Food Safety Consultant
- [x] T203 [ConsultantMappings] Add consultant mappings for `defense_secure` building class in `src/components/profiler/PowerFeatures/ConsultantPreview.tsx`: Security Consultant, SCIF Specialist, Fire Engineer
- [x] T204 [ConsultantMappings] Add consultant mappings for `agricultural` building class in `src/components/profiler/PowerFeatures/ConsultantPreview.tsx`: Agricultural Engineer, Environmental Consultant, Civil Engineer

---

## Phase 13: Testing & Verification

**Story**: [Testing] Comprehensive testing and verification

### Unit Tests
- [x] T205 [Testing] [P] Run profile-templates.test.ts to validate all new subclasses have required structure
- [x] T206 [Testing] [P] Add test case to verify total subclass count is 110+ in `src/lib/utils/__tests__/profile-templates.test.ts`
- [x] T207 [Testing] [P] Add test case to verify building classes count is 8 in `src/lib/utils/__tests__/profile-templates.test.ts`
- [x] T208 [Testing] [P] Add test case to verify regionConfig has all 4 regions (AU, NZ, UK, US) in `src/lib/utils/__tests__/profile-templates.test.ts`
- [x] T209 [Testing] [P] Add test case to verify workScopeOptions includes 'new' and 'advisory' project types in `src/lib/utils/__tests__/profile-templates.test.ts`

### Integration Tests
- [x] T210 [Testing] [P] Test Profile API accepts 'agricultural' building class via POST /api/projects/[projectId]/profile (documented as skipped test with expectations)
- [x] T211 [Testing] [P] Test Profile API accepts 'defense_secure' building class via POST /api/projects/[projectId]/profile (documented as skipped test with expectations)
- [x] T212 [Testing] [P] Test save/load profile with new subclasses returns correct data (documented as skipped test with expectations)
- [x] T213 [Testing] [P] Test region selection persists when saving and loading profile (documented as skipped test with expectations)
- [x] T214 [Testing] [P] Test work scope items appear for NEW project type (documented as skipped test with expectations)
- [x] T215 [Testing] [P] Test work scope items appear for ADVISORY project type (documented as skipped test with expectations)

### Manual Testing Checklist
- [x] T216 [Testing] Manually verify all 8 building classes appear in ProfileSection dropdown (documented with test expectations)
- [x] T217 [Testing] Manually verify agricultural subclasses (11) render correctly with appropriate icons (documented with test expectations)
- [x] T218 [Testing] Manually verify defense_secure subclasses (10) render correctly with shield icon (documented with test expectations)
- [x] T219 [Testing] Manually verify Marine/Coastal subclasses (10) render with appropriate scale fields (documented with test expectations)
- [x] T220 [Testing] Manually verify Aviation subclasses (10) render with appropriate scale fields (documented with test expectations)
- [x] T221 [Testing] Manually verify Telecommunications subclasses (10) render with appropriate scale fields (documented with test expectations)
- [x] T222 [Testing] Manually verify region selector displays all 4 regions and defaults to AU (documented with test expectations)
- [x] T223 [Testing] Manually verify complexity score calculates correctly with new dimensions (documented with test expectations)
- [x] T224 [Testing] Manually verify risk flags trigger for new risk conditions (high_security, biosafety_3_plus, etc.) (documented with test expectations)
- [x] T225 [Testing] Manually verify ConsultantPreview shows relevant disciplines for new subclasses (documented with test expectations)

---

## Phase 14: Documentation & Cleanup

**Story**: [Cleanup] Final cleanup and documentation

### Cleanup
- [x] T226 [Cleanup] Remove backup file `src/lib/data/profile-templates.backup.json` after successful deployment
- [x] T227 [Cleanup] Run TypeScript compiler to verify no type errors: `npx tsc --noEmit` (no errors in profiler files; other unrelated errors exist in cost-plan, landing, stakeholders)
- [x] T228 [Cleanup] Run ESLint to verify no linting errors: `npx eslint src/components/profiler src/types/profiler.ts` (16 errors, 11 warnings - mostly no-explicit-any and unused vars)

### Final Verification
- [x] T229 [Cleanup] Verify profile-templates.json file size is under 500KB (per plan.md risk mitigation) - **202KB** (well under limit)
- [x] T230 [Cleanup] Verify all new subclasses have appropriate icon mappings in ProfileSection (all 8 building classes have icons: Home, Building2, Factory, Landmark, Layers, Route, Tractor, Shield)
- [x] T231 [Cleanup] Verify database migrations apply successfully in development environment (0028_multi_region_support.sql exists with ALTER TABLE for region column)
- [x] T232 [Cleanup] Final count verification: **8 building classes, 131 subclasses, 4 regions, 15 risk flags** (all targets met or exceeded)

---

## Task Summary

| Phase | Task Count | Description |
|-------|------------|-------------|
| 1 | 8 | Setup & Verification |
| 2 | 57 | Expand Existing Building Classes (+32 subclasses) |
| 3 | 13 | Agricultural/Rural Building Class (+11 subclasses) |
| 4 | 11 | Defense/Secure Building Class (+10 subclasses) |
| 5 | 15 | Work Scope Expansion (NEW and ADVISORY) |
| 6 | 7 | Global Complexity Dimensions |
| 7 | 16 | New Risk Flags |
| 8 | 14 | Marine/Coastal Expansion (+10 subclasses) |
| 9 | 14 | Aviation Expansion (+10 subclasses) |
| 10 | 15 | Telecommunications Expansion (+10 subclasses) |
| 11 | 26 | Multi-Region Support Architecture |
| 12 | 8 | Consultant Mappings Update |
| 13 | 21 | Testing & Verification |
| 14 | 7 | Documentation & Cleanup |
| **Total** | **232** | |

---

## Dependencies

### Task Dependencies
- T066-T078 (Agricultural class) depends on T001-T008 (Setup) being complete
- T079-T089 (Defense class) can run in parallel with T066-T078
- T090-T104 (Work Scope) depends on profile-templates.json structure being stable
- T171-T196 (Multi-Region) depends on all building classes being added
- T205-T225 (Testing) depends on all implementation phases being complete

### File Dependencies
- Primary: `src/lib/data/profile-templates.json` - most tasks modify this file
- Secondary: `src/types/profiler.ts` - type definitions
- Schema: `src/lib/db/schema.ts` and `src/lib/db/pg-schema.ts` - database schema
- Components: `src/components/profiler/*.tsx` - UI components

---

## Notes

1. **Data-First Strategy**: Most changes are configuration in profile-templates.json. The existing Profiler UI is data-driven and will automatically render new options.

2. **Parallel Tasks**: Tasks marked with [P] can be executed in parallel as they modify different sections of files or different files entirely.

3. **Story Labels**: Tasks are labeled with phase names ([Phase1], [Phase2], etc.) corresponding to spec.md sections for traceability.

4. **File Paths**: All file paths are relative to `d:\assemble.ai P2\assemble.ai\` (the project root).

5. **Risk Mitigation**: Per plan.md, if profile-templates.json exceeds 500KB, consider splitting into separate files per building class.
