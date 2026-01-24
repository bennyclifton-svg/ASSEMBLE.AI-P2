import { ProjectTypeId } from './project-types';

export interface CostLineTemplate {
  category: string;
  description: string;
  unit: string;
  quantity?: number;
  rate?: number;
  notes?: string;
}

export const costPlanTemplates: Record<ProjectTypeId, CostLineTemplate[]> = {
  house: [
    // Consultant Fees
    { category: 'Consultant Fees', description: 'Architectural Fees', unit: 'sum', notes: 'Typically 8-12% of construction cost' },
    { category: 'Consultant Fees', description: 'Engineering Fees (Structural, Hydraulic)', unit: 'sum', notes: 'Typically 2-4% of construction cost' },
    { category: 'Consultant Fees', description: 'Town Planning Fees', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Energy Consultant (BASIX/NatHERS)', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Surveying Fees', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Geotechnical Investigation', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Certifier Fees', unit: 'sum' },

    // Authority Costs
    { category: 'Authority Costs', description: 'DA/CDC Application Fees', unit: 'sum' },
    { category: 'Authority Costs', description: 'Construction Certificate Fees', unit: 'sum' },
    { category: 'Authority Costs', description: 'Water/Sewer Connection Fees', unit: 'sum' },
    { category: 'Authority Costs', description: 'Long Service Levy', unit: 'sum', notes: '0.35% of construction cost' },

    // Construction
    { category: 'Construction', description: 'Preliminaries & Site Establishment', unit: 'sum', notes: '8-12% of construction' },
    { category: 'Construction', description: 'Demolition & Site Works', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Excavation & Earthworks', unit: 'm³', quantity: 0 },
    { category: 'Construction', description: 'Foundations & Substructure', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Floor Slab', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Frame & Structure', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Roof Structure & Covering', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'External Walls & Cladding', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Windows & External Doors', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Internal Walls & Partitions', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Internal Doors', unit: 'no', quantity: 0 },
    { category: 'Construction', description: 'Plumbing & Drainage', unit: 'sum' },
    { category: 'Construction', description: 'Electrical Installation', unit: 'sum' },
    { category: 'Construction', description: 'HVAC', unit: 'sum' },
    { category: 'Construction', description: 'Kitchen', unit: 'sum' },
    { category: 'Construction', description: 'Bathrooms', unit: 'no', quantity: 0 },
    { category: 'Construction', description: 'Floor Finishes', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Wall Finishes & Painting', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Ceiling Finishes', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Joinery & Built-ins', unit: 'sum' },
    { category: 'Construction', description: 'Landscaping', unit: 'sum' },
    { category: 'Construction', description: 'Driveway & Paths', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Fencing', unit: 'lm', quantity: 0 },

    // Contingencies
    { category: 'Contingency', description: 'Design Contingency', unit: 'sum', notes: '5-10% of construction cost' },
    { category: 'Contingency', description: 'Construction Contingency', unit: 'sum', notes: '5-10% of construction cost' }
  ],

  apartments: [
    // Consultant Fees
    { category: 'Consultant Fees', description: 'Architectural Fees', unit: 'sum', notes: 'Typically 4-6% of construction cost' },
    { category: 'Consultant Fees', description: 'Structural Engineering', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Civil Engineering', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Services Engineering (M&E)', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Fire Engineering', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Town Planning', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Geotechnical Investigation', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Acoustic Consultant', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Landscape Architecture', unit: 'sum' },
    { category: 'Consultant Fees', description: 'ESD Consultant', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Surveying', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Certifier', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Traffic Engineering', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Cost Planning', unit: 'sum' },

    // Authority Costs
    { category: 'Authority Costs', description: 'DA Application Fees', unit: 'sum' },
    { category: 'Authority Costs', description: 'Section 7.11/7.12 Contributions', unit: 'sum', notes: 'Per dwelling or % construction cost' },
    { category: 'Authority Costs', description: 'Construction Certificate', unit: 'sum' },
    { category: 'Authority Costs', description: 'Long Service Levy', unit: 'sum', notes: '0.35% of construction cost' },
    { category: 'Authority Costs', description: 'Utility Connection Fees', unit: 'sum' },

    // Marketing & Sales
    { category: 'Marketing & Sales', description: 'Marketing Campaign', unit: 'sum' },
    { category: 'Marketing & Sales', description: 'Display Suite', unit: 'sum' },
    { category: 'Marketing & Sales', description: 'Sales Commissions', unit: 'sum', notes: 'Typically 2-3% of revenue' },

    // Construction
    { category: 'Construction', description: 'Preliminaries', unit: 'sum', notes: '8-12% of construction' },
    { category: 'Construction', description: 'Demolition', unit: 'sum' },
    { category: 'Construction', description: 'Shoring & Excavation', unit: 'm³', quantity: 0 },
    { category: 'Construction', description: 'Piling (if required)', unit: 'no', quantity: 0 },
    { category: 'Construction', description: 'Basement Structure', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Superstructure - Concrete', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Facade', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Roofing & Waterproofing', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Lifts', unit: 'no', quantity: 0 },
    { category: 'Construction', description: 'Fire Services', unit: 'sum' },
    { category: 'Construction', description: 'Hydraulic Services', unit: 'sum' },
    { category: 'Construction', description: 'Mechanical Services', unit: 'sum' },
    { category: 'Construction', description: 'Electrical Services', unit: 'sum' },
    { category: 'Construction', description: 'BMS & Security', unit: 'sum' },
    { category: 'Construction', description: 'Internal Partitions', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Apartment Fit-out', unit: 'apt', quantity: 0 },
    { category: 'Construction', description: 'Common Area Fit-out', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'External Works & Landscaping', unit: 'sum' },
    { category: 'Construction', description: 'Civil Works', unit: 'sum' },

    // Contingencies
    { category: 'Contingency', description: 'Design Contingency', unit: 'sum', notes: '8-10% of construction cost' },
    { category: 'Contingency', description: 'Construction Contingency', unit: 'sum', notes: '8-10% of construction cost' }
  ],

  fitout: [
    // Consultant Fees
    { category: 'Consultant Fees', description: 'Interior Design', unit: 'sum' },
    { category: 'Consultant Fees', description: 'M&E Engineering', unit: 'sum' },
    { category: 'Consultant Fees', description: 'AV/ICT Consultant', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Acoustic Consultant', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Certifier', unit: 'sum' },

    // Authority Costs
    { category: 'Authority Costs', description: 'Building Approval Fees', unit: 'sum' },
    { category: 'Authority Costs', description: 'Landlord Approval/Coordination', unit: 'sum' },

    // Construction
    { category: 'Construction', description: 'Preliminaries & Access', unit: 'sum', notes: '8-12% of construction' },
    { category: 'Construction', description: 'Demolition & Strip-out', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Partitions', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Ceilings', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Doors & Glazing', unit: 'no', quantity: 0 },
    { category: 'Construction', description: 'Mechanical Services', unit: 'sum' },
    { category: 'Construction', description: 'Electrical Services', unit: 'sum' },
    { category: 'Construction', description: 'Hydraulic Services', unit: 'sum' },
    { category: 'Construction', description: 'Fire Services', unit: 'sum' },
    { category: 'Construction', description: 'Data & Communications', unit: 'sum' },
    { category: 'Construction', description: 'Joinery & Millwork', unit: 'sum' },
    { category: 'Construction', description: 'Kitchen/Pantry', unit: 'sum' },
    { category: 'Construction', description: 'Flooring', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Tiling', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Painting & Decorating', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Signage', unit: 'sum' },

    // FF&E
    { category: 'FF&E', description: 'Furniture', unit: 'sum' },
    { category: 'FF&E', description: 'Workstations', unit: 'no', quantity: 0 },
    { category: 'FF&E', description: 'Meeting Room Furniture', unit: 'sum' },
    { category: 'FF&E', description: 'Breakout Furniture', unit: 'sum' },
    { category: 'FF&E', description: 'AV Equipment', unit: 'sum' },

    // Contingencies
    { category: 'Contingency', description: 'Design Contingency', unit: 'sum', notes: '5-8%' },
    { category: 'Contingency', description: 'Construction Contingency', unit: 'sum', notes: '8-10%' }
  ],

  industrial: [
    // Consultant Fees
    { category: 'Consultant Fees', description: 'Architectural Fees', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Structural Engineering', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Civil Engineering', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Services Engineering', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Town Planning', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Geotechnical', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Traffic Engineering', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Surveying', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Certifier', unit: 'sum' },

    // Authority Costs
    { category: 'Authority Costs', description: 'DA Application Fees', unit: 'sum' },
    { category: 'Authority Costs', description: 'Section 7.11/7.12', unit: 'sum' },
    { category: 'Authority Costs', description: 'Construction Certificate', unit: 'sum' },
    { category: 'Authority Costs', description: 'Long Service Levy', unit: 'sum', notes: '0.35%' },

    // Construction
    { category: 'Construction', description: 'Preliminaries', unit: 'sum', notes: '8-10%' },
    { category: 'Construction', description: 'Site Works & Demolition', unit: 'sum' },
    { category: 'Construction', description: 'Civil Infrastructure', unit: 'sum' },
    { category: 'Construction', description: 'Foundations', unit: 'sum' },
    { category: 'Construction', description: 'Floor Slab', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Structural Steel Frame', unit: 'tonne', quantity: 0 },
    { category: 'Construction', description: 'Roof Cladding', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Wall Cladding', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Mezzanine (if required)', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Office Fitout', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Amenities', unit: 'sum' },
    { category: 'Construction', description: 'Roller Doors & Dock Equipment', unit: 'no', quantity: 0 },
    { category: 'Construction', description: 'Electrical Services', unit: 'sum' },
    { category: 'Construction', description: 'Mechanical Services', unit: 'sum' },
    { category: 'Construction', description: 'Hydraulic Services', unit: 'sum' },
    { category: 'Construction', description: 'Fire Services', unit: 'sum' },
    { category: 'Construction', description: 'Security Systems', unit: 'sum' },
    { category: 'Construction', description: 'Hardstand & Paving', unit: 'm²', quantity: 0 },
    { category: 'Construction', description: 'Car Parking', unit: 'space', quantity: 0 },
    { category: 'Construction', description: 'Landscaping', unit: 'sum' },
    { category: 'Construction', description: 'Fencing & Gates', unit: 'lm', quantity: 0 },

    // Contingencies
    { category: 'Contingency', description: 'Design Contingency', unit: 'sum', notes: '8-10%' },
    { category: 'Contingency', description: 'Construction Contingency', unit: 'sum', notes: '8-10%' }
  ],

  remediation: [
    // Consultant Fees
    { category: 'Consultant Fees', description: 'Environmental Consultant', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Site Auditor (EPA Accredited)', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Occupational Hygienist', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Hydrogeologist', unit: 'sum' },
    { category: 'Consultant Fees', description: 'Civil/Geotech Engineering', unit: 'sum' },

    // Investigation
    { category: 'Investigation', description: 'Phase 1 ESA', unit: 'sum' },
    { category: 'Investigation', description: 'Phase 2 ESA/DSI', unit: 'sum' },
    { category: 'Investigation', description: 'Laboratory Analysis', unit: 'sum' },
    { category: 'Investigation', description: 'Remediation Action Plan', unit: 'sum' },

    // Authority Costs
    { category: 'Authority Costs', description: 'EPA Notifications', unit: 'sum' },
    { category: 'Authority Costs', description: 'Site Audit Statement Fee', unit: 'sum' },

    // Remediation Works
    { category: 'Remediation', description: 'Site Establishment & Protection', unit: 'sum' },
    { category: 'Remediation', description: 'Asbestos Removal', unit: 'm²', quantity: 0 },
    { category: 'Remediation', description: 'Demolition', unit: 'sum' },
    { category: 'Remediation', description: 'Excavation & Segregation', unit: 'm³', quantity: 0 },
    { category: 'Remediation', description: 'Soil Screening & Classification', unit: 'sum' },
    { category: 'Remediation', description: 'On-site Treatment', unit: 'm³', quantity: 0 },
    { category: 'Remediation', description: 'Off-site Disposal (Contaminated)', unit: 'm³', quantity: 0 },
    { category: 'Remediation', description: 'Imported Fill (Validated)', unit: 'm³', quantity: 0 },
    { category: 'Remediation', description: 'Groundwater Treatment', unit: 'sum' },
    { category: 'Remediation', description: 'Dewatering', unit: 'sum' },
    { category: 'Remediation', description: 'Capping & Containment', unit: 'm²', quantity: 0 },
    { category: 'Remediation', description: 'Validation Sampling', unit: 'sum' },
    { category: 'Remediation', description: 'Environmental Monitoring', unit: 'sum' },
    { category: 'Remediation', description: 'Waste Tracking & Reporting', unit: 'sum' },

    // Contingencies
    { category: 'Contingency', description: 'Investigation Contingency', unit: 'sum', notes: '15-20%' },
    { category: 'Contingency', description: 'Remediation Contingency', unit: 'sum', notes: '20-30%' }
  ]
};
