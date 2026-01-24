/**
 * Profiler Validation Schemas
 * Feature 019 - Project Profiler
 */

import { z } from 'zod';

// ============================================================================
// PROFILE VALIDATION
// ============================================================================

// Define enums directly for Zod v4 compatibility
export const buildingClassSchema = z.enum(['residential', 'commercial', 'industrial', 'institution', 'mixed', 'infrastructure']);
export const projectTypeSchema = z.enum(['refurb', 'extend', 'new', 'remediation', 'advisory']);

export const profileSchema = z.object({
  buildingClass: buildingClassSchema,
  projectType: projectTypeSchema,
  subclass: z.array(z.string()).default([]), // Allow empty array for partial saves
  subclassOther: z.array(z.string()).nullable().optional(),
  scaleData: z.record(z.number().positive('Scale values must be positive')).default({}), // Allow empty for partial saves
  complexity: z.record(z.string()).default({}), // Allow empty for partial saves
});

// Mixed class allows multiple subclasses (up to 4)
export const mixedClassProfileSchema = profileSchema.extend({
  buildingClass: z.literal('mixed'),
  subclass: z.array(z.string()).max(4, 'Maximum 4 subclasses for Mixed').default([]),
});

export type ProfileSchemaType = z.infer<typeof profileSchema>;

// ============================================================================
// OBJECTIVES VALIDATION
// ============================================================================

export const objectiveSourceSchema = z.enum(['manual', 'ai_generated', 'ai_polished']);

export const objectiveContentSchema = z.object({
  content: z.string().min(10, 'Content too short'),
  source: objectiveSourceSchema,
  originalAi: z.string().nullable(),
  editHistory: z.array(z.string()).nullable(),
});

export const objectivesInputSchema = z.object({
  functionalQuality: objectiveContentSchema.optional(),
  planningCompliance: objectiveContentSchema.optional(),
}).refine(
  (data) => data.functionalQuality || data.planningCompliance,
  'At least one objective category required'
);

export const generateRequestSchema = z.object({
  profileId: z.string().min(1, 'Profile ID required'),
});

export const polishRequestSchema = z.object({
  functionalQualityUser: z.string().min(10, 'Content too short'),
  planningComplianceUser: z.string().min(10, 'Content too short'),
});

export type ObjectivesInputType = z.infer<typeof objectivesInputSchema>;
export type GenerateRequestType = z.infer<typeof generateRequestSchema>;
export type PolishRequestType = z.infer<typeof polishRequestSchema>;

// ============================================================================
// SCALE FIELD VALIDATION (Dynamic based on subclass)
// ============================================================================

// Common scale field constraints
export const scaleConstraints: Record<string, { min: number; max: number }> = {
  beds: { min: 1, max: 500 },
  dementia_beds: { min: 0, max: 500 },
  gfa_sqm: { min: 50, max: 500000 },
  gfa_per_bed: { min: 30, max: 150 },
  units: { min: 1, max: 1000 },
  levels: { min: 1, max: 100 },
  storeys: { min: 1, max: 100 },
  rooms: { min: 1, max: 2000 },
  nla_sqm: { min: 100, max: 200000 },
  ilus: { min: 1, max: 500 },
  households: { min: 1, max: 50 },
  beds_per_household: { min: 6, max: 20 },
};

export function validateScaleField(key: string, value: number): boolean {
  const constraints = scaleConstraints[key];
  if (!constraints) return value > 0;
  return value >= constraints.min && value <= constraints.max;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function validateProfile(data: unknown): { success: true; data: ProfileSchemaType } | { success: false; errors: z.ZodError } {
  const result = profileSchema.safeParse(data);
  if (result.success) {
    // Additional validation for mixed class
    if (result.data.buildingClass === 'mixed') {
      const mixedResult = mixedClassProfileSchema.safeParse(data);
      if (!mixedResult.success) {
        return { success: false, errors: mixedResult.error };
      }
    }
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

export function formatValidationErrors(errors: z.ZodError): Array<{ field: string; message: string }> {
  return errors.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}
