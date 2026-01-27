# Inference Rules Research: Continuation Prompt

**Created**: 2026-01-27
**Purpose**: Handoff document to continue defining inference rules in a future session

---

## Context Summary

We conducted a brainstorming session to design the "Intelligent Report Generation" system. The key insight was that **domain knowledge should be embedded in structured JSON data**, not in AI training or prompts. The AI acts as a **data interpreter and formatter**, not a domain expert.

### Architecture Decisions Made

1. **AI Persona**: Domain expert - Senior PM with deep expertise in Australian construction procurement, cost planning, and project delivery

2. **Data Hierarchy**:
   - Layer 1: Project Details (lot/site characteristics)
   - Layer 2: Project Profiler (site improvements)
   - Layer 3: Inference Rules (relationships & implications)
   - Layer 4: Generated Outputs

3. **Approach**: Option B-Lite
   - Rules stored in JSON file (`inference-rules.json`)
   - Rules evaluated at generation time against project data
   - Matched rules injected into prompts as context
   - AI can extend beyond rules for edge cases

4. **Two-Iteration Workflow**:
   - Iteration 1 (Generate): Very short bullet points (2-5 words) for breadth check
   - Iteration 2 (Polish): User edits, then AI expands slightly while incorporating changes

5. **Visual Differentiation**:
   - Explicit items (from profiler): One color
   - Inferred items (by AI/rules): Different color

---

## Rule Schema

Each inference rule follows this structure:

```typescript
interface InferenceRule {
  id: string;                    // Unique identifier (e.g., "opc-010")
  description: string;           // Human-readable description
  condition: Condition;          // When to apply this rule
  infer: InferredItem[];         // What to generate
  priority: number;              // Higher = more important (for ordering)
  source: 'explicit' | 'inferred';  // For UI coloring
}

interface Condition {
  project_details?: {
    jurisdiction?: string | string[];
    lot_area_sqm?: { min?: number; max?: number };
  };
  profiler?: {
    building_class?: string | string[];
    subclass?: string | string[];
    project_type?: string | string[];
    region?: string | string[];
    scale?: { [key: string]: { min?: number; max?: number } };
    complexity?: { [key: string]: string | string[] };
    work_scope_includes?: string[];
    work_scope_excludes?: string[];
  };
  and?: Condition[];
  or?: Condition[];
  not?: Condition;
}

interface InferredItem {
  text: string;                  // The objective text
  category?: string;             // For grouping
  confidence: 'high' | 'medium' | 'low';
}
```

For stakeholder rules, the inferred items include:
```typescript
interface StakeholderInferredItem {
  name: string;                  // Stakeholder name/discipline/trade
  subgroup?: string;             // Subgroup classification
  role?: string;                 // Role description
  reason: string;                // Why this stakeholder is needed
  confidence: 'high' | 'medium' | 'low';
}
```

---

## Rule Categories

### 1. Functional & Quality Objectives (`objectives_functional_quality`)

Rules that generate objectives about what the building will be/have:
- Physical characteristics (bedrooms, storeys, GFA)
- Quality/finish levels
- Site-driven requirements (infill, heritage, topography)
- Functional requirements by building type

### 2. Planning & Compliance Objectives (`objectives_planning_compliance`)

Rules that generate objectives about regulatory requirements:
- Building code classification (NCC, NZBC, IBC, etc.)
- Approval pathways (DA, CDC, Building Permit, etc.)
- Overlay requirements (heritage, bushfire, flood, contamination)
- State/region-specific requirements (BASIX, etc.)
- Environmental compliance (EIS, EPBC, etc.)

### 3. Stakeholder Inference (`stakeholders`)

Rules that suggest project team members across 4 groups:
- **Client**: Owner, Tenant, PM, Superintendent, QS
- **Authority**: Council, Fire, Heritage, Transport, EPA, etc.
- **Consultant**: Architect, Engineers, Specialists
- **Contractor**: Main contractor, Trades

---

## Rules Already Defined

### Functional & Quality Objectives (6 rules)

| ID | Trigger | Generates |
|----|---------|-----------|
| ofq-001 | Residential + bedrooms | "X bedroom accommodation" |
| ofq-002 | 2+ storeys | "X-storey construction" |
| ofq-003 | Quality tier selected | "Medium/High/Premium quality finishes" |
| ofq-010 | Infill site | Boundary setbacks, party walls, overshadowing |
| ofq-011 | Heritage overlay | Heritage facade retention, sympathetic materials |
| ofq-020 | Residential + Premium | High-end fixtures, engineered stone, custom joinery |

### Planning & Compliance Objectives (7 rules)

| ID | Trigger | Generates |
|----|---------|-----------|
| opc-001 | Region = AU | "NCC Class X compliance" |
| opc-002 | Approval pathway selected | Approval pathway objective |
| opc-010 | Heritage overlay | Heritage consultant, CMP, HIS |
| opc-011 | Bushfire overlay (AU) | AS 3959, BAL assessment, BMP |
| opc-012 | Contamination | DSI, RAP, site auditor |
| opc-020 | NSW + Residential | BASIX certification |
| opc-021 | State significant | EIS, consultation, RTS |

### Client Stakeholders (3 rules)

| ID | Trigger | Suggests |
|----|---------|----------|
| sc-001 | Always | Owner Rep, PM |
| sc-002 | Refurb/Fitout | Tenant Rep |
| sc-003 | Traditional procurement | Superintendent |

### Authority Stakeholders (5 rules)

| ID | Trigger | Suggests |
|----|---------|----------|
| sa-001 | DA pathway | Local Council |
| sa-002 | AU + Class 2+ | Fire & Rescue NSW |
| sa-003 | Heritage overlay | Heritage NSW |
| sa-004 | Large/traffic generating | Transport for NSW |
| sa-005 | Contamination/industrial | EPA |

### Consultant Stakeholders (8 rules)

| ID | Trigger | Suggests |
|----|---------|----------|
| sco-001 | Any building | Architect |
| sco-002 | 2+ storeys or structural scope | Structural Engineer |
| sco-003 | Commercial/Institution or 500+ sqm | Mech, Elec, Hydraulic |
| sco-004 | 4+ storeys or institution | Fire Engineer |
| sco-010 | Heritage overlay | Heritage Consultant |
| sco-011 | New build or complex site | Geotechnical Engineer |
| sco-012 | Contamination | Environmental Consultant |
| sco-020 | Public buildings | Access Consultant |

### Contractor Stakeholders (4 rules)

| ID | Trigger | Suggests |
|----|---------|----------|
| str-001 | New build | Main Contractor |
| str-002 | Demolition scope or infill | Demolition Contractor |
| str-003 | Earthworks or basement | Civil/Excavation |
| str-010 | Facade scope or tall commercial | Facade Contractor |

---

## Rules Still Needed

### By Building Class

Reference `specs/022-profiler-expansion/brainstorm.md` for full building class definitions.

#### Residential (Current: Partial coverage)
- [ ] Apartments-specific rules (lift consultant, body corporate)
- [ ] Aged care-specific rules (9c compliance, accessibility)
- [ ] Student housing rules
- [ ] BTR rules
- [ ] Social/affordable housing rules

#### Commercial (Current: Partial coverage)
- [ ] Retail-specific rules (food safety, liquor licensing)
- [ ] Hotel rules (tourism, fire life safety)
- [ ] Life sciences/biotech rules (PC levels, TGA)
- [ ] Data centre rules (Uptime tier, power)

#### Industrial (Current: Minimal coverage)
- [ ] Warehouse rules
- [ ] Manufacturing rules (EPA, noise)
- [ ] Dangerous goods rules (7a classification)
- [ ] Cold storage rules
- [ ] Cleanroom rules (ISO grades)

#### Institution (Current: Minimal coverage)
- [ ] Education rules (DET, AISNSW)
- [ ] Healthcare rules (health infrastructure)
- [ ] Correctional rules (Corrective Services)
- [ ] Emergency services rules

#### Infrastructure (Current: No coverage)
- [ ] Roads/civil rules
- [ ] Rail rules
- [ ] Water/wastewater rules
- [ ] Energy rules (solar, wind, hydrogen)
- [ ] Marine/coastal rules
- [ ] Aviation rules
- [ ] Telecommunications rules

#### Agricultural (Current: No coverage)
- [ ] Farm buildings rules
- [ ] Winery/brewery rules
- [ ] Livestock facilities rules
- [ ] Vertical farming rules

#### Defense/Secure (Current: No coverage)
- [ ] Security classification rules (PSPF)
- [ ] Clearance requirements
- [ ] SCIF construction rules

### By Complexity Dimension

- [ ] Quality tier variations (basic, medium, high, premium)
- [ ] Site conditions (greenfield, infill, sloping, rock, flood)
- [ ] Procurement routes (traditional, D&C, ECI, MC, alliance)
- [ ] Operational constraints (vacant, partial, live, 24/7)
- [ ] Environmental sensitivity rules

### By Region

Currently AU-focused. Need equivalents for:

#### New Zealand
- [ ] NZBC building code mappings
- [ ] Resource consent rules
- [ ] Building consent rules

#### United Kingdom
- [ ] Building Regulations classifications
- [ ] Planning permission rules
- [ ] Building notice vs full plans
- [ ] Listed buildings (heritage)

#### United States
- [ ] IBC/IRC classifications
- [ ] State-specific variations
- [ ] Zoning/use permit rules
- [ ] ADA accessibility rules

### Stakeholder Gaps

#### Consultants Not Yet Covered
- [ ] Town Planner
- [ ] Traffic Engineer
- [ ] Landscape Architect
- [ ] Acoustic Consultant
- [ ] Facade Engineer
- [ ] Lighting Designer
- [ ] Vertical Transport Consultant
- [ ] BMS Consultant
- [ ] Security Consultant
- [ ] ICT Consultant
- [ ] Quantity Surveyor (as consultant)
- [ ] Building Certifier / PCA
- [ ] Surveyor
- [ ] Arborist
- [ ] Contaminated Land Specialist
- [ ] Wind Engineer
- [ ] ESD Consultant

#### Contractors Not Yet Covered
- [ ] Structural steel
- [ ] Concrete
- [ ] Formwork
- [ ] Mechanical services
- [ ] Electrical services
- [ ] Hydraulic services
- [ ] Fire services
- [ ] Lift installation
- [ ] Facade installation
- [ ] Glazing
- [ ] Roofing
- [ ] Waterproofing
- [ ] Fitout
- [ ] Joinery
- [ ] Flooring
- [ ] Ceilings
- [ ] Painting
- [ ] Landscaping
- [ ] Signage

---

## Reference Documents

When continuing this work, read these files for context:

1. **Profiler structure**: `specs/022-profiler-expansion/brainstorm.md`
   - All building classes and subclasses
   - Scale fields per subclass
   - Complexity options
   - Work scope items with consultant mappings

2. **Stakeholder structure**: `specs/020-stakeholder/spec.md`
   - Four stakeholder groups
   - Subgroup definitions
   - Tender workflow

3. **Current spec**: `specs/025-intelligent-report-generation/spec.md`
   - Report section types
   - Data sources per section

4. **Working notes**: `specs/025-intelligent-report-generation/workingtobedeleted`
   - 19 AI content generation contexts
   - Data sources for each

---

## Prompt for Continuation

Use this prompt to continue the work:

```
I'm continuing work on defining inference rules for the Assemble.ai intelligent
generation system. Please read the following files to understand the context:

1. specs/025-intelligent-report-generation/inference-rules-research-prompt.md
2. specs/022-profiler-expansion/brainstorm.md
3. specs/020-stakeholder/spec.md

The task is to expand the inference rules to cover:
- [SPECIFY WHICH CATEGORY: e.g., "Industrial building class"]
- [OR: "All missing consultant stakeholders"]
- [OR: "UK region equivalents"]

For each rule, provide:
- Rule ID (follow existing naming: ofq-XXX, opc-XXX, sc-XXX, sa-XXX, sco-XXX, str-XXX)
- Trigger condition (what profiler/project data activates it)
- What it generates (objectives or stakeholders)
- Priority (relative importance)
- Confidence level (high/medium/low)

Output the rules in the same JSON format as the existing rules.
```

---

## Questions to Resolve

1. **Rule granularity**: Should rules be very specific (one rule per subclass) or more general (building class level with variations)?

2. **Consultant specificity**: Some consultants span multiple disciplines (e.g., "Services Engineer" vs "Mechanical Engineer"). What level of specificity?

3. **Regional authority names**: Need to map equivalent authorities across regions (e.g., FRNSW = FRS in UK = Local Fire Dept in US)

4. **Confidence calibration**: Need consistent criteria for high/medium/low confidence ratings

5. **Rule maintenance**: Who will maintain these rules? Should there be a UI for rule management?

---

## Next Steps After Rules Complete

1. **Rule evaluation service** - TypeScript code to evaluate conditions
2. **Prompt templates** - How to format matched rules for AI
3. **Generate/Polish workflow** - How edits are tracked
4. **Testing framework** - Verify rules produce expected outputs
