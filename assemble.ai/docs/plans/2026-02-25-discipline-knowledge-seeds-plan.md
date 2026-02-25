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

## Stage 3: Seed Content Authoring

**Goal:** Create the 5 discipline seed markdown files following the established authoring format.

**Files to create (in `src/lib/constants/knowledge-seed/`):**
- `civil-earthworks-guide.md`
- `structural-engineering-guide.md`
- `architectural-trades-guide.md`
- `mep-services-guide.md`
- `trade-interfaces-coordination-guide.md`

### Content Authoring Rules

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

[200-500 words of prose focused on constructability, interfaces, and procurement — NOT engineering design theory]

Reference: [Standards/codes cited]
Applies to: [Project types and scale]
Related standards: [Cross-references to other domain content]

Common pitfalls:
- [Bullet 1]
- [Bullet 2]
- [Bullet 3]
```

### 3A. Civil Engineering & Earthworks Guide (~45 chunks)

Sections to cover:
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

### 3B. Structural Engineering Guide (~50 chunks)

Sections to cover:
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

### 3C. Architectural Trades Guide (~60 chunks)

Sections to cover:
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

### 3D. MEP Services Guide (~70 chunks)

Sections to cover:
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

### 3E. Trade Interfaces & Coordination Guide (~50 chunks)

Sections to cover:
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

### Verification — Stage 3
- [ ] Each file has valid YAML frontmatter with all 8 required fields
- [ ] Each `domainSlug` matches the corresponding entry in `PREBUILT_DOMAINS`
- [ ] Content uses `## Section` / `### Subsection` heading hierarchy
- [ ] Each section includes Reference, Applies to, Related standards, Common pitfalls
- [ ] No fee ranges or deliverable lists (these belong in consultant-templates.json)
- [ ] Content focuses on constructability, interfaces, and procurement — not engineering design theory
- [ ] Total estimated chunk count: ~275 chunks across 5 files (within 250-300 target)

---

## Stage 4: Ingestion & Integration Testing

**Goal:** Ingest the seed content into the database and verify retrieval precision.

### 4A. Run ingestion script

```bash
npx tsx scripts/ingest-seed-knowledge.ts
```

Verify:
- [ ] All 5 new seed files are detected and parsed
- [ ] YAML frontmatter is valid for each file
- [ ] Chunks are created with correct hierarchy levels and paths
- [ ] Embeddings are generated (Voyage AI)
- [ ] `document_sets` entries created with correct `domain_tags` arrays
- [ ] `knowledge_domain_sources` entries created with `source_type: 'prebuilt_seed'`

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
- [ ] Top-5 reranked results are from the correct discipline domain
- [ ] No cross-discipline contamination (structural queries don't return civil chunks)
- [ ] Relevance scores > 0.3 for top results

### 4C. End-to-end TRR test

Generate a TRR for a structural tender package and verify:
- [ ] Knowledge context section appears in the assembled prompt
- [ ] Structural domain chunks are included alongside procurement guidance
- [ ] AI output references discipline-specific considerations (not just generic procurement advice)

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
Stage 1 (Infrastructure) ──→ Stage 2 (Definitions) ──→ Stage 3 (Content) ──→ Stage 4 (Ingestion & Testing)
                                                                                        │
                                                                               Stage 5 (Phase 2 — future)
```

- **Stage 1 must complete first** — routing changes are prerequisite for content to be useful
- **Stage 2 depends on Stage 1** — domain definitions reference tags established in Stage 1
- **Stage 3 can be parallelised** — 5 markdown files can be authored independently
- **Stage 4 depends on Stages 1-3** — needs both infrastructure and content
- **Stage 5 is independent** — can be scheduled after Stage 4 or deferred

---

## Risk Notes

1. **Tag validation bug:** TRR route currently sends `'contract-administration'` which is NOT a valid tag. This means current TRR domain retrieval is partially broken — Stage 1E fixes this.
2. **Chunk count calibration:** The retrieval pipeline uses `topK: 15, rerankTopK: 5`. Only ~5 chunks per query reach the prompt. Prioritise breadth (well-differentiated sections) over depth (many similar chunks).
3. **Existing content duplication:** Discipline seeds must NOT duplicate fee ranges, service phases, or deliverables already in `consultant-templates.json`. Content lens is constructability/risk/procurement.
4. **Embedding costs:** ~275 new chunks × Voyage AI embeddings. Estimate ~50K tokens for embedding generation. One-time cost during ingestion.
