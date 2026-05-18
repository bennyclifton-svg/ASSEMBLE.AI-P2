# Discipline-Specific Knowledge Seeds — Implementation Plan

**Date:** 2026-02-25
**Objective:** Expand the Knowledge Domain System with trade-specific seed content (Civil, Structural, Architectural, MEP, Interfaces) and wire discipline-aware routing so the content actually reaches AI prompts.

---

## Stage 1: Infrastructure & Routing

**Goal:** Ensure the plumbing exists for discipline knowledge to flow from DB → orchestrator → AI prompt. Without this, seed content sits unused.

**Files to modify:**
- `src/lib/context/types.ts`
- `src/lib/constants/knowledge-domains.ts`
- `src/app/api/trr/[id]/generate/route.ts`

### 1A. Add `discipline` field to `ContextRequest`

In `src/lib/context/types.ts`, add an optional `discipline` parameter to `ContextRequest`:

```typescript
/** Discipline being analysed (e.g., 'structural', 'mechanical').
 *  Merges discipline-specific domain tags into retrieval query. */
discipline?: string;
```

This allows API callers (TRR, RFT) to specify which discipline they're working with, triggering discipline-specific knowledge retrieval.

### 1B. Add `PROJECT_TYPE_TO_DISCIPLINES` mapping

In `src/lib/constants/knowledge-domains.ts`, add a mapping that infers relevant disciplines from project type:

```typescript
export const PROJECT_TYPE_TO_DISCIPLINES: Record<string, DomainTag[]> = {
  house:         ['structural', 'civil', 'architectural'],
  apartments:    ['structural', 'civil', 'architectural', 'mechanical', 'electrical', 'hydraulic', 'fire'],
  townhouses:    ['structural', 'civil', 'architectural', 'mechanical', 'electrical', 'hydraulic'],
  commercial:    ['structural', 'civil', 'architectural', 'mechanical', 'electrical', 'hydraulic', 'fire', 'landscape'],
  office:        ['structural', 'civil', 'architectural', 'mechanical', 'electrical', 'hydraulic', 'fire'],
  retail:        ['structural', 'architectural', 'mechanical', 'electrical', 'hydraulic', 'fire'],
  industrial:    ['structural', 'civil', 'mechanical', 'electrical', 'fire'],
  refurbishment: ['structural', 'architectural', 'mechanical', 'electrical', 'hydraulic'],
  remediation:   ['civil', 'structural', 'environmental'],
  fitout:        ['architectural', 'mechanical', 'electrical', 'interior'],
};
```

### 1C. Update `resolveProfileDomainTags()` to surface discipline tags

In `src/lib/constants/knowledge-domains.ts`, extend `resolveProfileDomainTags()` to include discipline tags when a project type is known:

```typescript
// After existing project type checks, add:
if (profile.projectType && PROJECT_TYPE_TO_DISCIPLINES[profile.projectType]) {
  tags.push(...PROJECT_TYPE_TO_DISCIPLINES[profile.projectType]);
}
```

### 1D. Add discipline-aware entries to `SECTION_TO_DOMAIN_TAGS`

Extend the existing mapping so discipline-scoped section keys resolve correctly:

```typescript
// Discipline-scoped TRR / construction sections
'trr:structural':    ['structural', 'procurement', 'tendering', 'contracts'],
'trr:mechanical':    ['mechanical', 'procurement', 'tendering', 'contracts'],
'trr:electrical':    ['electrical', 'procurement', 'tendering', 'contracts'],
'trr:hydraulic':     ['hydraulic', 'procurement', 'tendering', 'contracts'],
'trr:fire':          ['fire', 'procurement', 'tendering', 'contracts'],
'trr:civil':         ['civil', 'procurement', 'tendering', 'contracts'],
'trr:architectural': ['architectural', 'procurement', 'tendering', 'contracts'],
```

### 1E. Fix invalid tag in TRR route

In `src/app/api/trr/[id]/generate/route.ts` (line 287), replace the invalid `'contract-administration'` tag:

```typescript
// Before:
domainTags: ['procurement', 'tendering', 'contract-administration'],

// After — dynamically include discipline tag from TRR record:
domainTags: ['procurement', 'tendering', 'contracts',
  ...(discipline ? [discipline] : [])],
```

### 1F. Update orchestrator to merge discipline tags

In `src/lib/context/orchestrator.ts`, update `assembleDomainContext()` (line 90-96) to merge discipline tags:

```typescript
// Current: only uses explicit domainTags or sectionKey lookup
// New: also merge discipline tag if provided
let domainTags =
  request.domainTags && request.domainTags.length > 0
    ? [...request.domainTags]
    : request.sectionKey
      ? [...(SECTION_TO_DOMAIN_TAGS[request.sectionKey] ?? [])]
      : [];

// Merge discipline tag if provided
if (request.discipline && isKnownTag(request.discipline)) {
  if (!domainTags.includes(request.discipline as DomainTag)) {
    domainTags.push(request.discipline as DomainTag);
  }
}
```

### Verification — Stage 1
- [ ] TypeScript compiles with no errors
- [ ] Existing `report-section` retrieval unchanged (regression check)
- [ ] `resolveProfileDomainTags({ projectType: 'apartments' })` returns discipline tags
- [ ] Unit tests in `src/lib/context/__tests__/strategies.test.ts` still pass

---

## Stage 2: Domain Definitions

**Goal:** Register the 5 new discipline domains in `PREBUILT_DOMAINS` so the ingestion script and retrieval pipeline recognise them.

**Files to modify:**
- `src/lib/constants/knowledge-domains.ts`

### 2A. Add 5 new domain definitions to `PREBUILT_DOMAINS`

```typescript
{
  id: 'domain-civil-earthworks',
  name: 'Civil Engineering & Earthworks Guide',
  domainType: 'best_practices',
  tags: ['civil', 'construction', 'remediation'],
  description: 'Site preparation, excavation, ground retention, piling, stormwater, and civil authority processes',
  applicableProjectTypes: ['new', 'refurb', 'extend', 'remediation'],
  applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
},
{
  id: 'domain-structural-engineering',
  name: 'Structural Engineering Guide',
  domainType: 'best_practices',
  tags: ['structural', 'construction'],
  description: 'Concrete frame, structural steel, post-tensioning, precast, temporary works, and structural tolerances',
  applicableProjectTypes: ['new', 'refurb', 'extend'],
  applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
},
{
  id: 'domain-architectural-trades',
  name: 'Architectural Trades Guide',
  domainType: 'best_practices',
  tags: ['architectural', 'construction'],
  description: 'Facades, glazing, waterproofing, partitions, ceilings, finishes, joinery, and fire-rated elements',
  applicableProjectTypes: ['new', 'refurb', 'extend'],
  applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
},
{
  id: 'domain-mep-services',
  name: 'MEP Services Guide',
  domainType: 'best_practices',
  tags: ['mechanical', 'electrical', 'hydraulic', 'fire', 'construction'],
  description: 'HVAC, electrical reticulation, hydraulic supply/drainage, fire detection/suppression, commissioning, and authority connections',
  applicableProjectTypes: ['new', 'refurb', 'extend'],
  applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
},
{
  id: 'domain-trade-interfaces',
  name: 'Trade Interfaces & Coordination Guide',
  domainType: 'best_practices',
  tags: ['construction', 'architectural', 'structural', 'mechanical', 'electrical', 'hydraulic'],
  description: 'Cross-trade coordination, interface risk management, BIM/clash workflows, design responsibility matrices, and sequencing dependencies',
  applicableProjectTypes: ['new', 'refurb', 'extend'],
  applicableStates: ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'],
},
```

### Verification — Stage 2
- [ ] `PREBUILT_DOMAINS` has 15 entries (10 existing + 5 new)
- [ ] Each domain `id` matches the `domainSlug` that will be in the seed markdown frontmatter
- [ ] TypeScript compiles — no duplicate IDs, all tags are valid `DomainTag` values

---

## Stage 3: Research-Driven Seed Content Development

**Goal:** Produce practitioner-grade discipline knowledge through a rigorous, multi-pass research methodology — ensuring content reflects what a 15-year Australian construction PM actually knows, not generic textbook material.

**Design principle:** The section lists below are a *starting hypothesis*. Research actively expands them. Every section must include real dollar figures, real timelines, real consequences, and real Australian market nuance.

Stage 3 is split into three phases: **3A (Research)**, **3B (Review Gate)**, and **3C (Authoring)**.

---

### Phase 3A: Multi-Pass Deep Research (per discipline)

Each of the 5 disciplines gets a dedicated research session with **5 systematic passes** using live web search. Research is conducted BEFORE any content is written.

#### Pass 1 — Industry Landscape Survey

Broad web research to map the current Australian construction landscape for this discipline:
- Identify key industry bodies and their current publications (MBA, HIA, AIQS, Engineers Australia, ABCB, ACIF)
- Survey current market conditions, supply chain issues, and workforce trends
- Identify recent industry shifts (e.g., material substitutions, new systems entering the AU market)
- Note any post-COVID or current-year supply chain changes affecting lead times or availability

**Example queries:**
- "Australian construction industry {discipline} best practice 2025 2026"
- "{discipline} construction methodology Australia current practice"
- "Master Builders Association {discipline} guidance publications"

#### Pass 2 — Standards & Regulatory Mapping

Identify every relevant standard, code, and authority requirement for this discipline:
- Australian Standards (AS/NZS) — current edition numbers and key clause references
- National Construction Code (NCC) / Building Code of Australia (BCA) — specific volumes, parts, and clauses
- State-specific authority requirements (NSW, VIC, QLD at minimum — note where states diverge)
- WorkSafe / SafeWork requirements specific to this discipline
- Environmental regulations (EPA, contamination, noise, vibration)

**Example queries:**
- "AS {standard number} current edition Australia {discipline}"
- "NCC 2024 {discipline} requirements changes"
- "NSW {authority} connection application timeline requirements"
- "SafeWork {state} {discipline} code of practice"

**Output:** A standards reference table mapping each standard to the section(s) it applies to.

#### Pass 3 — Failure, Defect & Dispute Analysis

Research common defects, construction disputes, and failure modes — this is where practitioner-grade nuance comes from:
- QBCC (QLD) complaint and defect statistics for this discipline
- VBA (VIC) inspection and compliance data
- NSW Fair Trading building defect reports
- NCAT/VCAT tribunal decision patterns related to this discipline
- Insurance claim trends and common exclusions
- Industry reports on construction defect prevalence and remediation costs

**Example queries:**
- "QBCC common defects {discipline} Queensland statistics"
- "NSW Fair Trading building defect claims {trade} data"
- "{discipline} construction failure Australia case study"
- "construction defect remediation cost Australia {trade}"
- "{discipline} insurance claim construction Australia"

**Output:** A defect/failure register with: failure mode, typical cause, typical remediation cost range, prevention strategy. Minimum 8-10 entries per discipline.

#### Pass 4 — Cost, Lead Time & Program Impact

Research current Australian market data on procurement timelines, cost drivers, and program risk:
- Current lead times for key materials and systems (fabrication, manufacture, shipping)
- Typical tender periods and evaluation timelines
- Long-lead item identification and current market availability
- Authority approval and connection timelines (state-specific where they diverge)
- Weather and seasonal impacts on this discipline's work
- Typical subcontract structures and packaging approaches

**Example queries:**
- "{material/system} fabrication lead time Australia 2025 2026"
- "{discipline} subcontractor procurement timeline Australia"
- "{authority} connection application processing time {state}"
- "{discipline} construction program duration allowance"

**Output:** A lead time and cost impact table with: item, current lead time range, cost sensitivity factors, program risk rating (high/medium/low).

#### Pass 5 — Gap Analysis & Section Expansion

Review the initial section list against ALL findings from Passes 1-4:
- Identify topics that research surfaced but are NOT in the current section list → propose additions
- Identify sections where research found thin or conflicting data → flag as confidence gaps
- Cross-reference against the other 4 disciplines to identify interface topics that may need coverage in multiple files
- Validate that every section has sufficient research backing to write practitioner-grade content

**Output:** Revised section list with additions marked as `[NEW]` and confidence ratings for each section (Strong / Adequate / Thin — needs more research).

---

### Phase 3B: Research Report & Review Gate

After all 5 passes are complete for a discipline, produce a **Research Summary Report** before any content authoring begins. The user reviews this report and can redirect research or approve for authoring.

#### Research Report Template (per discipline)

```markdown
# {Discipline} — Research Summary

## Sources Identified
- [Count] industry publications reviewed
- [Count] Australian Standards mapped
- [Count] authority/regulatory requirements identified
- [Count] defect/failure cases documented
- [List key sources with links where available]

## Standards Reference Table
| Standard | Edition | Relevant Sections | Key Requirements |
|----------|---------|-------------------|-----------------|
| AS XXXX  | 20XX    | 3A, 3B            | ...             |

## Defect & Failure Register
| Failure Mode | Typical Cause | Remediation Cost | Prevention |
|-------------|--------------|-----------------|------------|
| ...         | ...          | $XX-XXK         | ...        |

## Lead Time & Cost Impact Table
| Item | Lead Time | Cost Sensitivity | Program Risk |
|------|-----------|-----------------|-------------|
| ...  | XX-XX wks | High/Med/Low    | High/Med/Low|

## Proposed Section Additions [NEW]
- [New section 1] — surfaced by: [which pass]
- [New section 2] — surfaced by: [which pass]

## Confidence Gaps
- [Section X] — data was thin because: [reason]
- [Section Y] — conflicting sources: [detail]

## Recommendation
Ready for authoring / Needs additional research on: [specific gaps]
```

#### Review Gate Rules
- **User reviews each discipline's research report** before authoring proceeds
- User may request additional research on specific gaps
- User may add/remove sections based on findings
- User approves the final section list and the report becomes an input artefact for authoring

---

### Phase 3C: Content Authoring (informed by research)

Only after the research report is approved does content authoring begin for that discipline.

**Files to create (in `src/lib/constants/knowledge-seed/`):**
- `civil-earthworks-guide.md`
- `structural-engineering-guide.md`
- `architectural-trades-guide.md`
- `mep-services-guide.md`
- `trade-interfaces-coordination-guide.md`

#### Content Authoring Rules

Each file must follow the established format:

**YAML frontmatter** (exact field names):
```yaml
---
domainSlug: domain-civil-earthworks
name: Civil Engineering & Earthworks Guide
domainType: best_practices
tags: [civil, construction, remediation]
version: "1.0.0"
repoType: knowledge_practices
applicableProjectTypes: [new, refurb, extend, remediation]
applicableStates: [NSW, VIC, QLD, WA, SA, TAS, ACT, NT]
---
```

**Content structure** (per section):
```markdown
## [Section Heading — descriptive, search-friendly]

### [Subsection if needed]

[200-500 words of practitioner-grade prose focused on constructability,
interfaces, and procurement — NOT engineering design theory.

Must include:
- Real Australian dollar figures and cost ranges where applicable
- Real lead times sourced from Pass 4 research
- Real failure consequences sourced from Pass 3 research
- Specific Australian Standard references sourced from Pass 2 research
- State-specific variations where authorities diverge]

Reference: [Specific AS/NZS numbers, NCC clauses cited]
Applies to: [Project types and scale]
Related standards: [Cross-references to other domain content]

Common pitfalls:
- [Specific, practitioner-grade pitfall with cost/time consequence]
- [Specific, practitioner-grade pitfall with cost/time consequence]
- [Specific, practitioner-grade pitfall with cost/time consequence]
```

**Quality bar — "Would a 15-year PM find this useful or obvious?"**
- If the advice is something a graduate PM would know → too shallow, add depth
- If the advice lacks dollar figures or timelines → too vague, add specifics
- If the advice doesn't mention what goes wrong when ignored → too theoretical, add consequences

#### Initial Section Lists (hypothesis — expanded by Pass 5 gap analysis)

**Civil Engineering & Earthworks Guide (~45+ chunks)**

1. Site Establishment & Enabling Works
2. Bulk Excavation Methodologies (top-down vs bottom-up)
3. Ground Retention Systems (shotcrete, contiguous piling, sheet piling)
4. Dewatering Risks & Management
5. Piling Systems (bored, driven, CFA — selection criteria)
6. Subgrade Preparation & Proof Rolling
7. Stormwater Management & Drainage
8. Earthworks Quality Control (compaction testing, moisture content)
9. Latent Ground Conditions — Managing Risk
10. Road Opening Permits & Authority Approvals
11. Contaminated Land & Remediation Interface
12. **Procurement & Tender Evaluation for Civil Works** (lead times, evaluation criteria, tender red flags)
13. **Program Risk Factors for Civil Works** (weather sensitivity, authority delays, latent conditions)
14. **Regulatory & Authority Context** (state-specific: council DAs, EPA, water authorities)
15. *[Pass 5 may add: UXO protocols, heritage management, service relocations, rock anchoring, vibration monitoring, etc.]*

**Structural Engineering Guide (~50+ chunks)**

1. Concrete Frame Construction (formwork systems, pour sequencing)
2. Reinforcement Detailing & Placement (prefab cages, laps, cover requirements)
3. Post-Tensioning Systems (bonded vs unbonded, stressing sequence)
4. Structural Steel Fabrication & Erection (connection types, tolerances)
5. Precast Concrete Elements (manufacture, transport, erection, grouting)
6. Temporary Works & Propping (design responsibility, removal sequencing)
7. Structural Tolerances & Interface with Connecting Trades
8. Ground Floor & Slab-on-Ground Construction
9. Structural Waterproofing (tanking, membrane systems below ground)
10. Demolition & Structural Alteration (for refurbishment projects)
11. **Procurement & Tender Evaluation for Structural Works** (shop drawing lead times: 8-12 weeks, steel fabrication: 12-16 weeks)
12. **Program Risk Factors for Structural Works** (critical path implications, weather holds, cure times)
13. *[Pass 5 may add: hot/cold weather concreting, mass concrete pours, crane planning, structural monitoring, etc.]*

**Architectural Trades Guide (~60+ chunks)**

1. Facade Systems (curtain wall, panel, brick veneer — selection criteria)
2. Glazing & Window Systems (performance specifications, lead times)
3. External Waterproofing (membrane types, warranty structures)
4. Internal Waterproofing (wet areas — the highest defect risk in AU construction)
5. Masonry — Brick & Blockwork (cavity construction, fire-rated walls)
6. Internal Partitions & Linings (plasterboard, fire-rating, acoustic performance)
7. Ceiling Systems (suspended, bulkhead, access requirements for MEP)
8. Floor Finishes (tiles, vinyl, carpet, timber — substrate preparation)
9. Joinery & Cabinetry (shop drawing process, installation sequencing)
10. Painting & Protective Coatings
11. Door Hardware & Ironmongery (keying schedules, access control interface)
12. Roofing Systems (metal deck, membrane, insulation)
13. Fire-Rated Construction (compartmentation, penetration sealing)
14. Acoustic Performance & Compliance
15. **Procurement & Tender Evaluation for Architectural Trades** (facade lead times: 16-24 weeks, joinery: 8-12 weeks)
16. **Sequence of Internal Finishes** (the critical dependencies PMs must manage)
17. *[Pass 5 may add: balustrade systems, accessibility compliance, signage/wayfinding, etc.]*

**MEP Services Guide (~70+ chunks)**

1. HVAC Systems Overview (split, VRF, chilled water — selection by project type)
2. Mechanical Plant & Equipment (AHUs, chillers, cooling towers — spatial requirements)
3. Ductwork Installation & Coordination
4. Electrical Substations & Main Switchboard (authority requirements, lead times: 16-20 weeks)
5. Electrical Reticulation (risers, distribution boards, cable tray coordination)
6. Lighting & Power (LED systems, metering, sub-metering requirements)
7. Hydraulic Supply (cold/hot water, gas — pipe materials, insulation)
8. Hydraulic Drainage (sanitary, stormwater — pipe grades, access)
9. Fire Sprinkler Systems (design responsibility, BCA classification triggers)
10. Fire Detection & Alarm Systems (AS 1670 requirements, integration)
11. Fire Hydrant & Hose Reel Systems
12. Spatial Coordination Strategies (BIM/clash detection workflows, LOD requirements)
13. Commissioning & Tuning Phases (often underestimated in the program)
14. Authority Connection Timelines (state-specific: Ausgrid/Endeavour, Sydney Water/Melbourne Water, Jemena/AusNet)
15. Energy Efficiency Compliance (NCC Section J, BASIX, NatHERS)
16. **Procurement & Tender Evaluation for MEP** (design-and-construct vs construct-only, combined vs separated packages)
17. **Program Risk Factors for MEP** (long lead items, commissioning float, authority inspection holds)
18. *[Pass 5 may add: solar/renewables, EV charging infrastructure, smart building systems, vertical transportation, etc.]*

**Trade Interfaces & Coordination Guide (~50+ chunks)**

1. Design Responsibility Matrices (who designs what at trade boundaries)
2. Structure-to-Facade Interface (tolerances, brackets, movement joints)
3. Structure-to-MEP Interface (penetrations, sleeves, setdowns)
4. Waterproofing Interface Responsibilities (the #1 defect source)
5. Fire-Rated Penetration Sealing (responsibility, inspection, certification)
6. Ceiling Zone Coordination (services priority, access panels, ceiling grid)
7. Riser Coordination (vertical services spatial planning)
8. BIM/Clash Detection Workflow (model ownership, clash resolution process)
9. LOD Requirements by Project Phase
10. Sequencing Dependencies Between Trades (structure → waterproofing → services rough-in → linings → finishes)
11. Defect Liability — Interface Disputes (common patterns, prevention strategies)
12. Authority Inspection Sequencing (which authority inspects what, and when)
13. **Coordination Meeting Cadence & Agenda Templates** (design coordination vs site coordination)
14. **Common Variation Sources at Trade Interfaces** (helps QSs anticipate claims)
15. *[Pass 5 may add: weather protection responsibilities, noise/vibration between trades, site logistics coordination, etc.]*

### Verification — Stage 3

**Phase 3A (Research):**
- [ ] All 5 passes completed for each discipline with live web search
- [ ] Standards reference table produced per discipline
- [ ] Defect/failure register has 8+ entries per discipline
- [ ] Lead time table has current (2025-2026) Australian market data
- [ ] Gap analysis reviewed initial section list and proposed additions

**Phase 3B (Review Gate):**
- [ ] Research summary report produced for each discipline
- [ ] User has reviewed and approved each report
- [ ] Final section list confirmed (including any additions from Pass 5)
- [ ] Confidence gaps acknowledged and either resolved or flagged inline

**Phase 3C (Authoring):**
- [ ] Each file has valid YAML frontmatter with all 8 required fields
- [ ] Each `domainSlug` matches the corresponding entry in `PREBUILT_DOMAINS`
- [ ] Content uses `## Section` / `### Subsection` heading hierarchy
- [ ] Each section includes Reference, Applies to, Related standards, Common pitfalls
- [ ] Common pitfalls include specific dollar/time consequences (not vague warnings)
- [ ] No fee ranges or deliverable lists (these belong in consultant-templates.json)
- [ ] Content focuses on constructability, interfaces, and procurement — not engineering design theory
- [ ] Content passes the "15-year PM" quality bar — specific, nuanced, consequence-aware
- [ ] Total estimated chunk count: ~275-350 chunks across 5 files (expanded from research)

---

## Stage 4: Ingestion & Integration Testing

**Goal:** Ingest the seed content into the database and verify retrieval precision.

### 4A. Run ingestion script

```bash
npx tsx scripts/ingest-seed-knowledge.ts
```

Verify:
- [x] All 5 new seed files are detected and parsed
- [x] YAML frontmatter is valid for each file
- [x] Chunks are created with correct hierarchy levels and paths (197 total: 40+36+45+39+37)
- [x] Embeddings are generated (Voyage AI) — 121,179 tokens
- [x] `document_sets` entries created with correct `domain_tags` arrays
- [x] `knowledge_domain_sources` entries created with `source_type: 'prebuilt_seed'`

### 4B. Retrieval precision tests

Run 5 representative queries per discipline through `retrieveFromDomains()`:

**Civil:**
- "managing latent ground conditions during excavation"
- "dewatering risks for deep basement construction"
- "civil works tender evaluation criteria"

**Structural:**
- "structural steel shop drawing lead times and fabrication"
- "post-tensioning stressing sequence and methodology"
- "temporary works propping design responsibility"

**Architectural:**
- "wet area waterproofing defect risk and warranty"
- "facade curtain wall procurement lead times"
- "sequence of internal finishes for apartment fit-out"

**MEP:**
- "electrical authority connection timeline NSW Ausgrid"
- "commissioning and tuning phase program allowance"
- "BIM clash detection coordination workflow"

**Interfaces:**
- "structure to facade tolerance interface"
- "fire-rated penetration sealing responsibility"
- "common variation sources at trade interfaces"

**Pass criteria:**
- [x] Top-5 reranked results are from the correct discipline domain (15/15 queries)
- [x] No cross-discipline contamination (structural queries don't return civil chunks)
- [x] Relevance scores > 0.3 for top results (range: 0.7464–0.9495)

### 4C. End-to-end TRR test

Generate a TRR for a structural tender package and verify:
- [x] Knowledge context section appears in the assembled prompt (14,444 chars, 76 lines)
- [x] Structural domain chunks are included alongside procurement guidance (5/5 results from Structural Engineering Guide)
- [x] AI output references discipline-specific considerations (9/10 discipline terms found: structural, steel, concrete, reinforcement, formwork, post-tension, fabrication, erection, tolerance)

---

## Stage 5: Phase 2 Disciplines (Future — Lower Priority)

**Goal:** Expand to remaining discipline tags for consistent coverage.

**Files to create:**
- `landscape-external-works-guide.md` (~30 chunks) — tags: `[landscape, construction]`
- `interior-fitout-guide.md` (~40 chunks) — tags: `[interior, architectural, construction]`
- `sustainability-esd-guide.md` (~50 chunks) — tags: `[sustainability, construction]`

**Files to modify:**
- `src/lib/constants/knowledge-domains.ts` — add 3 more entries to `PREBUILT_DOMAINS`

This stage is independent of Stages 1-4 and can be scheduled separately.

---

## Dependency Map

```
Stage 1 (Infrastructure) ──→ Stage 2 (Definitions) ──┐
                                                      │
              ┌───────────────────────────────────────┘
              │
              ▼
   Stage 3A (Multi-Pass Research — per discipline, parallelisable)
              │
              ▼
   Stage 3B (Research Report — user reviews each discipline)
              │
              ▼
   Stage 3C (Content Authoring — per discipline, parallelisable)
              │
              ▼
   Stage 4 (Ingestion & Testing)
              │
              ▼
   Stage 5 (Phase 2 — future, independent)
```

- **Stage 1 must complete first** — routing changes are prerequisite for content to be useful
- **Stage 2 depends on Stage 1** — domain definitions reference tags established in Stage 1
- **Stage 3A can be parallelised** — 5 disciplines can be researched independently (parallel agents)
- **Stage 3B is a user review gate** — each discipline's research report must be approved before its authoring begins. Disciplines can proceed independently (e.g., Civil approved and authored while Structural still in research)
- **Stage 3C can be parallelised** — once a discipline's research is approved, its content can be authored independently
- **Stage 4 depends on Stages 1-3** — needs both infrastructure and all content
- **Stage 5 is independent** — can be scheduled after Stage 4 or deferred

---

## Risk Notes

1. **Tag validation bug:** TRR route currently sends `'contract-administration'` which is NOT a valid tag. This means current TRR domain retrieval is partially broken — Stage 1E fixes this.
2. **Chunk count calibration:** The retrieval pipeline uses `topK: 15, rerankTopK: 5`. Only ~5 chunks per query reach the prompt. Prioritise breadth (well-differentiated sections) over depth (many similar chunks).
3. **Existing content duplication:** Discipline seeds must NOT duplicate fee ranges, service phases, or deliverables already in `consultant-templates.json`. Content lens is constructability/risk/procurement.
4. **Embedding costs:** ~275-350 new chunks × Voyage AI embeddings. Estimate ~50-70K tokens for embedding generation. One-time cost during ingestion. Chunk count may increase due to section expansion from Pass 5 gap analysis.
5. **Research currency:** Web search results reflect data available at time of research. Lead times and authority timelines should be tagged with the date they were sourced so they can be updated in future content revisions.
6. **Research scope expansion risk:** Pass 5 gap analysis may identify significantly more sections than the initial hypothesis. Cap expansion at ~30% additional sections per discipline to avoid scope creep. If gap analysis suggests more, prioritise by PM impact and defer the rest to Stage 5.
7. **State-specific divergence:** Research may surface significant regulatory differences between states (e.g., NSW vs VIC vs QLD authority processes). Where states diverge materially, the content should note the divergence explicitly rather than defaulting to one state's requirements.

---

## Execution Strategy

**Total agents: 12 | Maximum concurrent: 6 | 4 sequential waves**

The critical insight: Stage 3A research (pure web search) has no dependency on Stage 1/2 infrastructure code. Both can run simultaneously.

---

### Wave 1 — Infrastructure + Research (6 agents, all parallel)

All 6 agents launch simultaneously. No dependencies between them.

| # | Agent | Task | Type | Isolation | Output |
|---|-------|------|------|-----------|--------|
| 1 | **Infrastructure** | Stage 1 + Stage 2 | Code changes | Worktree | Modified: `types.ts`, `knowledge-domains.ts`, `orchestrator.ts`, TRR `route.ts` |
| 2 | **Civil Research** | Stage 3A — Civil Engineering (5 passes) | Web research | None | `docs/research/civil-engineering-research-report.md` |
| 3 | **Structural Research** | Stage 3A — Structural Engineering (5 passes) | Web research | None | `docs/research/structural-engineering-research-report.md` |
| 4 | **Architectural Research** | Stage 3A — Architectural Trades (5 passes) | Web research | None | `docs/research/architectural-trades-research-report.md` |
| 5 | **MEP Research** | Stage 3A — MEP Services (5 passes) | Web research | None | `docs/research/mep-services-research-report.md` |
| 6 | **Interfaces Research** | Stage 3A — Trade Interfaces (5 passes) | Web research | None | `docs/research/trade-interfaces-research-report.md` |

**Agent 1 scope** (~50 lines of code across 4 files):
- Add `discipline?: string` to `ContextRequest` in `types.ts`
- Add `PROJECT_TYPE_TO_DISCIPLINES` mapping to `knowledge-domains.ts`
- Add 5 new `PREBUILT_DOMAINS` entries to `knowledge-domains.ts`
- Add discipline-scoped entries to `SECTION_TO_DOMAIN_TAGS`
- Update `resolveProfileDomainTags()` to surface discipline tags
- Fix `'contract-administration'` → `'contracts'` in TRR route + add dynamic discipline tag
- Merge discipline tags in `assembleDomainContext()` in `orchestrator.ts`

**Agents 2-6 scope** (each executes 5 research passes with ~15-20 web searches):
- Pass 1: Industry Landscape Survey
- Pass 2: Standards & Regulatory Mapping → produces standards reference table
- Pass 3: Failure, Defect & Dispute Analysis → produces defect/failure register (8+ entries)
- Pass 4: Cost, Lead Time & Program Impact → produces lead time table
- Pass 5: Gap Analysis → produces revised section list with `[NEW]` additions and confidence ratings

Each research agent writes its findings using the Research Report Template (see Phase 3B above).

#### Wave 1 Progress
- [x] Agent 1: Infrastructure & Domain Definitions complete
- [x] Agent 2: Civil Engineering research report complete
- [x] Agent 3: Structural Engineering research report complete
- [x] Agent 4: Architectural Trades research report complete
- [x] Agent 5: MEP Services research report complete
- [x] Agent 6: Trade Interfaces research report complete

---

### Wave 2 — User Review Gate (no agents — user-driven)

After Wave 1 completes:
1. Merge Agent 1's infrastructure worktree into main branch
2. Present all 5 research reports for user review
3. User reviews each discipline's report and either:
   - **Approves** — discipline proceeds to Wave 3 authoring
   - **Redirects** — requests additional research on specific gaps (re-run targeted passes)
   - **Modifies** — adds/removes sections from the final section list

Disciplines can be approved independently (e.g., Civil approved and authored while Structural still under review).

#### Wave 2 Progress
- [x] Infrastructure worktree merged
- [x] Civil Engineering research report reviewed & approved
- [x] Structural Engineering research report reviewed & approved
- [x] Architectural Trades research report reviewed & approved
- [x] MEP Services research report reviewed & approved
- [x] Trade Interfaces research report reviewed & approved

---

### Wave 3 — Content Authoring (up to 5 agents, parallel)

Once a discipline's research report is approved, launch its authoring agent. Can start per-discipline — no need to wait for all 5 approvals.

| # | Agent | Input | Output |
|---|-------|-------|--------|
| 7 | **Civil Author** | Approved civil research report + format reference | `src/lib/constants/knowledge-seed/civil-earthworks-guide.md` |
| 8 | **Structural Author** | Approved structural research report + format reference | `src/lib/constants/knowledge-seed/structural-engineering-guide.md` |
| 9 | **Architectural Author** | Approved architectural research report + format reference | `src/lib/constants/knowledge-seed/architectural-trades-guide.md` |
| 10 | **MEP Author** | Approved MEP research report + format reference | `src/lib/constants/knowledge-seed/mep-services-guide.md` |
| 11 | **Interfaces Author** | Approved interfaces research report + format reference | `src/lib/constants/knowledge-seed/trade-interfaces-coordination-guide.md` |

Each authoring agent receives:
- The approved research report for its discipline (standards table, defect register, lead times)
- The content authoring rules and YAML frontmatter template from Phase 3C
- The quality bar: *"Would a 15-year PM find this useful or obvious?"*
- An existing seed file (`contract-administration-guide.md`) as format reference

#### Wave 3 Progress
- [x] Agent 7: Civil Engineering seed file authored (19 sections, ~12,473 words)
- [x] Agent 8: Structural Engineering seed file authored (19 sections, ~13,018 words)
- [x] Agent 9: Architectural Trades seed file authored (21 sections, ~13,300 words)
- [x] Agent 10: MEP Services seed file authored (22 sections, ~16,000 words)
- [x] Agent 11: Trade Interfaces seed file authored (18 sections, ~13,124 words)

---

### Wave 4 — Ingestion & Testing (1 agent)

After all 5 seed files are written and infrastructure is merged:

| # | Agent | Task |
|---|-------|------|
| 12 | **Ingestion & Test** | Run `npx tsx scripts/ingest-seed-knowledge.ts`, execute 15 retrieval precision queries (Stage 4B), run end-to-end TRR test (Stage 4C) |

#### Wave 4 Progress
- [x] Agent 12: Ingestion script ran successfully (5 files detected, parsed, chunked, embedded — 197 chunks, 121,179 tokens)
- [x] Agent 12: Retrieval precision — 15/15 queries return correct discipline results (100% pass rate, scores 0.7464–0.9495)
- [x] Agent 12: End-to-end TRR test — structural tender includes discipline knowledge context (6/6 tests passed, 14,444 chars context)

---

### Execution Summary

| Wave | Agents | Parallel? | Depends On | Deliverable |
|------|--------|-----------|------------|-------------|
| **Wave 1** | 6 (1 code + 5 research) | All parallel | Nothing | Infrastructure code + 5 research reports |
| **Wave 2** | 0 (user review) | N/A | Wave 1 | Approved section lists per discipline |
| **Wave 3** | Up to 5 (authoring) | All parallel | Wave 2 (per discipline) | 5 seed markdown files (~275-350 chunks) |
| **Wave 4** | 1 (ingestion + testing) | Sequential | Waves 1 + 3 | Ingested content, passing retrieval tests |
