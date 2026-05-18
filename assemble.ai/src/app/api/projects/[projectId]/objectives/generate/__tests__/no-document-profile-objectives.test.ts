/**
 * @jest-environment node
 */

import {
  buildNoDocumentProfileObjectiveCandidates,
  strengthenNoDocumentGeneratedObjectives,
} from '../no-document-profile-objectives';

const richApartmentProfile = {
  buildingClass: 'residential',
  projectType: 'new' as const,
  subclass: ['apartments'],
  scaleData: {
    storeys: 8,
    units: 33,
    gfa_sqm: 5500,
    avg_unit_sqm: 88,
    parking_bays: 50,
    parking_basement_levels: 2,
  },
  complexity: {
    quality_tier: 'standard',
    heritage: 'overlay',
    approval_pathway: 'low_rise_code',
    contamination_level: 'minor',
    access_constraints: 'urban_constrained',
    operational_constraints: 'partial_occupation',
    procurement_route: 'design_construct',
    stakeholder_complexity: 'strata',
    environmental_sensitivity: 'sensitive',
    site_conditions: ['infill'],
  },
  workScopeLabels: [
    'Demolition',
    'Site Clearance',
    'Decontamination',
    'Bulk Earthworks',
    'Earthworks Detailed',
    'Site Drainage',
    'Stormwater Management',
    'Internal Roads',
    'Substructure',
    'Superstructure',
    'Post-Tensioning',
    'Precast Elements',
    'Mechanical HVAC',
    'Electrical Power',
    'Hydraulic Plumbing',
    'Fire Services',
    'Vertical Transport',
    'BMS Controls',
    'Facade System',
    'Curtain Wall',
    'Glazing',
    'Waterproofing',
  ],
  classDescriptors: ['Class 2: Apartment building'],
};

describe('no-document profile objective candidates', () => {
  it('builds profile-specific candidates from a fully configured apartment profile', () => {
    const candidates = buildNoDocumentProfileObjectiveCandidates(richApartmentProfile);

    expect(candidates.functional?.map((item) => item.text)).toEqual([
      'Deliver 8-storey, 33-apartment building',
      'Provide 5500 sqm GFA and 88 sqm average units',
      'Provide 50 parking bays over 2 basement levels',
      'Integrate substructure, superstructure, post-tensioning, precast elements and vertical transport',
      'Integrate HVAC, power, hydraulics, fire and BMS',
    ]);
    expect(candidates.planning?.map((item) => item.text)).toContain('Resolve heritage overlay constraints');
    expect(candidates.planning?.map((item) => item.text)).toContain('Plan constrained infill access and staging for apartment building');
    expect(candidates.quality?.map((item) => item.text)).toContain('Control facade, glazing and waterproofing performance');
    expect(candidates.compliance?.map((item) => item.text)).toContain('Certify fire, lift and building-services systems');
  });

  it('uses the project name as a soft asset hint for commercial other amenities work', () => {
    const candidates = buildNoDocumentProfileObjectiveCandidates({
      projectName: 'Amenities Block 2 Replacement',
      buildingClass: 'commercial',
      projectType: 'new' as const,
      subclass: ['other'],
      scaleData: { storeys: 1, gfa_sqm: 120 },
      complexity: {},
      workScopeLabels: [
        'Demolition',
        'Site Clearance',
        'Decontamination',
        'Bulk Earthworks',
        'Detailed Earthworks',
        'Site Drainage',
        'Stormwater Management',
        'Internal Roads/Pavements',
        'Substructure/Foundation',
        'Superstructure',
        'Facade System',
        'Roofing System',
        'Glazing/Windows',
        'Waterproofing',
        'Mechanical HVAC',
        'Electrical Power',
        'Hydraulic/Plumbing',
        'Fire Services',
        'Vertical Transport',
        'BMS/Controls',
        'Partitions/Internal Walls',
        'Ceilings',
        'Flooring',
        'Joinery/Cabinetry',
        'Landscaping',
        'External Lighting',
        'Fencing/Gates',
      ],
      classDescriptors: [],
    });
    const allText = Object.values(candidates).flat().map((item) => item.text).join('\n');

    expect(candidates.planning?.map((item) => item.text)).toContain(
      'Confirm approval pathway for 1-storey amenities block replacement',
    );
    expect(candidates.planning?.map((item) => item.text)).toContain(
      'Secure demolition, decontamination and site-clearance approvals',
    );
    expect(candidates.functional?.map((item) => item.text)).toContain(
      'Deliver 1-storey replacement amenities block',
    );
    expect(candidates.quality?.map((item) => item.text)).toContain(
      'Set durable, maintainable wet-area finishes',
    );
    expect(candidates.compliance?.map((item) => item.text)).toContain(
      'Confirm accessibility and sanitary facility compliance',
    );
    expect(candidates.functional?.map((item) => item.text)).toContain(
      'Integrate substructure, superstructure and vertical transport',
    );
    expect(allText).not.toMatch(/precast/i);
  });

  it('puts specific profile-backed candidates ahead of weak AI labels', () => {
    const strengthened = strengthenNoDocumentGeneratedObjectives(
      {
        functional: [
          { text: 'Coordinate selected civil scope', source: 'profile_fact' },
          { text: 'Deliver 8-storey apartment building', source: 'profile_fact' },
        ],
        quality: [
          { text: 'Standard quality materials', source: 'profile_fact' },
          { text: 'Set waterproofing standards', source: 'profile_fact' },
        ],
      },
      richApartmentProfile,
      ['functional', 'quality'],
    );

    expect(strengthened.functional?.map((item) => item.text)).toEqual([
      'Deliver 8-storey, 33-apartment building',
      'Provide 5500 sqm GFA and 88 sqm average units',
      'Provide 50 parking bays over 2 basement levels',
      'Integrate substructure, superstructure, post-tensioning, precast elements and vertical transport',
      'Integrate HVAC, power, hydraulics, fire and BMS',
    ]);
    expect(strengthened.quality?.map((item) => item.text)).toEqual([
      'Apply standard quality tier across finishes',
      'Control facade, glazing and waterproofing performance',
      'Manage structural tolerances at facade interfaces',
      'Control earthworks, drainage and stormwater workmanship',
      'Set apartment acoustic and waterproofing standards',
    ]);
  });
});
