# Research: Evaluation Report

**Feature**: 011-evaluation-report
**Date**: 2025-12-12

## Research Questions

### 1. FortuneSheet Dynamic Column Configuration

**Question**: How to configure FortuneSheet with dynamic columns based on short-listed firms?

**Decision**: Use dynamic celldata generation with firm-based column mapping

**Rationale**:
- FortuneSheet accepts `celldata` array format where each cell is positioned by row/column index
- Columns are dynamically generated based on short-listed firms count
- First column (index 0) is always Description; subsequent columns are firm columns
- Column headers populated with firm company names

**Implementation Pattern** (from existing Cost Plan):
```typescript
// Dynamic column generation
const firms = shortlistedFirms; // [{id, companyName}, ...]
const columns = [
  { index: 0, width: 200, header: 'Description' },
  ...firms.map((firm, i) => ({
    index: i + 1,
    width: 120,
    header: firm.companyName
  }))
];

// Cell data generation
const celldata = rows.flatMap((row, r) => [
  { r, c: 0, v: { v: row.description, ct: { fa: '@', t: 's' } } },
  ...firms.map((firm, c) => ({
    r,
    c: c + 1,
    v: { v: row.amounts[firm.id] || '', ct: { fa: '$#,##0', t: 'n' } }
  }))
]);
```

**Alternatives Considered**:
- Fixed column count with hidden columns: Rejected - wasteful and complicates logic
- Separate table per firm: Rejected - loses side-by-side comparison value

---

### 2. PDF Parsing Approach

**Question**: How to extract pricing data from tender submission PDFs?

**Decision**: Use Claude API with structured extraction prompt via existing RAG infrastructure

**Rationale**:
- Tender PDFs vary widely in format (no standard schema)
- Claude excels at understanding document structure and extracting tabular data
- Existing RAG infrastructure (Feature 007) provides PDF-to-text pipeline
- Can request structured JSON output with line items and amounts

**Implementation Pattern**:
```typescript
const extractionPrompt = `
Extract all pricing line items from this tender submission.
Return JSON format:
{
  "firmName": "detected company name",
  "lineItems": [
    { "description": "...", "amount": number, "confidence": 0-100 }
  ],
  "totalAmount": number
}

Document content:
${pdfText}
`;

const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: extractionPrompt }]
});
```

**Alternatives Considered**:
- Local PDF parsing with regex: Rejected - too brittle for varied formats
- OCR + template matching: Rejected - overkill; most tender PDFs are text-based
- Third-party extraction API: Rejected - adds dependency; Claude already available

---

### 3. Firm Identification for Bulk Parsing

**Question**: How to identify which firm a tender PDF belongs to during bulk evaluation?

**Decision**: AI-based firm name extraction + fuzzy matching against short-listed firms

**Rationale**:
- Tender documents typically include company name/letterhead
- Claude can extract firm name as part of parsing
- Fuzzy match (Levenshtein distance) handles minor variations
- Fall back to manual assignment if confidence < 70%

**Implementation Pattern**:
```typescript
interface ParseResult {
  extractedFirmName: string;
  matchedFirmId: string | null;
  matchConfidence: number;
  lineItems: LineItem[];
}

function matchFirmToShortlist(
  extractedName: string,
  shortlistedFirms: Firm[]
): { firmId: string | null; confidence: number } {
  const matches = shortlistedFirms.map(firm => ({
    firmId: firm.id,
    score: similarityScore(extractedName, firm.companyName)
  }));

  const best = matches.sort((a, b) => b.score - a.score)[0];
  return best.score >= 0.7
    ? { firmId: best.firmId, confidence: best.score }
    : { firmId: null, confidence: best.score };
}
```

**Alternatives Considered**:
- Require firm association before upload: Rejected - adds friction to workflow
- Filename-based matching: Rejected - unreliable; filenames vary
- Manual assignment only: Rejected - loses automation value

---

### 4. Line Item Mapping Strategy

**Question**: How to map extracted amounts to existing evaluation row descriptions?

**Decision**: Semantic similarity matching with confidence thresholds

**Rationale**:
- Exact string matching fails due to wording variations
- Semantic similarity (embeddings or Claude comparison) handles synonyms
- Show low-confidence matches with warning indicator
- User can manually correct mismatches

**Implementation Pattern**:
```typescript
interface MappingResult {
  rowId: string;
  amount: number;
  confidence: number;
  source: 'ai' | 'manual';
}

async function mapLineItems(
  extracted: ExtractedLineItem[],
  existingRows: EvaluationRow[]
): Promise<MappingResult[]> {
  const mappings: MappingResult[] = [];

  for (const item of extracted) {
    // Use Claude to find best match
    const matchPrompt = `
      Given this extracted line item: "${item.description}"
      Find the best match from these options:
      ${existingRows.map((r, i) => `${i}. ${r.description}`).join('\n')}
      Return: { "matchIndex": number, "confidence": 0-100 }
    `;

    const result = await claude.complete(matchPrompt);
    mappings.push({
      rowId: existingRows[result.matchIndex].id,
      amount: item.amount,
      confidence: result.confidence / 100,
      source: 'ai'
    });
  }

  return mappings;
}
```

**Alternatives Considered**:
- Exact string matching: Rejected - too brittle
- User-defined mapping rules: Rejected - adds complexity for small firms
- Skip mapping, show all extracted: Rejected - loses structured comparison

---

### 5. Export Strategy

**Question**: How to export evaluation tables to PDF/Word/Excel?

**Decision**: Extend existing export utilities with evaluation-specific formatting

**Rationale**:
- Existing `pdf-enhanced.ts` provides PDF generation infrastructure
- Excel export can use existing xlsx library patterns
- Word export via docx library (if installed) or PDF fallback

**Implementation Pattern**:
```typescript
// Excel export using FortuneSheet's built-in export
import { exportExcel } from '@fortune-sheet/react';

// PDF export extending existing utility
import { generateEvaluationPdf } from '@/lib/export/pdf-enhanced';

// Table data structure for export
interface EvaluationExport {
  projectName: string;
  disciplineName: string;
  firms: string[];
  table1: { description: string; amounts: Record<string, number> }[];
  table2: { description: string; amounts: Record<string, number> }[];
  subtotals: { table1: Record<string, number>; table2: Record<string, number> };
  grandTotal: Record<string, number>;
}
```

**Alternatives Considered**:
- Screenshot/image export: Rejected - poor quality, not editable
- CSV only: Rejected - loses formatting and structure
- Third-party export service: Rejected - unnecessary dependency

---

## Summary

All research questions resolved. Key decisions:
1. **Dynamic columns**: FortuneSheet celldata with firm-based indexing
2. **PDF parsing**: Claude API via existing RAG infrastructure
3. **Firm identification**: AI extraction + fuzzy matching
4. **Line item mapping**: Semantic similarity with confidence thresholds
5. **Export**: Extend existing utilities (PDF, Excel, Word)

No clarifications needed. Ready for Phase 1 design.
