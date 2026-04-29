---
name: spec-indexer
tier: 2
description: Index project specifications into ChromaDB using trade-section-aware chunking. Splits spec by trade code sections (e.g., 0531 Structural Steelwork) rather than arbitrary token count. Enables precise queries like "what does the spec say about fire door hardware?" Produces richer metadata than the generic report-indexer.
agents: [design, procurement, delivery]
---

# Specification Indexer Skill

## When to Load

Load this skill when:
- A project specification PDF has been uploaded to `docs/design/`
- A spec revision is detected (supersedes previous)
- An agent needs to search the specification for a trade-specific requirement
- Tender evaluation requires checking specification compliance claims

## Why a Separate Skill from Report Indexer

The generic report-indexer chunks by token count. For specifications:
- Specifications are typically 400–600+ pages with 50–100 trade sections
- Each trade section is a logical unit (e.g., "Section 0531 — Structural Steelwork")
- Chunking across section boundaries mixes irrelevant trades
- Trade code metadata (`0531`, `0671`, `1010`) enables precise filtering
- Queries like "what steel grade is specified?" should search Section 0531, not the whole document

---

## Australian Specification Trade Codes

The indexer detects trade sections using standard Australian Natspec/WorkSpec section numbering:

```python
TRADE_SECTIONS = {
    # Substructure
    '0131': 'General Requirements',
    '0210': 'Demolition',
    '0310': 'Excavation and Filling',
    '0321': 'Piling',
    '0331': 'Drainage',
    '0341': 'Footings and Slabs on Ground',
    # Structure
    '0411': 'Concrete',
    '0421': 'Reinforcement',
    '0431': 'Formwork',
    '0461': 'Precast Concrete',
    '0511': 'Structural Steelwork',
    '0531': 'Structural Steelwork',  # Common alternative
    '0551': 'Metalwork',
    '0611': 'Waterproofing',
    '0621': 'Flashings',
    # Enclosure
    '0711': 'Masonry',
    '0721': 'Brick and Block',
    '0731': 'Rendered Finishes',
    '0811': 'Roofing',
    '0831': 'Skylights',
    '0851': 'Curtain Walls',
    '0861': 'Glazing',
    '0871': 'Aluminium Windows and Doors',
    '0881': 'Timber Windows and Doors',
    '0891': 'Steel Doors and Frames',
    '0921': 'Facade Cladding',
    # Fitout
    '1011': 'Wall and Ceiling Linings',
    '1021': 'Plasterboard',
    '1031': 'Suspended Ceilings',
    '1041': 'Floor Finishes',
    '1051': 'Tiling',
    '1061': 'Carpet',
    '1071': 'Resilient Flooring',
    '1081': 'Timber Flooring',
    '1111': 'Joinery',
    '1121': 'Cabinetwork',
    '1141': 'Painting',
    '1151': 'Decorative Finishes',
    # Services
    '1211': 'Hydraulic Services',
    '1221': 'Plumbing',
    '1231': 'Fire Services',
    '1241': 'Mechanical Services',
    '1251': 'Air Conditioning',
    '1261': 'Electrical Services',
    '1271': 'Lifts',
    '1281': 'Communications',
    '1291': 'Security',
    '1310': 'Landscaping',
    # General
    '0011': 'General Requirements',
    '0021': 'Site',
    '0031': 'Management',
}
```

---

## Indexing Script

```python
# index_spec.py — Trade-section-aware specification chunking
# Run: python system/skills/spec-indexer/index_spec.py <spec_filepath> <report_id> <rev_id>
```

```python
# index_spec.py
import pdfplumber
import chromadb
import sqlite3
import sys
import re
import json
from pathlib import Path
from datetime import datetime
from sentence_transformers import SentenceTransformer

CHROMA_PATH = "project-vectors/"
DB_PATH = "project.db"
MODEL_NAME = "all-MiniLM-L6-v2"

# Pattern to detect trade section headings
# Matches: "SECTION 0531 - STRUCTURAL STEELWORK" or "0531 Structural Steelwork" etc.
SECTION_PATTERN = re.compile(
    r'(?:SECTION\s+)?(\d{4})\s*[-–—]?\s*([A-Z][A-Z\s&/,]+)',
    re.IGNORECASE
)

def extract_pages(filepath):
    pages = []
    with pdfplumber.open(filepath) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ''
            if text.strip():
                pages.append((i, text.strip()))
    return pages

def detect_section_break(text, page_num):
    """Return (trade_code, trade_name) if this page starts a new trade section."""
    lines = text.split('\n')[:5]  # Check first 5 lines of page
    for line in lines:
        m = SECTION_PATTERN.match(line.strip())
        if m:
            code = m.group(1)
            name = m.group(2).strip().title()
            return code, name
    return None, None

def split_into_sections(pages):
    """Split pages into trade sections."""
    sections = []
    current_section = {
        'trade_code': '0000',
        'trade_name': 'General / Preamble',
        'pages': [],
        'start_page': 1
    }

    for page_num, text in pages:
        code, name = detect_section_break(text, page_num)
        if code:
            if current_section['pages']:
                sections.append(current_section)
            current_section = {
                'trade_code': code,
                'trade_name': name,
                'pages': [(page_num, text)],
                'start_page': page_num
            }
        else:
            current_section['pages'].append((page_num, text))

    if current_section['pages']:
        sections.append(current_section)

    return sections

def chunk_section(section, chunk_chars=2800, overlap_chars=400):
    """Chunk a trade section's text with overlap."""
    # Join all pages in the section
    full_text = '\n\n'.join(text for _, text in section['pages'])
    page_nums = [p for p, _ in section['pages']]

    chunks = []
    pos = 0
    idx = 0
    while pos < len(full_text):
        end = min(pos + chunk_chars, len(full_text))
        if end < len(full_text):
            # Break at sentence boundary
            boundary = full_text.rfind('. ', pos, end)
            if boundary > pos + (chunk_chars // 2):
                end = boundary + 2
        chunk_text = full_text[pos:end].strip()
        if chunk_text:
            # Estimate which page this chunk falls on
            page_estimate = section['start_page'] + int(
                (pos / len(full_text)) * len(page_nums)
            ) if page_nums else section['start_page']
            chunks.append({
                'text': chunk_text,
                'trade_code': section['trade_code'],
                'trade_name': section['trade_name'],
                'start_page': section['start_page'],
                'page_estimate': page_estimate,
                'chunk_index': idx
            })
            idx += 1
        pos = end - overlap_chars
        if pos <= 0:
            break

    return chunks

def index_specification(filepath, report_id, rev_id):
    filepath = Path(filepath)
    print(f"Loading embedding model: {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)

    print(f"Extracting pages from {filepath.name}...")
    pages = extract_pages(str(filepath))
    print(f"Pages extracted: {len(pages)}")

    print("Splitting into trade sections...")
    sections = split_into_sections(pages)
    print(f"Trade sections detected: {len(sections)}")
    for s in sections:
        print(f"  {s['trade_code']} — {s['trade_name']} ({len(s['pages'])} pages)")

    print("\nChunking sections...")
    all_chunks = []
    for section in sections:
        chunks = chunk_section(section)
        all_chunks.extend(chunks)
    print(f"Total chunks: {len(all_chunks)}")

    print("Connecting to ChromaDB...")
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    try:
        collection = client.get_collection("reports")
    except Exception:
        collection = client.create_collection(
            name="reports",
            metadata={"description": "Project report and specification chunks"}
        )

    # Supersede old spec chunks
    try:
        existing = collection.get(
            where={"$and": [
                {"report_id": int(report_id)},
                {"report_type": "specification"},
                {"superseded": False}
            ]}
        )
        if existing['ids']:
            collection.update(
                ids=existing['ids'],
                metadatas=[{**m, 'superseded': True} for m in existing['metadatas']]
            )
            print(f"Superseded {len(existing['ids'])} previous spec chunks")
    except Exception:
        pass

    # Generate embeddings
    texts = [c['text'] for c in all_chunks]
    print(f"Generating embeddings for {len(texts)} chunks...")
    embeddings = model.encode(texts, show_progress_bar=True).tolist()

    # Store in ChromaDB
    ids = [f"spec-{report_id}-rev-{rev_id}-{c['trade_code']}-chunk-{c['chunk_index']}"
           for c in all_chunks]
    metadatas = [{
        "report_id": int(report_id),
        "rev_id": int(rev_id),
        "report_type": "specification",
        "trade_code": c['trade_code'],
        "trade_name": c['trade_name'],
        "section_heading": f"{c['trade_code']} — {c['trade_name']}",
        "page_number": c['page_estimate'],
        "start_page": c['start_page'],
        "chunk_index": c['chunk_index'],
        "superseded": False
    } for c in all_chunks]

    batch_size = 100
    for i in range(0, len(ids), batch_size):
        collection.add(
            ids=ids[i:i+batch_size],
            documents=texts[i:i+batch_size],
            embeddings=embeddings[i:i+batch_size],
            metadatas=metadatas[i:i+batch_size]
        )
    print(f"Stored {len(ids)} chunks in ChromaDB")

    # Update SQLite
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        UPDATE report_revisions SET chunked_at = ?, chunk_count = ? WHERE id = ?
    """, (datetime.now().isoformat(), len(all_chunks), int(rev_id)))
    conn.execute("UPDATE reports SET status = 'chunked' WHERE id = ?", (int(report_id),))
    conn.commit()
    conn.close()

    # Summary
    trade_summary = {}
    for c in all_chunks:
        key = f"{c['trade_code']} — {c['trade_name']}"
        trade_summary[key] = trade_summary.get(key, 0) + 1

    print(f"\n✓ Specification indexed: {len(sections)} sections, {len(all_chunks)} chunks")
    print("\nSections indexed:")
    for section, count in sorted(trade_summary.items()):
        print(f"  {section}: {count} chunks")

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: index_spec.py <filepath> <report_id> <rev_id>")
        print("(Register the spec using report-indexer/register_report.py first)")
        sys.exit(1)
    index_specification(sys.argv[1], sys.argv[2], sys.argv[3])
```

---

## Searching the Specification

Agents can search the specification using the standard `search_reports.py` with `report_type=specification`, or with trade-code filtering:

### By semantic query (across all trades):
```bash
python system/skills/report-indexer/search_reports.py "fire door hardware FRL rating" specification 5
```

### By specific trade section:
```python
# In Python — filter to specific trade
results = collection.query(
    query_embeddings=embedding,
    n_results=5,
    where={"$and": [
        {"report_type": "specification"},
        {"trade_code": "0891"},  # Steel Doors and Frames
        {"superseded": False}
    ]}
)
```

### Example Agent Responses Using Spec Search

> **Delivery Agent (variation assessment):**
> "I've searched the project specification for the applicable steel grade requirements. Section 0531 — Structural Steelwork (page 142) specifies: 'All structural steelwork shall comply with AS 4100 and be Grade 350 to AS/NZS 3678 unless noted otherwise.' The contractor's claim that Grade 300 was acceptable is not supported by the specification."

> **Design Agent (NCC review):**
> "According to the project specification Section 1231 — Fire Services (page 267): 'Stair enclosure walls shall be FRL 120/120/120.' This aligns with the NCC Section C requirement for Type B construction."

> **Procurement Agent (tender evaluation):**
> "Tenderer B's methodology states standard AS 4100 compliance for structural steel. The specification (Section 0531) requires Grade 350 material specifically — confirm Tenderer B has allowed for this."

---

## Spec Revision Handling

When a new specification revision is uploaded:

```
📄 New file detected: specification-rev-d.pdf → docs/design/

→ Registered as Specification, Rev D (supersedes Rev C, 412 pages)
→ Running trade-section-aware indexing...
  Sections detected: 87 trade sections
  Chunks generated: 1,847
  Previous Rev C chunks tagged as superseded

Specification Rev D is now searchable.

Notable: 87 sections in Rev D vs 86 in Rev C — one new section detected.
Would you like me to identify what changed between revisions?
```

---

## Full Specification Indexing Workflow

```bash
# 1. Register the spec
python system/skills/report-indexer/register_report.py docs/design/specification-rev-d.pdf specification

# 2. Index with trade-section-aware chunker
python system/skills/spec-indexer/index_spec.py docs/design/specification-rev-d.pdf <report_id> <rev_id>
```

The spec is now searchable by all agents via `search_reports.py` with `report_type=specification`.
