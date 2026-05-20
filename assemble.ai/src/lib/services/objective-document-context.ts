import { aiComplete } from '@/lib/ai/client';
import {
  getDocumentChunksByIds,
  type DocumentChunkContent,
} from '@/lib/rag/retrieval';

const OBJECTIVE_DIRECT_DOCUMENT_TOKEN_BUDGET = 160_000;
const OBJECTIVE_DOCUMENT_BATCH_TOKEN_BUDGET = 4_500;
const OBJECTIVE_DOCUMENT_CHUNK_SLICE_TOKEN_BUDGET = 3_500;
const OBJECTIVE_DOCUMENT_BATCH_SUMMARY_MAX_TOKENS = 900;
const OBJECTIVE_DOCUMENT_SUMMARY_CONTEXT_TOKEN_BUDGET = 8_000;

export interface AttachedObjectiveDocumentContext {
  context: string;
  documentChunkCount: number;
  estimatedDocumentTokens: number;
  usedStagedSummary: boolean;
}

export interface AttachedObjectiveDocumentContextOptions {
  allowStagedSummary?: boolean;
  directDocumentTokenBudget?: number;
}

export function estimateObjectiveTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function truncateToTokenBudget(text: string, tokenBudget: number): string {
  if (estimateObjectiveTokens(text) <= tokenBudget) return text;
  return `${text.slice(0, tokenBudget * 4).trim()}\n\n[Additional attached-document source material omitted to keep this request within the model budget.]`;
}

function formatObjectiveDocumentChunks(chunks: DocumentChunkContent[]): string {
  const lines: string[] = [];
  let currentDocumentId: string | null = null;

  for (const chunk of chunks) {
    if (chunk.documentId !== currentDocumentId) {
      currentDocumentId = chunk.documentId;
      lines.push(`\n## Attached Document ${chunk.documentId}`);
    }

    const labelParts = [
      chunk.hierarchyPath ? `Path ${chunk.hierarchyPath}` : null,
      chunk.clauseNumber ? `Clause ${chunk.clauseNumber}` : null,
      chunk.sectionTitle ? chunk.sectionTitle : null,
    ].filter(Boolean);

    if (labelParts.length > 0) {
      lines.push(`\n### ${labelParts.join(' | ')}`);
    }
    lines.push(chunk.content);
  }

  return lines.join('\n').trim();
}

function splitTextByTokenBudget(text: string, tokenBudget: number): string[] {
  const maxChars = tokenBudget * 4;
  const parts: string[] = [];
  let current = '';

  const flushCurrent = () => {
    if (!current.trim()) return;
    parts.push(current.trim());
    current = '';
  };

  const pushHardSplit = (value: string) => {
    let remaining = value.trim();
    while (estimateObjectiveTokens(remaining) > tokenBudget) {
      let splitAt = remaining.lastIndexOf('\n', maxChars);
      if (splitAt < Math.floor(maxChars * 0.65)) splitAt = remaining.lastIndexOf(' ', maxChars);
      if (splitAt < Math.floor(maxChars * 0.65)) splitAt = maxChars;

      parts.push(remaining.slice(0, splitAt).trim());
      remaining = remaining.slice(splitAt).trimStart();
    }
    if (remaining.trim()) parts.push(remaining.trim());
  };

  for (const paragraph of text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean)) {
    if (estimateObjectiveTokens(paragraph) > tokenBudget) {
      flushCurrent();
      pushHardSplit(paragraph);
      continue;
    }

    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (estimateObjectiveTokens(next) > tokenBudget) {
      flushCurrent();
      current = paragraph;
    } else {
      current = next;
    }
  }

  flushCurrent();
  return parts.length > 0 ? parts : [text];
}

function splitOversizedDocumentChunks(
  chunks: DocumentChunkContent[],
  tokenBudget: number,
): DocumentChunkContent[] {
  return chunks.flatMap((chunk) => {
    const contentTokenEstimate = estimateObjectiveTokens(chunk.content);
    const effectiveTokens = Math.max(chunk.tokenCount ?? contentTokenEstimate, contentTokenEstimate);
    if (effectiveTokens <= tokenBudget) return [chunk];

    return splitTextByTokenBudget(chunk.content, tokenBudget).map((content, index) => ({
      ...chunk,
      chunkId: `${chunk.chunkId}::objectives-part-${index + 1}`,
      content,
      tokenCount: estimateObjectiveTokens(content),
      sectionTitle: chunk.sectionTitle
        ? `${chunk.sectionTitle} (part ${index + 1})`
        : `Document text part ${index + 1}`,
    }));
  });
}

function splitChunksByTokenBudget(
  chunks: DocumentChunkContent[],
  tokenBudget: number,
): DocumentChunkContent[][] {
  const batches: DocumentChunkContent[][] = [];
  let currentBatch: DocumentChunkContent[] = [];
  let currentTokens = 0;

  for (const chunk of chunks) {
    const chunkTokens = chunk.tokenCount ?? estimateObjectiveTokens(chunk.content);
    if (currentBatch.length > 0 && currentTokens + chunkTokens > tokenBudget) {
      batches.push(currentBatch);
      currentBatch = [];
      currentTokens = 0;
    }

    currentBatch.push(chunk);
    currentTokens += chunkTokens;
  }

  if (currentBatch.length > 0) batches.push(currentBatch);
  return batches;
}

async function summarizeObjectiveDocumentBatches(chunks: DocumentChunkContent[]): Promise<string> {
  const splitChunks = splitOversizedDocumentChunks(chunks, OBJECTIVE_DOCUMENT_CHUNK_SLICE_TOKEN_BUDGET);
  const batches = splitChunksByTokenBudget(splitChunks, OBJECTIVE_DOCUMENT_BATCH_TOKEN_BUDGET);
  const summaries: string[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batchContent = formatObjectiveDocumentChunks(batches[i]);
    const { text } = await aiComplete({
      featureGroup: 'generation',
      maxTokens: OBJECTIVE_DOCUMENT_BATCH_SUMMARY_MAX_TOKENS,
      system: 'You extract project-specific requirements from Australian construction project documents. Use only the supplied text.',
      messages: [{
        role: 'user',
        content: `Extract objective source material from this attached document portion. This is not the final objective list.

Group concise source notes under these headings:
- PLANNING: approvals, authority processes, consent conditions, dates, notices, site constraints.
- FUNCTIONAL: building/use requirements, scope, services, access, operational or physical provisions.
- QUALITY: workmanship, finishes, samples, inspections, defects, durability, handover quality.
- COMPLIANCE: NCC/BCA, Australian Standards, BASIX, fire, acoustic, accessibility, WHS, environmental, utilities.
- PROJECT FACTS: address, storeys, GFA, uses, DA/consent numbers, Principal approvals, named parties.
- OPEN QUESTIONS: unclear responsibilities, missing source details, or discrepancies.

Preserve exact project facts and obligations. Do not add generic construction-management advice.

## Document Portion ${i + 1} of ${batches.length}
${batchContent}`,
      }],
    });
    summaries.push(`## Attached Document Portion ${i + 1}\n${text.trim()}`);
  }

  return truncateToTokenBudget(
    summaries.join('\n\n'),
    OBJECTIVE_DOCUMENT_SUMMARY_CONTEXT_TOKEN_BUDGET,
  );
}

export async function buildAttachedObjectiveDocumentContext(
  documentIds: string[],
  options: AttachedObjectiveDocumentContextOptions = {},
): Promise<AttachedObjectiveDocumentContext> {
  const chunks = await getDocumentChunksByIds(documentIds);
  const directDocumentTokenBudget =
    options.directDocumentTokenBudget ?? OBJECTIVE_DIRECT_DOCUMENT_TOKEN_BUDGET;
  const estimatedDocumentTokens = chunks.reduce(
    (sum, chunk) => sum + Math.max(chunk.tokenCount ?? 0, estimateObjectiveTokens(chunk.content)),
    0,
  );

  if (chunks.length === 0) {
    return {
      context: '',
      documentChunkCount: 0,
      estimatedDocumentTokens: 0,
      usedStagedSummary: false,
    };
  }

  if (estimatedDocumentTokens <= directDocumentTokenBudget) {
    return {
      context: `## Full Indexed Attached Document Text\n${formatObjectiveDocumentChunks(chunks)}`,
      documentChunkCount: chunks.length,
      estimatedDocumentTokens,
      usedStagedSummary: false,
    };
  }

  if (options.allowStagedSummary === false) {
    return {
      context: '',
      documentChunkCount: chunks.length,
      estimatedDocumentTokens,
      usedStagedSummary: true,
    };
  }

  const summary = await summarizeObjectiveDocumentBatches(chunks);
  return {
    context: `## Requirement-Focused Summary From Full Indexed Attached Documents\n${summary}`,
    documentChunkCount: chunks.length,
    estimatedDocumentTokens,
    usedStagedSummary: true,
  };
}
