# Pillar 1: Knowledge Domain System - Comprehensive Design

**Date**: 2026-02-21
**Status**: Design complete, pending approval
**Depends on**: None (foundational pillar)
**Depended on by**: Pillar 2 (Context Orchestrator), Pillar 3 (Inline Instructions), Pillar 4 (Coaching Engine)

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Australian Building Codes and Standards Research](#2-australian-building-codes-and-standards-research)
3. [Three-Tier Knowledge Architecture](#3-three-tier-knowledge-architecture)
4. [Domain Taxonomy and Tag System](#4-domain-taxonomy-and-tag-system)
5. [Seed Content Strategy](#5-seed-content-strategy)
6. [Database Schema Design](#6-database-schema-design)
7. [Retrieval Pipeline Changes](#7-retrieval-pipeline-changes)
8. [Chunking Strategy for Regulatory Documents](#8-chunking-strategy-for-regulatory-documents)
9. [Integration Points with Other Pillars](#9-integration-points-with-other-pillars)
10. [Edge Cases and Pitfalls](#10-edge-cases-and-pitfalls)
11. [Refined Implementation Approach](#11-refined-implementation-approach)

---

## 1. Current State Analysis

### 1.1 Existing RAG Architecture

The existing RAG system is well-architected and provides a solid foundation for the Knowledge Domain System. The current pipeline handles document ingestion, embedding, and retrieval for project-scoped and global organization-level documents.

**Schema (`src/lib/db/rag-schema.ts`):**

The `documentChunks` table stores 1024-dimension Voyage AI embeddings with a hierarchical structure supporting four levels (0=document, 1=section, 2=subsection, 3=clause). Each chunk carries metadata through `hierarchyPath` (e.g., "1.2.3"), `sectionTitle`, and `clauseNumber` fields, enabling precise citation and parent-child context enrichment.

The `documentSets` table groups documents with a `repoType` field that currently supports 7 values: `project` plus 6 global types (`due_diligence`, `house`, `apartments`, `fitout`, `industrial`, `remediation`). It includes `organizationId` and `isGlobal` fields for organization-level repositories.

The `documentSetMembers` table provides many-to-many linking between documents and sets with sync status tracking (`pending`, `processing`, `synced`, `failed`).

Supporting tables include `reportTemplates` and `reportSections` for LangGraph report state, and `reportMemory` for cross-project TOC pattern learning.

**Retrieval pipeline (`src/lib/rag/retrieval.ts`):**

The pipeline operates in 4 stages:
1. **Embed query** -- Voyage AI generates a 1024-dim embedding for the search query
2. **Vector search** -- pgvector cosine distance search across `document_chunks`
3. **Rerank** -- BAAI primary reranker with Cohere fallback, distance-based scoring as final fallback
4. **Enrich** -- Prepend parent context from hierarchical chunk relationships

The pipeline supports scoping by document IDs (resolved from document set memberships), batch retrieval for report generation with 3-concurrent query processing, and hierarchical chunk enrichment.

**Document processing worker (`workers/document-processor/index.ts`):**

A BullMQ worker handles the full ingestion pipeline: parse (LlamaParse, Unstructured, pdf-parse fallback chain) -> chunk (construction-aware with clause pattern detection) -> batch embed (Voyage AI) -> store (batched inserts of 50).

**Chunking module (`src/lib/rag/chunking.ts`):**

Construction-aware chunking already handles:
- Numbered clause patterns (`3.2.1 Concrete Mix`)
- Specification section patterns (`PART 1`, `SECTION 1`)
- Document type detection (specifications, drawing schedules, correspondence, reports)
- Hierarchical parent-child relationships for large clauses split into sub-chunks

### 1.2 Key Gaps Identified

**Gap 1: No domain-level classification on document sets.** There is no way to tag a document set as "regulatory" vs "best-practices" vs "templates". The `repoType` field only handles project-type groupings (house, apartments, etc.), not knowledge domain categorization.

**Gap 2: No pre-built knowledge layer.** The system only retrieves from user-uploaded documents. There is no mechanism for shipping curated, authoritative reference content that every organization benefits from out of the box.

**Gap 3: Chunking is tuned for project documents only.** Building codes and standards have different structural patterns (NCC clause numbering, AS standard section format, performance requirements) that the current chunking module does not detect.

**Gap 4: No domain-aware retrieval scoping.** The retrieval function filters by document IDs but cannot filter by domain tags, project type applicability, or state/territory relevance. There is no way to say "retrieve from cost management knowledge, filtered for residential projects in NSW."

**Gap 5: No provenance tracking.** There is no record of where a document set's content originated (pre-built seed, user upload, or organization library), its version, or when it was last verified for accuracy.

### 1.3 Competitive Landscape

| Platform | Knowledge System | RAG | Domain Classification |
|----------|-----------------|-----|----------------------|
| Procore | No regulatory knowledge | No | Third-party integrations |
| Aconex | Document management only | No | Metadata tagging by users |
| PlanGrid | Drawing/field management | No | No knowledge system |
| Mastt | Best-practice report templates | No | No |
| Buildxact | Built-in cost database | No | Cost data only |
| **Assemble.ai** | **AI-powered knowledge domains** | **Yes** | **Automatic + curated** |

**Conclusion: No existing Australian construction platform has AI-powered knowledge domains. This is a genuine differentiator.**

---

## 2. Australian Building Codes and Standards Research

### 2.1 National Construction Code (NCC)

The NCC is the primary regulatory framework for building in Australia, maintained by the Australian Building Codes Board (ABCB).

**Structure:**
- **Volume 1**: Commercial buildings (Class 2-9)
- **Volume 2**: Residential buildings (Class 1 and 10)
- **Volume 3**: Plumbing and drainage

**Performance-based framework:** The NCC uses a hierarchy of Performance Requirements (mandatory outcomes), Deemed-to-Satisfy (DtS) Provisions (prescriptive compliance paths), and Verification Methods (alternative compliance pathways).

**Access and licensing:**
- Free digital access since 2019 at ncc.abcb.gov.au
- Can quote individual clauses with attribution
- Cannot replicate entire code sections or DtS tables
- Updated every 3 years (latest NCC 2022, effective May 2023)

**State variations are critical:** Each state and territory can amend the NCC with local additions. These variations must be tracked:

| State | Authority | Key Additions |
|-------|-----------|---------------|
| NSW | NSW Fair Trading / Building Commissioner | BASIX energy/water targets, Design & Building Practitioners Act 2020 |
| VIC | Victorian Building Authority (VBA) | Essential Safety Measures, BAL (Bushfire Attack Level) requirements |
| QLD | QBCC | Wind region classifications, pool safety, Queensland Development Code (QDC) |
| WA | Building Commissioner WA | Energy efficiency variations |
| SA | Building Professional Board SA | Bushfire planning overlays |
| TAS | Consumer Building & Occupational Services | Energy efficiency addenda |
| ACT | EPSDD | Territory Plan requirements |
| NT | Dept of Infrastructure | Cyclone region D requirements |

### 2.2 Australian Standards (AS)

**Copyright constraints:** Australian Standards are copyright-protected and individually priced ($80-$500+ each). Full text cannot be embedded or reproduced.

**Legally safe content for seed data:**
- Standard numbers and official titles
- Scope descriptions (what the standard covers)
- NCC cross-references (which NCC clauses reference which AS)
- General principle summaries written in original words
- Application guidance (when/where to use each standard)

**Key standards by discipline:**

| Category | Standards | Purpose |
|----------|-----------|---------|
| **CONTRACTS & PROCUREMENT** | | |
| | AS 4000-1997 | General conditions of contract (major works, private sector) |
| | AS 2124-1992 | General conditions of contract (government/institutional) |
| | AS 4902-2000 | Design and Construct conditions of contract |
| | AS 4905-2002, AS 4949-2001 | Minor works and work order contracts |
| | AS 4901-1998, AS 2545-1993, AS 4903-2000 | Subcontract forms (for AS 4000, AS 2124, AS 4902) |
| **STRUCTURAL -- Loading** | | |
| | AS/NZS 1170.0, .1, .2, .3, .4 | Structural design actions (general, permanent/imposed, wind, snow, earthquake) |
| **STRUCTURAL -- Concrete** | | |
| | AS 3600:2018 | Concrete structures design and construction |
| | AS/NZS 4671:2019 | Steel reinforcement for concrete (rebar and mesh) |
| | AS 3610.1, .2 | Formwork for concrete (documentation, design, erection) |
| | AS 1012 (series) | Methods of testing concrete |
| **STRUCTURAL -- Steel** | | |
| | AS 4100:2020 | Steel structures design |
| | AS/NZS 5131:2016 | Structural steelwork fabrication and erection |
| | AS/NZS 1554 (series) | Structural steel welding |
| | AS/NZS 2312.1, .2 | Protective coatings for steel (paint, hot dip galvanizing) |
| | AS 4312 | Atmospheric corrosivity zones in Australia |
| **STRUCTURAL -- Timber** | | |
| | AS 1684.1, .2, .3, .4 | Residential timber-framed construction (design, non-cyclonic, cyclonic, simplified) |
| | AS 1720.1, .2 | Timber structures design methods and properties |
| | AS 5604 | Timber natural durability ratings |
| **STRUCTURAL -- Masonry & Foundations** | | |
| | AS 3700:2018 | Masonry structures design and construction |
| | AS 2159 | Piling design and installation |
| | AS 2870 | Residential slabs and footings (site classification) |
| | AS 4678 | Earth-retaining structures |
| **GEOTECHNICAL** | | |
| | AS 1726:2017 | Geotechnical site investigations (soil/rock classification) |
| | AS 1289 (series) | Methods of testing soils for engineering purposes |
| | AS 3798:2007 | Earthworks for commercial and residential developments |
| **ARCHITECTURAL -- Access & DDA** | | |
| | AS 1428.1:2021, .2, .4.1, .5 | Design for access and mobility (general, enhanced, tactile indicators, hearing) |
| **ARCHITECTURAL -- Acoustics** | | |
| | AS/NZS 2107:2016 | Recommended design sound levels for building interiors |
| | AS 3671 | Road traffic noise intrusion -- building siting and construction |
| **ARCHITECTURAL -- Glazing & Windows** | | |
| | AS 1288:2021 | Glass in buildings -- selection and installation |
| | AS 2047:2014 | Windows and external glazed doors in buildings |
| | AS 4420 (series) | Windows test methods (deflection, water, air, strength) |
| **ARCHITECTURAL -- General** | | |
| | AS 1657:2018 | Fixed platforms, walkways, stairways and ladders |
| | AS 1926.1:2024 | Swimming pool safety barriers |
| **MECHANICAL / HVAC** | | |
| | AS 1668.1 | Ventilation and air conditioning -- fire and smoke control |
| | AS 1668.2:2024 | Mechanical ventilation in buildings |
| | AS 1668.4 | Natural ventilation of buildings |
| | AS 4254.1, .2 | Ductwork for air-handling systems (flexible, rigid) |
| | AS/NZS 3823 (series) | Performance of air conditioners and heat pumps |
| | AS/NZS 5149 (series) | Refrigerating systems safety requirements |
| **ELECTRICAL -- General** | | |
| | AS/NZS 3000:2018 | Electrical installations (Wiring Rules) |
| | AS/NZS 3008.1.1 | Selection of cables for electrical installations |
| | AS/NZS 3017 | Electrical installations verification guidelines |
| | AS/NZS 61439 (series) | Low-voltage switchgear and controlgear assemblies |
| **ELECTRICAL -- Emergency & Lighting** | | |
| | AS/NZS 2293.1, .2, .3 | Emergency escape lighting and exit signs (design, inspection, construction) |
| **ELECTRICAL -- Lightning & Surge** | | |
| | AS 1768:2021 | Lightning protection |
| **ELECTRICAL -- Solar / Renewables** | | |
| | AS/NZS 5033:2021 | PV array installation and safety |
| | AS/NZS 4777.1:2024, .2 | Grid-connected inverter energy systems |
| | AS/NZS 5139 | Safety of battery systems for electrical installations |
| **HYDRAULIC / PLUMBING** | | |
| | AS/NZS 3500.0, .1, .2, .3, .4 | Plumbing and drainage (glossary, water services, sanitary, stormwater, heated water) |
| | AS/NZS 5601.1:2022 | Gas installations -- general |
| **FIRE PROTECTION -- Sprinklers** | | |
| | AS 2118.1:2017 | Automatic fire sprinkler systems -- general systems |
| | AS 2118.2 | Fire sprinkler systems -- wall-wetting sprinklers |
| | AS 2118.4 | Fire sprinkler systems -- residential (up to 4 storeys) |
| | AS 2118.5 | Home fire sprinkler systems |
| | AS 2118.6 | Combined sprinkler and hydrant systems (CMDA) |
| **FIRE PROTECTION -- Hydrants** | | |
| | AS 2419.1:2021 | Fire hydrant installations -- system design and commissioning |
| | AS 2419.2 | Fire hydrant valves |
| | AS 2419.3 | Fire brigade booster connections |
| **FIRE PROTECTION -- Detection & Alarm** | | |
| | AS 1670.1:2018 | Fire detection, warning and intercom -- system design and commissioning |
| | AS 1670.3 | Fire alarm monitoring |
| | AS 1670.4 | Sound systems and intercom for emergency purposes |
| | AS 3786:2023 | Smoke alarms (scattered light, transmitted light, ionisation) |
| **FIRE PROTECTION -- Pumps** | | |
| | AS 2941:2013 | Fixed fire protection installations -- pumpset systems |
| **FIRE PROTECTION -- Fire Resistance & Testing** | | |
| | AS 1530.1, .2, .3, .4 | Fire tests (combustibility, flammability, ignitability/heat/smoke, fire-resistance) |
| **FIRE PROTECTION -- Fire Doors & Passive** | | |
| | AS 1905.1:2015 | Fire-resistant doorsets for openings in fire-resistant walls |
| **FIRE PROTECTION -- Portable Equipment** | | |
| | AS 2444 | Portable fire extinguishers and fire blankets -- selection and location |
| **FIRE PROTECTION -- Maintenance** | | |
| | AS 1851 | Routine service of fire protection systems and equipment |
| **WATERPROOFING / ROOFING** | | |
| | AS 3740:2021 | Waterproofing of domestic wet areas |
| | AS 4654.1, .2 | Waterproofing membranes for external above-ground use (materials, design/installation) |
| | AS 4200.1, .2 | Pliable building membranes and underlays (materials, installation) |
| **FACADES & CURTAIN WALLS** | | |
| | AS 4284 | Testing of building facades |
| **LIFTS / VERTICAL TRANSPORT** | | |
| | AS 1735.1.2:2021 | Passenger and goods-passenger lifts |
| | AS 1735.2 | Escalators and moving walks |
| | AS 1735.12:2020 | Lift facilities for persons with disabilities |
| **COMMUNICATIONS / DATA** | | |
| | AS/CA S009:2020, S008:2020 | Customer cabling installation requirements and product requirements |
| | AS/NZS 3080:2013 | Generic cabling for commercial premises |
| **SECURITY** | | |
| | AS/NZS 2201.1, .2, .3, .5 | Intruder alarm systems (design, monitoring, detection, transmission) |
| | AS 4806.1, .2 | CCTV management, operation and application guidelines |
| **SUSTAINABILITY / ENERGY** | | |
| | AS/NZS 4859.1, .2 | Thermal insulation materials for buildings (criteria, design values) |
| **PAINTING / PROTECTIVE COATINGS** | | |
| | AS/NZS 2312.1, .2 | Protection of structural steel (paint coatings, hot dip galvanizing) |
| | AS 1627.4 | Metal surface preparation -- abrasive blast cleaning |
| | AS 4312 | Atmospheric corrosivity zones in Australia |
| **OCCUPATIONAL HEALTH & SAFETY** | | |
| | AS/NZS 1576 (series) | Scaffolding requirements (general, couplers, prefabricated, hanging) |
| | AS 2601:2001 | Demolition of structures |
| | AS 1418 (series) | Cranes, hoists and winches -- design and construction |
| | AS 2550 (series) | Cranes, hoists and winches -- safe use |

> **Note:** Standards with "(series)" have multiple parts (e.g., AS 1012.1, .2, etc.). The parent number is what a PM/QS typically references; part numbers are relevant to specialists. The NCC (National Construction Code) is not itself an AS standard but references many of these and is the overarching regulatory framework. Standard numbers remain stable but editions change — the app stores number and edition year separately for independent updates.

### 2.3 Sustainability Standards

| Framework | Access | Seed Content Strategy |
|-----------|--------|----------------------|
| NatHERS | Free public tools and methodology | Summarize rating methodology, star band thresholds |
| NABERS | Public rating methodology | Summarize rating levels, energy/water benchmarks |
| Green Star | Members-only detailed criteria, public rating levels | Summarize public rating descriptions, credit categories |
| BASIX (NSW) | Public calculator | Summarize target thresholds, applicable building types |

### 2.4 Contract Standards

The Australian construction industry uses several standard contract forms:

| Contract | Type | Typical Use |
|----------|------|-------------|
| AS 2124-1992 | General conditions | Government/institutional, traditional procurement |
| AS 4000-1997 | General conditions | Private sector, traditional procurement |
| AS 4902-2000 | D&C conditions | Design and construct projects |
| ABIC MW-1 | Major works | Architect-administered contracts |
| HIA contracts | Residential | Home building (mandatory in some states) |
| MBA contracts | Residential | Master Builders Association residential contracts |

---

## 3. Three-Tier Knowledge Architecture

### 3.1 Architecture Overview

The Knowledge Domain System operates across three tiers, each serving a distinct purpose and data source:

```
┌─────────────────────────────────────────────────────────────┐
│                    QUERY-TIME ASSEMBLY                        │
│     Tier 3: Dynamic / AI-Synthesized Knowledge               │
│     Claude + Tier 1 + Tier 2 + Project Context              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────┐  ┌──────────────────────────────┐ │
│  │  Tier 1: Baked-In    │  │  Tier 2: Organization-       │ │
│  │  Reference Knowledge │  │  Uploaded Libraries          │ │
│  │                      │  │                              │ │
│  │  - NCC clause index  │  │  - Company procedures        │ │
│  │  - AS standard       │  │  - Contract templates        │ │
│  │    catalog            │  │  - Past project close-outs  │ │
│  │  - State variations  │  │  - Trade specifications      │ │
│  │  - Contract type     │  │  - Design guidelines         │ │
│  │    comparisons        │  │  - Quality standards        │ │
│  │  - Building class    │  │                              │ │
│  │    definitions        │  │  (Existing RAG pipeline     │ │
│  │  - Best-practice     │  │   with domain tags added)    │ │
│  │    guides             │  │                              │ │
│  └──────────────────────┘  └──────────────────────────────┘ │
│                                                               │
│                    Vector Database (pgvector)                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Tier 1: Baked-In Reference Knowledge (Seed Data)

Pre-authored knowledge chunks that ship with the platform. Every organization gets these automatically. Content is written in original language with references to authoritative sources.

**Included:**
- NCC clause reference index (numbers, titles, descriptions in original words)
- AS standard catalog (numbers, titles, scope descriptions)
- State/territory variation summaries per jurisdiction
- Contract type reference (AS 2124, AS 4000, ABIC, HIA comparisons)
- Common regulatory pathways (DA, CC, OC process)
- Building class definitions (Class 1a through Class 10c)
- Construction stage checklists and milestone guidance
- Cost management principles (contingency, variations, progress claims)
- Procurement and tendering best practices
- Program and scheduling guidance

**Explicitly NOT included:**
- Full text of any standard or code
- Deemed-to-Satisfy provision tables
- Detailed engineering requirements or calculation methods
- Proprietary rating tool criteria

### 3.3 Tier 2: Organization-Uploaded Knowledge Libraries

Organization-specific documents processed through the existing RAG pipeline, now enhanced with domain classification. Organizations upload their own:

- Company-specific contract templates and standard clauses
- Internal procedures and quality management documents
- Past project close-out reports and lessons learned
- Trade-specific specifications and design guidelines
- Preferred supplier lists and prequalification criteria

These documents flow through the existing document processing worker (parse -> chunk -> embed -> store) but are tagged with domain metadata for targeted retrieval.

### 3.4 Tier 3: Dynamic / AI-Synthesized Knowledge

Assembled at query time by combining Tier 1 seed data, Tier 2 organization documents, project-specific context, and Claude's training knowledge. The key insight is that Claude already has substantial knowledge of Australian building codes and construction practices from its training data. What it needs is the **citation pathway** -- structured references that let it ground its answers in verifiable sources rather than relying on parametric knowledge alone.

The Context Orchestrator (Pillar 2) handles the assembly of Tier 3 knowledge at query time, pulling from domain-tagged retrieval results and formatting them for the AI prompt.

---

## 4. Domain Taxonomy and Tag System

### 4.1 Pre-Built Domain Definitions

Ten pre-built knowledge domains, each with a domain type, set of tags, and description:

| # | Domain Name | Domain Type | Tags | Description |
|---|------------|-------------|------|-------------|
| 1 | NCC Reference Guide | `reference` | `ncc`, `regulatory` | National Construction Code clause index, building classifications, performance requirements |
| 2 | AS Standards Reference | `reference` | `as-standards`, `regulatory` | Australian Standards catalog, scope descriptions, NCC cross-references |
| 3 | Residential Construction Guide | `best_practices` | `residential`, `construction` | Best practices for Class 1/10 residential projects |
| 4 | Multi-Residential/Apartments Guide | `best_practices` | `residential`, `commercial`, `apartments` | Best practices for Class 2-4 multi-residential projects |
| 5 | Commercial Construction Guide | `best_practices` | `commercial`, `construction` | Best practices for Class 5-9 commercial and institutional projects |
| 6 | Cost Management Principles | `best_practices` | `cost-management`, `budgeting`, `variations` | Cost planning, contingency, progress claims, forecast management |
| 7 | Procurement & Tendering Guide | `best_practices` | `procurement`, `contracts`, `tendering` | Tender process, evaluation criteria, RFT preparation |
| 8 | Contract Administration Guide | `best_practices` | `contracts`, `as2124`, `as4000`, `variations`, `eot`, `defects` | Contract management, variations, extensions of time, defect liability |
| 9 | Program & Scheduling Guide | `best_practices` | `programming`, `milestones`, `critical-path` | Construction programming, milestone tracking, delay analysis |
| 10 | Remediation & Due Diligence Guide | `best_practices` | `remediation`, `due-diligence`, `environmental` | Site investigation, contamination assessment, remediation action plans |

### 4.2 Domain Type Enum

```typescript
export const DOMAIN_TYPES = [
  'reference',         // Regulatory and standards references
  'regulatory',        // Jurisdiction-specific regulatory content
  'best_practices',    // Industry best-practice guidance
  'templates',         // Document and process templates
  'project_history',   // Past project lessons learned
  'custom',            // User-defined custom domains
] as const;

export type DomainType = (typeof DOMAIN_TYPES)[number];
```

### 4.3 Tag Taxonomy

Tags are organized into five categories. A domain can have tags from multiple categories.

**Building Type Tags:**
```typescript
const BUILDING_TYPE_TAGS = [
  'residential',    // Class 1, 10
  'apartments',     // Class 2
  'commercial',     // Class 5-9
  'industrial',     // Class 7, 8
  'mixed-use',      // Multiple classes
] as const;
```

**Discipline Tags:**
```typescript
const DISCIPLINE_TAGS = [
  'architectural',
  'structural',
  'mechanical',
  'electrical',
  'hydraulic',
  'fire',
  'civil',
  'landscape',
  'interior',
  'sustainability',
] as const;
```

**Function Tags:**
```typescript
const FUNCTION_TAGS = [
  'cost-management',
  'budgeting',
  'variations',
  'progress-claims',
  'procurement',
  'tendering',
  'contracts',
  'programming',
  'milestones',
  'critical-path',
  'construction',
  'defects',
  'eot',              // Extension of time
  'remediation',
  'due-diligence',
  'environmental',
] as const;
```

**Regulatory Tags:**
```typescript
const REGULATORY_TAGS = [
  'ncc',
  'as-standards',
  'regulatory',
  'basix',            // NSW energy/water
  'nathers',
  'nabers',
  'green-star',
] as const;
```

**Contract Tags:**
```typescript
const CONTRACT_TAGS = [
  'as2124',
  'as4000',
  'as4902',
  'abic',
  'hia',
  'mba',
] as const;
```

**Master tag list (union):**

```typescript
export const ALL_DOMAIN_TAGS = [
  ...BUILDING_TYPE_TAGS,
  ...DISCIPLINE_TAGS,
  ...FUNCTION_TAGS,
  ...REGULATORY_TAGS,
  ...CONTRACT_TAGS,
] as const;

export type DomainTag = (typeof ALL_DOMAIN_TAGS)[number];
```

### 4.4 Section-to-Domain Tag Mapping

This mapping connects report sections and module contexts to relevant knowledge domains. Used by the Context Orchestrator (Pillar 2) and the Coaching Q&A system (Pillar 4) to automatically determine which domains to query.

```typescript
export const SECTION_TO_DOMAIN_TAGS: Record<string, DomainTag[]> = {
  // Report sections
  'brief': ['cost-management', 'programming'],
  'procurement': ['procurement', 'contracts', 'tendering'],
  'cost_planning': ['cost-management', 'variations', 'progress-claims'],
  'programme': ['programming', 'milestones', 'critical-path'],
  'planning_authorities': ['ncc', 'regulatory'],
  'design': ['architectural', 'ncc'],
  'construction': ['construction', 'contracts', 'defects'],

  // Module contexts (for Coaching Q&A)
  'cost_plan': ['cost-management', 'budgeting', 'variations', 'progress-claims'],
  'variations': ['variations', 'contracts', 'eot'],
  'invoices': ['progress-claims', 'cost-management'],
  'payment_schedule': ['progress-claims', 'contracts'],
  'program': ['programming', 'milestones', 'critical-path'],
  'stakeholders': ['procurement', 'contracts'],
  'documents': ['procurement', 'tendering'],
  'reports': ['cost-management', 'programming', 'procurement'],
};
```

---

## 5. Seed Content Strategy

### 5.1 The "Smart Summary + Citation" Format

Every seed knowledge chunk follows a consistent format designed to maximize retrieval precision while respecting copyright constraints. The format provides enough context for the AI to give specific, actionable answers while directing users to authoritative sources for full details.

**Format per chunk:**

```
[Topic Heading]

[Plain-language summary written in original words, not copied from source]

Reference: [NCC Clause X.X.X / AS XXXX Section Y / Jurisdiction Act Name]
Applies to: [Building classes, project types, states/territories]
Related standards: [Cross-references to related codes/standards]

Common pitfalls:
- [Practical mistake or oversight #1]
- [Practical mistake or oversight #2]
- [Practical mistake or oversight #3]
```

### 5.2 Example Seed Chunks

**Example 1: NCC Reference Guide**

```
Fire Resistance Levels (FRL) for Class 2 Buildings

In multi-residential buildings (Class 2), the fire resistance levels for
structural elements depend on the building's effective height and type of
construction. For buildings with an effective height of not more than 25m,
Type A construction requires minimum FRL of 90/90/90 for load-bearing walls.
Type B construction (permitted for buildings not more than 3 storeys) has
reduced requirements.

The fire resistance level notation represents adequacy/integrity/insulation
in minutes. A rating of 90/90/90 means the element must withstand 90 minutes
for each criterion.

Reference: NCC 2022 Volume 1, Specification C1.1, Table 3
Applies to: Class 2 (apartments), Class 3 (hotels/boarding), some Class 9
Related standards: AS 1530.4 (fire resistance tests)
State variations: Check state-specific amendments for deemed-to-satisfy
provisions, particularly regarding sprinklered vs non-sprinklered buildings

Common pitfalls:
- Confusing effective height with actual building height
- Forgetting mixed-use buildings classify each part separately
- Not checking state-specific variations for sprinklered vs non-sprinklered
```

**Example 2: Cost Management Principles**

```
Contingency Allowances by Project Type

Contingency is a budget provision for unforeseen costs that emerge during
the project lifecycle. The appropriate contingency percentage depends on the
project type, stage of design development, and risk profile.

Typical contingency ranges in Australian construction:
- Residential new build (Class 1): 5-10% of construction cost
- Multi-residential (Class 2): 8-12% of construction cost
- Commercial fit-out: 5-8% of fit-out cost
- Commercial new build: 8-10% of construction cost
- Remediation: 20-30% of estimated remediation cost
- Refurbishment: 10-15% of construction cost

These ranges assume a project at Design Development stage. Earlier stages
(feasibility, concept) warrant higher contingency; later stages (tender,
construction) warrant lower contingency as costs become more certain.

Reference: AIQS Cost Management Practice Guide
Applies to: All building classes and project types
Related standards: AS 4122 (General conditions for engagement of consultants)

Common pitfalls:
- Setting contingency too low on remediation projects where unknowns are high
- Not adjusting contingency downward as design progresses and costs firm up
- Double-counting risk allowances already in trade package budgets
- Failing to track contingency drawdown against percentage complete
```

**Example 3: Contract Administration Guide**

```
Extension of Time (EOT) Claims Under AS 4000

Under AS 4000-1997, the contractor is entitled to an extension of time for
delays caused by qualifying causes of delay listed in the contract. The
contractor must give written notice within the time specified in the
contract (typically 28 days of the delay event becoming apparent).

Key requirements for a valid EOT claim:
1. The delay must be caused by a qualifying cause listed in the contract
2. The contractor must have given proper notice within the required timeframe
3. The delay must actually affect the critical path to practical completion
4. The contractor must have taken reasonable steps to mitigate the delay

The superintendent must assess the claim and grant or reject the extension.
Failure to assess within the specified period may have contractual
consequences depending on the specific amendments to the standard conditions.

Reference: AS 4000-1997, Clause 34 (Extensions of time)
Applies to: Projects using AS 4000 form of contract
Related standards: AS 2124-1992 Clause 35.5, Security of Payment legislation

Common pitfalls:
- Missing the notice period (typically 28 days) renders claims invalid
- Not demonstrating impact on the critical path
- Failing to separate concurrent delays (contractor-caused vs owner-caused)
- Not keeping contemporaneous records of delay events
```

### 5.3 Volume Estimates

| Domain | Estimated Chunks | Tokens per Chunk | Total Tokens |
|--------|-----------------|-------------------|--------------|
| NCC Reference Guide | 150-200 | 500-800 | ~120,000 |
| AS Standards Reference | 80-120 | 400-600 | ~60,000 |
| Residential Construction Guide | 60-80 | 600-1000 | ~56,000 |
| Multi-Residential/Apartments Guide | 60-80 | 600-1000 | ~56,000 |
| Commercial Construction Guide | 50-70 | 600-1000 | ~45,000 |
| Cost Management Principles | 80-100 | 600-1000 | ~72,000 |
| Procurement & Tendering Guide | 70-90 | 600-1000 | ~64,000 |
| Contract Administration Guide | 80-100 | 600-1000 | ~72,000 |
| Program & Scheduling Guide | 50-70 | 600-1000 | ~45,000 |
| Remediation & Due Diligence Guide | 50-70 | 600-1000 | ~45,000 |
| **Total** | **~730-980** | | **~635,000** |

**Embedding cost estimate:** At Voyage AI pricing (~$0.10 per million tokens), the total seed data costs approximately $0.06-0.10 to embed. Per-domain embedding cost is negligible at $0.01-0.02.

### 5.4 Authoring Phases

Content authoring is sequenced to deliver value early while deferring legally sensitive content:

**Phase A (Ship first): 4 universal domains -- no regulatory review needed**
1. Cost Management Principles
2. Procurement & Tendering Guide
3. Contract Administration Guide
4. Program & Scheduling Guide

These contain industry best practices written in original language. No regulatory text reproduction concerns.

**Phase B: Regulatory reference domains -- requires legal review**
5. NCC Reference Guide (clause index only, original-language summaries)
6. AS Standards Reference (catalog with scope descriptions)

**Phase C: Project-type-specific guides**
7. Residential Construction Guide
8. Multi-Residential/Apartments Guide
9. Commercial Construction Guide
10. Remediation & Due Diligence Guide

### 5.5 Seed Content Storage

Seed content is authored as markdown files stored in the repository:

```
src/lib/constants/knowledge-seed/
  cost-management-principles.md
  procurement-tendering-guide.md
  contract-administration-guide.md
  program-scheduling-guide.md
  ncc-reference-guide.md
  as-standards-reference.md
  residential-construction-guide.md
  multi-residential-apartments-guide.md
  commercial-construction-guide.md
  remediation-due-diligence-guide.md
```

Each file uses a consistent frontmatter format:

```markdown
---
domain: cost-management-principles
name: Cost Management Principles
domainType: best_practices
tags: [cost-management, budgeting, variations]
version: "1.0.0"
applicableProjectTypes: [refurb, extend, new, remediation, advisory]
applicableStates: [NSW, VIC, QLD, WA, SA, TAS, ACT, NT]
---

# Cost Management Principles

## Contingency Allowances by Project Type

Contingency is a budget provision for unforeseen costs...
```

An ingestion script parses these files, splits them into chunks using the regulatory chunking strategy (Section 8), generates embeddings, and inserts them into the database as a pre-built document set with the appropriate domain metadata.

---

## 6. Database Schema Design

### 6.1 Additions to `documentSets` Table

Two new columns are added to the existing `documentSets` table in `src/lib/db/rag-schema.ts`:

```typescript
// In documentSets table definition, add after isGlobal:
domainType: text('domain_type', {
    enum: ['reference', 'regulatory', 'best_practices', 'templates', 'project_history', 'custom'],
}), // NULL for non-knowledge document sets (backward compatible)
domainTags: text('domain_tags').array(), // e.g., ['cost-management', 'budgeting', 'variations']
```

**New `repoType` values:** The existing `repoType` enum is extended with three knowledge-specific values:

```typescript
repoType: text('repo_type', {
    enum: [
        'project',
        'due_diligence', 'house', 'apartments', 'fitout', 'industrial', 'remediation',
        // New knowledge repo types:
        'knowledge_regulatory',
        'knowledge_practices',
        'knowledge_templates',
    ],
}).default('project'),
```

**New indexes** for domain queries:

```typescript
// Add to documentSets table indexes:
index('idx_document_sets_domain_type').on(table.domainType),
// Note: GIN index for domainTags array needs raw SQL migration (see below)
```

**Raw SQL migration** for the array GIN index (Drizzle does not support GIN indexes natively):

```sql
CREATE INDEX idx_document_sets_domain_tags ON document_sets USING GIN (domain_tags);
```

### 6.2 New `knowledgeDomainSources` Table

A new table tracks the provenance, versioning, and applicability of knowledge domain content. This enables version management when regulatory content updates (e.g., NCC 2025 edition) and state-level filtering.

```typescript
export const knowledgeDomainSources = pgTable(
    'knowledge_domain_sources',
    {
        id: text('id').primaryKey(),
        documentSetId: text('document_set_id')
            .notNull()
            .references(() => documentSets.id, { onDelete: 'cascade' }),
        sourceType: text('source_type', {
            enum: ['prebuilt_seed', 'user_uploaded', 'organization_library'],
        }).notNull(),
        sourceVersion: text('source_version'), // e.g., "1.0.0", "NCC 2022"
        lastVerifiedAt: timestamp('last_verified_at'), // When content was last reviewed for accuracy
        applicableProjectTypes: text('applicable_project_types').array(),
        // e.g., ['refurb', 'extend', 'new']
        applicableStates: text('applicable_states').array(),
        // e.g., ['NSW', 'VIC', 'QLD']
        isActive: boolean('is_active').default(true),
        metadata: jsonb('metadata'), // Flexible field for additional provenance data
        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at').defaultNow(),
    },
    (table) => [
        index('idx_kds_document_set').on(table.documentSetId),
        index('idx_kds_source_type').on(table.sourceType),
        index('idx_kds_active').on(table.isActive),
        // GIN indexes for array columns (via raw SQL migration):
        // CREATE INDEX idx_kds_project_types ON knowledge_domain_sources USING GIN (applicable_project_types);
        // CREATE INDEX idx_kds_states ON knowledge_domain_sources USING GIN (applicable_states);
    ]
);

export const knowledgeDomainSourcesRelations = relations(knowledgeDomainSources, ({ one }) => ({
    documentSet: one(documentSets, {
        fields: [knowledgeDomainSources.documentSetId],
        references: [documentSets.id],
    }),
}));
```

### 6.3 Updated `documentSets` Relations

```typescript
export const documentSetsRelations = relations(documentSets, ({ many }) => ({
    members: many(documentSetMembers),
    reports: many(reportTemplates),
    domainSources: many(knowledgeDomainSources), // New relation
}));
```

### 6.4 SQL Migration Summary

```sql
-- Step 1: Add domain columns to document_sets
ALTER TABLE document_sets
  ADD COLUMN domain_type TEXT,
  ADD COLUMN domain_tags TEXT[];

-- Step 2: Extend repo_type enum (PostgreSQL enum type alteration)
-- If repo_type is a text column with application-level enum, no DB change needed.
-- If using PostgreSQL ENUM type, use:
-- ALTER TYPE repo_type_enum ADD VALUE 'knowledge_regulatory';
-- ALTER TYPE repo_type_enum ADD VALUE 'knowledge_practices';
-- ALTER TYPE repo_type_enum ADD VALUE 'knowledge_templates';

-- Step 3: Create indexes
CREATE INDEX idx_document_sets_domain_type ON document_sets (domain_type);
CREATE INDEX idx_document_sets_domain_tags ON document_sets USING GIN (domain_tags);

-- Step 4: Create knowledge_domain_sources table
CREATE TABLE knowledge_domain_sources (
  id                      TEXT PRIMARY KEY,
  document_set_id         TEXT NOT NULL REFERENCES document_sets(id) ON DELETE CASCADE,
  source_type             TEXT NOT NULL, -- 'prebuilt_seed' | 'user_uploaded' | 'organization_library'
  source_version          TEXT,
  last_verified_at        TIMESTAMP,
  applicable_project_types TEXT[],
  applicable_states       TEXT[],
  is_active               BOOLEAN DEFAULT true,
  metadata                JSONB,
  created_at              TIMESTAMP DEFAULT NOW(),
  updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_kds_document_set ON knowledge_domain_sources (document_set_id);
CREATE INDEX idx_kds_source_type ON knowledge_domain_sources (source_type);
CREATE INDEX idx_kds_active ON knowledge_domain_sources (is_active);
CREATE INDEX idx_kds_project_types ON knowledge_domain_sources USING GIN (applicable_project_types);
CREATE INDEX idx_kds_states ON knowledge_domain_sources USING GIN (applicable_states);
```

### 6.5 Updated Type Exports

```typescript
// New repo type union
export const KNOWLEDGE_REPO_TYPES = [
    'knowledge_regulatory',
    'knowledge_practices',
    'knowledge_templates',
] as const;

export type KnowledgeRepoType = (typeof KNOWLEDGE_REPO_TYPES)[number];

// Extended RepoType
export type RepoType = 'project' | GlobalRepoType | KnowledgeRepoType;

// Extended display labels
export const REPO_TYPE_LABELS: Record<RepoType, string> = {
    project: 'Project',
    due_diligence: 'Due Diligence',
    house: 'House',
    apartments: 'Apartments',
    fitout: 'Fitout',
    industrial: 'Industrial',
    remediation: 'Remediation',
    knowledge_regulatory: 'Knowledge - Regulatory',
    knowledge_practices: 'Knowledge - Best Practices',
    knowledge_templates: 'Knowledge - Templates',
};

// Source type enum
export const KNOWLEDGE_SOURCE_TYPES = [
    'prebuilt_seed',
    'user_uploaded',
    'organization_library',
] as const;

export type KnowledgeSourceType = (typeof KNOWLEDGE_SOURCE_TYPES)[number];
```

---

## 7. Retrieval Pipeline Changes

### 7.1 New `retrieveFromDomains()` Function

A new top-level retrieval function in `src/lib/rag/retrieval.ts` that resolves knowledge domain document sets based on domain metadata, then delegates to the existing `retrieve()` pipeline.

```typescript
export interface DomainRetrievalOptions {
    projectType?: string;          // e.g., 'new', 'refurb'
    domainTags?: string[];         // e.g., ['cost-management', 'variations']
    domainTypes?: string[];        // e.g., ['best_practices', 'reference']
    organizationId?: string;       // For org-scoped domains
    state?: string;                // e.g., 'NSW', 'VIC'
    includePrebuilt?: boolean;     // Include seed domains (default: true)
    includeOrganization?: boolean; // Include org-uploaded domains (default: true)
    topK?: number;
    rerankTopK?: number;
    minRelevanceScore?: number;
}

export interface DomainRetrievalResult extends RetrievalResult {
    domainName?: string;           // Name of the source domain
    domainType?: string;           // Type of the source domain
    domainTags?: string[];         // Tags of the source domain
    sourceVersion?: string;        // Version of the source content
}

/**
 * Retrieve from knowledge domains with metadata-based filtering
 *
 * Resolution algorithm:
 * 1. Query documentSets where domainType IS NOT NULL
 * 2. Filter by repoType IN (knowledge_regulatory, knowledge_practices, knowledge_templates)
 * 3. Filter domainTags with PostgreSQL array overlap operator (&&)
 * 4. Join knowledgeDomainSources for projectType/state filtering
 * 5. Collect matching document set IDs
 * 6. Pass to existing retrieve() pipeline
 * 7. Enrich results with domain metadata for attribution
 */
export async function retrieveFromDomains(
    query: string,
    options: DomainRetrievalOptions = {}
): Promise<DomainRetrievalResult[]> {
    const {
        projectType,
        domainTags,
        domainTypes,
        organizationId,
        state,
        includePrebuilt = true,
        includeOrganization = true,
        topK = DEFAULT_TOP_K,
        rerankTopK = DEFAULT_RERANK_TOP_K,
        minRelevanceScore = MIN_RELEVANCE_SCORE,
    } = options;

    console.log(`[retrieval] Domain retrieval for: "${query.substring(0, 50)}..."`);
    console.log(`[retrieval] Domain filters: tags=${domainTags}, types=${domainTypes}, state=${state}`);

    // Step 1-4: Resolve matching domain document set IDs
    const matchingSetIds = await resolveDomainDocumentSets({
        domainTags,
        domainTypes,
        organizationId,
        projectType,
        state,
        includePrebuilt,
        includeOrganization,
    });

    if (matchingSetIds.length === 0) {
        console.warn('[retrieval] No matching knowledge domains found');
        return [];
    }

    console.log(`[retrieval] Found ${matchingSetIds.length} matching domain document sets`);

    // Step 5-6: Pass to existing retrieve() pipeline
    const results = await retrieve(query, {
        documentSetIds: matchingSetIds,
        topK,
        rerankTopK,
        minRelevanceScore,
        includeParentContext: true,
    });

    // Step 7: Enrich with domain metadata
    const enriched = await enrichWithDomainMetadata(results, matchingSetIds);

    return enriched;
}
```

### 7.2 Domain Document Set Resolution

```typescript
/**
 * Resolve document set IDs that match the given domain filters
 */
async function resolveDomainDocumentSets(filters: {
    domainTags?: string[];
    domainTypes?: string[];
    organizationId?: string;
    projectType?: string;
    state?: string;
    includePrebuilt: boolean;
    includeOrganization: boolean;
}): Promise<string[]> {
    const conditions: SQL[] = [];

    // Base condition: must be a knowledge domain (domainType is not null)
    conditions.push(sql`domain_type IS NOT NULL`);

    // Filter by repo type (knowledge repos only)
    conditions.push(sql`repo_type IN ('knowledge_regulatory', 'knowledge_practices', 'knowledge_templates')`);

    // Filter by domain type if specified
    if (filters.domainTypes && filters.domainTypes.length > 0) {
        const typesArray = `{${filters.domainTypes.join(',')}}`;
        conditions.push(sql`domain_type = ANY(${typesArray}::text[])`);
    }

    // Filter by domain tags using array overlap operator
    if (filters.domainTags && filters.domainTags.length > 0) {
        const tagsArray = `{${filters.domainTags.join(',')}}`;
        conditions.push(sql`domain_tags && ${tagsArray}::text[]`);
    }

    // Filter by source type (prebuilt vs organization)
    const sourceConditions: string[] = [];
    if (filters.includePrebuilt) {
        sourceConditions.push(`is_global = true`);
    }
    if (filters.includeOrganization && filters.organizationId) {
        sourceConditions.push(
            `(organization_id = '${filters.organizationId}' AND is_global = false)`
        );
    }
    if (sourceConditions.length > 0) {
        conditions.push(sql.raw(`(${sourceConditions.join(' OR ')})`));
    }

    // Build and execute query
    const whereClause = conditions.map(c => sql`(${c})`);
    const result = await ragDb.execute(sql`
        SELECT ds.id
        FROM document_sets ds
        LEFT JOIN knowledge_domain_sources kds ON kds.document_set_id = ds.id
        WHERE ${sql.join(whereClause, sql` AND `)}
        ${filters.projectType
            ? sql`AND (
                kds.applicable_project_types IS NULL
                OR ${filters.projectType} = ANY(kds.applicable_project_types)
            )`
            : sql``
        }
        ${filters.state
            ? sql`AND (
                kds.applicable_states IS NULL
                OR ${filters.state} = ANY(kds.applicable_states)
            )`
            : sql``
        }
        AND (kds.is_active IS NULL OR kds.is_active = true)
    `);

    return ((result.rows || []) as any[]).map(r => r.id);
}
```

### 7.3 Domain Metadata Enrichment

```typescript
/**
 * Enrich retrieval results with domain metadata for attribution
 */
async function enrichWithDomainMetadata(
    results: RetrievalResult[],
    documentSetIds: string[]
): Promise<DomainRetrievalResult[]> {
    if (results.length === 0) return [];

    // Fetch domain metadata for all matching document sets
    const setIdsArray = `{${documentSetIds.join(',')}}`;
    const domainMeta = await ragDb.execute(sql`
        SELECT
            ds.id as "setId",
            ds.name as "domainName",
            ds.domain_type as "domainType",
            ds.domain_tags as "domainTags",
            kds.source_version as "sourceVersion"
        FROM document_sets ds
        LEFT JOIN knowledge_domain_sources kds ON kds.document_set_id = ds.id
        WHERE ds.id = ANY(${setIdsArray}::text[])
    `);

    // Build lookup: document_id -> document_set metadata
    // This requires a second lookup through document_set_members
    const documentIds = [...new Set(results.map(r => r.documentId))];
    const docIdsArray = `{${documentIds.join(',')}}`;

    const docToSet = await ragDb.execute(sql`
        SELECT
            dsm.document_id as "documentId",
            dsm.document_set_id as "setId"
        FROM document_set_members dsm
        WHERE dsm.document_id = ANY(${docIdsArray}::text[])
        AND dsm.document_set_id = ANY(${setIdsArray}::text[])
    `);

    // Build lookup maps
    const setMetaMap = new Map<string, {
        domainName: string;
        domainType: string;
        domainTags: string[];
        sourceVersion: string | null;
    }>();
    for (const row of (domainMeta.rows || []) as any[]) {
        setMetaMap.set(row.setId, {
            domainName: row.domainName,
            domainType: row.domainType,
            domainTags: row.domainTags || [],
            sourceVersion: row.sourceVersion,
        });
    }

    const docToSetMap = new Map<string, string>();
    for (const row of (docToSet.rows || []) as any[]) {
        docToSetMap.set(row.documentId, row.setId);
    }

    // Enrich results
    return results.map(result => {
        const setId = docToSetMap.get(result.documentId);
        const meta = setId ? setMetaMap.get(setId) : undefined;

        return {
            ...result,
            domainName: meta?.domainName,
            domainType: meta?.domainType,
            domainTags: meta?.domainTags,
            sourceVersion: meta?.sourceVersion ?? undefined,
        };
    });
}
```

### 7.4 Domain-Aware Context Assembly

The Context Orchestrator (Pillar 2) uses `retrieveFromDomains()` to automatically detect and fetch relevant domain knowledge. The key pattern is:

1. **Auto-detect domain tags from task/instruction keywords** -- The orchestrator inspects the query or report section key and maps it to domain tags using `SECTION_TO_DOMAIN_TAGS`.
2. **Get project type and state from project profile** -- The profiler data provides building class, project type, and region for filtering.
3. **Format domain results separately from project RAG results** -- Domain knowledge gets its own section in the prompt with clear source attribution, distinct from project-specific document retrieval.

```typescript
// Example: Context Orchestrator assembling domain knowledge
async function assembleDomainContext(
    query: string,
    module: string,
    projectProfile: { projectType: string; region: string; organizationId: string }
): Promise<string> {
    const domainTags = SECTION_TO_DOMAIN_TAGS[module] || [];

    const domainResults = await retrieveFromDomains(query, {
        domainTags,
        projectType: projectProfile.projectType,
        state: projectProfile.region,
        organizationId: projectProfile.organizationId,
        includePrebuilt: true,
        includeOrganization: true,
        rerankTopK: 5,
    });

    if (domainResults.length === 0) return '';

    // Format as a distinct knowledge section
    const formatted = domainResults.map(r => {
        const source = r.domainName ? `[Source: ${r.domainName}]` : '';
        const version = r.sourceVersion ? ` (${r.sourceVersion})` : '';
        return `${source}${version}\n${r.content}`;
    });

    return `## Knowledge Domain Context\n\n${formatted.join('\n\n---\n\n')}`;
}
```

---

## 8. Chunking Strategy for Regulatory Documents

### 8.1 New Document Types

Two new document types are added to the chunking module in `src/lib/rag/chunking.ts`, optimized for knowledge domain content:

```typescript
const CHUNK_SIZES = {
    specifications: { min: 1000, max: 1500 },
    drawingSchedules: { min: 500, max: 800 },
    correspondence: { min: 0, max: Infinity },
    reports: { min: 800, max: 1200 },
    default: { min: 800, max: 1200 },
    // New knowledge domain types:
    regulatory: { min: 400, max: 800 },        // Smaller for precision
    knowledgeGuide: { min: 600, max: 1000 },   // Medium for best-practice
};
```

**Rationale:** Regulatory chunks must be small and precise because a user asking about "FRL for Class 2 buildings" needs to retrieve exactly the chunk about FRLs for Class 2 buildings, not a broader section that happens to mention it. Best-practice guide chunks can be slightly larger because they provide contextual guidance where more surrounding information is helpful.

### 8.2 NCC and AS Clause Patterns

New regex patterns for detecting NCC and Australian Standards structure:

```typescript
// NCC Volume 1/2 clause patterns
// Matches: A1.1, B1.3, C2.3, D2.23, E1.3, etc.
const NCC_CLAUSE_PATTERN = /^([A-Z]\d+(?:\.\d+)*)\s+(.+)$/gm;

// NCC Performance Requirement patterns
// Matches: P1, P2.1, P3, etc.
const NCC_PERFORMANCE_PATTERN = /^(P\d+(?:\.\d+)*)\s+(.+)$/gm;

// NCC Specification patterns
// Matches: Specification C1.1, Specification A2.3, etc.
const NCC_SPEC_PATTERN = /^(Specification\s+[A-Z]\d+(?:\.\d+)*)/gim;

// Australian Standards section patterns
// Matches: Section 1, Section 2.3, Appendix A, Appendix B, etc.
const AS_SECTION_PATTERN = /^(Section\s+\d+|Appendix\s+[A-Z])/gim;

// Australian Standards clause patterns (numbered subsections)
// Matches: 1.1, 2.3.1, 3.4.2.1, etc.
const AS_CLAUSE_PATTERN = /^(\d+(?:\.\d+)+)\s+(.+)$/gm;
```

### 8.3 Regulatory Document Type Detection

Extended `detectDocumentType()` function:

```typescript
function detectDocumentType(content: string): keyof typeof CHUNK_SIZES {
    const lowerContent = content.toLowerCase();

    // Knowledge domain detection (check before general patterns)
    if (NCC_CLAUSE_PATTERN.test(content) || NCC_PERFORMANCE_PATTERN.test(content)) {
        return 'regulatory';
    }
    if (AS_SECTION_PATTERN.test(content) || AS_CLAUSE_PATTERN.test(content)) {
        return 'regulatory';
    }
    if (lowerContent.includes('common pitfalls:') && lowerContent.includes('reference:')) {
        return 'knowledgeGuide'; // Seed content format detection
    }

    // Existing detection patterns...
    if (SPEC_SECTION_PATTERN.test(content) || lowerContent.includes('specification')) {
        return 'specifications';
    }
    // ... rest of existing function
}
```

### 8.4 Table Preservation

Regulatory documents frequently contain tables (e.g., FRL tables, material property tables, fee schedules). Tables must be kept as complete units rather than split mid-row.

```typescript
/**
 * Detect and preserve table boundaries during chunking
 * Tables are identified by consistent pipe (|) separators or tab-aligned columns
 */
function preserveTableBoundaries(text: string): string[] {
    const TABLE_PATTERN = /(?:^[|].*[|]$\n?)+/gm;
    const TAB_TABLE_PATTERN = /(?:^[^\n]*\t[^\n]*$\n?){3,}/gm;

    // Mark table boundaries so splitBySemantic does not break them
    let marked = text;
    const tableMatches = [...text.matchAll(TABLE_PATTERN), ...text.matchAll(TAB_TABLE_PATTERN)];

    for (const match of tableMatches) {
        // Replace newlines within tables with a placeholder
        const tableText = match[0];
        const preserved = tableText.replace(/\n/g, '{{TABLE_NEWLINE}}');
        marked = marked.replace(tableText, preserved);
    }

    return marked.split(/\n\n+/).map(chunk =>
        chunk.replace(/\{\{TABLE_NEWLINE\}\}/g, '\n')
    );
}
```

### 8.5 Seed Content Chunking

Seed content authored in the "Smart Summary + Citation" format is chunked at topic boundaries (each heading starts a new chunk). The frontmatter is stripped and stored as metadata on the document set, not embedded as chunk content.

```typescript
/**
 * Chunk seed content markdown file
 * Splits on ## headings, preserving the heading as sectionTitle
 */
function chunkSeedContent(
    content: string,
    documentId: string,
    domainSlug: string
): Chunk[] {
    // Strip frontmatter
    const bodyContent = content.replace(/^---[\s\S]*?---\s*/, '');

    // Split on ## headings
    const sections = bodyContent.split(/(?=^## )/gm).filter(s => s.trim());
    const chunks: Chunk[] = [];

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        const titleMatch = section.match(/^##\s+(.+)$/m);
        const title = titleMatch ? titleMatch[1].trim() : null;

        const tokenCount = estimateTokens(section);

        if (tokenCount <= CHUNK_SIZES.knowledgeGuide.max) {
            chunks.push({
                id: generateChunkId(),
                content: section,
                hierarchyLevel: 1,
                hierarchyPath: `${i + 1}`,
                sectionTitle: title,
                clauseNumber: null,
                parentId: null,
                tokenCount,
            });
        } else {
            // Split large sections further on ### sub-headings
            const subSections = section.split(/(?=^### )/gm).filter(s => s.trim());
            const parentId = generateChunkId();

            // Parent chunk with just the heading
            chunks.push({
                id: parentId,
                content: title ? `## ${title}` : section.substring(0, 100),
                hierarchyLevel: 1,
                hierarchyPath: `${i + 1}`,
                sectionTitle: title,
                clauseNumber: null,
                parentId: null,
                tokenCount: estimateTokens(title || ''),
            });

            for (let j = 0; j < subSections.length; j++) {
                const subSection = subSections[j].trim();
                const subTitleMatch = subSection.match(/^###\s+(.+)$/m);

                chunks.push({
                    id: generateChunkId(),
                    content: subSection,
                    hierarchyLevel: 2,
                    hierarchyPath: `${i + 1}.${j + 1}`,
                    sectionTitle: subTitleMatch ? subTitleMatch[1].trim() : null,
                    clauseNumber: null,
                    parentId,
                    tokenCount: estimateTokens(subSection),
                });
            }
        }
    }

    return chunks;
}
```

---

## 9. Integration Points with Other Pillars

### 9.1 Pillar 2: Context Orchestrator (Primary Consumer)

The Context Orchestrator is the primary consumer of domain knowledge. When assembling context for any AI task (report generation, note generation, coaching Q&A), the orchestrator:

1. Determines which domain tags are relevant based on the task type and module context using `SECTION_TO_DOMAIN_TAGS`
2. Fetches the project profile to get project type and state for filtering
3. Calls `retrieveFromDomains()` with the appropriate filters
4. Formats domain results into a distinct "Knowledge Domain Context" section in the prompt
5. Passes both domain context and project RAG context to the AI, clearly separated

```typescript
// In the Context Orchestrator (Pillar 2):
const CONTEXT_STRATEGY: Record<string, {
    domainTags: DomainTag[];
    domainTypes?: DomainType[];
    projectDataModules: string[];
}> = {
    'report-brief': {
        domainTags: ['cost-management', 'programming'],
        projectDataModules: ['costPlan', 'program', 'stakeholders', 'risks'],
    },
    'report-procurement': {
        domainTags: ['procurement', 'contracts', 'tendering'],
        projectDataModules: ['procurement', 'costPlan'],
    },
    'report-cost_planning': {
        domainTags: ['cost-management', 'variations', 'progress-claims'],
        projectDataModules: ['costPlan', 'variations', 'invoices'],
    },
    'report-programme': {
        domainTags: ['programming', 'milestones', 'critical-path'],
        projectDataModules: ['program'],
    },
    'coaching-qa': {
        domainTags: [], // Dynamic -- inferred from question keywords
        projectDataModules: ['auto'], // Auto-detect from question
    },
};
```

### 9.2 Pillar 3: Inline `//` Instructions

When a user types `// what does the NCC say about fire resistance for this building class?` in a note or report editor, the instruction execution pipeline:

1. Extracts keywords from the instruction text
2. Maps keywords to domain tags (e.g., "NCC" -> `ncc`, `regulatory`; "fire resistance" -> `fire`)
3. Calls the Context Orchestrator which in turn calls `retrieveFromDomains()`
4. Passes domain results to the AI for response generation

No special integration needed -- the shared Context Orchestrator handles routing. The key value is that `//` instructions gain access to curated knowledge without the user needing to upload any documents.

### 9.3 Pillar 4: Coaching Engine

Knowledge domains are the **data source** for coaching:

- **Checklist derivation**: Future versions can derive checklist items from domain knowledge content. For example, the "Cost Management Principles" domain's content on contingency can generate checklist items like "Verify contingency percentage is appropriate for project type."
- **Q&A answers**: When the Coaching Q&A system answers a user's question about contingency, it pulls from the Cost Management Principles domain to provide grounded guidance with citation.
- **Suggested questions**: The coaching suggestions generator can use domain content to generate contextually relevant questions based on what knowledge is available.

The coaching schema already includes a `source` field with values `'prebuilt' | 'knowledge_domain' | 'ai_generated'` and a `domainId` field for future linking.

### 9.4 Report Generation (LangGraph)

The existing report generation pipeline benefits from domain knowledge through the Context Orchestrator. Each report section type maps to specific domain tags:

```typescript
// Already part of the Context Orchestrator integration
const SECTION_TO_DOMAIN_TAGS: Record<string, DomainTag[]> = {
    'brief': ['cost-management', 'programming'],
    'procurement': ['procurement', 'contracts', 'tendering'],
    'cost_planning': ['cost-management', 'variations', 'progress-claims'],
    'programme': ['programming', 'milestones', 'critical-path'],
    'planning_authorities': ['ncc', 'regulatory'],
    'design': ['architectural', 'ncc'],
    'construction': ['construction', 'contracts', 'defects'],
};
```

This means a procurement section in a Tender Recommendation Report automatically receives context from the Procurement & Tendering Guide and Contract Administration Guide domains, enriching the AI's output with industry best-practice references.

### 9.5 Project Profiler

The project profiler provides the filtering parameters used by domain retrieval:

- **Building class** determines which NCC volume and sections are relevant
- **Project type** (`refurb`, `extend`, `new`, etc.) filters to applicable domains
- **Region/state** enables state-specific regulatory filtering
- **Complexity data** (procurement route, quality tier) can refine domain selection

The profiler data is fetched once per AI request and passed through the Context Orchestrator to `retrieveFromDomains()`.

---

## 10. Edge Cases and Pitfalls

### 10.1 Empty Domains

**Scenario:** A pre-built domain has been created (document set with domain metadata) but no seed content has been ingested yet.

**Solution:** The retrieval function returns empty results gracefully. The UI shows the domain with an "Empty -- content pending" indicator. No error is thrown. The system continues to function with whatever domains do have content.

### 10.2 Overlapping Results Across Domains

**Scenario:** A query about "contingency for residential projects" matches chunks in both the "Cost Management Principles" domain and the "Residential Construction Guide" domain, returning near-duplicate content.

**Solution:** Apply deduplication within the enrichment step. Use content similarity (cosine distance between embeddings) to identify near-duplicates. When two results from different domains have >0.95 embedding similarity, keep the one with the higher relevance score and annotate it with both domain sources. Between domains, apply diversity sampling to ensure results come from multiple domains when available.

### 10.3 Stale Regulatory Content

**Scenario:** The NCC 2025 edition is released, but the seed data still references NCC 2022.

**Solution:** The `knowledgeDomainSources` table tracks `sourceVersion` and `lastVerifiedAt`. A UI staleness indicator shows when content has not been verified within a configurable period (e.g., 12 months). The `sourceVersion` field enables migration to new editions by creating a new version of the seed content and updating the document set, without affecting user-uploaded organization content.

Migration workflow:
1. Author new seed content for NCC 2025
2. Create new chunks with updated content
3. Delete old seed chunks (identified by document set + source type = `prebuilt_seed`)
4. Update `sourceVersion` in `knowledgeDomainSources`
5. Existing organization-uploaded content is unaffected

### 10.4 State-Specific Confusion

**Scenario:** A user in NSW asks about energy efficiency requirements, but the system returns content about QLD cyclone requirements.

**Solution:** State filtering is applied through the `applicableStates` field in `knowledgeDomainSources`. When the project profile has a region set (e.g., "NSW"), the retrieval query includes a state filter. Chunks that are nationally applicable have `applicableStates = NULL` (meaning "all states"), while state-specific content has the applicable states listed. If no state is set in the project profile, the system falls back to returning nationally applicable content only and prompts the user to complete their project profile for state-specific guidance.

### 10.5 Copyright Compliance

**Scenario:** A contributor accidentally includes verbatim copied text from an Australian Standard in a seed content file.

**Solution:** Seed content goes through a review process before inclusion. Every seed chunk must follow the "Smart Summary + Citation" format which requires original-language summaries with references, not reproduced text. A pre-ingestion check can flag chunks that have unusually high similarity to known copyrighted sources. The authoring guidelines explicitly state what is and is not permitted.

**What is permitted:**
- Standard numbers and official titles
- Scope descriptions in original words
- General principle summaries in original language
- NCC cross-references
- Application guidance written from scratch

**What is NOT permitted:**
- Verbatim clauses or paragraphs from AS documents
- Reproduced DtS provision tables from the NCC
- Copied test method procedures
- Screenshots or images from standards

### 10.6 Organization Isolation

**Scenario:** Organization A uploads confidential contract templates to their knowledge domains. Organization B should never see them.

**Solution:** All retrieval queries MUST include an `organizationId` filter. Pre-built seed content is marked with `isGlobal = true` and has no `organizationId`, making it accessible to all organizations. Organization-uploaded content has `isGlobal = false` and an `organizationId` set, ensuring it is only returned when the requesting user belongs to that organization. The `resolveDomainDocumentSets()` function enforces this filter at the SQL level.

### 10.7 Large Document Sets

**Scenario:** An organization uploads thousands of past project documents into knowledge domains, creating millions of vector entries.

**Solution:** The existing pgvector infrastructure handles millions of vectors efficiently. For document set ID resolution, if the join between `document_sets`, `knowledge_domain_sources`, and `document_set_members` becomes slow, introduce a materialized view that pre-computes the document-to-domain mapping:

```sql
CREATE MATERIALIZED VIEW domain_document_lookup AS
SELECT
    ds.id AS document_set_id,
    ds.domain_type,
    ds.domain_tags,
    dsm.document_id,
    kds.applicable_project_types,
    kds.applicable_states
FROM document_sets ds
JOIN document_set_members dsm ON dsm.document_set_id = ds.id
LEFT JOIN knowledge_domain_sources kds ON kds.document_set_id = ds.id
WHERE ds.domain_type IS NOT NULL
AND dsm.sync_status = 'synced';

CREATE INDEX idx_ddl_tags ON domain_document_lookup USING GIN (domain_tags);
CREATE INDEX idx_ddl_document ON domain_document_lookup (document_id);

-- Refresh periodically or on document sync completion
REFRESH MATERIALIZED VIEW CONCURRENTLY domain_document_lookup;
```

### 10.8 Tag Fragmentation

**Scenario:** Users create custom domains with inconsistent tags: "cost_management", "Cost Management", "costManagement", "costs".

**Solution:** Tags are normalized on write: lowercased, hyphenated, trimmed. The UI provides a curated autocomplete dropdown with the master tag list from `ALL_DOMAIN_TAGS`. Custom tags are permitted but displayed differently in the UI (lighter color, "custom" badge). A tag normalization function runs on every tag input:

```typescript
function normalizeTag(tag: string): string {
    return tag
        .trim()
        .toLowerCase()
        .replace(/[_\s]+/g, '-')     // Underscores and spaces to hyphens
        .replace(/[^a-z0-9-]/g, '')  // Remove non-alphanumeric except hyphens
        .replace(/-+/g, '-')         // Collapse multiple hyphens
        .replace(/^-|-$/g, '');      // Trim leading/trailing hyphens
}
```

### 10.9 Seed Data Versioning

**Scenario:** The seed data for the "Contract Administration Guide" is updated with new content about Security of Payment Act changes. Existing organizations should get the update without losing any customizations they have made.

**Solution:** The `sourceVersion` field in `knowledgeDomainSources` enables versioned updates. Seed data is identified by `sourceType = 'prebuilt_seed'`. When a new version is released:

1. The ingestion script checks the current version against the new version
2. Only seed-sourced chunks are replaced (identified by document set + source type)
3. Organization-uploaded chunks in the same domain are preserved
4. The `sourceVersion` is updated to the new version string
5. The `lastVerifiedAt` timestamp is updated

This approach treats seed content as a platform-managed baseline that can be updated independently of organization customizations.

---

## 11. Refined Implementation Approach

### Phase 1A: Schema Migration (1 day)

**Step 1: Add domain columns to `documentSets`**
- Add `domainType` and `domainTags` columns to the existing `documentSets` table definition in `src/lib/db/rag-schema.ts`
- Extend the `repoType` enum with `knowledge_regulatory`, `knowledge_practices`, `knowledge_templates`
- Run `npm run db:push` to apply migration

**Step 2: Create `knowledgeDomainSources` table**
- Add table definition to a new schema file `src/lib/db/knowledge-domain-sources-schema.ts`
- Include all indexes
- Run `npm run db:push`
- Apply GIN indexes via raw SQL migration for array columns

**Files:**
| Action | File |
|--------|------|
| Modify | `src/lib/db/rag-schema.ts` |
| Create | `src/lib/db/knowledge-domain-sources-schema.ts` |

### Phase 1B: Knowledge Domain Constants (1 day)

**Step 3: Domain definitions and tag catalog**
- Create `src/lib/constants/knowledge-domains.ts` containing:
  - 10 pre-built domain definitions (name, domainType, tags, description)
  - `DOMAIN_TYPES` enum
  - `ALL_DOMAIN_TAGS` master tag list with category groupings
  - `SECTION_TO_DOMAIN_TAGS` mapping
  - `normalizeTag()` utility function
  - `DomainTag` and `DomainType` TypeScript types
  - Display labels and descriptions for each domain

**Files:**
| Action | File |
|--------|------|
| Create | `src/lib/constants/knowledge-domains.ts` |

### Phase 1C: Domain-Aware Retrieval (2-3 days)

**Step 4: Add `retrieveFromDomains()` to retrieval pipeline**
- Add `DomainRetrievalOptions` and `DomainRetrievalResult` interfaces
- Implement `resolveDomainDocumentSets()` with SQL-level domain filtering
- Implement `enrichWithDomainMetadata()` for source attribution
- Implement main `retrieveFromDomains()` function
- Add unit tests for domain resolution logic

**Files:**
| Action | File |
|--------|------|
| Modify | `src/lib/rag/retrieval.ts` |

### Phase 1D: Regulatory Chunking Enhancement (1-2 days)

**Step 5: Add regulatory document types and patterns**
- Add `regulatory` and `knowledgeGuide` to `CHUNK_SIZES`
- Add NCC/AS clause patterns (`NCC_CLAUSE_PATTERN`, `NCC_PERFORMANCE_PATTERN`, `NCC_SPEC_PATTERN`, `AS_SECTION_PATTERN`, `AS_CLAUSE_PATTERN`)
- Extend `detectDocumentType()` with regulatory detection
- Add `preserveTableBoundaries()` utility
- Add `chunkSeedContent()` for seed markdown files
- Update document processing worker to support new document types

**Files:**
| Action | File |
|--------|------|
| Modify | `src/lib/rag/chunking.ts` |
| Modify | `workers/document-processor/index.ts` |

### Phase 1E: Seed Data Authoring and Ingestion (3-5 days)

**Step 6: Author Phase A seed content (4 universal domains)**
- Cost Management Principles (~80-100 chunks)
- Procurement & Tendering Guide (~70-90 chunks)
- Contract Administration Guide (~80-100 chunks)
- Program & Scheduling Guide (~50-70 chunks)

**Step 7: Create seed ingestion script**
- Parse markdown files with frontmatter
- Chunk using `chunkSeedContent()`
- Generate embeddings via Voyage AI
- Create document sets with domain metadata
- Create `knowledgeDomainSources` records
- Insert chunks into database
- Idempotent (can be re-run without duplicating data)

**Files:**
| Action | File |
|--------|------|
| Create | `src/lib/constants/knowledge-seed/cost-management-principles.md` |
| Create | `src/lib/constants/knowledge-seed/procurement-tendering-guide.md` |
| Create | `src/lib/constants/knowledge-seed/contract-administration-guide.md` |
| Create | `src/lib/constants/knowledge-seed/program-scheduling-guide.md` |
| Create | `scripts/ingest-seed-knowledge.ts` |

### Phase 1F: API Routes (1-2 days)

**Step 8: CRUD API for knowledge domains**
- `GET /api/knowledge-domains` -- List all knowledge domains (pre-built + organization)
- `GET /api/knowledge-domains/[domainId]` -- Get domain details with source metadata
- `POST /api/knowledge-domains` -- Create custom domain (organization-scoped)
- `PATCH /api/knowledge-domains/[domainId]` -- Update domain metadata (tags, description)
- `DELETE /api/knowledge-domains/[domainId]` -- Soft-delete custom domain
- `POST /api/knowledge-domains/[domainId]/upload` -- Upload documents to domain (triggers existing document processing pipeline)

**Files:**
| Action | File |
|--------|------|
| Create | `src/app/api/knowledge-domains/route.ts` |
| Create | `src/app/api/knowledge-domains/[domainId]/route.ts` |
| Create | `src/app/api/knowledge-domains/[domainId]/upload/route.ts` |

### Phase 1G: Knowledge Domain Management UI (2-3 days)

**Step 9: Settings panel for knowledge domain management**
- Located in organization settings
- Shows all 10 pre-built domains with status (active/empty/stale)
- Shows organization-uploaded custom domains
- Upload interface for adding documents to a domain
- Tag selection with autocomplete from master list
- Domain source version and last-verified-at display
- Toggle domains active/inactive

**Files:**
| Action | File |
|--------|------|
| Create | `src/components/knowledge/KnowledgeDomainManager.tsx` |
| Create | `src/components/knowledge/DomainCard.tsx` |
| Create | `src/components/knowledge/DomainUploadDialog.tsx` |
| Create | `src/lib/hooks/use-knowledge-domains.ts` |

### Phase 1H: Integration with Pillar 2 Context Orchestrator (1 day)

**Step 10: Wire domain retrieval into context assembly**
- Add `includeKnowledgeDomains` option to context assembly
- Add `assembleDomainContext()` function
- Format domain results as a distinct prompt section
- Ensure domain attribution flows through to AI responses

**Files:**
| Action | File |
|--------|------|
| Modify | `src/lib/services/report-context-orchestrator.ts` |

---

## Files Created/Modified Summary

| Action | File | Phase |
|--------|------|-------|
| Modify | `src/lib/db/rag-schema.ts` | 1A |
| Create | `src/lib/db/knowledge-domain-sources-schema.ts` | 1A |
| Create | `src/lib/constants/knowledge-domains.ts` | 1B |
| Modify | `src/lib/rag/retrieval.ts` | 1C |
| Modify | `src/lib/rag/chunking.ts` | 1D |
| Modify | `workers/document-processor/index.ts` | 1D |
| Create | `src/lib/constants/knowledge-seed/cost-management-principles.md` | 1E |
| Create | `src/lib/constants/knowledge-seed/procurement-tendering-guide.md` | 1E |
| Create | `src/lib/constants/knowledge-seed/contract-administration-guide.md` | 1E |
| Create | `src/lib/constants/knowledge-seed/program-scheduling-guide.md` | 1E |
| Create | `scripts/ingest-seed-knowledge.ts` | 1E |
| Create | `src/app/api/knowledge-domains/route.ts` | 1F |
| Create | `src/app/api/knowledge-domains/[domainId]/route.ts` | 1F |
| Create | `src/app/api/knowledge-domains/[domainId]/upload/route.ts` | 1F |
| Create | `src/components/knowledge/KnowledgeDomainManager.tsx` | 1G |
| Create | `src/components/knowledge/DomainCard.tsx` | 1G |
| Create | `src/components/knowledge/DomainUploadDialog.tsx` | 1G |
| Create | `src/lib/hooks/use-knowledge-domains.ts` | 1G |
| Modify | `src/lib/services/report-context-orchestrator.ts` | 1H |

### Total Estimated Effort: 12-18 days

### Implementation Dependencies

- **Phases 1A-1E are fully independent** of other pillars and can ship standalone
- **Phase 1F** (API routes) is independent but enables Phases 1G and 1H
- **Phase 1G** (UI) depends on 1F (API routes)
- **Phase 1H** (orchestrator integration) depends on Pillar 2 being implemented, but the retrieval functions (1C) work standalone

### Recommended Build Order

1. Ship 1A + 1B + 1C + 1D first (schema + constants + retrieval + chunking) -- enables testing the full retrieval pipeline
2. Ship 1E (seed content) -- populates domains with content, testable via direct API calls
3. Ship 1F (API routes) -- enables programmatic access
4. Ship 1G (UI) -- enables user management of domains
5. Ship 1H after Pillar 2 is complete (orchestrator integration connects everything)
