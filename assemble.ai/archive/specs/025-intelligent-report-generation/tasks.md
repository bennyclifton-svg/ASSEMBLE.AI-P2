# Spec 025: Implementation Tasks

**Status:** In Progress
**Last Updated:** 2026-01-26

---

## Implementation Steps

### Step 1: Create Orchestrator Service ✅
- [x] Create `report-context-orchestrator.ts` with base types and utilities
- [x] Add reporting period delta tracking utilities
- [x] Add display name formatters for all enums (building class, project type, quality tier, procurement route)

### Step 2: Implement Brief/Summary Orchestrator ✅
- [x] Create `fetchBriefContext()` function
- [x] Fetch profiler data (building class, type, GFA, storeys, quality tier, complexity score)
- [x] Fetch cost plan summary (budget, forecast, variance, contingency)
- [x] Fetch program status (current stage, next milestone, days ahead/behind)
- [x] Fetch risk summary (count by severity, top 3 active)
- [x] Fetch procurement overview (X of Y awarded/tendered)
- [x] Add period deltas: changes to forecast, new risks, milestone updates

### Step 3: Implement Procurement Orchestrator ✅
- [x] Create `fetchProcurementContext()` function
- [x] Fetch procurement route from profiler complexity
- [x] Fetch all consultant statuses with tender stages
- [x] Fetch all contractor statuses with tender stages
- [x] Fetch shortlisted firms (consultants + contractors)
- [x] Fetch awarded values vs budget allowances from cost plan
- [x] Add period deltas: new RFTs issued, awards made, tender stage changes

### Step 4: Implement Cost Planning Orchestrator
- [ ] Create `fetchCostContext()` function
- [ ] Fetch cost lines by section (FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY)
- [ ] Calculate budget vs approved contract vs forecast
- [ ] Fetch variation summary (pending count/value, approved count/value)
- [ ] Fetch invoice summary (this period, cumulative claimed)
- [ ] Calculate contingency status (original, used, remaining, %)
- [ ] Add period deltas: new variations, invoices received, forecast changes

### Step 5: Implement Programme Orchestrator
- [ ] Create `fetchProgrammeContext()` function
- [ ] Fetch program activities and current stage
- [ ] Fetch upcoming milestones (next 30/60/90 days)
- [ ] Calculate critical path status
- [ ] Fetch stage completion status
- [ ] Add period deltas: milestone completions, schedule changes

### Step 6: Implement Planning & Authorities Orchestrator
- [ ] Create `fetchPlanningContext()` function
- [ ] Fetch authority stakeholders with submission statuses
- [ ] Summarize pending/submitted/approved/rejected breakdown
- [ ] Fetch outstanding conditions and cleared count
- [ ] Add period deltas: new submissions, responses received, conditions cleared

### Step 7: Implement Design Orchestrator
- [ ] Create `fetchDesignContext()` function
- [ ] Fetch consultant stakeholders with brief status and fees
- [ ] Fetch design milestones from program
- [ ] Add period deltas: design stage transitions, new appointments

### Step 8: Implement Construction Orchestrator
- [ ] Create `fetchConstructionContext()` function
- [ ] Fetch contractor stakeholders with scope and status
- [ ] Fetch construction milestones and % complete
- [ ] Fetch claims this period and total claimed
- [ ] Fetch contractor variations (pending/approved)
- [ ] Add period deltas: new claims, variation approvals, progress updates

### Step 9: Implement RAG-Enhanced Note Retrieval
- [ ] Enhance `fetchStarredNotes()` to JOIN with `noteTransmittals` for attached documentIds
- [ ] Query sync status API to identify RAG-synced documents
- [ ] For synced documents, use `retrieve()` from `rag/retrieval.ts` with `documentIds` filter
- [ ] Format context: Note title → User notes → Source document excerpts (with section titles)
- [ ] Track which documents contributed to generation in response metadata

### Step 10: Add Response Length Control
- [ ] Add `responseLength` parameter type: `'short'` | `'detailed'`
- [ ] Define short mode: 3-5 bullet points, ~150-250 tokens
- [ ] Define detailed mode: 3-4 paragraphs or 8-12 bullets, ~500-800 tokens
- [ ] Create prompt modifiers for each mode
- [ ] Adjust `max_tokens` based on selection
- [ ] Default to 'short' for meetings, 'detailed' for reports

### Step 11: Integrate into AI Content Generation
- [ ] Modify `ai-content-generation.ts` to import orchestrator
- [ ] Route each section to appropriate context fetcher based on sectionKey
- [ ] Include RAG document context from note attachments
- [ ] Accept `responseLength` parameter and apply prompt/token modifiers
- [ ] Update response metadata to track sources used (notes, documents, RAG, profiler, cost, etc.)

---

## Testing Checklist

### Brief Generation
- [ ] Project with full profiler data → verify building class, GFA referenced
- [ ] Project with cost plan → verify budget, forecast, variance referenced
- [ ] Project with risks → verify risk summary included

### Procurement Generation
- [ ] Project with mixed tender stages → verify each discipline/trade status correct
- [ ] Project with shortlisted firms → verify shortlist included
- [ ] Project with awards → verify awarded firms and values included

### Cost Planning Generation
- [ ] Project with variations → verify variation summary correct
- [ ] Project with invoices → verify claims summary correct
- [ ] Project with contingency → verify contingency status correct

### RAG Integration
- [ ] Note with RAG-synced attachment → verify document excerpts included
- [ ] Note without attachment → verify works without RAG
- [ ] Note with non-synced attachment → verify graceful handling

### Response Length
- [ ] Short mode → verify 3-5 bullet points
- [ ] Detailed mode → verify 3-4 paragraphs

---

## Progress Log

| Date | Step | Status | Notes |
|------|------|--------|-------|
| 2026-01-25 | Planning | Complete | Spec created |
| 2026-01-25 | Step 1 | Complete | Created report-context-orchestrator.ts with base types, delta tracking utilities, and display name formatters |
| 2026-01-25 | Step 2 | Complete | Implemented fetchBriefContext() with ProfilerSummary, CostPlanSummary, ProgramStatus, RiskSummary, ProcurementOverview, and PeriodDeltas |
| 2026-01-26 | Step 3 | Complete | Implemented fetchProcurementContext() with StakeholderProcurementStatus, ShortlistedFirm, AwardedFirm types; fetches procurement route, consultant/contractor tender stages, shortlisted firms, awarded values vs budget, and period deltas (RFTs, awards, stage transitions) |
