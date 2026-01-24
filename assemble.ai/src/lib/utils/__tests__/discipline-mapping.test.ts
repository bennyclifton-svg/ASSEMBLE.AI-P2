/**
 * Unit Tests for Discipline Mapping (Feature 018 - Phase 10)
 * Test filtering of consultant disciplines by project type
 */

import {
  getEnabledDisciplines,
  getApplicableDisciplines,
  isDisciplineApplicable,
} from '../discipline-mapping';
import type { ConsultantTemplatesData, ProjectTypeId } from '@/lib/types/project-initiator';

// Mock consultant templates data for testing
const mockConsultantTemplates: ConsultantTemplatesData = {
  version: '1.0',
  lastUpdated: '2024-12-20',
  disciplines: {
    architect: {
      name: 'Architect',
      abbrev: 'ARC',
      category: 'design',
      applicableProjectTypes: ['all'],
      phases: {
        'Concept Design': {
          services: ['Design development', 'Documentation'],
          deliverables: [
            { item: 'Sketch plans', format: 'PDF', mandatory: true },
            { item: '3D renders', format: 'PDF', mandatory: false },
          ],
        },
        'Design Development': {
          services: ['Detailed drawings', 'Specifications'],
          deliverables: [
            { item: 'Detailed drawings', format: 'PDF', mandatory: true },
            { item: 'Specifications', format: 'PDF', mandatory: true },
          ],
        },
      },
    },
    structural_engineer: {
      name: 'Structural Engineer',
      abbrev: 'STR',
      category: 'engineering',
      applicableProjectTypes: ['all'],
      phases: {
        'Design Development': {
          services: ['Structural design', 'Engineering certification'],
          deliverables: [
            { item: 'Structural drawings', format: 'PDF', mandatory: true },
            { item: 'Calculations', format: 'PDF', mandatory: true },
          ],
        },
        'Construction': {
          services: ['Site inspections', 'Certificates'],
          deliverables: [
            { item: 'Site inspections', format: 'Report', mandatory: true },
            { item: 'Certificates', format: 'PDF', mandatory: true },
          ],
        },
      },
    },
    civil_engineer: {
      name: 'Civil Engineer',
      abbrev: 'CIV',
      category: 'engineering',
      applicableProjectTypes: ['apartments', 'townhouses', 'office', 'industrial'],
      phases: {
        'Design Development': {
          services: ['Site works design', 'Drainage design'],
          deliverables: [
            { item: 'Civil drawings', format: 'PDF', mandatory: true },
            { item: 'Stormwater plan', format: 'PDF', mandatory: true },
          ],
        },
      },
    },
    mechanical_engineer: {
      name: 'Mechanical Engineer',
      abbrev: 'MEC',
      category: 'engineering',
      applicableProjectTypes: ['apartments', 'office', 'retail', 'industrial'],
      phases: {
        'Design Development': {
          services: ['HVAC design', 'Mechanical services'],
          deliverables: [
            { item: 'Mechanical drawings', format: 'PDF', mandatory: true },
            { item: 'Equipment schedules', format: 'PDF', mandatory: true },
          ],
        },
      },
    },
    landscape_architect: {
      name: 'Landscape Architect',
      abbrev: 'LAN',
      category: 'design',
      applicableProjectTypes: ['house', 'apartments', 'townhouses', 'office'],
      phases: {
        'Concept Design': {
          services: ['Landscape design', 'Planting plans'],
          deliverables: [
            { item: 'Landscape concept', format: 'PDF', mandatory: true },
            { item: 'Planting palette', format: 'PDF', mandatory: false },
          ],
        },
      },
    },
  },
};

describe('getEnabledDisciplines', () => {
  it('should return disciplines with "all" applicableProjectTypes for any project type', () => {
    const result = getEnabledDisciplines('house', mockConsultantTemplates);

    expect(result).toContain('Architect');
    expect(result).toContain('Structural Engineer');
  });

  it('should return specific disciplines for apartments project type', () => {
    const result = getEnabledDisciplines('apartments', mockConsultantTemplates);

    // Should include "all" disciplines
    expect(result).toContain('Architect');
    expect(result).toContain('Structural Engineer');

    // Should include specific disciplines for apartments
    expect(result).toContain('Civil Engineer');
    expect(result).toContain('Mechanical Engineer');
    expect(result).toContain('Landscape Architect');
  });

  it('should return specific disciplines for house project type', () => {
    const result = getEnabledDisciplines('house', mockConsultantTemplates);

    // Should include "all" disciplines
    expect(result).toContain('Architect');
    expect(result).toContain('Structural Engineer');

    // Should include specific disciplines for house
    expect(result).toContain('Landscape Architect');

    // Should NOT include disciplines not applicable to house
    expect(result).not.toContain('Civil Engineer');
    expect(result).not.toContain('Mechanical Engineer');
  });

  it('should return specific disciplines for office project type', () => {
    const result = getEnabledDisciplines('office', mockConsultantTemplates);

    expect(result).toContain('Architect');
    expect(result).toContain('Structural Engineer');
    expect(result).toContain('Civil Engineer');
    expect(result).toContain('Mechanical Engineer');
    expect(result).toContain('Landscape Architect');
  });

  it('should return only "all" disciplines for project type with no specific disciplines', () => {
    const result = getEnabledDisciplines('due-diligence', mockConsultantTemplates);

    expect(result).toContain('Architect');
    expect(result).toContain('Structural Engineer');
    expect(result).toHaveLength(2);
  });

  it('should handle empty disciplines object', () => {
    const emptyTemplates: ConsultantTemplatesData = {
      version: '1.0',
      lastUpdated: '2024-12-20',
      disciplines: {},
    };

    const result = getEnabledDisciplines('house', emptyTemplates);

    expect(result).toEqual([]);
  });
});

describe('getApplicableDisciplines', () => {
  it('should return Map with discipline details for applicable disciplines', () => {
    const result = getApplicableDisciplines('apartments', mockConsultantTemplates);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBeGreaterThan(0);

    // Check that we have the expected disciplines
    expect(result.has('Architect')).toBe(true);
    expect(result.has('Civil Engineer')).toBe(true);

    // Verify structure of returned discipline
    const architect = result.get('Architect');
    expect(architect).toBeDefined();
    expect(architect?.name).toBe('Architect');
    expect(architect?.applicableProjectTypes).toContain('all');
    expect(architect?.phases).toBeDefined();
  });

  it('should return correct disciplines for house project type', () => {
    const result = getApplicableDisciplines('house', mockConsultantTemplates);

    expect(result.has('Architect')).toBe(true);
    expect(result.has('Structural Engineer')).toBe(true);
    expect(result.has('Landscape Architect')).toBe(true);
    expect(result.has('Civil Engineer')).toBe(false);
    expect(result.has('Mechanical Engineer')).toBe(false);
  });

  it('should return empty Map when no disciplines are applicable', () => {
    const emptyTemplates: ConsultantTemplatesData = {
      version: '1.0',
      lastUpdated: '2024-12-20',
      disciplines: {},
    };

    const result = getApplicableDisciplines('house', emptyTemplates);

    expect(result).toBeInstanceOf(Map);
    expect(result.size).toBe(0);
  });
});

describe('isDisciplineApplicable', () => {
  it('should return true for discipline with "all" applicableProjectTypes', () => {
    const result = isDisciplineApplicable('Architect', 'house', mockConsultantTemplates);

    expect(result).toBe(true);
  });

  it('should return true when project type is in applicableProjectTypes', () => {
    const result = isDisciplineApplicable('Civil Engineer', 'apartments', mockConsultantTemplates);

    expect(result).toBe(true);
  });

  it('should return false when project type is not in applicableProjectTypes', () => {
    const result = isDisciplineApplicable('Civil Engineer', 'house', mockConsultantTemplates);

    expect(result).toBe(false);
  });

  it('should return false for non-existent discipline', () => {
    const result = isDisciplineApplicable('Non-Existent Discipline', 'house', mockConsultantTemplates);

    expect(result).toBe(false);
  });

  it('should handle all edge cases correctly', () => {
    // Test "all" keyword
    expect(isDisciplineApplicable('Architect', 'due-diligence', mockConsultantTemplates)).toBe(true);

    // Test specific match
    expect(isDisciplineApplicable('Mechanical Engineer', 'office', mockConsultantTemplates)).toBe(true);

    // Test no match
    expect(isDisciplineApplicable('Mechanical Engineer', 'house', mockConsultantTemplates)).toBe(false);
  });
});
