---
name: design-review-tracking
tier: 2
description: Design review scaffold — checks drawings against brief, budget, planning controls, NCC, coordination, and buildability. Tracks comments as annotations in project.db. Design Agent applies within this structure.
agent: design
---

# Skill: Design Review & Tracking

**Tier 2 — Scaffold skill.** Provides the design review checklist, comment format, annotation tracking, and revision comparison workflow. Design Agent applies review criteria to uploaded drawings and documents.

## When to Load This Skill

Load when the user asks for:
- Drawing review or design review
- "Review this drawing" / "Check this against the brief"
- Design comment register
- Revision comparison
- "What changed between Rev A and Rev B?"
- Design quality check

## Step 1: Review Trigger Checklist

Before starting a review, confirm:

```
REVIEW SETUP
─────────────────────────────────────────────────────────
Drawing/document:   [File name and path]
Drawing number:     [e.g., A-SK-001 or DA-A-001]
Revision:           [Rev A / B / C / etc.]
Date on drawing:    [DD Month YYYY]
Format available:   [DXF / IFC / PDF]
Confidence level:   [Based on format — see drawing intelligence note below]
Design stage:       [Concept / Schematic / DD / Construction Docs]
Prior revision:     [Rev [X] available for comparison: YES / NO]
─────────────────────────────────────────────────────────
```

### Drawing Intelligence Note

State confidence level based on available format:
- **DXF** — Medium-high confidence. Geometric analysis, layer-based review, dimension measurement possible. Load `dxf-parser` skill.
- **IFC** — High confidence. Full semantic properties. Load `ifc-parser` skill (Phase 4).
- **PDF only** — Low-medium confidence. Text annotations and general layout only. Cannot verify dimensions. State: *"This review is based on PDF drawings only. Measurements cannot be verified. Consider providing DXF for a more thorough review."*

#### PDF Preprocessing (required before vision review)

Before passing any PDF page to vision:

1. **Resize** — Max 1500px on longest edge (use PIL `img.thumbnail((1500, 1500))`). Prevents 413 API errors.
2. **One page at a time** — Review each page sequentially. Summarise findings (≤200 words) before loading the next page. Do not accumulate raw page content in context.
3. **Prioritise pages** — For large drawing sets, scan title blocks first to identify relevant pages (floor plans, sections, key elevations). Skip covers and spec pages unless asked.

---

## Step 2: Design Review

Work through all applicable criteria. Not all criteria apply at every stage — use judgement.

```
DESIGN REVIEW
─────────────────────────────────────────────────────────
Project:       [Name]
Drawing:       [Number] — [Title]
Revision:      [Rev X]
Date on dwg:   [DD Month YYYY]
Reviewed:      [DD Month YYYY]
Stage:         [Concept / Schematic / DD / Construction Docs]
Format:        [DXF / PDF / IFC] — [confidence level]
─────────────────────────────────────────────────────────

1. BRIEF COMPLIANCE
   ─────────────────────────────────────────────────────
   Target GFA:   [brief says Xm² — drawing shows ~Xm²] [✓ / ⚠ / ✗]
   Unit mix:     [brief says X/Y/Z — drawing shows X/Y/Z] [✓ / ⚠ / ✗]
   Unit sizes:   [brief says avg Xm² — drawing average ~Xm²] [✓ / ⚠ / ✗]
   Car parking:  [brief says X — drawing shows X] [✓ / ⚠ / ✗]
   Open space:   [brief says Xm² communal — drawing shows Xm²] [✓ / ⚠ / ✗]
   Deep soil:    [brief says Xm² — drawing shows Xm²] [✓ / ⚠ / ✗]
   Special req:  [rooftop terrace / ground floor retail / etc.] [✓ / ⚠ / ✗]
   
   Brief compliance issues:
   [List each non-compliance or concern with brief reference]

2. PLANNING COMPLIANCE
   ─────────────────────────────────────────────────────
   Height:       [LEP says Xm — drawing shows Xm RL / X storeys] [✓ / ⚠ / ✗]
   FSR/GFA:      [LEP max Xm² — drawing shows ~Xm²] [✓ / ⚠ / ✗]
   Front setback:[DCP says Xm — drawing shows Xm] [✓ / ⚠ / ✗]
   Side setbacks:[DCP says Xm — drawing shows Xm] [✓ / ⚠ / ✗]
   Rear setback: [DCP says Xm — drawing shows Xm] [✓ / ⚠ / ✗]
   Solar access: [ADG/DCP standard — [compliant / flag for assessment]] [✓ / ⚠ / ✗]
   Deep soil:    [DCP min X% = Xm² — drawing shows Xm²] [✓ / ⚠ / ✗]
   Heritage:     [If heritage-affected — compliance with heritage controls] [✓ / ⚠ / ✗]
   
   Planning compliance issues:
   [List each non-compliance with specific control reference and measured value]

3. NCC PRELIMINARY COMPLIANCE
   ─────────────────────────────────────────────────────
   Note: This is a preliminary review only. Not a substitute for formal BCA assessment.
   
   Classification:   [Confirm building classification — Class X]
   Exit travel dist: [Max Xm — design appears [compliant / non-compliant]] [✓ / ⚠ / ✗]
   Fire stairs:      [Number and position adequate for floor plate] [✓ / ⚠ / ✗]
   Accessible units: [X required per AS 1428 — drawing shows X] [✓ / ⚠ / ✗]
   Lift provision:   [Required above X storeys — drawing shows X lifts] [✓ / ⚠ / ✗]
   Natural light:    [Habitable rooms — preliminary check] [✓ / ⚠ / ✗]
   Natural vent:     [Cross-ventilation — preliminary check] [✓ / ⚠ / ✗]
   
   NCC issues (preliminary):
   [List each issue with NCC section reference — flag that formal BCA assessment required]

4. COORDINATION
   ─────────────────────────────────────────────────────
   Structural grid:     [Columns/walls align with architectural? — if structural available] [✓ / ⚠ / ✗]
   Services zones:      [Plant room, risers, ceiling zones adequate?] [✓ / ⚠ / ✗]
   Façade/structure:    [Structural elements don't conflict with façade design?] [✓ / ⚠ / ✗]
   Civil/drainage:      [Site drainage coordinated with ground-level design?] [✓ / ⚠ / ✗]
   Landscape:           [Ground-level design coordinated with landscape?] [✓ / ⚠ / ✗]
   
   Coordination issues:
   [List cross-discipline conflicts — name the two disciplines, describe the conflict]

5. BUILDABILITY
   ─────────────────────────────────────────────────────
   Complex geometry:    [Any geometry that creates construction difficulty?] [✓ / ⚠ / ✗]
   Difficult details:   [Junctions, interfaces requiring non-standard construction?] [✓ / ⚠ / ✗]
   Sequencing:          [Any aspects that create logical sequencing problems?] [✓ / ⚠ / ✗]
   Access/craneage:     [Site constraints likely to affect construction methodology?] [✓ / ⚠ / ✗]
   
   Buildability issues:
   [List each concern with explanation]

6. STAGE COMPLETENESS
   ─────────────────────────────────────────────────────
   Are all drawings expected at this stage present?
   Required at [Stage]:  [List expected drawings for this stage]
   Received:             [List what's been received]
   Outstanding:          [List what's missing]
─────────────────────────────────────────────────────────

OVERALL STATUS: [PROCEED / PROCEED WITH COMMENTS / HOLD PENDING RESOLUTION]

CRITICAL ISSUES (must resolve before proceeding):
  [List any RED items — potential deal-breakers or serious non-compliance]

COMMENTS FOR CONSULTANT:
  [List amber items to be addressed in next revision]

→ Would you like me to issue these comments to [consultant]?
  (via Correspondence Agent — RFI or formal design review comment)
─────────────────────────────────────────────────────────
```

---

## Step 3: Store Annotations

After completing a review, store each comment as an annotation in `project.db`:

```sql
-- Insert design review annotation
INSERT INTO annotations (
  drawing_id, revision, annotation_type, category,
  description, status, created_date
) VALUES (
  [drawing_id],     -- from drawings table
  '[Rev X]',
  'DESIGN_REVIEW',
  '[BRIEF / PLANNING / NCC / COORDINATION / BUILDABILITY]',
  '[Description of issue, with reference to brief/control/code section]',
  'OPEN',
  '[YYYY-MM-DD]'
);

-- Query open annotations for a drawing
SELECT a.annotation_id, a.category, a.description, a.status
FROM annotations a
WHERE a.drawing_id = [id]
  AND a.status = 'OPEN'
ORDER BY a.category, a.annotation_id;

-- Mark annotation as resolved
UPDATE annotations
SET status = 'RESOLVED',
    resolved_date = '[YYYY-MM-DD]',
    resolution_note = '[How it was resolved]'
WHERE annotation_id = [id];
```

---

## Step 4: Revision Comparison

When a new revision of an existing drawing is uploaded:

1. Load `drawing-compare` skill for format-specific comparison
2. Identify what changed between revisions
3. Assess whether prior open annotations have been addressed
4. Identify any new issues introduced

```
REVISION COMPARISON
─────────────────────────────────────────────────────────
Drawing:      [Number] — [Title]
Prior rev:    [Rev A]
New rev:      [Rev B]
Comparison:   [DXF diff / PDF visual comparison]
─────────────────────────────────────────────────────────
CHANGES IDENTIFIED:
  1. [What changed — area, location, dimension, configuration]
  2. [What changed]
  3. [What changed]

PRIOR ANNOTATIONS — STATUS CHECK:
  Annotation [ID] — [Category]: [was: issue description]
    → [RESOLVED / PARTIALLY RESOLVED / STILL OPEN / NEW ISSUE INTRODUCED]

NEW ISSUES (if any):
  [New issues arising from this revision]
─────────────────────────────────────────────────────────
```

---

## Design Comment Register Query

Run periodically to track outstanding design comments:

```sql
-- All open design review comments
SELECT 
  a.annotation_id,
  d.drawing_number,
  d.title,
  a.revision,
  a.category,
  a.description,
  a.created_date
FROM annotations a
JOIN drawings d ON d.drawing_id = a.drawing_id
WHERE a.annotation_type = 'DESIGN_REVIEW'
  AND a.status = 'OPEN'
ORDER BY a.category, a.created_date;

-- Comment count by category
SELECT a.category, COUNT(*) as open_count
FROM annotations a
WHERE a.annotation_type = 'DESIGN_REVIEW'
  AND a.status = 'OPEN'
GROUP BY a.category;
```

---

## Stage Gate Review

Before each sub-phase gate, run a consolidated design review:

```
SUB-PHASE GATE REVIEW — [Concept → Schematic / Schematic → DD / etc.]
─────────────────────────────────────────────────────────
All drawings at this stage reviewed:   [YES / PARTIALLY — list outstanding]
Open critical annotations:             [X] — [list]
Open non-critical annotations:         [X] — [acceptable to proceed / should resolve]
Brief compliance:                      [FULL / PARTIAL — detail]
Planning compliance:                   [FULL / PARTIAL — detail]
Cost plan alignment:                   [From Finance Agent]
Programme alignment:                   [From Program Agent]

GATE ASSESSMENT:
  ☐ GATE CLEAR — proceed to next stage
  ☐ GATE CONDITIONAL — proceed with [X] critical items to resolve within [Y] days
  ☐ GATE HOLD — resolve [specific issues] before proceeding
─────────────────────────────────────────────────────────
```

## Output

- Design review comments: stored as annotations in `project.db`
- Design review summary: issued via Correspondence Agent (RFI or design review comment letter)
- Gate review: `outputs/reports/gate-review-[stage]-[date].md`
