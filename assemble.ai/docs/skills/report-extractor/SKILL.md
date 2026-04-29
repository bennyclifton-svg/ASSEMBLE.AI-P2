---
name: report-extractor
tier: 2
description: Pre-extract key facts from indexed reports into the report_extractions SQLite table for fast retrieval without vector search. User-triggered for high-traffic reports (geotech, BCA, fire engineering, specification). Stores structured key facts by section.
agents: [feasibility, design, finance, delivery]
---

# Report Extractor Skill

## When to Load

Load this skill when:
- A report has been indexed (chunked in ChromaDB) and the user asks to "extract key facts"
- An agent is about to do repeated queries against the same report and pre-extraction would be faster
- The file watcher has indexed a new report and offered pre-extraction
- The user explicitly asks: "Extract the key findings from the geotech report"

## When to Suggest Pre-Extraction

Proactively suggest pre-extraction for:

| Report Type | Why Pre-Extract |
|-------------|----------------|
| **Geotech** | Bearing capacity, rock depth, water table — referenced throughout design, procurement, and delivery (latent condition claims) |
| **BCA/NCC assessment** | Compliance status per section — referenced during design review, DA, CC applications |
| **Fire engineering** | FRL schedules, compartmentation — referenced during design and construction |
| **Acoustic** | Noise criteria, recommended treatments — referenced during design and council RFIs |
| **Specification** | Use spec-indexer skill instead — trade-section chunking is better |

**Say to the user:**
> "I've indexed the [report type] report for searching. This report will likely be referenced frequently — would you like me to extract key facts for faster access? This takes about 30 seconds and makes queries on this report much faster."

---

## What Gets Extracted

Pre-extraction reads the most relevant sections of each report type and stores structured summaries in `project.db → report_extractions`.

### Extraction Templates by Report Type

#### Geotech Report
```
Sections to extract:
- executive_summary: Project scope, location, investigation methodology
- site_conditions: Existing site conditions, geology, topography
- findings: Soil profile, rock description, bearing capacity, water table depth, contamination indicators
- recommendations: Foundation type, bearing pressure, subgrade preparation, groundwater management
- risks: Identified risks, limitations of investigation, recommendations for further investigation
- key_values: {
    "rock_depth_m": "...",
    "water_table_rl": "...",
    "bearing_capacity_kpa": "...",
    "ucs_mpa": "...",
    "fill_depth_m": "...",
    "contamination_detected": true/false
  }
```

#### BCA / NCC Assessment
```
Sections to extract:
- building_classification: Confirmed NCC classification(s) and rise in storeys
- type_of_construction: Required type (A/B/C) and proposed construction method
- section_c_fire: Fire resistance status — compliant/non-compliant items
- section_d_egress: Egress compliance — exits, travel distances, issues
- section_e_services: Services compliance — sprinklers, alarms, emergency lighting
- section_f_amenity: Health and amenity — light, ventilation, sound
- section_h_liveable: Liveable Housing Design compliance (NCC 2022)
- section_j_energy: Energy efficiency status / BASIX interaction
- outstanding_items: List of non-compliant or unresolved items requiring consultant action
- consultant_recommendations: Actions required before CC or DA
```

#### Fire Engineering Report
```
Sections to extract:
- scope: Building description, classification, fire engineering approach
- frl_schedule: Fire Resistance Levels for walls, floors, columns, beams
- compartmentation: Fire compartment boundaries, maximum sizes
- exit_strategy: Exit locations, travel distances, exit widths
- smoke_management: Smoke hazard management approach, mechanical systems
- sprinkler_system: Type, coverage, AS 2118 reference
- performance_solutions: Any performance solutions and their basis
- conditions: Conditions on the fire engineering solution
```

#### Acoustic Assessment
```
Sections to extract:
- noise_sources: Identified noise sources (road, rail, aircraft, industry)
- noise_levels: Measured/predicted ambient noise levels (LAeq, Lmax)
- criteria: Applicable noise criteria (council DCP, EPA guidelines, AS 1170.4)
- compliance_status: Which levels comply, which require treatment
- recommended_treatments: Glazing specifications, mechanical ventilation requirements, wall construction
- internal_noise_levels: Predicted internal noise levels with recommended treatments
- conditions: Any conditions of consent anticipated
```

---

## Extraction Script

```python
# extract_facts.py
# Run: python system/skills/report-extractor/extract_facts.py <report_id> <rev_id> <report_type> <agent_name>
# The script searches ChromaDB for the most relevant chunks per section,
# then asks the LLM to extract structured facts from those chunks.
```

```python
# extract_facts.py
import chromadb
import sqlite3
import sys
import json
from datetime import datetime
from sentence_transformers import SentenceTransformer

CHROMA_PATH = "project-vectors/"
DB_PATH = "project.db"
MODEL_NAME = "all-MiniLM-L6-v2"

# Section queries by report type — what to search for in each section
SECTION_QUERIES = {
    'geotech': {
        'executive_summary': 'project scope investigation methodology purpose',
        'site_conditions': 'existing site conditions geology topography ground surface',
        'findings': 'soil profile rock description bearing capacity groundwater water table depth fill',
        'recommendations': 'foundation type bearing pressure subgrade preparation groundwater management',
        'risks': 'risks limitations further investigation recommended',
        'key_values': 'bearing capacity kPa rock depth RL water table UCS MPa fill depth contamination'
    },
    'bca': {
        'building_classification': 'building classification NCC class rise storeys',
        'type_of_construction': 'type of construction Type A B C required',
        'section_c_fire': 'fire resistance FRL walls floors non-compliant compliant Section C',
        'section_d_egress': 'egress exits travel distance exit width Section D',
        'section_e_services': 'sprinklers alarms emergency lighting smoke Section E',
        'section_f_amenity': 'natural light ventilation sound insulation Section F',
        'section_h_liveable': 'liveable housing design Section H step-free accessible',
        'outstanding_items': 'non-compliant outstanding action required prior to'
    },
    'fire': {
        'scope': 'project description classification fire engineering approach',
        'frl_schedule': 'fire resistance level FRL walls floors columns beams',
        'compartmentation': 'fire compartment boundary size maximum area',
        'exit_strategy': 'exit location travel distance exit width path of travel',
        'smoke_management': 'smoke hazard management mechanical ventilation pressurisation',
        'sprinkler_system': 'sprinkler system AS 2118 coverage type',
        'performance_solutions': 'performance solution basis modelling FEB',
        'conditions': 'conditions requirements limitations fire engineering solution'
    },
    'acoustic': {
        'noise_sources': 'noise sources road rail aircraft industry background',
        'noise_levels': 'measured predicted ambient noise LAeq Lmax dB',
        'criteria': 'noise criteria DCP EPA guidelines acceptable levels',
        'compliance_status': 'compliant non-compliant exceeds criteria',
        'recommended_treatments': 'glazing specification mechanical ventilation wall construction treatment',
        'internal_noise_levels': 'internal noise levels predicted bedrooms living areas',
        'conditions': 'conditions consent anticipated required'
    },
    'contamination': {
        'site_history': 'site history previous use industrial activities',
        'sampling': 'soil sampling groundwater testing laboratory analysis',
        'findings': 'contaminants detected concentrations exceedances',
        'risk_assessment': 'health risk ecological risk assessment',
        'remediation': 'remediation required remedial action plan RAP',
        'validation': 'validation sampling validation report required'
    }
}

def get_chunks_for_section(collection, report_id, rev_id, section_query, model, n=8):
    """Get most relevant chunks for a given section query."""
    query_embedding = model.encode([section_query]).tolist()
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=n,
        where={"$and": [
            {"report_id": int(report_id)},
            {"rev_id": int(rev_id)},
            {"superseded": False}
        ]},
        include=['documents', 'metadatas']
    )
    if results['documents'][0]:
        chunks = []
        for doc, meta in zip(results['documents'][0], results['metadatas'][0]):
            page = meta.get('page_number', '?')
            section = meta.get('section', '')
            chunks.append(f"[Page {page}{f', {section}' if section else ''}]\n{doc}")
        return '\n\n---\n\n'.join(chunks)
    return ''

def store_extraction(db_path, rev_id, section, key_facts, agent_name):
    """Store extracted facts in report_extractions table."""
    conn = sqlite3.connect(db_path)
    conn.execute("""
        INSERT INTO report_extractions (report_rev_id, section, key_facts, extracted_by, extracted_at)
        VALUES (?, ?, ?, ?, ?)
    """, (int(rev_id), section, key_facts, agent_name, datetime.now().isoformat()))
    conn.commit()
    conn.close()

def extract_facts(report_id, rev_id, report_type, agent_name):
    print(f"Loading embedding model...")
    model = SentenceTransformer(MODEL_NAME)

    client = chromadb.PersistentClient(path=CHROMA_PATH)
    collection = client.get_collection("reports")

    sections = SECTION_QUERIES.get(report_type, {})
    if not sections:
        print(f"No extraction template for report type '{report_type}'. "
              f"Supported: {', '.join(SECTION_QUERIES.keys())}")
        sys.exit(1)

    print(f"Extracting {len(sections)} sections from report_id={report_id}, rev_id={rev_id}...")
    print("Note: This script retrieves relevant chunks. The LLM agent reads these")
    print("chunks and writes the extracted facts to the database.\n")

    extraction_data = {}
    for section, query in sections.items():
        chunks_text = get_chunks_for_section(collection, report_id, rev_id, query, model)
        extraction_data[section] = {
            'query': query,
            'chunks': chunks_text,
            'char_count': len(chunks_text)
        }
        print(f"  Section '{section}': {len(chunks_text)} chars of context retrieved")

    # Output to file for agent to read and extract
    out = {
        'report_id': report_id,
        'rev_id': rev_id,
        'report_type': report_type,
        'agent': agent_name,
        'sections': extraction_data,
        'instruction': (
            "For each section, read the retrieved chunks and extract structured key facts. "
            "Store each section's facts in the report_extractions table using store_extraction(). "
            "Be concise and factual. Include specific values (depths, capacities, etc.) where present."
        )
    }

    print(f"\nContext retrieved for {len(sections)} sections.")
    print("Agent should read each section's chunks and call store_extraction() for each.")
    return out

if __name__ == '__main__':
    if len(sys.argv) < 5:
        print("Usage: extract_facts.py <report_id> <rev_id> <report_type> <agent_name>")
        print(f"Supported types: {', '.join(SECTION_QUERIES.keys())}")
        sys.exit(1)
    result = extract_facts(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
    print(json.dumps(result, indent=2, ensure_ascii=False))
```

---

## How Agents Use Extracted Facts

After pre-extraction, agents query the SQLite table directly for fast retrieval:

```sql
-- Get all extracted facts for the current geotech report
SELECT re.section, re.key_facts, re.extracted_at
FROM report_extractions re
JOIN report_revisions rv ON re.report_rev_id = rv.id
JOIN reports r ON rv.report_id = r.id
WHERE r.report_type = 'geotech'
  AND rv.superseded = 0
ORDER BY re.section;
```

### Response Pattern

When an agent has pre-extracted facts:
> "Based on the Douglas Partners Geotechnical Report (Rev B, extracted 2025-11-20):"
> 
> **Key Findings:**
> - Rock encountered at RL 12.5m (approximately 4.5m depth from existing surface)
> - UCS: 45 MPa (medium strength sandstone)
> - Groundwater: RL 8.2m (approximately 9m depth)
> - Bearing capacity: 1,500 kPa on rock
> - No contamination detected

When facts aren't available and vector search is used:
> "I've searched the geotech report and found the following relevant passage (page 14):"
> [chunk text]
> 
> "Would you like me to extract and store key facts from this report for faster access in future?"

---

## Re-extraction After Revision

When a report is updated to a new revision, offer re-extraction:

> "The geotech report has been updated to Rev B and re-indexed. The previous extraction (Rev A) noted rock at RL 12.5m. Would you like me to re-extract key facts from Rev B to check if this has changed?"

Previous extraction data is retained (linked to the old rev_id) for comparison. Only current revision data is used for active queries.
