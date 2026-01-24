/**
 * Template Substitution Utility
 * Handles variable substitution and conditional variations for objective templates
 * Feature: 018-project-initiator
 */

import type {
  QuestionAnswers,
  ObjectiveTemplate,
  ObjectiveField,
  TemplateSubstitutionContext,
} from '@/lib/types/project-initiator';

/**
 * Substitutes variables in a template string
 * Syntax: {{variable_name}}
 *
 * @param template - Template string with {{variable}} placeholders
 * @param context - Context containing answers and project details
 * @returns String with variables substituted
 *
 * @example
 * substituteVariables(
 *   "Build a {{building_scale}} house",
 *   { answers: { building_scale: "large" } }
 * )
 * // Returns: "Build a large house"
 */
export function substituteVariables(
  template: string,
  context: TemplateSubstitutionContext
): string {
  // Validate template is a string
  if (typeof template !== 'string') {
    console.error('substituteVariables received non-string template:', template, 'type:', typeof template);
    return String(template || '');
  }

  return template.replace(/\{\{(\w+)(?::([^}]+))?\}\}/g, (match, key, defaultValue) => {
    // Priority: answers > projectDetails > default > fallback
    const answerValue = context.answers[key];

    if (answerValue !== undefined && answerValue !== null) {
      // Handle array values (from multi-select questions)
      if (Array.isArray(answerValue)) {
        return answerValue.join(', ');
      }
      return String(answerValue);
    }

    // Check project details
    if (context.projectDetails && key in context.projectDetails) {
      const detailValue = context.projectDetails[key];
      if (detailValue !== undefined && detailValue !== null) {
        return String(detailValue);
      }
    }

    // Use default value if provided
    if (defaultValue) {
      return defaultValue;
    }

    // Fallback to placeholder
    return `[${key}]`;
  });
}

/**
 * Applies conditional variations to an objective field
 * Supports two variation formats:
 * 1. Flat variations: { variations: { value1: "text", value2: "text" } }
 * 2. Named groups: { bedroom_configs: { small: "text", large: "text" } }
 *
 * @param field - Objective field with template and optional variations
 * @param answers - User's question answers
 * @returns Template string with variations applied
 */
export function applyFieldVariations(
  field: ObjectiveField,
  answers: QuestionAnswers
): string {
  // Validate field has a template property
  if (!field || typeof field !== 'object') {
    console.error('Invalid field object:', field);
    return '';
  }

  if (!field.template || typeof field.template !== 'string') {
    console.error('Field missing template property or template is not a string:', field);
    return field.template || '';
  }

  // Start with base template
  let template = field.template;

  // Try flat variations first (new format)
  if (field.variations) {
    for (const [answerKey, answerValue] of Object.entries(answers)) {
      const answerValueStr = Array.isArray(answerValue) ? answerValue[0] : String(answerValue);
      if (field.variations[answerValueStr]) {
        template = field.variations[answerValueStr];
        return template; // Found match, return immediately
      }
    }
  }

  // Try named variation groups (legacy format)
  // Look for properties ending in "_options", "_configs", "_notes", "_pathways", etc.
  for (const [fieldKey, fieldValue] of Object.entries(field)) {
    // Skip non-object fields and special fields
    if (fieldKey === 'template' || fieldKey === 'variations' || typeof fieldValue !== 'object') {
      continue;
    }

    // Check each answer to see if it matches this variation group
    for (const [answerKey, answerValue] of Object.entries(answers)) {
      const answerValueStr = Array.isArray(answerValue) ? answerValue[0] : String(answerValue);

      // Check if this variation group has a match for this answer value
      if (fieldValue && typeof fieldValue === 'object' && answerValueStr in fieldValue) {
        template = (fieldValue as Record<string, string>)[answerValueStr];
        return template; // Found match, return immediately
      }
    }
  }

  return template;
}

/**
 * Generates objectives from a template with substitution and variations
 * This is the main function used by the ObjectivesPreviewStep
 *
 * @param template - Objective template for the project type
 * @param context - Substitution context
 * @returns Objectives with all substitutions applied
 */
export function generateObjectives(
  template: ObjectiveTemplate,
  context: TemplateSubstitutionContext
): {
  functional: string;
  quality: string;
  budget: string;
  program: string;
} {
  // Step 1: Apply field variations and get template strings
  const functionalTemplate = applyFieldVariations(template.functional, context.answers);
  const qualityTemplate = applyFieldVariations(template.quality, context.answers);
  const budgetTemplate = applyFieldVariations(template.budget, context.answers);
  const programTemplate = applyFieldVariations(template.program, context.answers);

  // Step 2: Substitute variables in each objective
  return {
    functional: substituteVariables(functionalTemplate, context),
    quality: substituteVariables(qualityTemplate, context),
    budget: substituteVariables(budgetTemplate, context),
    program: substituteVariables(programTemplate, context),
  };
}

/**
 * Validates that all required variables in a template have values
 * Useful for detecting missing question answers
 *
 * @param template - Template string
 * @param context - Substitution context
 * @returns Array of missing variable names
 */
export function findMissingVariables(
  template: string,
  context: TemplateSubstitutionContext
): string[] {
  const variableRegex = /\{\{(\w+)(?::([^}]+))?\}\}/g;
  const missing: string[] = [];
  let match;

  while ((match = variableRegex.exec(template)) !== null) {
    const key = match[1];
    const defaultValue = match[2];

    // Skip if has default value
    if (defaultValue) {
      continue;
    }

    const hasValue =
      context.answers[key] !== undefined ||
      (context.projectDetails && context.projectDetails[key] !== undefined);

    if (!hasValue) {
      missing.push(key);
    }
  }

  return missing;
}
