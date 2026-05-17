/**
 * Pure prompt-builder for the objectives polish pass.
 * Extracted so it can be unit-tested without touching the database or AI client.
 */

const INSTRUCTION_REGEX = /(?<!:)\/\/\s*(.+)/;

export interface PolishBullet {
  text: string;
  sourceDetail?: string;
}

export interface PolishPromptInput {
  profileContext: string;
  domainContextSection: string;
  attachedDocumentContext?: string;
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
  const { profileContext, domainContextSection, attachedDocumentContext = '', bullets } = input;
  // Instruction-only bullets (just `// ...`) carry no expandable content;
  // skip them entirely so the AI never sees them and never has a reason to
  // return an empty slot. The handler simply leaves those rows untouched.
  const parsed = bullets
    .map((b, i) => parseBullet(b.text, i))
    .filter((p) => !p.isInstructionOnly);

  const bulletList = parsed
    .map((p, displayIdx) => {
      const sourceDetail = bullets[p.index]?.sourceDetail?.trim();
      return sourceDetail
        ? `${displayIdx + 1}. ${p.cleanedText}\n   Source evidence: ${sourceDetail}`
        : `${displayIdx + 1}. ${p.cleanedText}`;
    })
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
${attachedDocumentContext ? `## ATTACHED INDEXED DOCUMENT CONTEXT - AUTHORITATIVE\n${attachedDocumentContext}\n\n` : ''}${domainContextSection ? `${domainContextSection}\n` : ''}OBJECTIVES TO EXPAND (${expectedCount} bullets — return exactly ${expectedCount} polished strings):

${bulletList}
${steeringSection}
INSTRUCTIONS:
Expand each bullet point to 18-30 words while preserving its meaning. Critical rules:
1. Return EXACTLY ${expectedCount} polished strings — one per input bullet, in the same order. Never drop, merge, or reorder bullets.
2. When ATTACHED INDEXED DOCUMENT CONTEXT is present, use it first. It is authoritative for project-specific facts, quantities, approvals, authorities, standards, warranties, dates, and thresholds.
3. Use the KNOWLEDGE DOMAIN CONTEXT only as supplementary phrasing or regulatory support.
4. Use any "Source evidence" under each bullet as the most specific grounding for that bullet.
5. Preserve the short bullet's intent. Add detail, evidence, and measurable criteria from the attached document where supported; otherwise use profile and knowledge context only.
6. Make objectives measurable where possible (quantities, percentages, ratings, timeframes).
7. Keep language professional, formal, and concise — suitable for tender documentation.
8. If a STEERING note is given for a bullet, treat it as the user's refinement instruction for that bullet only — do NOT apply it to any other bullet.
9. STRIP any "//" markers and the text after them from your output. The polished bullet must contain no "//" notation.
10. Do NOT invent new objectives. Do NOT skip bullets even if they look duplicative — the user owns deduplication.
11. Do NOT replace a curated short bullet with a different objective. Long mode expands; it does not re-select.

Return a JSON array of EXACTLY ${expectedCount} expanded strings, in the same order as the input:
["expanded bullet 1", "expanded bullet 2", ...]`;
}
