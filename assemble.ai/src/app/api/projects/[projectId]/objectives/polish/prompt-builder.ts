/**
 * Pure prompt-builder for the objectives polish pass.
 * Extracted so it can be unit-tested without touching the database or AI client.
 */

const INSTRUCTION_REGEX = /(?<!:)\/\/\s*(.+)/;

export interface PolishBullet {
  text: string;
}

export interface PolishPromptInput {
  profileContext: string;
  domainContextSection: string;
  bullets: PolishBullet[];
}

interface ParsedBullet {
  index: number;
  cleanedText: string;
  instruction: string | null;
  isInstructionOnly: boolean;
}

function parseBullet(rawText: string, idx: number): ParsedBullet {
  const trimmed = rawText.trim();
  const match = INSTRUCTION_REGEX.exec(trimmed);

  if (!match) {
    return { index: idx, cleanedText: trimmed, instruction: null, isInstructionOnly: false };
  }

  const instruction = match[1].trim();
  const beforeMarker = trimmed.slice(0, match.index).trim();

  if (beforeMarker.length === 0) {
    return { index: idx, cleanedText: '', instruction, isInstructionOnly: true };
  }

  return {
    index: idx,
    cleanedText: beforeMarker,
    instruction,
    isInstructionOnly: false,
  };
}

export function buildPolishPrompt(input: PolishPromptInput): string {
  const { profileContext, domainContextSection, bullets } = input;
  // Instruction-only bullets (just `// ...`) carry no expandable content;
  // skip them entirely so the AI never sees them and never has a reason to
  // return an empty slot. The handler simply leaves those rows untouched.
  const parsed = bullets
    .map((b, i) => parseBullet(b.text, i))
    .filter((p) => !p.isInstructionOnly);

  const bulletList = parsed
    .map((p, displayIdx) => `${displayIdx + 1}. ${p.cleanedText}`)
    .join('\n');

  const steeringLines = parsed
    .filter((p) => p.instruction)
    .map((p, displayIdx) => `- STEERING for bullet ${displayIdx + 1}: ${p.instruction}`)
    .join('\n');

  const steeringSection = steeringLines
    ? `\nPER-BULLET STEERING (apply only to the indicated bullet):\n${steeringLines}\n`
    : '';

  const expectedCount = parsed.length;

  return `You are an expert construction project manager and technical writer in Australia.

${profileContext}
${domainContextSection ? `${domainContextSection}\n` : ''}OBJECTIVES TO EXPAND (${expectedCount} bullets — return exactly ${expectedCount} polished strings):

${bulletList}
${steeringSection}
INSTRUCTIONS:
Expand each bullet point to 10-15 words while preserving its meaning. Critical rules:
1. Return EXACTLY ${expectedCount} polished strings — one per input bullet, in the same order. Never drop, merge, or reorder bullets.
2. Use the KNOWLEDGE DOMAIN CONTEXT above to add accurate Australian standards references (NCC 2022, BCA, AS standards) — cite only references found in the domain context, do not invent standards.
3. Make objectives measurable where possible (quantities, percentages, ratings, timeframes).
4. Keep language professional, formal, and concise — suitable for tender documentation.
5. If a STEERING note is given for a bullet, treat it as the user's refinement instruction for that bullet only — do NOT apply it to any other bullet.
6. STRIP any "//" markers and the text after them from your output. The polished bullet must contain no "//" notation.
7. Do NOT invent new objectives. Do NOT skip bullets even if they look duplicative — the user owns deduplication.

Return a JSON array of EXACTLY ${expectedCount} expanded strings, in the same order as the input:
["expanded bullet 1", "expanded bullet 2", ...]`;
}
