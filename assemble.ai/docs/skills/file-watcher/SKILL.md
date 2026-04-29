---
name: file-watcher
tier: 2
description: Background polling watcher for the docs/ folder tree. Detects new and revised files, triggers the unified indexing pipeline (register → classify → process → revision handling → notify), and queues user notifications. Covers both entry paths — manual saves and email-auto-filed attachments. Companion to report-indexer, spec-indexer, and dxf-parser skills.
agents: [orchestrator, design, feasibility, correspondence]
---

# File Watcher Skill

## When to Load

Load this skill when:
- Starting the file watcher background process for a project
- A new document has been detected and needs indexing
- Checking what documents are pending indexing
- A user asks "what's new since last check?" or "have any new files come in?"
- Investigating why a document wasn't indexed automatically

## Configuration

All file watcher settings are in `settings.json`:

```json
{
  "file_watcher": {
    "enabled": true,
    "watch_path": "docs/",
    "poll_interval_seconds": 30,
    "auto_index": true,
    "ignore_patterns": [".DS_Store", "Thumbs.db", "~$*", "*.tmp", "*.part"]
  }
}
```

**Prerequisites:**
```bash
pip install watchdog pdfplumber sentence-transformers chromadb ezdxf
```

**Run the watcher:**
```bash
# Start in background (logs to file_watcher.log)
python system/skills/file-watcher/file_watcher.py >> file_watcher.log 2>&1 &

# Or run once (check for new files, process, then exit)
python system/skills/file-watcher/file_watcher.py --once
```

---

## Two Entry Paths, One Pipeline

```
PATH 1: EMAIL                          PATH 2: MANUAL SAVE
                                       
Outlook delivers email +               User saves file to docs/
attachment to CM Agent Inbox                   ↓
        ↓                              File watcher polling detects
Correspondence Agent                   new file (every 30 seconds)
classifies + auto-files to                     ↓
correct docs/ subfolder                ┌───────────────────────┐
        ↓                              │  UNIFIED INDEXING      │
┌───────────────────────┐              │  PIPELINE              │
│  UNIFIED INDEXING      │              │                       │
│  PIPELINE              │              │  1. Register           │
│  (same pipeline)       │              │  2. Classify           │
└───────────────────────┘              │  3. Process by type    │
        ↓                              │  4. Revision handling  │
Auto-routes to agent                   │  5. Notify             │
(email context known)                  └───────────────────────┘
                                               ↓
                                       Queue notification for user
```

---

## File Watcher Script

```python
# file_watcher.py — Poll docs/ folder and trigger indexing pipeline
# Run: python system/skills/file-watcher/file_watcher.py [--once]
```

```python
# file_watcher.py
import sqlite3
import hashlib
import json
import sys
import time
import subprocess
from pathlib import Path
from datetime import datetime

DB_PATH = "project.db"
WATCH_PATH = Path("docs")
POLL_INTERVAL = 30  # seconds — overridden by settings.json
IGNORE_PATTERNS = {".DS_Store", "Thumbs.db"}
IGNORE_PREFIXES = ("~$",)
IGNORE_SUFFIXES = (".tmp", ".part", ".crdownload")

# Document type classification by folder and extension
CLASSIFICATION_RULES = [
    # (folder_contains, extension, report_type, destination_hint)
    ("feasibility", ".pdf", "geotech",         "feasibility"),
    ("feasibility", ".pdf", "contamination",   "feasibility"),
    ("feasibility", ".pdf", "feasibility",     "feasibility"),
    ("design",      ".dxf", "drawing",         "design"),
    ("design",      ".dwg", "drawing",         "design"),
    ("design",      ".pdf", "specification",   "design"),   # detected by filename
    ("design",      ".pdf", "report",          "design"),
    ("procurement", ".pdf", "tender",          "procurement"),
    ("delivery",    ".pdf", "delivery",        "delivery"),
    ("inbound",     ".pdf", "unclassified",    "inbound"),
]

SPECIFICATION_KEYWORDS = ["specification", "spec-", "specs-", "project-spec"]
DRAWING_KEYWORDS = ["drawing", "plan", "elevation", "section", "detail",
                    "a1", "a2", "a3", "a10", "a20", "a30", "s1", "e1", "m1", "c1"]


def load_settings():
    try:
        with open("system/settings.json") as f:
            settings = json.load(f)
        fw = settings.get("file_watcher", {})
        return {
            "enabled": fw.get("enabled", True),
            "watch_path": fw.get("watch_path", "docs/"),
            "poll_interval": fw.get("poll_interval_seconds", POLL_INTERVAL),
            "auto_index": fw.get("auto_index", True),
            "ignore_patterns": set(fw.get("ignore_patterns",
                                          [".DS_Store", "Thumbs.db", "~$*", "*.tmp"]))
        }
    except Exception:
        return {"enabled": True, "watch_path": "docs/",
                "poll_interval": POLL_INTERVAL, "auto_index": True,
                "ignore_patterns": set()}


def file_hash(path):
    """SHA-256 hash of file contents."""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def is_ignored(path):
    """Return True if file should be skipped."""
    name = path.name
    if name in IGNORE_PATTERNS:
        return True
    if name.startswith(IGNORE_PREFIXES):
        return True
    if name.endswith(IGNORE_SUFFIXES):
        return True
    if name.startswith("."):
        return True
    return False


def get_known_hashes(conn):
    """Return {hash: (id, type, filepath)} for all registered documents."""
    known = {}
    # Check all document tables
    for table, type_col, path_col in [
        ("reports",       "report_type", "filepath"),
        ("drawings",      "'drawing'",   "filepath"),
        ("specifications", "'specification'", "filepath"),
    ]:
        try:
            cur = conn.execute(
                f"SELECT file_hash, id, {type_col}, {path_col} FROM {table} WHERE file_hash IS NOT NULL"
            )
            for row in cur.fetchall():
                known[row[0]] = {"id": row[1], "doc_type": row[2], "filepath": row[3]}
        except Exception:
            pass
    return known


def get_registered_paths(conn):
    """Return set of all registered file paths."""
    paths = set()
    for table, path_col in [
        ("reports", "filepath"),
        ("drawings", "filepath"),
        ("specifications", "filepath"),
    ]:
        try:
            cur = conn.execute(f"SELECT {path_col} FROM {table}")
            paths.update(row[0] for row in cur.fetchall() if row[0])
        except Exception:
            pass
    return paths


def classify_document(filepath):
    """
    Classify document type from filepath, filename, and folder location.
    Returns (doc_type, confidence) where doc_type is one of:
    'drawing', 'specification', 'report', 'unclassified'
    and confidence is 'high', 'medium', 'low'
    """
    path = Path(filepath)
    name_lower = path.stem.lower()
    ext_lower = path.suffix.lower()
    folder_lower = str(path.parent).lower()

    # DXF/DWG → always drawing
    if ext_lower in (".dxf", ".dwg"):
        return "drawing", "high"

    # IFC → BIM model
    if ext_lower in (".ifc", ".ifczip"):
        return "ifc_model", "high"

    # Excel/CSV → data file (register, schedule)
    if ext_lower in (".xlsx", ".xls", ".csv"):
        return "data", "medium"

    # PDF classification by filename and folder
    if ext_lower == ".pdf":
        # Specification by filename keywords
        if any(kw in name_lower for kw in SPECIFICATION_KEYWORDS):
            return "specification", "high"

        # Drawing (PDF version) by filename
        if any(kw in name_lower for kw in DRAWING_KEYWORDS):
            return "drawing_pdf", "medium"

        # Folder-based classification
        if "feasibility" in folder_lower:
            return "report", "medium"
        if "design" in folder_lower:
            # Could be drawing (pdf) or report — use filename to distinguish
            if any(kw in name_lower for kw in DRAWING_KEYWORDS):
                return "drawing_pdf", "medium"
            return "report", "medium"
        if "procurement" in folder_lower:
            return "report", "medium"
        if "delivery" in folder_lower:
            return "report", "medium"

        return "report", "low"

    return "unclassified", "low"


def detect_revision(conn, filepath, file_hash_val):
    """
    Check if this file is a new revision of an existing document.
    Returns (is_revision, existing_doc_id, existing_doc_type) or (False, None, None)
    """
    path = Path(filepath)
    # Normalise filename — strip revision suffix patterns
    # e.g., "acoustic-report-rev-b" → "acoustic-report"
    #        "A201-Level1-Plan-RevC" → "A201-Level1-Plan"
    import re
    stem = path.stem
    base = re.sub(
        r'[-_\s]*(rev|revision|r)[-_\s]*[a-z0-9]+$',
        '', stem, flags=re.IGNORECASE
    ).strip('-_ ')

    # Search for existing documents with similar base name
    for table, name_col, path_col in [
        ("reports", "filename", "filepath"),
        ("drawings", "filename", "filepath"),
        ("specifications", "filename", "filepath"),
    ]:
        try:
            cur = conn.execute(
                f"SELECT id, '{table}' as tbl FROM {table} "
                f"WHERE {name_col} LIKE ? AND file_hash != ?",
                (f"%{base}%", file_hash_val)
            )
            row = cur.fetchone()
            if row:
                return True, row[0], table
        except Exception:
            pass

    return False, None, None


def queue_notification(conn, message, doc_type, filepath, is_revision=False,
                       existing_id=None, action_required=False):
    """Store a pending notification for display on next user interaction."""
    try:
        conn.execute("""
            INSERT INTO file_watcher_notifications
            (message, doc_type, filepath, is_revision, existing_doc_id,
             action_required, created_at, shown)
            VALUES (?, ?, ?, ?, ?, ?, ?, 0)
        """, (message, doc_type, str(filepath), is_revision, existing_id,
              action_required, datetime.now().isoformat()))
        conn.commit()
    except Exception as e:
        # Notifications table may not exist yet — print to stdout instead
        print(f"[NOTIFY] {message}")


def run_indexing_pipeline(filepath, doc_type, report_type=None,
                          report_id=None, rev_id=None):
    """
    Trigger the appropriate indexing script for the document type.
    Returns (success, output_message)
    """
    path = Path(filepath)

    if doc_type == "drawing":
        # DXF parser — extract entities to SQLite
        try:
            result = subprocess.run(
                ["python", "system/skills/dxf-parser/extract_dxf.py", str(path)],
                capture_output=True, text=True, timeout=120
            )
            return result.returncode == 0, result.stdout or result.stderr
        except Exception as e:
            return False, str(e)

    elif doc_type == "specification":
        # Spec indexer — trade-section-aware chunking
        if report_id and rev_id:
            try:
                result = subprocess.run(
                    ["python", "system/skills/spec-indexer/index_spec.py",
                     str(path), str(report_id), str(rev_id)],
                    capture_output=True, text=True, timeout=600
                )
                return result.returncode == 0, result.stdout or result.stderr
            except Exception as e:
                return False, str(e)

    elif doc_type == "report":
        # Report indexer — token-based chunking
        if report_id and rev_id:
            try:
                result = subprocess.run(
                    ["python", "system/skills/report-indexer/pipeline.py",
                     str(path)],
                    capture_output=True, text=True, timeout=600
                )
                return result.returncode == 0, result.stdout or result.stderr
            except Exception as e:
                return False, str(e)

    return True, f"Registered {doc_type} — no further processing required"


def register_report(conn, filepath, doc_type, file_hash_val,
                    is_revision=False, supersedes_id=None):
    """Register document in project.db. Returns (report_id, rev_id)."""
    path = Path(filepath)
    now = datetime.now().isoformat()

    if doc_type in ("report", "specification"):
        # Get next revision letter
        rev_letter = "A"
        if is_revision and supersedes_id:
            cur = conn.execute(
                "SELECT revision FROM report_revisions WHERE report_id = ? "
                "ORDER BY id DESC LIMIT 1",
                (supersedes_id,)
            )
            row = cur.fetchone()
            if row and row[0]:
                # Increment letter: A→B, B→C, etc.
                current = row[0].strip()[-1].upper()
                rev_letter = chr(ord(current) + 1) if current < 'Z' else 'A'

        # Insert or update reports table
        if is_revision and supersedes_id:
            # Supersede previous revision
            conn.execute(
                "UPDATE report_revisions SET superseded = 1 WHERE report_id = ?",
                (supersedes_id,)
            )
            report_id = supersedes_id
        else:
            cur = conn.execute("""
                INSERT INTO reports (filename, filepath, report_type, status,
                                    file_hash, registered_at)
                VALUES (?, ?, ?, 'registered', ?, ?)
            """, (path.name, str(filepath), doc_type, file_hash_val, now))
            report_id = cur.lastrowid

        cur = conn.execute("""
            INSERT INTO report_revisions (report_id, revision, filepath,
                                          file_hash, registered_at, superseded)
            VALUES (?, ?, ?, ?, ?, 0)
        """, (report_id, rev_letter, str(filepath), file_hash_val, now))
        rev_id = cur.lastrowid
        conn.commit()
        return report_id, rev_id

    return None, None


def process_new_file(conn, filepath, known_hashes, registered_paths):
    """
    Full pipeline for a newly detected file.
    Returns a notification dict for display to user.
    """
    path = Path(filepath)
    hash_val = file_hash(filepath)

    # Duplicate check
    if hash_val in known_hashes:
        return None  # Already indexed with this exact content

    # Already registered path with different hash → revision
    str_path = str(filepath)
    is_revision = str_path in registered_paths

    # If not by path, detect by similar name
    if not is_revision:
        is_revision, existing_id, existing_type = detect_revision(
            conn, filepath, hash_val
        )
    else:
        existing_id, existing_type = None, None

    # Classify document
    doc_type, confidence = classify_document(filepath)

    print(f"[{datetime.now().strftime('%H:%M:%S')}] New file: {path.name} "
          f"({doc_type}, {'revision' if is_revision else 'new'}, "
          f"confidence: {confidence})")

    # Register in SQLite
    report_id, rev_id = register_report(
        conn, filepath, doc_type, hash_val, is_revision, existing_id
    )

    # Build notification
    notification = {
        "filepath": str(filepath),
        "filename": path.name,
        "doc_type": doc_type,
        "confidence": confidence,
        "is_revision": is_revision,
        "supersedes_id": existing_id,
        "hash": hash_val,
        "report_id": report_id,
        "rev_id": rev_id,
        "indexed": False,
        "index_error": None,
    }

    # Index if auto_index and not unclassified
    if doc_type not in ("unclassified", "drawing_pdf", "data", "ifc_model"):
        success, output = run_indexing_pipeline(
            filepath, doc_type, report_id=report_id, rev_id=rev_id
        )
        notification["indexed"] = success
        if not success:
            notification["index_error"] = output

    return notification


def format_notification(notif):
    """Format a notification dict into a user-facing message string."""
    fname = notif["filename"]
    doc_type = notif["doc_type"]
    is_rev = notif["is_revision"]
    indexed = notif.get("indexed", False)
    error = notif.get("index_error")

    rev_label = " (revision detected — supersedes previous)" if is_rev else ""

    lines = [f"📄 New file detected: {fname}{rev_label}"]

    if doc_type == "drawing":
        lines.append(f"   → Drawing extracted to SQLite"
                     if indexed else "   → Registered (extraction pending)")
    elif doc_type == "specification":
        lines.append(f"   → Specification indexed by trade section"
                     if indexed else "   → Registered (indexing pending)")
    elif doc_type == "report":
        lines.append(f"   → Report chunked and indexed in ChromaDB"
                     if indexed else "   → Registered (indexing pending)")
    elif doc_type == "drawing_pdf":
        lines.append(f"   → PDF drawing registered (DXF not available — vision review only)")
    elif doc_type == "unclassified":
        lines.append(f"   → Saved to docs/inbound/ — classification uncertain")
        lines.append(f"   → Please advise: what type of document is this?")

    if error:
        lines.append(f"   ⚠ Indexing error: {error[:120]}")

    return "\n".join(lines)


def scan_and_process(watch_path, conn, auto_index=True):
    """
    Scan docs/ tree once. Return list of notification dicts for new files.
    """
    known_hashes = get_known_hashes(conn)
    registered_paths = get_registered_paths(conn)
    notifications = []

    for filepath in sorted(Path(watch_path).rglob("*")):
        if not filepath.is_file():
            continue
        if is_ignored(filepath):
            continue

        notif = process_new_file(conn, filepath, known_hashes, registered_paths)
        if notif:
            notifications.append(notif)
            # Update known hashes so duplicates in same scan are skipped
            known_hashes[notif["hash"]] = {
                "id": notif.get("report_id"),
                "doc_type": notif["doc_type"],
                "filepath": str(filepath)
            }

    return notifications


def main():
    settings = load_settings()
    if not settings["enabled"]:
        print("File watcher disabled in settings.json")
        return

    run_once = "--once" in sys.argv
    poll_interval = settings["poll_interval"]
    watch_path = settings["watch_path"]

    print(f"[{datetime.now().isoformat()}] File watcher started")
    print(f"  Watching: {watch_path}")
    print(f"  Interval: {poll_interval}s{' (once)' if run_once else ''}")

    while True:
        conn = sqlite3.connect(DB_PATH)
        try:
            notifications = scan_and_process(watch_path, conn,
                                             settings["auto_index"])
            if notifications:
                print(f"\n{'=' * 60}")
                print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                      f"{len(notifications)} new file(s) detected:")
                for notif in notifications:
                    msg = format_notification(notif)
                    print(msg)
                    queue_notification(
                        conn,
                        msg,
                        notif["doc_type"],
                        notif["filepath"],
                        notif["is_revision"],
                        notif.get("supersedes_id"),
                        action_required=(notif["doc_type"] == "unclassified")
                    )
                print("=" * 60)
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] "
                      f"Scan complete — no new files")
        except Exception as e:
            print(f"[ERROR] Scan failed: {e}")
        finally:
            conn.close()

        if run_once:
            break
        time.sleep(poll_interval)


if __name__ == "__main__":
    main()
```

---

## Notification Schema

The file watcher stores notifications in `project.db → file_watcher_notifications`. The Orchestrator reads this table at the start of every interaction and surfaces unshown notifications.

```sql
CREATE TABLE IF NOT EXISTS file_watcher_notifications (
    id              INTEGER PRIMARY KEY,
    message         TEXT NOT NULL,
    doc_type        TEXT,
    filepath        TEXT,
    is_revision     BOOLEAN DEFAULT FALSE,
    existing_doc_id INTEGER,
    action_required BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    shown           BOOLEAN DEFAULT FALSE,
    shown_at        TIMESTAMP
);
```

**Orchestrator query at session start:**
```sql
SELECT id, message, doc_type, filepath, action_required
FROM file_watcher_notifications
WHERE shown = 0
ORDER BY created_at ASC;
```

**Mark as shown after surfacing:**
```sql
UPDATE file_watcher_notifications
SET shown = 1, shown_at = CURRENT_TIMESTAMP
WHERE id IN (?, ?, ...);
```

---

## Unified Indexing Pipeline (5 Steps)

### Step 1 — Register

Every new document is registered in SQLite before processing:

| Document type | Table | Key fields |
|---------------|-------|-----------|
| Report (PDF) | `reports` + `report_revisions` | filename, filepath, report_type, file_hash, revision |
| Specification (PDF) | `reports` + `report_revisions` | report_type = 'specification', trade_section_count |
| Drawing (DXF/DWG) | `drawings` + `revisions` | drawing_number, revision, layer_count |
| PDF drawing | `drawings` | drawing_number, revision, pdf_only = True |
| IFC model | `ifc_elements` (stub) | element counts |

### Step 2 — Classify

Document type inferred from (in priority order):
1. File extension — `.dxf`/`.dwg` → drawing (high confidence)
2. Filename keywords — "specification", "spec-" → specification
3. Folder location — `docs/feasibility/` → feasibility report
4. Filename drawing codes — "A201", "A-201", "Level-1-Plan" → drawing
5. If uncertain → `docs/inbound/`, ask user

### Step 3 — Process by Type

| Type | Script called | Output |
|------|--------------|--------|
| DXF drawing | `dxf-parser/extract_dxf.py` | Entities in SQLite (layers, text, dimensions, rooms) |
| PDF report | `report-indexer/pipeline.py` | Chunks in ChromaDB, registered in SQLite |
| Specification | `spec-indexer/index_spec.py` | Trade-section chunks in ChromaDB |
| PDF drawing | No extraction | Registered only — available for vision review |
| IFC model | (roadmap) | Not implemented in Phase 4 |
| Data (.xlsx) | No extraction | Registered only |

### Step 4 — Revision Handling

When a document is identified as a revision of an existing document:

```
1. Identify existing document by:
   a. Same file path (same filename saved over)
   b. Similar filename with different revision suffix

2. For reports/specs:
   - Mark previous report_revisions row: superseded = 1
   - Create new report_revisions row with next letter (A→B, B→C)
   - In ChromaDB: update previous chunk metadatas to superseded = True
   - New chunks indexed fresh with new rev_id

3. For drawings:
   - Previous revision retained under old revision_id
   - New revision row created
   - Run revision comparison (see below)

4. If pre-extraction existed:
   - Flag in project.db: re_extraction_required = True
   - Surface to user: "Rev B has been indexed. Previous extraction
     was for Rev A — would you like me to re-extract key facts?"
```

**Revision comparison for drawings:**
```python
# After extracting new DXF revision, compare entity counts:
# - Layer count change
# - New/removed layers
# - Room count change
# - Fire-rated wall layer change (flag immediately)
# - Total entity count delta
```

### Step 5 — Notify

Notifications are queued in `file_watcher_notifications` and surfaced by the Orchestrator on the user's next interaction.

---

## Notification Patterns

### Single new report:
```
📄 New file detected: geotech-report-rev-b.pdf → docs/feasibility/
   → Registered as Geotech Report, Rev B (supersedes Rev A)
   → 84 pages, 142 chunks indexed in ChromaDB
   → Classification: report (high confidence)

Would you like me to:
→ Extract key facts for quick reference? (recommended for geotech)
→ Route to the Feasibility Agent for review?
```

### Single new drawing:
```
📄 New drawing detected: A201-Level1-Plan-RevC.dxf → docs/design/
   → Registered as Drawing A201 Level 1 Floor Plan, Rev C (supersedes Rev B)
   → 847 entities extracted across 24 layers
   → 3 fire-rated wall layers identified
   → 18 rooms derived

Revision changes vs Rev B:
→ 2 new door openings on grid line D
→ Corridor width reduced from 1800mm to 1600mm at grid B-C
→ 1 fire-rated wall removed between grids 5-6

⚠ Fire-rated wall change detected — route to Design Agent for NCC review?
```

### New specification:
```
📄 New specification detected: specification-rev-d.pdf → docs/design/
   → Registered as Project Specification, Rev D (supersedes Rev C)
   → 412 pages, 87 trade sections, 1,847 chunks indexed

Notable: 87 sections in Rev D vs 86 in Rev C — one new section detected.
Would you like me to identify what changed between revisions?
```

### Multiple files at once:
```
📄 12 new files detected in docs/design/:

   Drawings (DXF): 8 files
   → A201–A208, all Rev C
   → 6,240 entities extracted across 8 drawings

   Reports (PDF): 3 files
   → Fire Engineering Report Rev B (48 pages, indexed)
   → Section J Assessment Rev A (32 pages, indexed)
   → Access Report Rev A (28 pages, indexed)

   Specification: 1 file
   → Project Specification Rev C (412 pages, 86 trade sections indexed)

   All registered in document register.
   Route to Design Agent for review?
```

### Unclassified file:
```
📄 Unclassified file detected: mystery-document.pdf → docs/inbound/
   → Registered and saved to docs/inbound/ pending classification
   → Classification confidence: low

What type of document is this? (geotech report / BCA assessment /
drawing / specification / tender / other)
```

### Fire-rated wall change (immediate escalation):
```
⚠ FIRE-RATED WALL CHANGE DETECTED — Drawing A201 Rev C

Layer FIRE-RATED-WALL shows 1 fewer wall segment vs Rev B.
This may affect NCC Section C compartmentation compliance.

Route to Design Agent for NCC review now?
```

---

## Orchestrator Integration

The Orchestrator checks for pending notifications **at the start of every user interaction**, before processing the user's request:

```python
# Pseudo-code in Orchestrator startup scan
pending = db.query("""
    SELECT id, message, doc_type, action_required
    FROM file_watcher_notifications
    WHERE shown = 0
    ORDER BY created_at ASC
""")

if pending:
    # Surface notifications first, then address user's request
    for notif in pending:
        display(notif.message)
        if notif.action_required:
            ask_user_for_classification(notif)
    
    mark_shown(pending)
```

If the user's current request relates to a newly indexed document, the Orchestrator connects them:
> "I've just indexed a new acoustic report (Rev 02, just detected in docs/design/). Your question about the council RFI concerns may be answered by that report — routing to Design Agent now."

---

## Auto-Filing Rules (Email Path)

When the Outlook integration (outlook-integration skill) auto-files attachments, the file watcher detects them and triggers the same pipeline. The classification from the email context takes priority over the watcher's filename-based classification.

| Email classification | Destination folder | File watcher result |
|---------------------|-------------------|---------------------|
| `geotech`, `contamination`, `environmental` | `docs/feasibility/` | Indexed as feasibility report |
| `acoustic`, `bca`, `fire`, `traffic`, `structural`, `civil` | `docs/design/` | Indexed as design report |
| `drawing` | `docs/design/` | Indexed as drawing (DXF) or drawing PDF |
| `specification` | `docs/design/` | Indexed by spec-indexer (trade sections) |
| `tender`, `cost_plan` | `docs/procurement/` | Indexed as procurement document |
| `superintendent`, `programme`, `insurance` | `docs/delivery/` | Indexed as delivery document |
| `unclassified` | `docs/inbound/` | Ask user |

---

## Running in Production

```bash
# Start watcher in background on project open
python system/skills/file-watcher/file_watcher.py >> logs/file_watcher.log 2>&1 &
echo $! > logs/file_watcher.pid

# Stop watcher
kill $(cat logs/file_watcher.pid)

# Check log
tail -50 logs/file_watcher.log

# One-time scan (e.g., after manually dropping files)
python system/skills/file-watcher/file_watcher.py --once
```
