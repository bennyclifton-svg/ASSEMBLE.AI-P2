/**
 * T230: Field Types for Unified Field Generation
 *
 * Defines the taxonomy of generatable fields across the application,
 * along with metadata for prompt engineering and context requirements.
 */

/**
 * All supported field types for AI generation
 */
export type FieldType =
  // RFT Fields (Consultant Brief)
  | 'brief.service'       // briefServices field
  | 'brief.deliverables'  // briefDeliverables field

  // RFT Fields (Contractor Scope)
  | 'scope.works'         // scopeWorks field

  // TRR Fields (Future)
  | 'trr.executiveSummary'
  | 'trr.clarifications'
  | 'trr.recommendation'

  // Report Fields (Future)
  | 'report.section'
  | 'report.summary';

/**
 * Input interpretation modes - determines how AI treats user input
 */
export type InputInterpretation =
  | 'instruction'  // User gave a command (e.g., "list 4 key services")
  | 'enhance'      // User provided content to expand
  | 'generate'     // Empty field - generate from context
  | 'focused';     // User provided topic keywords to focus on

/**
 * Configuration for bullet-point generation (short response pattern)
 */
export interface BulletGenerationConfig {
  enabled: true;
  headers: string[];
  bulletCount: { min: number; max: number };
  wordCount: { short: { min: number; max: number }; expanded: { min: number; max: number } };
}

/**
 * Metadata for each field type
 */
export interface FieldTypeMetadata {
  displayName: string;
  description: string;
  contextLabel: string;      // Label used in prompts (e.g., "consultant services", "scope of works")
  requiresDiscipline: boolean;
  requiresTrade: boolean;
  defaultPlaceholder: string;
  bulletGeneration?: BulletGenerationConfig;
}

/**
 * Field metadata registry
 */
export const FIELD_METADATA: Record<FieldType, FieldTypeMetadata> = {
  // RFT Consultant Fields
  'brief.service': {
    displayName: 'Service Description',
    description: 'Professional description of consultant services required',
    contextLabel: 'consultant services',
    requiresDiscipline: true,
    requiresTrade: false,
    defaultPlaceholder: 'Enter service details or instructions for AI...',
    bulletGeneration: {
      enabled: true,
      headers: ['Advisory Services', 'Design Services', 'Documentation', 'Project Support'],
      bulletCount: { min: 6, max: 12 },
      wordCount: { short: { min: 2, max: 5 }, expanded: { min: 10, max: 15 } },
    },
  },
  'brief.deliverables': {
    displayName: 'Deliverables',
    description: 'Expected deliverables and milestones',
    contextLabel: 'consultant deliverables',
    requiresDiscipline: true,
    requiresTrade: false,
    defaultPlaceholder: 'Enter deliverables or instructions for AI...',
    bulletGeneration: {
      enabled: true,
      headers: ['Reports & Studies', 'Drawings & Documentation', 'Certifications', 'Ongoing Support'],
      bulletCount: { min: 6, max: 12 },
      wordCount: { short: { min: 2, max: 5 }, expanded: { min: 10, max: 15 } },
    },
  },

  // RFT Contractor Fields
  'scope.works': {
    displayName: 'Scope of Works',
    description: 'Description of contractor scope and responsibilities',
    contextLabel: 'contractor scope of works',
    requiresDiscipline: false,
    requiresTrade: true,
    defaultPlaceholder: 'Enter scope details or instructions for AI...',
    bulletGeneration: {
      enabled: true,
      headers: ['Site Works', 'Installation', 'Testing & Commissioning', 'Warranties'],
      bulletCount: { min: 6, max: 12 },
      wordCount: { short: { min: 2, max: 5 }, expanded: { min: 10, max: 15 } },
    },
  },

  // TRR Fields (Future)
  'trr.executiveSummary': {
    displayName: 'Executive Summary',
    description: 'High-level summary of tender review',
    contextLabel: 'tender review executive summary',
    requiresDiscipline: true,
    requiresTrade: false,
    defaultPlaceholder: 'Enter summary or instructions for AI...',
  },
  'trr.clarifications': {
    displayName: 'Clarifications',
    description: 'Questions and clarifications required from tenderers',
    contextLabel: 'clarifications required',
    requiresDiscipline: true,
    requiresTrade: false,
    defaultPlaceholder: 'Enter clarifications or instructions for AI...',
  },
  'trr.recommendation': {
    displayName: 'Recommendation',
    description: 'Final recommendation based on evaluation',
    contextLabel: 'tender recommendation',
    requiresDiscipline: true,
    requiresTrade: false,
    defaultPlaceholder: 'Enter recommendation or instructions for AI...',
  },

  // Report Fields (Future)
  'report.section': {
    displayName: 'Report Section',
    description: 'Content for a report section',
    contextLabel: 'report section content',
    requiresDiscipline: false,
    requiresTrade: false,
    defaultPlaceholder: 'Enter content or instructions for AI...',
  },
  'report.summary': {
    displayName: 'Report Summary',
    description: 'Summary or abstract for a report',
    contextLabel: 'report summary',
    requiresDiscipline: false,
    requiresTrade: false,
    defaultPlaceholder: 'Enter summary or instructions for AI...',
  },
};

/**
 * Patterns that indicate the input is an instruction
 */
const INSTRUCTION_PATTERNS = [
  // Starts with common imperative verbs
  /^(list|write|describe|create|generate|provide|outline|draft|summarize|explain|include|add|make|define|specify)\b/i,
  // Contains instructional phrases
  /\b(should be|must include|needs to|make sure|ensure that|focus on|emphasize|highlight)\b/i,
  // Bullet point or numbered format requests
  /\b(\d+\s*(items?|points?|things?|bullet|key)|bullet\s*points?|numbered\s*list)\b/i,
  // Length or format constraints
  /\b(\d+\s*(sentence|paragraph|word|line)|keep it|be concise|be brief|be detailed)\b/i,
];

/**
 * Patterns that indicate topic-focused input (not just content)
 */
const FOCUS_PATTERNS = [
  /^focus\s+(on|around)\b/i,
  /^(about|regarding|concerning|related to)\b/i,
  /\b(specifically|particularly|especially)\s+(on|about|regarding)\b/i,
];

/**
 * Detects the interpretation mode for user input
 * @param input - The user's input text
 * @returns The detected input interpretation mode
 */
export function detectInputMode(input: string): InputInterpretation {
  const trimmed = input.trim();

  // Empty input = generate mode
  if (!trimmed) {
    return 'generate';
  }

  // Check for instruction patterns
  for (const pattern of INSTRUCTION_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'instruction';
    }
  }

  // Check for focus patterns
  for (const pattern of FOCUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return 'focused';
    }
  }

  // Non-empty text that's not an instruction = enhance mode
  return 'enhance';
}

/**
 * Check if input looks like an instruction
 * @param input - The user's input text
 * @returns True if input appears to be an instruction
 */
export function isInstructionInput(input: string): boolean {
  return detectInputMode(input) === 'instruction';
}

/**
 * Get prompt template for RFT fields with short bullet generation (2-5 words)
 * Follows the same pattern as objectives generation
 */
function getRftBulletPromptTemplate(
  fieldType: FieldType,
  mode: InputInterpretation,
  hasRAG: boolean
): string {
  const metadata = FIELD_METADATA[fieldType];
  const bulletConfig = metadata.bulletGeneration!;
  const headersFormatted = bulletConfig.headers.map(h => `**${h}**`).join(', ');

  // RAG section
  const ragSection = hasRAG
    ? `## Retrieved Documents (Knowledge Source)
{ragChunks}`
    : `## Note
No Knowledge Source documents are available for this project. Generate content based on the project context above and professional best practices for the {contextName} discipline/trade.`;

  // Discipline-specific instruction
  const disciplineInstruction = `

CRITICAL: This content must be SPECIFIC to the {contextName} discipline/trade. Do NOT generate generic project information - focus ONLY on services, deliverables, and requirements that are directly relevant to {contextName}.`;

  switch (mode) {
    case 'generate':
    case 'focused':
      // ITERATION 1: Generate SHORT bullet points (2-5 words each)
      const focusSection = mode === 'focused' ? `

## Focus Area
{userInput}

Focus your bullets specifically on this topic while maintaining the short format.` : '';

      return `You are an expert construction project manager in Australia generating ${metadata.contextLabel} for {contextName}.

## Project Context
{projectContext}

${ragSection}${focusSection}

INSTRUCTIONS - ITERATION 1 (SHORT BULLETS):
Generate SHORT bullet points only (${bulletConfig.wordCount.short.min}-${bulletConfig.wordCount.short.max} words each).

1. Each bullet: ${bulletConfig.wordCount.short.min}-${bulletConfig.wordCount.short.max} words MAXIMUM (e.g., "Design review assistance", "NCC compliance assessment")
2. NO prose, NO sentences, NO detailed explanations
3. Output ${bulletConfig.bulletCount.min}-${bulletConfig.bulletCount.max} bullets total
4. Group by category using headers: ${headersFormatted}
5. Use ONLY headers that are relevant - skip headers with no applicable items
6. Be SPECIFIC to {contextName} - not generic project content

Example format for ${metadata.contextLabel}:
**${bulletConfig.headers[0]}**
- Design review assistance
- Compliance assessment
- Specification advice

**${bulletConfig.headers[1]}**
- Schematic design development
- Detail coordination
- Shop drawing review

Generate content for {contextName} now.${disciplineInstruction}`;

    case 'enhance':
      // ITERATION 2: Expand short bullets to 10-15 words
      return `You are an expert construction project manager and technical writer in Australia.

## Existing Content to Expand
{userInput}

## Project Context
{projectContext}

${ragSection}

INSTRUCTIONS - ITERATION 2 (EXPAND BULLETS):
Expand each short bullet point to ${bulletConfig.wordCount.expanded.min}-${bulletConfig.wordCount.expanded.max} words.

1. Add specific Australian standards references where relevant (AS, NCC, BCA)
2. Make requirements measurable where possible (quantities, timeframes, deliverable types)
3. PRESERVE the user's structure - keep ALL headers and bullet order exactly as provided
4. PRESERVE any user edits - do NOT change, remove, or reorder items
5. Keep language professional and formal - suitable for tender documentation
6. Do NOT add new categories or bullet points not present in the input
7. Do NOT remove any items - every input bullet must have a corresponding expanded output

Example transformation:
Input: "- Design review assistance"
Output: "- Provide design review assistance during schematic and design development phases per AS 1100.101"

Input: "- NCC compliance assessment"
Output: "- Conduct NCC 2022 compliance assessment and provide written certification of conformance"

Input: "- Shop drawing review"
Output: "- Review and approve contractor shop drawings within 5 business days of submission"

Generate expanded content for {contextName}.${disciplineInstruction}`;

    case 'instruction':
      // User gave explicit instructions - follow them but still aim for bullet format
      return `You are an expert construction project manager in Australia generating ${metadata.contextLabel} for {contextName}.

Follow these instructions:
{userInput}

## Project Context
{projectContext}

${ragSection}

Generate professional content that addresses the user's instructions. If no format is specified, use short bullet points (${bulletConfig.wordCount.short.min}-${bulletConfig.wordCount.short.max} words each) organized under headers: ${headersFormatted}.${disciplineInstruction}`;
  }
}

/**
 * Get the appropriate prompt template based on input mode and field type
 * @param fieldType - The type of field being generated
 * @param mode - The detected input interpretation mode
 * @param hasRAG - Whether RAG documents are available (optional, defaults to true)
 * @returns The prompt template string
 */
export function getPromptTemplate(fieldType: FieldType, mode: InputInterpretation, hasRAG: boolean = true): string {
  const metadata = FIELD_METADATA[fieldType];

  // Route RFT fields with bullet generation to the specialized prompt template
  if (metadata.bulletGeneration?.enabled) {
    return getRftBulletPromptTemplate(fieldType, mode, hasRAG);
  }

  const isDisciplineField = fieldType.startsWith('brief.') || fieldType.startsWith('scope.');

  // Add discipline-specific instruction for brief/scope fields
  const disciplineInstruction = isDisciplineField
    ? `\n\nCRITICAL: This content must be SPECIFIC to the {contextName} discipline/trade. Do NOT generate generic project information - focus ONLY on services, deliverables, and requirements that are directly relevant to {contextName}.`
    : '';

  // RAG section - either includes retrieved documents or explains they're not available
  const ragSection = hasRAG
    ? `## Retrieved Documents (Knowledge Source)
{ragChunks}`
    : `## Note
No Knowledge Source documents are available for this project. Generate content based on the project context above and professional best practices for the {contextName} discipline/trade.`;

  // Source reference for generation instructions
  const sourceRef = hasRAG ? 'the project context and retrieved documents' : 'the project context and professional best practices';

  switch (mode) {
    case 'instruction':
      return `Follow these instructions to generate ${metadata.contextLabel} for {contextName}:

{userInput}

Use the following context to inform your response:

## Project Context
{projectContext}

${ragSection}

Generate professional content that addresses the user's instructions while incorporating relevant information from the provided context.${disciplineInstruction}`;

    case 'enhance':
      return `Enhance and expand the following ${metadata.contextLabel} content for {contextName} professionally:

## Existing Content
{userInput}

## Project Context
{projectContext}

${ragSection}

Improve and expand the existing content while maintaining its intent. Make it more detailed, professional, and comprehensive using the provided context. Keep the original structure and key points.${disciplineInstruction}`;

    case 'generate':
      return `Generate professional ${metadata.contextLabel} content for {contextName} on this project.

## Project Context
{projectContext}

${ragSection}

Create comprehensive, professional content appropriate for a tender document. Be specific and detailed based on ${sourceRef}.${disciplineInstruction}`;

    case 'focused':
      return `Generate ${metadata.contextLabel} content for {contextName} focusing on the specified topic:

## Focus Area
{userInput}

## Project Context
{projectContext}

${ragSection}

Create professional content that specifically addresses the requested focus area while using the provided context. Prioritize information related to the focus topic.${disciplineInstruction}`;
  }
}

/**
 * Get display name for a field type
 */
export function getFieldDisplayName(fieldType: FieldType): string {
  return FIELD_METADATA[fieldType]?.displayName ?? fieldType;
}

/**
 * Get placeholder text for a field type
 */
export function getFieldPlaceholder(fieldType: FieldType): string {
  return FIELD_METADATA[fieldType]?.defaultPlaceholder ?? 'Enter content or instructions for AI...';
}

/**
 * Check if a field type requires discipline context
 */
export function requiresDiscipline(fieldType: FieldType): boolean {
  return FIELD_METADATA[fieldType]?.requiresDiscipline ?? false;
}

/**
 * Check if a field type requires trade context
 */
export function requiresTrade(fieldType: FieldType): boolean {
  return FIELD_METADATA[fieldType]?.requiresTrade ?? false;
}
