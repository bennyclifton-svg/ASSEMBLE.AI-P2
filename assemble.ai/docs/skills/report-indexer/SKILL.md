---
name: report-indexer
tier: 2
description: Index PDF reports into ChromaDB for semantic search. Extracts text, chunks into 500-800 token segments, generates embeddings via all-MiniLM-L6-v2, stores in project-vectors/. Registers report in project.db. Used by all agents to make reports searchable.
agents: [feasibility, design, procurement, delivery, finance, program]
---

# Report Indexer Skill

## When to Load

Load this skill when:
- A new PDF report has been detected in `docs/` (via file watcher)
- A user uploads a report and asks for it to be indexed
- A revised report supersedes a previous version
- An agent needs to search a report that hasn't been indexed yet

## Dependencies

```bash
pip install chromadb sentence-transformers pdfplumber sqlite3
```

**Embedding model:** `all-MiniLM-L6-v2` (via sentence-transformers) — runs locally on CPU, ~90MB download on first use, no API key required.

**ChromaDB:** Local persistent store at `project-vectors/` — no server required.

---

## Step 1: Register the Report

Before indexing, register the report in `project.db`:

```python
# Run: python system/skills/report-indexer/register_report.py <filepath> <report_type>
# Example: python system/skills/report-indexer/register_report.py docs/design/acoustic-report-rev02.pdf acoustic
```

```python
# register_report.py
import sqlite3
import hashlib
import sys
import os
from pathlib import Path
from datetime import datetime

REPORT_TYPES = [
    'geotech', 'contamination', 'environmental', 'heritage', 'survey',
    'planning', 'traffic', 'acoustic', 'bca', 'section_j', 'access',
    'fire', 'structural', 'civil', 'wind', 'specification',
    'tender_report', 'cost_plan', 'programme', 'superintendent', 'other'
]

def file_hash(filepath):
    h = hashlib.sha256()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()

def register_report(filepath, report_type, db_path='project.db'):
    if report_type not in REPORT_TYPES:
        print(f"Unknown report type '{report_type}'. Valid types: {', '.join(REPORT_TYPES)}")
        sys.exit(1)

    filepath = Path(filepath)
    if not filepath.exists():
        print(f"File not found: {filepath}")
        sys.exit(1)

    fhash = file_hash(filepath)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Check for existing report with same filename (possible revision)
    cur.execute("SELECT id, filename, current_rev FROM reports WHERE filename = ?",
                (filepath.name,))
    existing = cur.fetchone()

    if existing:
        report_id = existing[0]
        # Determine next revision
        cur.execute("SELECT revision FROM report_revisions WHERE report_id = ? ORDER BY id DESC LIMIT 1",
                    (report_id,))
        last_rev = cur.fetchone()
        if last_rev:
            last = last_rev[0]
            # Auto-increment: A→B→C or 1→2→3
            if last.isalpha():
                next_rev = chr(ord(last.upper()) + 1)
            else:
                next_rev = str(int(last) + 1)
        else:
            next_rev = 'B'

        # Mark previous revision as superseded
        cur.execute("UPDATE report_revisions SET superseded = 1 WHERE report_id = ? AND superseded = 0",
                    (report_id,))
        cur.execute("UPDATE reports SET current_rev = ?, status = 'uploaded' WHERE id = ?",
                    (next_rev, report_id))
        print(f"New revision detected: {filepath.name} → Rev {next_rev} (supersedes previous)")
    else:
        # New report
        cur.execute("""
            INSERT INTO reports (filename, filepath, report_type, current_rev, status)
            VALUES (?, ?, ?, 'A', 'uploaded')
        """, (filepath.name, str(filepath), report_type))
        report_id = cur.lastrowid
        next_rev = 'A'
        print(f"New report registered: {filepath.name} (Rev A, type: {report_type})")

    # Insert revision record
    cur.execute("""
        INSERT INTO report_revisions (report_id, revision, filepath)
        VALUES (?, ?, ?)
    """, (report_id, next_rev, str(filepath)))
    rev_id = cur.lastrowid

    conn.commit()
    conn.close()

    return report_id, rev_id, next_rev

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: register_report.py <filepath> <report_type>")
        print(f"Types: {', '.join(REPORT_TYPES)}")
        sys.exit(1)
    report_id, rev_id, rev = register_report(sys.argv[1], sys.argv[2])
    print(f"report_id={report_id}, rev_id={rev_id}, revision={rev}")
```

---

## Step 2: Extract and Chunk the Report

```python
# index_report.py — Extract text, chunk, and prepare for embedding
# Run: python system/skills/report-indexer/index_report.py <filepath> <report_id> <rev_id>
```

```python
# index_report.py
import pdfplumber
import sys
import json
import re
from pathlib import Path

def extract_text_by_page(filepath):
    """Extract text from PDF, returning list of (page_num, text) tuples."""
    pages = []
    with pdfplumber.open(filepath) as pdf:
        for i, page in enumerate(pdf.pages, 1):
            text = page.extract_text() or ''
            text = text.strip()
            if text:
                pages.append((i, text))
    return pages

def chunk_pages(pages, chunk_tokens=650, overlap_tokens=100, chars_per_token=4):
    """
    Chunk page text into segments of ~chunk_tokens with overlap.
    Uses character approximation (4 chars ≈ 1 token).
    """
    chunk_chars = chunk_tokens * chars_per_token
    overlap_chars = overlap_tokens * chars_per_token

    # Join all pages into a single text, tracking page boundaries
    full_text = ''
    page_map = []  # (char_start, char_end, page_num)
    for page_num, text in pages:
        start = len(full_text)
        full_text += text + ' '
        page_map.append((start, len(full_text), page_num))

    def char_to_page(pos):
        for start, end, page_num in page_map:
            if start <= pos < end:
                return page_num
        return page_map[-1][2] if page_map else 1

    chunks = []
    pos = 0
    chunk_idx = 0
    while pos < len(full_text):
        end = min(pos + chunk_chars, len(full_text))
        # Try to break at sentence boundary
        if end < len(full_text):
            boundary = full_text.rfind('. ', pos, end)
            if boundary > pos + (chunk_chars // 2):
                end = boundary + 2
        chunk_text = full_text[pos:end].strip()
        if chunk_text:
            chunks.append({
                'index': chunk_idx,
                'text': chunk_text,
                'page_number': char_to_page(pos),
                'char_start': pos,
                'char_end': end
            })
            chunk_idx += 1
        # Advance with overlap
        pos = end - overlap_chars
        if pos <= 0:
            break

    return chunks

def detect_section(text):
    """Attempt to detect the section heading for a chunk."""
    lines = text.split('\n')
    for line in lines[:3]:
        line = line.strip()
        # Match patterns like "3.2 Rock Classification" or "EXECUTIVE SUMMARY"
        if re.match(r'^(\d+\.)*\d+\s+[A-Z]', line) or \
           (line.isupper() and len(line) > 5 and len(line) < 80):
            return line[:100]
    return None

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: index_report.py <filepath>")
        sys.exit(1)

    filepath = sys.argv[1]
    print(f"Extracting text from: {filepath}")

    pages = extract_text_by_page(filepath)
    print(f"Pages with text: {len(pages)}")

    chunks = chunk_pages(pages)
    print(f"Chunks generated: {len(chunks)}")

    # Add section detection to each chunk
    for chunk in chunks:
        section = detect_section(chunk['text'])
        if section:
            chunk['section'] = section

    # Output chunks as JSON for embed_chunks.py to consume
    out_path = Path(filepath).with_suffix('.chunks.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(chunks, f, ensure_ascii=False, indent=2)
    print(f"Chunks saved to: {out_path}")
```

---

## Step 3: Embed and Store in ChromaDB

```python
# embed_chunks.py — Generate embeddings and store in ChromaDB
# Run: python system/skills/report-indexer/embed_chunks.py <chunks_json> <report_id> <rev_id> <report_type> <filename> <revision> <author> <date>
```

```python
# embed_chunks.py
import chromadb
import json
import sys
import sqlite3
from pathlib import Path
from sentence_transformers import SentenceTransformer
from datetime import datetime

CHROMA_PATH = "project-vectors/"
DB_PATH = "project.db"
MODEL_NAME = "all-MiniLM-L6-v2"

def embed_and_store(chunks_json_path, report_id, rev_id, report_type,
                    filename, revision, author='', date=''):
    print(f"Loading embedding model: {MODEL_NAME}...")
    model = SentenceTransformer(MODEL_NAME)

    print(f"Loading chunks from: {chunks_json_path}")
    with open(chunks_json_path, 'r', encoding='utf-8') as f:
        chunks = json.load(f)

    print(f"Connecting to ChromaDB at: {CHROMA_PATH}")
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    # Get or create the reports collection
    try:
        collection = client.get_collection("reports")
    except Exception:
        collection = client.create_collection(
            name="reports",
            metadata={"description": "Project report and specification chunks"}
        )

    # Tag any existing chunks from previous revisions as superseded
    try:
        existing = collection.get(
            where={"$and": [{"report_id": int(report_id)}, {"superseded": False}]}
        )
        if existing['ids']:
            collection.update(
                ids=existing['ids'],
                metadatas=[{**m, 'superseded': True} for m in existing['metadatas']]
            )
            print(f"Marked {len(existing['ids'])} previous chunks as superseded")
    except Exception:
        pass  # No existing chunks

    # Generate embeddings and store
    texts = [c['text'] for c in chunks]
    print(f"Generating embeddings for {len(texts)} chunks...")
    embeddings = model.encode(texts, show_progress_bar=True).tolist()

    ids = [f"report-{report_id}-rev-{rev_id}-chunk-{c['index']}" for c in chunks]

    metadatas = [{
        "report_id": int(report_id),
        "rev_id": int(rev_id),
        "report_type": report_type,
        "filename": filename,
        "revision": revision,
        "page_number": c.get('page_number', 0),
        "section": c.get('section', ''),
        "chunk_index": c['index'],
        "author": author,
        "date": date,
        "superseded": False
    } for c in chunks]

    # Store in batches of 100
    batch_size = 100
    for i in range(0, len(ids), batch_size):
        batch_ids = ids[i:i+batch_size]
        batch_texts = texts[i:i+batch_size]
        batch_embeddings = embeddings[i:i+batch_size]
        batch_metadatas = metadatas[i:i+batch_size]
        collection.add(
            ids=batch_ids,
            documents=batch_texts,
            embeddings=batch_embeddings,
            metadatas=batch_metadatas
        )
        print(f"  Stored chunks {i+1}–{min(i+batch_size, len(ids))}")

    # Update report_revisions table
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        UPDATE report_revisions
        SET chunked_at = ?, chunk_count = ?
        WHERE id = ?
    """, (datetime.now().isoformat(), len(chunks), int(rev_id)))
    conn.execute("UPDATE reports SET status = 'chunked' WHERE id = ?", (int(report_id),))
    conn.commit()
    conn.close()

    print(f"\nDone. {len(chunks)} chunks indexed for {filename} Rev {revision}.")
    return len(chunks)

if __name__ == '__main__':
    if len(sys.argv) < 7:
        print("Usage: embed_chunks.py <chunks_json> <report_id> <rev_id> "
              "<report_type> <filename> <revision> [author] [date]")
        sys.exit(1)
    author = sys.argv[7] if len(sys.argv) > 7 else ''
    date = sys.argv[8] if len(sys.argv) > 8 else ''
    embed_and_store(sys.argv[1], sys.argv[2], sys.argv[3],
                    sys.argv[4], sys.argv[5], sys.argv[6], author, date)
```

---

## Step 4: Search Reports

```python
# search_reports.py — Semantic search interface for agents
# Run: python system/skills/report-indexer/search_reports.py "<query>" [report_type] [n_results]
```

```python
# search_reports.py
import chromadb
import sys
import json
from sentence_transformers import SentenceTransformer

CHROMA_PATH = "project-vectors/"
MODEL_NAME = "all-MiniLM-L6-v2"

def search_reports(query, report_type=None, n_results=5):
    model = SentenceTransformer(MODEL_NAME)
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    try:
        collection = client.get_collection("reports")
    except Exception:
        print("No reports collection found. Index some reports first.")
        sys.exit(1)

    query_embedding = model.encode([query]).tolist()

    # Build where filter
    where = {"superseded": False}
    if report_type:
        where = {"$and": [{"superseded": False}, {"report_type": report_type}]}

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=n_results,
        where=where,
        include=['documents', 'metadatas', 'distances']
    )

    output = []
    for i, (doc, meta, dist) in enumerate(zip(
        results['documents'][0],
        results['metadatas'][0],
        results['distances'][0]
    )):
        output.append({
            'rank': i + 1,
            'relevance': round(1 - dist, 3),
            'filename': meta.get('filename', ''),
            'revision': meta.get('revision', ''),
            'page_number': meta.get('page_number', ''),
            'section': meta.get('section', ''),
            'report_type': meta.get('report_type', ''),
            'author': meta.get('author', ''),
            'text': doc[:500] + ('...' if len(doc) > 500 else '')
        })

    return output

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: search_reports.py \"<query>\" [report_type] [n_results]")
        sys.exit(1)

    query = sys.argv[1]
    report_type = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != 'all' else None
    n_results = int(sys.argv[3]) if len(sys.argv) > 3 else 5

    results = search_reports(query, report_type, n_results)
    print(json.dumps(results, indent=2, ensure_ascii=False))
```

---

## Full Pipeline — One Command

```bash
# Index a new report in one step:
python system/skills/report-indexer/pipeline.py docs/design/acoustic-report-rev02.pdf acoustic "Renzo Tonin & Associates" "2025-11-15"
```

```python
# pipeline.py — Runs all steps in sequence
import sys
import subprocess
from pathlib import Path

def run_pipeline(filepath, report_type, author='', date='', db_path='project.db'):
    filepath = Path(filepath)
    print(f"\n=== INDEXING PIPELINE: {filepath.name} ===\n")

    # Step 1: Register
    result = subprocess.run([
        sys.executable, 'system/skills/report-indexer/register_report.py',
        str(filepath), report_type
    ], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
        sys.exit(1)

    # Parse report_id and rev_id from output
    for line in result.stdout.split('\n'):
        if line.startswith('report_id='):
            parts = dict(p.split('=') for p in line.split(', '))
            report_id = parts['report_id']
            rev_id = parts['rev_id']
            revision = parts['revision']

    # Step 2: Extract and chunk
    result = subprocess.run([
        sys.executable, 'system/skills/report-indexer/index_report.py',
        str(filepath)
    ], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
        sys.exit(1)

    chunks_json = filepath.with_suffix('.chunks.json')

    # Step 3: Embed and store
    result = subprocess.run([
        sys.executable, 'system/skills/report-indexer/embed_chunks.py',
        str(chunks_json), report_id, rev_id, report_type,
        filepath.name, revision, author, date
    ], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print(result.stderr)
        sys.exit(1)

    # Cleanup chunks file
    chunks_json.unlink(missing_ok=True)
    print(f"\n✓ {filepath.name} indexed and searchable.")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: pipeline.py <filepath> <report_type> [author] [date]")
        sys.exit(1)
    author = sys.argv[3] if len(sys.argv) > 3 else ''
    date = sys.argv[4] if len(sys.argv) > 4 else ''
    run_pipeline(sys.argv[1], sys.argv[2], author, date)
```

---

## How Agents Use This Skill

### When an agent receives a query about a report:

1. **Check pre-extracted facts first** (faster, no vector search):
```sql
SELECT key_facts FROM report_extractions re
JOIN report_revisions rv ON re.report_rev_id = rv.id
JOIN reports r ON rv.report_id = r.id
WHERE r.report_type = 'geotech' AND rv.superseded = 0;
```

2. **If not in extractions, run vector search:**
```bash
python system/skills/report-indexer/search_reports.py "rock bearing capacity at foundation level" geotech 5
```

3. **Cite sources in responses:**
> "According to the Douglas Partners Geotechnical Report (Rev B, page 14), rock was encountered at RL 12.5m with an unconfined compressive strength of 45 MPa."

### Notification on new file detection (file watcher):

When the file watcher detects a new PDF in `docs/`:

```
📄 New file detected: acoustic-report-rev02.pdf → docs/design/

→ Indexing report for search...
  Type detected: acoustic
  62 pages extracted | 108 chunks indexed
  Supersedes: acoustic-report-rev01.pdf (Rev A, 58 pages — tagged superseded)

Report is now searchable. Would you like me to:
[a] Extract key facts for quick reference (recommended for frequently referenced reports)
[b] Route to Design Agent for review
[c] Do nothing — available for search on demand
```
