---
name: drawing-compare
tier: 2
description: Drawing revision comparison — identifies what changed between two revisions of a drawing. Supports DXF geometric diff and PDF visual comparison. Design Agent uses within design-review-tracking workflow.
agent: design
---

# Skill: Drawing Comparison

**Tier 2 — Scaffold skill.** Provides the comparison methodology and output format for comparing drawing revisions. Design Agent applies when a new revision of an existing drawing is uploaded.

## When to Load This Skill

Load when:
- A new revision of an existing drawing is uploaded
- User asks "what changed in this revision?"
- Running design review and a prior revision exists
- Design Agent detects a new file in `docs/design/` that matches an existing drawing number

## Comparison Methods by Format

### DXF Comparison (preferred where available)

Load `dxf-parser` skill. Extract geometry from both revisions and compare:

```
DXF DIFF APPROACH:
1. Parse Rev A → extract layers, entities by layer (lines, arcs, polylines, text, dimensions)
2. Parse Rev B → same extraction
3. Compare layer by layer:
   - Entities in Rev A not in Rev B → REMOVED
   - Entities in Rev B not in Rev A → ADDED
   - Entities in both but different coordinates/text → MODIFIED
4. Summarise by layer (which maps to discipline/element type)
5. Flag any dimension changes — these are the most critical
```

Tolerance for "same entity": coordinates within 0.01m (allow for floating point rounding).

### PDF Comparison (fallback)

When only PDF is available:
- Review both PDFs visually (Claude vision)
- Look for revision clouds (standard drafting notation for changed areas)
- Read the revision note block (bottom-right corner of drawing)
- Identify text changes in annotation and labels
- Note any visible geometry changes

**Limitation statement for PDF-only comparison:** "This comparison is based on PDF drawings only. Geometric changes may not be precisely identifiable. Revision clouds and revision notes have been used as the primary indicator of change. Provide DXF files for a more reliable comparison."

#### PDF Preprocessing (required before vision comparison)

Apply to both revisions being compared:

1. **Resize** — Max 1500px on longest edge before sending to vision. Prevents 413 API errors.
2. **One page at a time** — Compare pages sequentially (Rev A page N vs Rev B page N). Record changes per page before moving to next. Do not hold both full revisions in context simultaneously.
3. **Revision clouds first** — On each page, locate and read revision clouds and the title block revision note before doing a full visual diff. This often identifies the changed area immediately, reducing the depth of review needed for unchanged pages.

---

## Step 1: Identify Revisions

```
REVISION COMPARISON SETUP
─────────────────────────────────────────────────────────
Drawing:         [Number] — [Title]
Prior revision:  Rev [A] — [date] — file: [path]
New revision:    Rev [B] — [date] — file: [path]
Format:          [DXF / PDF / Both]
Method:          [DXF diff / PDF visual / Revision cloud review]
─────────────────────────────────────────────────────────
```

Query prior revision from register:

```sql
SELECT drawing_number, title, revision, revision_date, file_path
FROM drawings
WHERE drawing_number = '[DA-A-001]'
ORDER BY revision;
```

---

## Step 2: Run Comparison

### For DXF:

```python
# Using dxf-parser skill — see dxf-parser/SKILL.md for full ezdxf approach

import ezdxf

def compare_dxf_revisions(file_a, file_b, tolerance=0.01):
    """Compare two DXF revisions. Returns dict of changes by layer."""
    doc_a = ezdxf.readfile(file_a)
    doc_b = ezdxf.readfile(file_b)
    
    msp_a = doc_a.modelspace()
    msp_b = doc_b.modelspace()
    
    # Extract entities by layer from each revision
    entities_a = extract_by_layer(msp_a)  # {layer: [entity_signatures]}
    entities_b = extract_by_layer(msp_b)
    
    changes = {}
    all_layers = set(entities_a.keys()) | set(entities_b.keys())
    
    for layer in all_layers:
        a_set = set(entities_a.get(layer, []))
        b_set = set(entities_b.get(layer, []))
        
        added = b_set - a_set
        removed = a_set - b_set
        
        if added or removed:
            changes[layer] = {
                'added': list(added),
                'removed': list(removed),
                'count_a': len(a_set),
                'count_b': len(b_set)
            }
    
    return changes
```

### For Text/Annotation Changes:

Extract and compare text entities — these capture dimension changes, label changes, and note changes:

```python
def extract_text_entities(msp):
    """Extract all TEXT and MTEXT entities with their content and position."""
    texts = []
    for entity in msp:
        if entity.dxftype() in ('TEXT', 'MTEXT'):
            texts.append({
                'content': entity.dxf.text,
                'insert': (round(entity.dxf.insert[0], 2), 
                           round(entity.dxf.insert[1], 2)),
                'layer': entity.dxf.layer
            })
    return texts
```

---

## Step 3: Comparison Output

```
DRAWING REVISION COMPARISON
─────────────────────────────────────────────────────────
Drawing:      [Number] — [Title]
Rev A:        [date]   Rev B: [date]
Method:       [DXF diff / PDF visual]
─────────────────────────────────────────────────────────

CHANGES IDENTIFIED:
─────────────────────────────────────────────────────────
Layer / Element   | Change Type | Description
─────────────────────────────────────────────────────────
[Layer name]      | ADDED       | [Description — e.g., "Balustrade line added to
                                  north elevation Level 3"]
[Layer name]      | REMOVED     | [Description — e.g., "Bay window removed from
                                  Units 301-303 east elevation"]
[Dimensions]      | MODIFIED    | [Description — e.g., "Overall width changed from
                                  18,600 to 18,450"]
[Annotations]     | MODIFIED    | [Description — e.g., "FSR calculation note updated:
                                  GFA 2,450m² → 2,380m²"]
─────────────────────────────────────────────────────────

REVISION NOTE (from drawing title block):
  Rev B: [Content of revision note as written on the drawing]
─────────────────────────────────────────────────────────

DESIGN IMPACT ASSESSMENT:
  Brief impact:     [Any change that affects brief compliance]
  Planning impact:  [Any change affecting planning controls — height, setbacks, GFA]
  NCC impact:       [Any change affecting NCC compliance — exits, accessibility]
  Cost impact:      [Any scope reduction/addition — flag to Finance Agent if significant]
  Coordination:     [Any change requiring other disciplines to update their drawings]
─────────────────────────────────────────────────────────

PRIOR ANNOTATIONS — STATUS CHECK:
  Annotation [ID] — [Category — PLANNING/BRIEF/etc.]:
    Issue: [Original annotation description]
    Status: [RESOLVED ✓ / PARTIALLY RESOLVED ⚠ / STILL OPEN ✗]
    Note: [How addressed in new revision, or why still open]
─────────────────────────────────────────────────────────

NEW ISSUES (arising from this revision):
  [Any new concerns introduced by the changes]
─────────────────────────────────────────────────────────

RECOMMENDATION:
  ☐ Acceptable — register new revision, close resolved annotations
  ☐ Minor follow-up required — [list]
  ☐ Further revision needed before issue — [list critical items]
─────────────────────────────────────────────────────────
```

---

## Step 4: Update Register

After comparison, update the document register:

```sql
-- Mark Rev A as superseded
UPDATE drawings
SET superseded = 1
WHERE drawing_number = '[DA-A-001]'
  AND revision = 'A';

-- Insert Rev B as current
INSERT INTO drawings (
  drawing_number, title, discipline, design_stage,
  current_revision, revision, revision_date,
  status, file_path, superseded
) VALUES (
  '[DA-A-001]', '[Title]', 'ARCHITECTURE', 'DD',
  'B', 'B', '[YYYY-MM-DD]',
  '[FOR REVIEW / DA ISSUE / FOR CONSTRUCTION]',
  'docs/design/[filename_revB]', 0
);

-- Update current_revision flag
UPDATE drawings
SET current_revision = 'B'
WHERE drawing_number = '[DA-A-001]';
```

Update resolved annotations:

```sql
UPDATE annotations
SET status = 'RESOLVED',
    resolved_date = '[YYYY-MM-DD]',
    resolution_note = 'Addressed in Rev B — [brief note]'
WHERE annotation_id = [id];
```

---

## Batch Comparison (Multiple Drawings)

When a consultant issues a full revision set:

```
BATCH COMPARISON — Revision Issue
─────────────────────────────────────────────────────────
Transmittal:   [TR-XXXX] received [date]
Drawings:      [X] drawings in this issue
─────────────────────────────────────────────────────────
Drawing No.    Prior Rev → New Rev   Changes
─────────────────────────────────────────────────────────
DA-A-001       B → C                [summary: minor — notation only]
DA-A-002       B → C                [summary: significant — unit mix change]
DA-A-003       A → B                [summary: major — layout revision Level 2]
DA-A-005       New drawing          [new drawing added this issue]
─────────────────────────────────────────────────────────
Significant changes requiring detailed review: DA-A-002, DA-A-003
Routine revisions: DA-A-001
→ Load design-review-tracking for DA-A-002 and DA-A-003
─────────────────────────────────────────────────────────
```

## Output

Comparison results are stored as annotations and added to the next design review. No separate output file required — embedded in design review output via `design-review-tracking` skill.
