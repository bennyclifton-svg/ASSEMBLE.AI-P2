import type { ObjectiveType } from '@/lib/db/objectives-schema';

export interface PolishFreshPromptInput {
  section: ObjectiveType;
  profileContext: string;
  domainContextSection: string;
  inferenceRulesFormatted: string;
}

const SECTION_DEFINITIONS: Record<ObjectiveType, string> = {
  functional: 'What the building physically provides and how it operates (physical attributes, design features, operational requirements).',
  quality: 'How well the building performs and materials/finish standards (quality, performance, user experience).',
  planning: 'Planning approvals and regulatory compliance (DA/CDC, environmental, council/authority requirements).',
  compliance: 'Building codes and certification requirements (NCC/BCA, Australian Standards, certifications).',
};

export function buildPolishFreshPrompt(input: PolishFreshPromptInput): string {
  const { section, profileContext, domainContextSection, inferenceRulesFormatted } = input;
  return `You are an expert construction project manager in Australia.

${profileContext}
${domainContextSection ? `${domainContextSection}\n` : ''}TARGET SECTION: ${section.toUpperCase()}
${SECTION_DEFINITIONS[section]}

SUGGESTED ITEMS FROM PROJECT ANALYSIS:
${inferenceRulesFormatted || '(No specific rules matched — generate based on project profile)'}

INSTRUCTIONS:
Generate 4-8 objectives for the ${section} section. For EACH objective, produce TWO forms — both "short" and "polished":
- "short": 2-5 words, terse bullet
- "polished": 10-15 words, professional tender-grade language with Australian standards references (NCC 2022, BCA, AS standards) where supported by the KNOWLEDGE DOMAIN CONTEXT. Make measurable where possible.

Cite ONLY standards present in the domain context — do NOT invent standards.

Respond in JSON format:
{
  "items": [
    { "short": "Premium material selection", "polished": "Premium material selection meeting NCC 2022 Section J energy efficiency standards" },
    ...
  ]
}`;
}
