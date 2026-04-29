---
name: document-register
tier: 2
description: Document register management — drawing register, report register, specification tracking, revision control, and supersession. Design Agent maintains via project.db document_register view.
agent: design
---

# Skill: Document Register

**Tier 2 — Scaffold skill.** Provides SQL patterns, display formats, and maintenance procedures for the document register. Design Agent uses this to maintain the full drawing and document register via `project.db`.

## When to Load This Skill

Load when the user asks for:
- Document register update or query
- "What revision is [drawing]?"
- "What drawings have been issued?"
- Drawing register or document list
- "Issue a transmittal for these drawings"
- Register of reports or specifications

## Data Model

The document register is maintained in the `drawings` and `transmittals` tables, surfaced via the `document_register` view. Check current schema:

```sql
-- Confirm view definition
SELECT sql FROM sqlite_master WHERE name = 'document_register';

-- Primary tables
SELECT * FROM drawings LIMIT 1;
SELECT * FROM transmittals LIMIT 1;
SELECT * FROM transmittal_items LIMIT 1;
```

## Drawing Numbering Convention

Drawings should follow a consistent numbering convention. Recommend:

```
[Discipline prefix]-[Type]-[Sequence]
Examples:
  A-SK-001      Architectural sketch 001
  DA-A-001      DA architectural drawing 001
  DA-S-001      DA structural drawing 001
  CD-A-001      Construction doc architectural drawing 001
  CD-S-001      Construction doc structural drawing 001

Discipline prefixes:
  A = Architecture
  S = Structural
  C = Civil
  M = Mechanical
  E = Electrical
  H = Hydraulic
  L = Landscape
  F = Fire
  SP = Specification
```

## Register Queries

### Current Register (all current-revision drawings)

```sql
SELECT 
  d.drawing_number,
  d.title,
  d.discipline,
  d.current_revision,
  d.revision_date,
  d.status,
  d.file_path
FROM drawings d
WHERE d.superseded = 0
ORDER BY d.discipline, d.drawing_number;
```

### Full Register with All Revisions

```sql
SELECT 
  d.drawing_number,
  d.title,
  d.discipline,
  d.revision,
  d.revision_date,
  d.status,
  d.issued_by_transmittal,
  CASE WHEN d.superseded = 1 THEN 'SUPERSEDED' ELSE 'CURRENT' END as currency
FROM drawings d
ORDER BY d.drawing_number, d.revision;
```

### Register by Stage

```sql
SELECT 
  d.drawing_number,
  d.title,
  d.discipline,
  d.current_revision,
  d.status
FROM drawings d
WHERE d.design_stage = '[CONCEPT / SCHEMATIC / DD / CONSTRUCTION]'
  AND d.superseded = 0
ORDER BY d.discipline, d.drawing_number;
```

### Drawings Not Yet Issued (status = DRAFT or INTERNAL REVIEW)

```sql
SELECT d.drawing_number, d.title, d.current_revision, d.status
FROM drawings d
WHERE d.status IN ('DRAFT', 'INTERNAL REVIEW')
  AND d.superseded = 0
ORDER BY d.discipline, d.drawing_number;
```

### Drawings Issued for DA

```sql
SELECT 
  d.drawing_number,
  d.title,
  d.discipline,
  d.current_revision,
  d.revision_date,
  t.transmittal_number,
  t.date_issued
FROM drawings d
LEFT JOIN transmittal_items ti ON ti.drawing_id = d.drawing_id
LEFT JOIN transmittals t ON t.transmittal_id = ti.transmittal_id
WHERE d.design_stage = 'DD'
  AND d.superseded = 0
ORDER BY d.discipline, d.drawing_number;
```

## Register Display Format

```
DRAWING REGISTER
Project: [Name]   Date: [DD Month YYYY]
─────────────────────────────────────────────────────────────────────────────
Drawing No.    Title                          Disc  Rev   Date      Status
─────────────────────────────────────────────────────────────────────────────
ARCHITECTURE
DA-A-001       Site Plan                      A     C     01/03/25  DA ISSUE
DA-A-002       Ground Floor Plan              A     C     01/03/25  DA ISSUE
DA-A-003       Level 1 Plan                   A     B     15/02/25  SUPERSEDED
DA-A-003       Level 1 Plan                   A     C     01/03/25  DA ISSUE
DA-A-004       Roof Plan                      A     A     01/02/25  DRAFT
─────────────────────────────────────────────────────────────────────────────
STRUCTURAL
DA-S-001       Structural Notes               S     A     01/03/25  DA ISSUE
─────────────────────────────────────────────────────────────────────────────
Total current drawings: [X] | Superseded: [X] | Drafted not issued: [X]
─────────────────────────────────────────────────────────────────────────────
```

## Adding a New Drawing

```sql
INSERT INTO drawings (
  drawing_number, title, discipline, design_stage,
  current_revision, revision, revision_date, 
  status, file_path, superseded
) VALUES (
  '[DA-A-001]', '[Site Plan]', 'ARCHITECTURE', 'DD',
  'A', 'A', '[YYYY-MM-DD]',
  'DRAFT', 'docs/design/[filename]', 0
);
```

## Recording a New Revision

```sql
-- Mark prior revision as superseded
UPDATE drawings
SET superseded = 1
WHERE drawing_number = '[DA-A-001]'
  AND revision = '[A]';

-- Insert new revision
INSERT INTO drawings (
  drawing_number, title, discipline, design_stage,
  current_revision, revision, revision_date,
  status, file_path, superseded
) VALUES (
  '[DA-A-001]', '[Site Plan]', 'ARCHITECTURE', 'DD',
  'B', 'B', '[YYYY-MM-DD]',
  'DRAFT', 'docs/design/[filename_rev_B]', 0
);

-- Update current_revision on all drawing records for this number
UPDATE drawings
SET current_revision = 'B'
WHERE drawing_number = '[DA-A-001]';
```

## Preparing a Document Schedule for Transmittal

When preparing a transmittal, pull the current-revision drawings to include:

```sql
-- Pull drawings for a transmittal
SELECT 
  d.drawing_number,
  d.title,
  d.discipline,
  d.current_revision,
  d.revision_date,
  d.status
FROM drawings d
WHERE d.drawing_number IN ('[DA-A-001]', '[DA-A-002]', '[DA-S-001]')
  AND d.superseded = 0
ORDER BY d.discipline, d.drawing_number;
```

Then issue via Correspondence Agent (`transmittals` skill). The transmittal registers the issue and records `issued_by_transmittal` on each drawing.

```sql
-- After transmittal is issued, link drawings to it
UPDATE drawings
SET issued_by_transmittal = '[TR-XXXX]',
    status = '[DA ISSUE / FOR CONSTRUCTION / FOR REVIEW]'
WHERE drawing_number IN ('[DA-A-001]', '[DA-A-002]', '[DA-S-001]')
  AND superseded = 0;
```

## Report Register

Track reports and documents (not drawings) separately:

```sql
-- Query reports register
SELECT 
  doc_number, title, document_type, author,
  version, date, status, file_path
FROM correspondence_register
WHERE document_type IN ('REPORT', 'SPECIFICATION', 'CERTIFICATE', 'ASSESSMENT')
ORDER BY document_type, date DESC;
```

Report status values: `DRAFT`, `FOR REVIEW`, `FINAL`, `SUPERSEDED`

Report types to track:
- Environmental reports (contamination PSI, acoustic, traffic)
- Heritage assessment
- BASIX certificate
- BCA assessment
- Geotechnical report
- Access report
- Town planning report (SEE)
- Specification sections

## Specification Register

Track specification sections as documents:

```
SPECIFICATION REGISTER
─────────────────────────────────────────────────────────
Section   Title                          Rev  Date      Status
─────────────────────────────────────────────────────────
01        General Requirements           A    [date]    DRAFT
02        Site Work                      A    [date]    FOR REVIEW
03        Concrete                       —    —         NOT COMMENCED
04        Masonry                        —    —         NOT COMMENCED
[etc.]
─────────────────────────────────────────────────────────
```

## Register Maintenance

Perform the following at each design milestone:

```
REGISTER MAINTENANCE CHECKLIST
─────────────────────────────────────────────────────────
☐ All drawings from consultants have been added to register
☐ Revisions recorded — prior revisions marked as superseded
☐ Transmittals issued — drawings linked to transmittals
☐ Status codes current (DRAFT / FOR REVIEW / FOR CONSTRUCTION / etc.)
☐ File paths valid — files in correct location in docs/design/
☐ Reports register updated with any new consultant reports
☐ Specification sections tracked
─────────────────────────────────────────────────────────
```

## Output

- Drawing register: `outputs/trackers/drawing-register-[project]-[date].xlsx`
  (Export from `document_register` view with openpyxl)
- Transmittals: issued via Correspondence Agent (`transmittals` skill)
