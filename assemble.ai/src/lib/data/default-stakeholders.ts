/**
 * Default Stakeholder Data
 * Feature: 020-stakeholder
 *
 * Contains default stakeholder definitions used when generating stakeholders
 * based on project profile data.
 */

import type { StakeholderGroup, CreateStakeholderRequest } from '@/types/stakeholder';

// ============================================
// Client Stakeholder Defaults
// ============================================

export interface ClientStakeholderDef {
  name: string;
  role: string;
  description: string;
}

export const DEFAULT_CLIENT_STAKEHOLDERS: ClientStakeholderDef[] = [
  { name: 'Project Owner', role: 'Owner', description: 'Primary decision maker and funding source' },
  { name: 'Project Manager', role: 'Project Manager', description: 'Day-to-day project coordination' },
  { name: 'Superintendent', role: 'Superintendent', description: 'Contract administration' },
  { name: 'Quantity Surveyor', role: 'Quantity Surveyor', description: 'Cost management and reporting' },
];

// ============================================
// Authority Stakeholder Defaults by Jurisdiction
// ============================================

export interface AuthorityDef {
  name: string;
  role: string;
  submissionType: string;
  conditions: {
    required?: boolean;
    complexity?: string[];
    buildingClass?: string[];
    subclass?: string[];
  };
}

export const NSW_AUTHORITIES: AuthorityDef[] = [
  {
    name: 'Local Council',
    role: 'Council',
    submissionType: 'DA / CDC',
    conditions: { required: true },
  },
  {
    name: 'Fire & Rescue NSW',
    role: 'FRNSW',
    submissionType: 'Referral',
    conditions: { buildingClass: ['commercial', 'industrial', 'institution'] },
  },
  {
    name: 'Transport for NSW',
    role: 'TfNSW',
    submissionType: 'Traffic Impact Assessment',
    conditions: { complexity: ['traffic_impact'] },
  },
  {
    name: 'NSW EPA',
    role: 'EPA',
    submissionType: 'Environment Protection Licence',
    conditions: { buildingClass: ['industrial'] },
  },
  {
    name: 'Heritage NSW',
    role: 'Heritage NSW',
    submissionType: 'Heritage Impact Statement',
    conditions: { complexity: ['heritage_listed', 'heritage_conservation'] },
  },
  {
    name: 'Department of Planning',
    role: 'NSW Planning',
    submissionType: 'SSD Application',
    conditions: { complexity: ['state_significant'] },
  },
  {
    name: 'Building Certifier',
    role: 'Building Certifier',
    submissionType: 'CDC / CC',
    conditions: { required: true },
  },
];

export const VIC_AUTHORITIES: AuthorityDef[] = [
  {
    name: 'Local Council',
    role: 'Council',
    submissionType: 'Planning Permit',
    conditions: { required: true },
  },
  {
    name: 'CFA / FRV',
    role: 'Fire Authority',
    submissionType: 'Referral',
    conditions: { buildingClass: ['commercial', 'industrial', 'institution'] },
  },
  {
    name: 'VicRoads',
    role: 'VicRoads',
    submissionType: 'Traffic Impact Assessment',
    conditions: { complexity: ['traffic_impact'] },
  },
  {
    name: 'EPA Victoria',
    role: 'EPA',
    submissionType: 'Works Approval',
    conditions: { buildingClass: ['industrial'] },
  },
  {
    name: 'Heritage Victoria',
    role: 'Heritage Victoria',
    submissionType: 'Heritage Permit',
    conditions: { complexity: ['heritage_listed', 'heritage_conservation'] },
  },
  {
    name: 'Building Surveyor',
    role: 'Building Surveyor',
    submissionType: 'Building Permit',
    conditions: { required: true },
  },
];

export const QLD_AUTHORITIES: AuthorityDef[] = [
  {
    name: 'Local Council',
    role: 'Council',
    submissionType: 'Development Application',
    conditions: { required: true },
  },
  {
    name: 'QFES',
    role: 'Fire Authority',
    submissionType: 'Referral',
    conditions: { buildingClass: ['commercial', 'industrial', 'institution'] },
  },
  {
    name: 'TMR',
    role: 'TMR',
    submissionType: 'Traffic Impact Assessment',
    conditions: { complexity: ['traffic_impact'] },
  },
  {
    name: 'DES',
    role: 'DES',
    submissionType: 'Environmental Authority',
    conditions: { buildingClass: ['industrial'] },
  },
  {
    name: 'Building Certifier',
    role: 'Building Certifier',
    submissionType: 'Building Approval',
    conditions: { required: true },
  },
];

export const AUTHORITIES_BY_STATE: Record<string, AuthorityDef[]> = {
  NSW: NSW_AUTHORITIES,
  VIC: VIC_AUTHORITIES,
  QLD: QLD_AUTHORITIES,
  // Add more states as needed
};

// ============================================
// Consultant Disciplines by Building Class
// ============================================

export interface DisciplineDef {
  name: string;
  disciplineOrTrade: string;
  required: boolean;
  reason: string;
  conditions?: {
    buildingClass?: string[];
    projectType?: string[];
    subclass?: string[];
    complexity?: string[];
  };
}

// Core disciplines required for most projects
export const CORE_DISCIPLINES: DisciplineDef[] = [
  { name: 'Architecture', disciplineOrTrade: 'Architecture', required: true, reason: 'Core project discipline' },
  { name: 'Structural', disciplineOrTrade: 'Structural', required: true, reason: 'Core project discipline' },
  { name: 'Civil', disciplineOrTrade: 'Civil', required: true, reason: 'Core project discipline' },
  { name: 'Mechanical', disciplineOrTrade: 'Mechanical', required: true, reason: 'Core project discipline' },
  { name: 'Electrical', disciplineOrTrade: 'Electrical', required: true, reason: 'Core project discipline' },
  { name: 'Hydraulic', disciplineOrTrade: 'Hydraulic', required: true, reason: 'Core project discipline' },
];

// Class-specific disciplines
export const CLASS_DISCIPLINES: DisciplineDef[] = [
  // Residential
  { name: 'Landscape', disciplineOrTrade: 'Landscape', required: false, reason: 'Residential landscaping', conditions: { buildingClass: ['residential'] } },
  { name: 'Acoustic', disciplineOrTrade: 'Acoustic', required: false, reason: 'Residential amenity', conditions: { buildingClass: ['residential'] } },

  // Commercial
  { name: 'Facade', disciplineOrTrade: 'Facade', required: false, reason: 'Commercial facade design', conditions: { buildingClass: ['commercial', 'mixed'] } },
  { name: 'ESD', disciplineOrTrade: 'ESD', required: false, reason: 'Sustainability requirements', conditions: { buildingClass: ['commercial', 'industrial'] } },
  { name: 'Fire', disciplineOrTrade: 'Fire', required: false, reason: 'Complex fire engineering', conditions: { buildingClass: ['commercial', 'industrial', 'institution'] } },

  // Institutional
  { name: 'Security', disciplineOrTrade: 'Security', required: false, reason: 'Security requirements', conditions: { buildingClass: ['institution', 'commercial'] } },

  // Mixed Use
  { name: 'Traffic', disciplineOrTrade: 'Traffic', required: false, reason: 'Traffic impact assessment', conditions: { buildingClass: ['mixed'] } },

  // Infrastructure
  { name: 'Geotechnical', disciplineOrTrade: 'Geotechnical', required: false, reason: 'Ground conditions', conditions: { buildingClass: ['infrastructure'] } },
  { name: 'Environmental', disciplineOrTrade: 'Environmental', required: false, reason: 'Environmental assessment', conditions: { buildingClass: ['infrastructure', 'industrial'] } },
];

// Complexity-triggered disciplines
export const COMPLEXITY_DISCIPLINES: DisciplineDef[] = [
  { name: 'Heritage', disciplineOrTrade: 'Heritage', required: true, reason: 'Heritage requirements', conditions: { complexity: ['heritage_listed', 'heritage_conservation'] } },
  { name: 'Bushfire', disciplineOrTrade: 'Bushfire', required: true, reason: 'BAL compliance', conditions: { complexity: ['bushfire_prone'] } },
  { name: 'Flood', disciplineOrTrade: 'Flood', required: true, reason: 'Flood planning requirements', conditions: { complexity: ['flood_prone'] } },
  { name: 'Planning', disciplineOrTrade: 'Planning', required: true, reason: 'SSD pathway', conditions: { complexity: ['state_significant'] } },
  { name: 'Access', disciplineOrTrade: 'Access', required: false, reason: 'DDA compliance', conditions: { buildingClass: ['commercial', 'institution'] } },
];

// Subclass-specific disciplines
export const SUBCLASS_DISCIPLINES: DisciplineDef[] = [
  { name: 'Fire', disciplineOrTrade: 'Fire', required: true, reason: 'Class 9c compliance', conditions: { subclass: ['aged_care_9c'] } },
  { name: 'Access', disciplineOrTrade: 'Access', required: true, reason: 'Aged care accessibility', conditions: { subclass: ['aged_care_9c'] } },
  { name: 'Medical Planning', disciplineOrTrade: 'Medical Planning', required: true, reason: 'Healthcare planning', conditions: { subclass: ['healthcare_hospital'] } },
  { name: 'Data Centre', disciplineOrTrade: 'Data Centre', required: true, reason: 'IT infrastructure', conditions: { subclass: ['data_centre'] } },
  { name: 'BCA', disciplineOrTrade: 'BCA', required: false, reason: 'Complex BCA compliance', conditions: { buildingClass: ['commercial', 'institution', 'mixed'] } },
];

// ============================================
// Contractor Trades by Building Class
// ============================================

export interface TradeDef {
  name: string;
  disciplineOrTrade: string;
  conditions?: {
    buildingClass?: string[];
    projectType?: string[];
    subclass?: string[];
  };
}

export const CORE_TRADES: TradeDef[] = [
  { name: 'Main Contractor', disciplineOrTrade: 'General Contractor' },
];

export const CLASS_TRADES: Record<string, TradeDef[]> = {
  residential: [
    { name: 'Demolition Contractor', disciplineOrTrade: 'Demolition' },
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
    { name: 'Concrete Works', disciplineOrTrade: 'Concrete' },
    { name: 'Roofing', disciplineOrTrade: 'Roofing' },
    { name: 'Plumbing', disciplineOrTrade: 'Plumbing' },
    { name: 'Electrical', disciplineOrTrade: 'Electrical' },
    { name: 'Joinery', disciplineOrTrade: 'Joinery' },
    { name: 'Painting', disciplineOrTrade: 'Painting' },
    { name: 'Landscaping', disciplineOrTrade: 'Landscaping' },
  ],
  commercial: [
    { name: 'Demolition Contractor', disciplineOrTrade: 'Demolition' },
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
    { name: 'Concrete Works', disciplineOrTrade: 'Concrete' },
    { name: 'Facade Contractor', disciplineOrTrade: 'Facade' },
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
    { name: 'Electrical Services', disciplineOrTrade: 'Electrical' },
    { name: 'Hydraulic Services', disciplineOrTrade: 'Hydraulic' },
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
    { name: 'Lift Installation', disciplineOrTrade: 'Lifts' },
    { name: 'Joinery', disciplineOrTrade: 'Joinery' },
    { name: 'Flooring', disciplineOrTrade: 'Flooring' },
    { name: 'Ceilings', disciplineOrTrade: 'Ceilings' },
    { name: 'Painting', disciplineOrTrade: 'Painting' },
  ],
  industrial: [
    { name: 'Demolition Contractor', disciplineOrTrade: 'Demolition' },
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
    { name: 'Concrete Works', disciplineOrTrade: 'Concrete' },
    { name: 'Cladding', disciplineOrTrade: 'Cladding' },
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
    { name: 'Electrical Services', disciplineOrTrade: 'Electrical' },
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
    { name: 'Roller Doors', disciplineOrTrade: 'Roller Doors' },
  ],
  institution: [
    { name: 'Demolition Contractor', disciplineOrTrade: 'Demolition' },
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
    { name: 'Concrete Works', disciplineOrTrade: 'Concrete' },
    { name: 'Facade Contractor', disciplineOrTrade: 'Facade' },
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
    { name: 'Electrical Services', disciplineOrTrade: 'Electrical' },
    { name: 'Hydraulic Services', disciplineOrTrade: 'Hydraulic' },
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
    { name: 'Lift Installation', disciplineOrTrade: 'Lifts' },
    { name: 'Medical Gas', disciplineOrTrade: 'Medical Gas' },
    { name: 'Security Systems', disciplineOrTrade: 'Security' },
    { name: 'Flooring', disciplineOrTrade: 'Flooring' },
    { name: 'Ceilings', disciplineOrTrade: 'Ceilings' },
  ],
  mixed: [
    { name: 'Demolition Contractor', disciplineOrTrade: 'Demolition' },
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
    { name: 'Concrete Works', disciplineOrTrade: 'Concrete' },
    { name: 'Facade Contractor', disciplineOrTrade: 'Facade' },
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
    { name: 'Electrical Services', disciplineOrTrade: 'Electrical' },
    { name: 'Hydraulic Services', disciplineOrTrade: 'Hydraulic' },
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
    { name: 'Lift Installation', disciplineOrTrade: 'Lifts' },
    { name: 'Joinery', disciplineOrTrade: 'Joinery' },
    { name: 'Flooring', disciplineOrTrade: 'Flooring' },
    { name: 'Ceilings', disciplineOrTrade: 'Ceilings' },
    { name: 'Painting', disciplineOrTrade: 'Painting' },
  ],
  infrastructure: [
    { name: 'Earthworks', disciplineOrTrade: 'Earthworks' },
    { name: 'Civil Works', disciplineOrTrade: 'Civil' },
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
    { name: 'Concrete Works', disciplineOrTrade: 'Concrete' },
    { name: 'Electrical Services', disciplineOrTrade: 'Electrical' },
    { name: 'Drainage', disciplineOrTrade: 'Drainage' },
    { name: 'Road Works', disciplineOrTrade: 'Roads' },
    { name: 'Landscaping', disciplineOrTrade: 'Landscaping' },
  ],
};

// ============================================
// Work Scope to Contractor Trade Mappings
// ============================================

/**
 * Maps work scope item values to recommended contractor trades
 * Used for scoped project types: remediation, refurb, extend
 */
export const WORK_SCOPE_TRADES: Record<string, TradeDef[]> = {
  // ===========================================
  // REMEDIATION - Structural
  // ===========================================
  spalling_concrete: [
    { name: 'Concrete Repairs Contractor', disciplineOrTrade: 'Concrete Repairs' },
    { name: 'Scaffolding Contractor', disciplineOrTrade: 'Scaffolding' },
    { name: 'Protective Coatings', disciplineOrTrade: 'Protective Coatings' },
  ],
  crack_injection: [
    { name: 'Concrete Repairs Contractor', disciplineOrTrade: 'Concrete Repairs' },
    { name: 'Structural Repairs', disciplineOrTrade: 'Structural Repairs' },
  ],
  steel_protection: [
    { name: 'Protective Coatings', disciplineOrTrade: 'Protective Coatings' },
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
    { name: 'Scaffolding Contractor', disciplineOrTrade: 'Scaffolding' },
  ],
  carbon_fibre_strengthening: [
    { name: 'Structural Repairs', disciplineOrTrade: 'Structural Repairs' },
    { name: 'Concrete Repairs Contractor', disciplineOrTrade: 'Concrete Repairs' },
  ],
  pile_remediation: [
    { name: 'Piling Contractor', disciplineOrTrade: 'Piling' },
    { name: 'Underpinning Contractor', disciplineOrTrade: 'Underpinning' },
    { name: 'Excavation Contractor', disciplineOrTrade: 'Excavation' },
  ],
  post_tension_repair: [
    { name: 'Post-Tension Specialist', disciplineOrTrade: 'Post-Tension' },
    { name: 'Concrete Repairs Contractor', disciplineOrTrade: 'Concrete Repairs' },
  ],

  // ===========================================
  // REMEDIATION - Building Envelope
  // ===========================================
  facade_remediation: [
    { name: 'Facade Contractor', disciplineOrTrade: 'Facade' },
    { name: 'Scaffolding Contractor', disciplineOrTrade: 'Scaffolding' },
    { name: 'Waterproofing Contractor', disciplineOrTrade: 'Waterproofing' },
  ],
  roof_waterproofing: [
    { name: 'Waterproofing Contractor', disciplineOrTrade: 'Waterproofing' },
    { name: 'Roofing Contractor', disciplineOrTrade: 'Roofing' },
    { name: 'Scaffolding Contractor', disciplineOrTrade: 'Scaffolding' },
  ],
  podium_waterproofing: [
    { name: 'Waterproofing Contractor', disciplineOrTrade: 'Waterproofing' },
    { name: 'Concrete Repairs Contractor', disciplineOrTrade: 'Concrete Repairs' },
    { name: 'Tiling Contractor', disciplineOrTrade: 'Tiling' },
  ],
  balcony_remediation: [
    { name: 'Waterproofing Contractor', disciplineOrTrade: 'Waterproofing' },
    { name: 'Concrete Repairs Contractor', disciplineOrTrade: 'Concrete Repairs' },
    { name: 'Tiling Contractor', disciplineOrTrade: 'Tiling' },
    { name: 'Balustrade Contractor', disciplineOrTrade: 'Balustrades' },
  ],
  window_replacement: [
    { name: 'Glazing Contractor', disciplineOrTrade: 'Glazing' },
    { name: 'Facade Contractor', disciplineOrTrade: 'Facade' },
    { name: 'Scaffolding Contractor', disciplineOrTrade: 'Scaffolding' },
  ],
  cladding_replacement: [
    { name: 'Facade Contractor', disciplineOrTrade: 'Facade' },
    { name: 'Scaffolding Contractor', disciplineOrTrade: 'Scaffolding' },
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
  ],

  // ===========================================
  // REMEDIATION - Environmental
  // ===========================================
  soil_contamination: [
    { name: 'Remediation Contractor', disciplineOrTrade: 'Environmental Remediation' },
    { name: 'Earthworks Contractor', disciplineOrTrade: 'Earthworks' },
    { name: 'Waste Disposal', disciplineOrTrade: 'Waste Disposal' },
  ],
  groundwater_contamination: [
    { name: 'Remediation Contractor', disciplineOrTrade: 'Environmental Remediation' },
    { name: 'Dewatering Contractor', disciplineOrTrade: 'Dewatering' },
  ],
  pfas_remediation: [
    { name: 'PFAS Remediation Specialist', disciplineOrTrade: 'PFAS Remediation' },
    { name: 'Waste Disposal', disciplineOrTrade: 'Waste Disposal' },
  ],
  acid_sulfate_soils: [
    { name: 'Earthworks Contractor', disciplineOrTrade: 'Earthworks' },
    { name: 'Drainage Contractor', disciplineOrTrade: 'Drainage' },
  ],
  landfill_gas: [
    { name: 'Gas Management Systems', disciplineOrTrade: 'Gas Management' },
    { name: 'Ventilation Contractor', disciplineOrTrade: 'Ventilation' },
  ],
  ust_removal: [
    { name: 'Tank Removal Specialist', disciplineOrTrade: 'Tank Removal' },
    { name: 'Excavation Contractor', disciplineOrTrade: 'Excavation' },
    { name: 'Waste Disposal', disciplineOrTrade: 'Waste Disposal' },
  ],

  // ===========================================
  // REMEDIATION - Hazardous Materials
  // ===========================================
  asbestos_acm: [
    { name: 'Licensed Asbestos Removalist', disciplineOrTrade: 'Asbestos Removal' },
    { name: 'Demolition Contractor', disciplineOrTrade: 'Demolition' },
  ],
  lead_paint: [
    { name: 'Lead Paint Removal', disciplineOrTrade: 'Lead Paint Removal' },
    { name: 'Painting Contractor', disciplineOrTrade: 'Painting' },
  ],
  synthetic_mineral_fibre: [
    { name: 'Hazmat Removal Contractor', disciplineOrTrade: 'Hazmat Removal' },
  ],
  pcb_removal: [
    { name: 'Hazmat Removal Contractor', disciplineOrTrade: 'Hazmat Removal' },
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],
  silica_exposure: [
    { name: 'Dust Control Specialist', disciplineOrTrade: 'Dust Control' },
  ],

  // ===========================================
  // REFURB - Fire & Life Safety
  // ===========================================
  fire_pump_room: [
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
    { name: 'Hydraulic Contractor', disciplineOrTrade: 'Hydraulic' },
  ],
  hydrant_system: [
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
    { name: 'Hydraulic Contractor', disciplineOrTrade: 'Hydraulic' },
  ],
  fire_tank: [
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
  ],
  sprinkler_upgrade: [
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
  ],
  smoke_detection: [
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],
  emergency_warning: [
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
  ],
  exit_egress: [
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
    { name: 'Building Works', disciplineOrTrade: 'Building Works' },
  ],
  fire_doors_seals: [
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
    { name: 'Door Contractor', disciplineOrTrade: 'Doors' },
  ],
  passive_fire: [
    { name: 'Fire Services', disciplineOrTrade: 'Fire Services' },
  ],

  // ===========================================
  // REFURB - Mechanical Systems
  // ===========================================
  hvac_upgrade: [
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
  ],
  chiller_replacement: [
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
    { name: 'Crane Hire', disciplineOrTrade: 'Crane' },
  ],
  cooling_tower: [
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
  ],
  ahu_replacement: [
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
  ],
  vav_upgrade: [
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
  ],
  exhaust_ventilation: [
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
  ],
  carpark_ventilation: [
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
  ],
  refrigerant_changeover: [
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
  ],

  // ===========================================
  // REFURB - Electrical Systems
  // ===========================================
  switchboard_upgrade: [
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],
  metering_upgrade: [
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],
  backup_power: [
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],
  lighting_upgrade: [
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],
  emergency_lighting: [
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],
  ev_charging: [
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],
  solar_pv: [
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
    { name: 'Solar Contractor', disciplineOrTrade: 'Solar' },
  ],
  battery_storage: [
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],

  // ===========================================
  // REFURB - Hydraulic Systems
  // ===========================================
  plumbing_upgrade: [
    { name: 'Hydraulic Contractor', disciplineOrTrade: 'Hydraulic' },
    { name: 'Plumbing Contractor', disciplineOrTrade: 'Plumbing' },
  ],
  hot_water_system: [
    { name: 'Hydraulic Contractor', disciplineOrTrade: 'Hydraulic' },
    { name: 'Plumbing Contractor', disciplineOrTrade: 'Plumbing' },
  ],
  water_treatment: [
    { name: 'Hydraulic Contractor', disciplineOrTrade: 'Hydraulic' },
  ],
  stormwater_upgrade: [
    { name: 'Civil Contractor', disciplineOrTrade: 'Civil' },
    { name: 'Hydraulic Contractor', disciplineOrTrade: 'Hydraulic' },
  ],
  sewer_upgrade: [
    { name: 'Hydraulic Contractor', disciplineOrTrade: 'Hydraulic' },
  ],
  rainwater_harvesting: [
    { name: 'Hydraulic Contractor', disciplineOrTrade: 'Hydraulic' },
  ],
  greywater_recycling: [
    { name: 'Hydraulic Contractor', disciplineOrTrade: 'Hydraulic' },
  ],

  // ===========================================
  // REFURB - Vertical Transport
  // ===========================================
  lift_modernisation: [
    { name: 'Lift Contractor', disciplineOrTrade: 'Lifts' },
  ],
  lift_replacement: [
    { name: 'Lift Contractor', disciplineOrTrade: 'Lifts' },
    { name: 'Structural Contractor', disciplineOrTrade: 'Structural' },
  ],
  dda_compliance: [
    { name: 'Lift Contractor', disciplineOrTrade: 'Lifts' },
  ],
  escalator_upgrade: [
    { name: 'Escalator Contractor', disciplineOrTrade: 'Escalators' },
  ],
  hoist_installation: [
    { name: 'Lift Contractor', disciplineOrTrade: 'Lifts' },
  ],

  // ===========================================
  // REFURB - Controls & Security
  // ===========================================
  bms_upgrade: [
    { name: 'BMS Contractor', disciplineOrTrade: 'BMS' },
  ],
  access_control: [
    { name: 'Security Systems', disciplineOrTrade: 'Security' },
  ],
  cctv_upgrade: [
    { name: 'Security Systems', disciplineOrTrade: 'Security' },
  ],
  intercom_system: [
    { name: 'Security Systems', disciplineOrTrade: 'Security' },
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],
  smart_building: [
    { name: 'BMS Contractor', disciplineOrTrade: 'BMS' },
    { name: 'ICT Contractor', disciplineOrTrade: 'ICT' },
  ],

  // ===========================================
  // REFURB - Common Areas
  // ===========================================
  lobby_refurbishment: [
    { name: 'Fit-out Contractor', disciplineOrTrade: 'Fit-out' },
    { name: 'Flooring Contractor', disciplineOrTrade: 'Flooring' },
    { name: 'Painting Contractor', disciplineOrTrade: 'Painting' },
  ],
  amenities_upgrade: [
    { name: 'Fit-out Contractor', disciplineOrTrade: 'Fit-out' },
    { name: 'Plumbing Contractor', disciplineOrTrade: 'Plumbing' },
    { name: 'Tiling Contractor', disciplineOrTrade: 'Tiling' },
  ],
  corridor_refurbishment: [
    { name: 'Fit-out Contractor', disciplineOrTrade: 'Fit-out' },
    { name: 'Flooring Contractor', disciplineOrTrade: 'Flooring' },
    { name: 'Painting Contractor', disciplineOrTrade: 'Painting' },
  ],
  carpark_upgrade: [
    { name: 'Civil Contractor', disciplineOrTrade: 'Civil' },
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
    { name: 'Line Marking', disciplineOrTrade: 'Line Marking' },
  ],
  landscape_upgrade: [
    { name: 'Landscaping Contractor', disciplineOrTrade: 'Landscaping' },
  ],
  signage_wayfinding: [
    { name: 'Signage Contractor', disciplineOrTrade: 'Signage' },
  ],

  // ===========================================
  // EXTEND - Structural Additions
  // ===========================================
  vertical_extension: [
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
    { name: 'Concrete Works', disciplineOrTrade: 'Concrete' },
    { name: 'Scaffolding Contractor', disciplineOrTrade: 'Scaffolding' },
    { name: 'Crane Hire', disciplineOrTrade: 'Crane' },
  ],
  horizontal_extension: [
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
    { name: 'Concrete Works', disciplineOrTrade: 'Concrete' },
    { name: 'Demolition Contractor', disciplineOrTrade: 'Demolition' },
  ],
  basement_extension: [
    { name: 'Excavation Contractor', disciplineOrTrade: 'Excavation' },
    { name: 'Piling Contractor', disciplineOrTrade: 'Piling' },
    { name: 'Concrete Works', disciplineOrTrade: 'Concrete' },
    { name: 'Waterproofing Contractor', disciplineOrTrade: 'Waterproofing' },
  ],
  link_building: [
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
    { name: 'Glazing Contractor', disciplineOrTrade: 'Glazing' },
  ],

  // ===========================================
  // EXTEND - Services Extension
  // ===========================================
  new_plant_room: [
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
    { name: 'Structural Contractor', disciplineOrTrade: 'Structural' },
  ],
  services_reticulation: [
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],
  substation_upgrade: [
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],

  // ===========================================
  // CLASS OVERRIDES - Commercial
  // ===========================================
  tenant_fitout: [
    { name: 'Fit-out Contractor', disciplineOrTrade: 'Fit-out' },
  ],
  esd_upgrade: [
    { name: 'BMS Contractor', disciplineOrTrade: 'BMS' },
    { name: 'Mechanical Services', disciplineOrTrade: 'Mechanical' },
  ],
  end_of_trip: [
    { name: 'Fit-out Contractor', disciplineOrTrade: 'Fit-out' },
    { name: 'Plumbing Contractor', disciplineOrTrade: 'Plumbing' },
  ],

  // ===========================================
  // CLASS OVERRIDES - Industrial
  // ===========================================
  crane_system: [
    { name: 'Crane Systems', disciplineOrTrade: 'Crane Systems' },
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
  ],
  dock_equipment: [
    { name: 'Dock Equipment', disciplineOrTrade: 'Dock Equipment' },
  ],
  hardstand_upgrade: [
    { name: 'Civil Contractor', disciplineOrTrade: 'Civil' },
    { name: 'Concrete Works', disciplineOrTrade: 'Concrete' },
  ],
  industrial_flooring: [
    { name: 'Industrial Flooring', disciplineOrTrade: 'Industrial Flooring' },
  ],
  racking_system: [
    { name: 'Racking Systems', disciplineOrTrade: 'Racking' },
  ],

  // ===========================================
  // CLASS OVERRIDES - Residential
  // ===========================================
  common_property: [
    { name: 'Building Works', disciplineOrTrade: 'Building Works' },
    { name: 'Painting Contractor', disciplineOrTrade: 'Painting' },
  ],
  defect_rectification: [
    { name: 'Building Works', disciplineOrTrade: 'Building Works' },
    { name: 'Concrete Repairs Contractor', disciplineOrTrade: 'Concrete Repairs' },
  ],
  strata_compliance: [
    { name: 'Building Works', disciplineOrTrade: 'Building Works' },
  ],

  // ===========================================
  // CLASS OVERRIDES - Infrastructure
  // ===========================================
  pavement_rehabilitation: [
    { name: 'Civil Contractor', disciplineOrTrade: 'Civil' },
    { name: 'Asphalt Contractor', disciplineOrTrade: 'Asphalt' },
  ],
  bridge_strengthening: [
    { name: 'Structural Steel', disciplineOrTrade: 'Structural Steel' },
    { name: 'Concrete Works', disciplineOrTrade: 'Concrete' },
  ],
  pipe_relining: [
    { name: 'Pipe Relining', disciplineOrTrade: 'Pipe Relining' },
    { name: 'Civil Contractor', disciplineOrTrade: 'Civil' },
  ],
  pump_station_upgrade: [
    { name: 'Hydraulic Contractor', disciplineOrTrade: 'Hydraulic' },
    { name: 'Electrical Contractor', disciplineOrTrade: 'Electrical' },
  ],
  treatment_upgrade: [
    { name: 'Process Contractor', disciplineOrTrade: 'Process' },
    { name: 'Civil Contractor', disciplineOrTrade: 'Civil' },
  ],
};

// ============================================
// Helper Functions
// ============================================

/**
 * Convert a discipline definition to a CreateStakeholderRequest
 */
export function disciplineToStakeholderRequest(
  def: DisciplineDef,
  isEnabled: boolean = true
): CreateStakeholderRequest {
  return {
    stakeholderGroup: 'consultant',
    name: def.name,
    disciplineOrTrade: def.disciplineOrTrade,
    isEnabled,
    isAiGenerated: true,
  };
}

/**
 * Convert a trade definition to a CreateStakeholderRequest
 */
export function tradeToStakeholderRequest(
  def: TradeDef,
  isEnabled: boolean = true
): CreateStakeholderRequest {
  return {
    stakeholderGroup: 'contractor',
    name: def.name,
    disciplineOrTrade: def.disciplineOrTrade,
    isEnabled,
    isAiGenerated: true,
  };
}

/**
 * Convert a client definition to a CreateStakeholderRequest
 */
export function clientToStakeholderRequest(def: ClientStakeholderDef): CreateStakeholderRequest {
  return {
    stakeholderGroup: 'client',
    name: def.name,
    role: def.role,
    isEnabled: true,
    isAiGenerated: true,
  };
}

/**
 * Convert an authority definition to a CreateStakeholderRequest
 */
export function authorityToStakeholderRequest(def: AuthorityDef): CreateStakeholderRequest {
  return {
    stakeholderGroup: 'authority',
    name: def.name,
    role: def.role,
    submissionType: def.submissionType,
    isEnabled: true,
    isAiGenerated: true,
  };
}
