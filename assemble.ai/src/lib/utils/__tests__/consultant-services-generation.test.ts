/**
 * Tests for Consultant Services Generation Utility
 * Feature: 018-project-initiator Phase 13
 */

import {
  generateServicesForDiscipline,
  generateServicesAndDeliverables,
  getServicesForDiscipline,
} from '../consultant-services-generation';
import type { ConsultantDiscipline, ConsultantTemplatesData } from '@/lib/types/project-initiator';

describe('Consultant Services Generation', () => {
  // Mock discipline data
  const mockDiscipline: ConsultantDiscipline = {
    name: 'Test Architect',
    abbrev: 'ARC',
    category: 'design',
    applicableProjectTypes: ['house', 'apartments'],
    phases: {
      feasibility: {
        services: [
          'Site inspection and analysis',
          'Preliminary massing studies',
        ],
        deliverables: [
          {
            item: 'Site analysis report',
            format: 'PDF',
            mandatory: false,
          },
          {
            item: 'Preliminary massing diagrams',
            format: 'PDF/SketchUp',
            mandatory: false,
          },
        ],
      },
      schematic_design: {
        services: [
          'Site inspection and analysis', // Duplicate to test deduplication
          'Design options development',
        ],
        deliverables: [
          {
            item: 'Concept design options',
            format: 'PDF',
            mandatory: true,
          },
        ],
      },
    },
  };

  const mockTemplatesData: ConsultantTemplatesData = {
    version: '3.0',
    lastUpdated: '2024-12-20',
    disciplines: {
      architect: mockDiscipline,
    },
  };

  describe('generateServicesForDiscipline', () => {
    it('should generate services markdown from discipline phases', () => {
      const result = generateServicesForDiscipline(mockDiscipline);

      expect(result.services).toContain('- Site inspection and analysis');
      expect(result.services).toContain('- Preliminary massing studies');
      expect(result.services).toContain('- Design options development');
    });

    it('should deduplicate services across phases', () => {
      const result = generateServicesForDiscipline(mockDiscipline);

      // "Site inspection and analysis" appears in both phases but should only appear once
      const occurrences = (result.services.match(/Site inspection and analysis/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it('should generate deliverables markdown organized by phase', () => {
      const result = generateServicesForDiscipline(mockDiscipline);

      expect(result.deliverables).toContain('**Feasibility**');
      expect(result.deliverables).toContain('- Site analysis report');
      expect(result.deliverables).toContain('- Preliminary massing diagrams');
      expect(result.deliverables).toContain('**Schematic Design**');
      expect(result.deliverables).toContain('- Concept design options');
    });

    it('should handle discipline with no phases', () => {
      const emptyDiscipline: ConsultantDiscipline = {
        name: 'Empty Consultant',
        abbrev: 'EMP',
        category: 'design',
        applicableProjectTypes: ['all'],
      };

      const result = generateServicesForDiscipline(emptyDiscipline);

      expect(result.services).toBe('');
      expect(result.deliverables).toBe('');
    });

    it('should handle phase with no services or deliverables', () => {
      const minimalDiscipline: ConsultantDiscipline = {
        name: 'Minimal Consultant',
        abbrev: 'MIN',
        category: 'design',
        applicableProjectTypes: ['all'],
        phases: {
          feasibility: {
            services: [],
            deliverables: [],
          },
        },
      };

      const result = generateServicesForDiscipline(minimalDiscipline);

      expect(result.services).toBe('');
      expect(result.deliverables).toBe('');
    });
  });

  describe('generateServicesAndDeliverables', () => {
    it('should generate services for applicable disciplines only', () => {
      const result = generateServicesAndDeliverables({
        projectType: 'house',
        templatesData: mockTemplatesData,
      });

      expect(result).toHaveLength(1);
      expect(result[0].disciplineName).toBe('Test Architect');
      expect(result[0].briefServices).toContain('- Site inspection and analysis');
      expect(result[0].briefDeliverables).toContain('**Feasibility**');
    });

    it('should skip non-applicable disciplines', () => {
      const result = generateServicesAndDeliverables({
        projectType: 'office', // Not in applicableProjectTypes
        templatesData: mockTemplatesData,
      });

      expect(result).toHaveLength(0);
    });

    it('should include disciplines with "all" applicableProjectTypes', () => {
      const templatesWithAll: ConsultantTemplatesData = {
        version: '3.0',
        lastUpdated: '2024-12-20',
        disciplines: {
          universal: {
            name: 'Universal Consultant',
            abbrev: 'UNI',
            category: 'design',
            applicableProjectTypes: ['all'],
            phases: {
              feasibility: {
                services: ['Universal service'],
                deliverables: [{ item: 'Universal deliverable', format: 'PDF', mandatory: true }],
              },
            },
          },
        },
      };

      const result = generateServicesAndDeliverables({
        projectType: 'house',
        templatesData: templatesWithAll,
      });

      expect(result).toHaveLength(1);
      expect(result[0].disciplineName).toBe('Universal Consultant');
    });
  });

  describe('getServicesForDiscipline', () => {
    it('should return services for a specific discipline by name', () => {
      const result = getServicesForDiscipline('Test Architect', mockTemplatesData);

      expect(result).not.toBeNull();
      expect(result?.services).toContain('- Site inspection and analysis');
      expect(result?.deliverables).toContain('**Feasibility**');
    });

    it('should return null for non-existent discipline', () => {
      const result = getServicesForDiscipline('Non-Existent', mockTemplatesData);

      expect(result).toBeNull();
    });
  });

  describe('Phase name formatting', () => {
    it('should format snake_case phase names as Title Case', () => {
      const result = generateServicesForDiscipline(mockDiscipline);

      expect(result.deliverables).toContain('**Feasibility**');
      expect(result.deliverables).toContain('**Schematic Design**');
      expect(result.deliverables).not.toContain('**feasibility**');
      expect(result.deliverables).not.toContain('**schematic_design**');
    });
  });
});
