/**
 * Profile Templates Validation Tests
 * Feature 022 - Profiler Expansion
 *
 * These tests validate the structure and completeness of profile-templates.json
 */

import profileTemplates from '@/lib/data/profile-templates.json';

interface Subclass {
  value: string;
  label: string;
}

interface ScaleField {
  key: string;
  label: string;
  type: string;
}

interface ComplexityOption {
  value: string;
  label: string;
}

interface BuildingClassConfig {
  label: string;
  icon: string;
  subclasses: Subclass[];
  scaleFields: Record<string, ScaleField[]>;
  complexityOptions: Record<string, Record<string, ComplexityOption[]> | ComplexityOption[]>;
}

describe('Profile Templates JSON Structure', () => {
  // T005: Validate JSON structure
  describe('JSON Structure Validation', () => {
    it('should have required top-level keys', () => {
      expect(profileTemplates).toHaveProperty('metadata');
      expect(profileTemplates).toHaveProperty('buildingClasses');
      expect(profileTemplates).toHaveProperty('projectTypes');
      expect(profileTemplates).toHaveProperty('workScopeOptions');
    });

    it('should have valid metadata', () => {
      expect(profileTemplates.metadata).toHaveProperty('version');
      expect(profileTemplates.metadata).toHaveProperty('structure');
    });
  });

  // T006: Validate subclasses have required fields
  describe('Subclass Validation', () => {
    const buildingClasses = profileTemplates.buildingClasses as Record<string, BuildingClassConfig>;

    Object.entries(buildingClasses).forEach(([className, config]) => {
      describe(`${className} subclasses`, () => {
        it('should have all subclasses with required fields (value, label)', () => {
          config.subclasses.forEach((subclass: Subclass) => {
            expect(subclass).toHaveProperty('value');
            expect(subclass).toHaveProperty('label');
            expect(typeof subclass.value).toBe('string');
            expect(typeof subclass.label).toBe('string');
            expect(subclass.value.length).toBeGreaterThan(0);
            expect(subclass.label.length).toBeGreaterThan(0);
          });
        });

        it('should have unique subclass values', () => {
          const values = config.subclasses.map((s: Subclass) => s.value);
          const uniqueValues = new Set(values);
          expect(uniqueValues.size).toBe(values.length);
        });
      });
    });
  });

  // T007: Validate scaleFields have required fields
  describe('ScaleFields Validation', () => {
    const buildingClasses = profileTemplates.buildingClasses as Record<string, BuildingClassConfig>;

    Object.entries(buildingClasses).forEach(([className, config]) => {
      describe(`${className} scaleFields`, () => {
        it('should have default scaleFields', () => {
          expect(config.scaleFields).toHaveProperty('default');
          expect(Array.isArray(config.scaleFields.default)).toBe(true);
        });

        it('should have all scaleFields with required fields (key, label, type)', () => {
          Object.entries(config.scaleFields).forEach(([fieldKey, fields]) => {
            if (Array.isArray(fields)) {
              fields.forEach((field: ScaleField) => {
                expect(field).toHaveProperty('key');
                expect(field).toHaveProperty('label');
                expect(field).toHaveProperty('type');
                expect(typeof field.key).toBe('string');
                expect(typeof field.label).toBe('string');
                // Allow integer, decimal, boolean, and select types
                expect(['integer', 'decimal', 'boolean', 'select']).toContain(field.type);
              });
            }
          });
        });
      });
    });
  });

  // T008: Validate complexityOptions have required fields
  describe('ComplexityOptions Validation', () => {
    const buildingClasses = profileTemplates.buildingClasses as Record<string, BuildingClassConfig>;

    Object.entries(buildingClasses).forEach(([className, config]) => {
      describe(`${className} complexityOptions`, () => {
        it('should have default complexityOptions', () => {
          expect(config.complexityOptions).toHaveProperty('default');
        });

        it('should have all complexityOptions with required fields (value, label)', () => {
          const validateOptions = (options: ComplexityOption[] | Record<string, ComplexityOption[]>) => {
            if (Array.isArray(options)) {
              options.forEach((option: ComplexityOption) => {
                expect(option).toHaveProperty('value');
                expect(option).toHaveProperty('label');
              });
            } else if (typeof options === 'object') {
              Object.values(options).forEach((dimensionOptions) => {
                if (Array.isArray(dimensionOptions)) {
                  dimensionOptions.forEach((option: ComplexityOption) => {
                    expect(option).toHaveProperty('value');
                    expect(option).toHaveProperty('label');
                  });
                }
              });
            }
          };

          Object.values(config.complexityOptions).forEach((options) => {
            validateOptions(options as ComplexityOption[] | Record<string, ComplexityOption[]>);
          });
        });
      });
    });
  });

  // Count tests for Phase 2 verification
  describe('Building Class Counts', () => {
    it('should have 8 building classes (post-expansion)', () => {
      const classCount = Object.keys(profileTemplates.buildingClasses).length;
      // Updated after Phase 3-4: 6 original + 2 new (agricultural, defense_secure) = 8 classes
      expect(classCount).toBe(8);
    });

    it('should have correct total subclass count', () => {
      const buildingClasses = profileTemplates.buildingClasses as Record<string, BuildingClassConfig>;
      let totalSubclasses = 0;
      Object.values(buildingClasses).forEach((config) => {
        totalSubclasses += config.subclasses.length;
      });
      // After Phase 2: 47 original + 32 new = 79 subclasses
      // Before Phase 2: 47 subclasses
      expect(totalSubclasses).toBeGreaterThanOrEqual(47);
    });
  });

  // T206: Verify total subclass count is 110+
  describe('Phase 13 - Profiler Expansion Verification', () => {
    describe('T206: Subclass Count Verification', () => {
      it('should have at least 110 total subclasses across all building classes', () => {
        const buildingClasses = profileTemplates.buildingClasses as Record<string, BuildingClassConfig>;
        let totalSubclasses = 0;
        Object.values(buildingClasses).forEach((config) => {
          totalSubclasses += config.subclasses.length;
        });
        // Per spec: 47 original + 63 new = 110+ subclasses
        expect(totalSubclasses).toBeGreaterThanOrEqual(110);
      });
    });

    // T207: Verify building classes count is 8
    describe('T207: Building Classes Count Verification', () => {
      it('should have exactly 8 building classes', () => {
        const classCount = Object.keys(profileTemplates.buildingClasses).length;
        expect(classCount).toBe(8);
      });

      it('should include all expected building classes', () => {
        const expectedClasses = [
          'residential',
          'commercial',
          'industrial',
          'institution',
          'mixed',
          'infrastructure',
          'agricultural',
          'defense_secure'
        ];
        const actualClasses = Object.keys(profileTemplates.buildingClasses);
        expectedClasses.forEach((expectedClass) => {
          expect(actualClasses).toContain(expectedClass);
        });
      });
    });

    // T208: Verify regionConfig has all 4 regions
    describe('T208: Region Configuration Verification', () => {
      it('should have regionConfig with all 4 regions', () => {
        expect(profileTemplates).toHaveProperty('regionConfig');
        const regionConfig = (profileTemplates as { regionConfig: Record<string, unknown> }).regionConfig;
        expect(regionConfig).toHaveProperty('AU');
        expect(regionConfig).toHaveProperty('NZ');
        expect(regionConfig).toHaveProperty('UK');
        expect(regionConfig).toHaveProperty('US');
      });

      it('should have exactly 4 regions configured', () => {
        const regionConfig = (profileTemplates as { regionConfig: Record<string, unknown> }).regionConfig;
        const regionCount = Object.keys(regionConfig).length;
        expect(regionCount).toBe(4);
      });

      it('each region should have required configuration fields', () => {
        const regionConfig = (profileTemplates as { regionConfig: Record<string, { code: string; name: string; currency: string; currencySymbol: string; buildingCodeName: string; buildingCodeAbbrev: string; measurementSystem: string }> }).regionConfig;
        const requiredFields = ['code', 'name', 'currency', 'currencySymbol', 'buildingCodeName', 'buildingCodeAbbrev', 'measurementSystem'];

        Object.entries(regionConfig).forEach(([regionCode, config]) => {
          requiredFields.forEach((field) => {
            expect(config).toHaveProperty(field);
          });
        });
      });
    });

    // T209: Verify workScopeOptions includes 'new' and 'advisory' project types
    describe('T209: Work Scope Options Verification', () => {
      it('should have workScopeOptions with applicableProjectTypes including new and advisory', () => {
        expect(profileTemplates).toHaveProperty('workScopeOptions');
        const workScopeOptions = (profileTemplates as { workScopeOptions: { applicableProjectTypes: string[] } }).workScopeOptions;
        expect(workScopeOptions.applicableProjectTypes).toContain('new');
        expect(workScopeOptions.applicableProjectTypes).toContain('advisory');
      });

      it('should have work scope configuration for NEW project type', () => {
        const workScopeOptions = (profileTemplates as { workScopeOptions: Record<string, unknown> }).workScopeOptions;
        expect(workScopeOptions).toHaveProperty('new');
        const newScope = workScopeOptions.new as Record<string, unknown>;
        // NEW project type should have standard construction categories
        expect(newScope).toHaveProperty('enabling_works');
        expect(newScope).toHaveProperty('structure');
        expect(newScope).toHaveProperty('envelope');
        expect(newScope).toHaveProperty('services');
      });

      it('should have work scope configuration for ADVISORY project type', () => {
        const workScopeOptions = (profileTemplates as { workScopeOptions: Record<string, unknown> }).workScopeOptions;
        expect(workScopeOptions).toHaveProperty('advisory');
        const advisoryScope = workScopeOptions.advisory as Record<string, unknown>;
        // ADVISORY project type should have consulting/advisory categories
        expect(advisoryScope).toHaveProperty('due_diligence');
        expect(advisoryScope).toHaveProperty('feasibility');
        expect(advisoryScope).toHaveProperty('design_review');
        expect(advisoryScope).toHaveProperty('procurement_support');
      });
    });
  });

  // Project types validation
  describe('Project Types Validation', () => {
    it('should have 5 project types', () => {
      expect(profileTemplates.projectTypes).toHaveLength(5);
    });

    it('should include required project types', () => {
      const types = profileTemplates.projectTypes.map((t: { value: string }) => t.value);
      expect(types).toContain('refurb');
      expect(types).toContain('extend');
      expect(types).toContain('new');
      expect(types).toContain('remediation');
      expect(types).toContain('advisory');
    });
  });

  // Work scope validation
  describe('WorkScope Validation', () => {
    it('should have riskDefinitions', () => {
      expect(profileTemplates.workScopeOptions).toHaveProperty('riskDefinitions');
    });

    it('should have all risk definitions with required fields', () => {
      const riskDefs = profileTemplates.workScopeOptions.riskDefinitions as Record<string, { severity: string; title: string; description: string }>;
      Object.values(riskDefs).forEach((risk) => {
        expect(risk).toHaveProperty('severity');
        expect(risk).toHaveProperty('title');
        expect(risk).toHaveProperty('description');
        expect(['info', 'warning', 'critical']).toContain(risk.severity);
      });
    });
  });

  /**
   * Integration Tests (T210-T215)
   * These tests require a running server and database connection.
   * Test expectations are documented here for manual/E2E testing.
   *
   * T210: Test Profile API accepts 'agricultural' building class
   *   - POST /api/projects/[projectId]/profile with buildingClass: 'agricultural'
   *   - Expected: 200 OK, profile saved successfully
   *
   * T211: Test Profile API accepts 'defense_secure' building class
   *   - POST /api/projects/[projectId]/profile with buildingClass: 'defense_secure'
   *   - Expected: 200 OK, profile saved successfully
   *
   * T212: Test save/load profile with new subclasses returns correct data
   *   - Save profile with subclass: 'life_sciences', 'cleanroom', 'marina', 'airport_terminal'
   *   - GET /api/projects/[projectId]/profile
   *   - Expected: All subclass data preserved correctly
   *
   * T213: Test region selection persists when saving and loading profile
   *   - Save profile with region: 'UK' or 'US' or 'NZ'
   *   - GET /api/projects/[projectId]/profile
   *   - Expected: Region field matches saved value
   *
   * T214: Test work scope items appear for NEW project type
   *   - Set projectType: 'new' in profile
   *   - GET /api/projects/[projectId]/profile
   *   - Expected: workScopeOptions.new categories available (enabling_works, structure, envelope, services)
   *
   * T215: Test work scope items appear for ADVISORY project type
   *   - Set projectType: 'advisory' in profile
   *   - GET /api/projects/[projectId]/profile
   *   - Expected: workScopeOptions.advisory categories available (due_diligence, feasibility, design_review)
   */
  describe('Integration Tests (T210-T215) - API Testing Documentation', () => {
    it.skip('T210: Profile API accepts agricultural building class', () => {
      // Requires running server - see documentation above
    });

    it.skip('T211: Profile API accepts defense_secure building class', () => {
      // Requires running server - see documentation above
    });

    it.skip('T212: Save/load profile with new subclasses returns correct data', () => {
      // Requires running server - see documentation above
    });

    it.skip('T213: Region selection persists when saving and loading profile', () => {
      // Requires running server - see documentation above
    });

    it.skip('T214: Work scope items appear for NEW project type', () => {
      // Requires running server - see documentation above
    });

    it.skip('T215: Work scope items appear for ADVISORY project type', () => {
      // Requires running server - see documentation above
    });
  });

  /**
   * Manual Testing Checklist (T216-T225)
   * These tests require visual inspection in the browser.
   * Mark as verified after manual testing.
   *
   * T216: Verify all 8 building classes appear in ProfileSection dropdown
   *   - Expected classes: residential, commercial, industrial, institution, mixed, infrastructure, agricultural, defense_secure
   *
   * T217: Verify agricultural subclasses (11) render correctly with tractor icon
   *   - Expected subclasses: farm_buildings, equestrian, winery_brewery, food_processing_rural,
   *     aquaculture, vertical_farming, rural_tourism, irrigation_infrastructure, grain_storage, livestock, other
   *
   * T218: Verify defense_secure subclasses (10) render correctly with shield icon
   *   - Expected subclasses: military_base, secure_data_centre, embassy_consulate, correctional_facility,
   *     border_control, intelligence_facility, nuclear_facility, weapons_storage, government_bunker, critical_comms, other
   *
   * T219: Verify Marine/Coastal subclasses (10) render with appropriate scale fields
   *   - marina, seawall_revetment, jetty_wharf, boat_ramp, coastal_protection, dredging,
   *     offshore_platform, aquaculture_marine, ferry_terminal, cruise_terminal
   *
   * T220: Verify Aviation subclasses (10) render with appropriate scale fields
   *   - airport_terminal, airfield_runway, hangar_maintenance, cargo_freight, heliport,
   *     air_traffic_control, fuel_farm, ground_support, vip_lounge, regional_airport
   *
   * T221: Verify Telecommunications subclasses (10) render with appropriate scale fields
   *   - telecom_tower, 5g_small_cell, data_centre_colo, data_centre_hyperscale, data_centre_edge,
   *     fibre_network, submarine_cable, exchange_facility, broadcast_facility, satellite_ground
   *
   * T222: Verify region selector displays all 4 regions and defaults to AU
   *   - Expected regions: Australia, New Zealand, United Kingdom, United States
   *   - Default selection: AU (Australia)
   *
   * T223: Verify complexity score calculates correctly with new dimensions
   *   - Test with contamination_level: heavily_contaminated (multiplier: 3)
   *   - Test with access_constraints: remote (multiplier: 2)
   *   - Test with operational_constraints: 24_7_occupied (multiplier: 3)
   *
   * T224: Verify risk flags trigger for new risk conditions
   *   - high_security: triggers when security_classification is 'top_secret' or 'sci'
   *   - biosafety_3_plus: triggers when biosafety_level is 'bsl_3' or 'bsl_4'
   *   - remote_site: triggers when remoteness is 'very_remote'
   *   - live_operations: triggers when operational_constraints is 'live_environment' or '24_7_occupied'
   *   - heritage_adaptive_reuse: triggers when subclass is 'heritage_conversion'
   *
   * T225: Verify ConsultantPreview shows relevant disciplines for new subclasses
   *   - life_sciences: Lab Planner, PC Consultant, Fire Engineer, HVAC Specialist
   *   - cleanroom: Cleanroom Specialist, HVAC, Fire Engineer, ESD Consultant
   *   - data_centre_hyperscale: Critical Systems Engineer, Electrical Engineer, Fire Engineer
   *   - marina: Coastal Engineer, Marine Surveyor, Environmental Consultant
   *   - airport_terminal: Aviation Planner, Security Consultant, Wayfinding
   *   - winery_brewery: Process Engineer, Food Safety Consultant
   *   - defense_secure: Security Consultant, SCIF Specialist, Fire Engineer
   *   - agricultural: Agricultural Engineer, Environmental Consultant, Civil Engineer
   */
  describe('Manual Testing Checklist (T216-T225) - Browser Verification', () => {
    it.skip('T216: All 8 building classes appear in ProfileSection dropdown', () => {
      // Manual verification required - see checklist above
    });

    it.skip('T217: Agricultural subclasses (11) render correctly with tractor icon', () => {
      // Manual verification required - see checklist above
    });

    it.skip('T218: Defense/Secure subclasses (10) render correctly with shield icon', () => {
      // Manual verification required - see checklist above
    });

    it.skip('T219: Marine/Coastal subclasses (10) render with appropriate scale fields', () => {
      // Manual verification required - see checklist above
    });

    it.skip('T220: Aviation subclasses (10) render with appropriate scale fields', () => {
      // Manual verification required - see checklist above
    });

    it.skip('T221: Telecommunications subclasses (10) render with appropriate scale fields', () => {
      // Manual verification required - see checklist above
    });

    it.skip('T222: Region selector displays all 4 regions and defaults to AU', () => {
      // Manual verification required - see checklist above
    });

    it.skip('T223: Complexity score calculates correctly with new dimensions', () => {
      // Manual verification required - see checklist above
    });

    it.skip('T224: Risk flags trigger for new risk conditions', () => {
      // Manual verification required - see checklist above
    });

    it.skip('T225: ConsultantPreview shows relevant disciplines for new subclasses', () => {
      // Manual verification required - see checklist above
    });
  });
});
