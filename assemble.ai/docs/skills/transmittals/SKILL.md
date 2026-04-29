---
name: transmittals
tier: 2
description: Transmittal form template and document schedule. Queries the document_register view in project.db to build the document schedule. Issues transmittals with a structured form and logs to the correspondence register.
agent: correspondence
---

# Skill: Transmittals

**Tier 2 — Scaffold skill.** Provides the transmittal form template and document schedule generation. Correspondence Agent queries the document register to build the schedule rather than manually listing documents.

## When to Load This Skill

Load when the user or a requesting agent asks to:
- Issue drawings, reports, or specifications to a recipient
- Formally transmit documents to the contractor, consultants, or council
- Record the issue of a document set
- Check what has been transmitted and when

## Transmittal Form Template

```
TRANSMITTAL
══════════════════════════════════════════════════════════
Transmittal No:  TR-[XXX]
Project:         [Project Name]
Date:            [DD Month YYYY]
To:              [Recipient name and organisation]
Attn:            [Contact name]
From:            [PM / Company]
Purpose:         [For Information / For Coordination / For Tender / For Construction / As-Built / For Approval]
══════════════════════════════════════════════════════════

DOCUMENT SCHEDULE:

| No  | Doc Number      | Title                          | Rev | Format      | Copies |
|-----|-----------------|--------------------------------|-----|-------------|--------|
| 1   | [doc number]    | [title]                        | [X] | [Electronic]| 1      |
| 2   | [doc number]    | [title]                        | [X] | [Electronic]| 1      |
| ... |                 |                                |     |             |        |

Total documents transmitted: [X]

══════════════════════════════════════════════════════════

NOTES:
[Any special instructions, conditions of use, or comments]

[Standard footer if applicable:]
"These documents supersede any previous issues of the same documents. 
Recipients should confirm they are working from the current revision."

[If For Construction:] "These documents are issued for construction. 
Do not use for construction any document not bearing this status."

Transmitted by: ________________________    Date: ________________
══════════════════════════════════════════════════════════
```

## Building the Document Schedule

When the user specifies which documents to transmit, query the `document_register` view in `project.db` to get current revision and status:

```sql
-- Get all documents of a specific type/status for transmittal
SELECT doc_number, title, discipline, revision, status, format_notes
FROM document_register
WHERE doc_type = 'drawing'
  AND status = 'for_construction'  -- or as requested
ORDER BY doc_number;

-- Or get specific documents by number
SELECT doc_number, title, revision, status
FROM document_register
WHERE doc_number IN ('A201', 'A202', 'S101')
ORDER BY doc_number;
```

If documents are not in the register, ask the user to provide the document details and add them to the register first.

## Transmittal Numbering

Transmittals use the `TR-XXX` series:
```sql
SELECT COALESCE(MAX(CAST(SUBSTR(transmittal_number, 4) AS INTEGER)), 0) + 1
FROM transmittals;
-- Format as TR-001, TR-002, etc.
```

## Issuing a Transmittal

1. Build the document schedule from the register (or user input)
2. Draft the transmittal form
3. Present to user for approval
4. On approval:
   a. Save to `outputs/correspondence/TR-[XXX]-[recipient]-[date].docx`
   b. Log to `transmittals` table:
      ```sql
      INSERT INTO transmittals (transmittal_number, sent_to, sent_by, sent_date, purpose, notes)
      VALUES ('TR-[XXX]', '[recipient]', '[PM name]', '[date]', '[purpose]', '[notes]');
      ```
   c. Log each document to `transmittal_items` table:
      ```sql
      INSERT INTO transmittal_items (transmittal_id, document_type, document_id, revision, copies, format)
      VALUES ([transmittal_id], '[drawing/report/specification]', [doc_id], '[rev]', 1, 'electronic');
      ```
   d. Log to `correspondence_register`:
      ```
      reference: 'TR-[XXX]', series: 'TR', type: 'transmittal'
      to_name: [recipient], subject: 'TR-[XXX]: [brief description of documents transmitted]'
      response_required: FALSE, status: 'sent'
      ```
5. Update PROJECT_MEMORY Activity Log if the transmittal is significant:
   `[DATE] [CORRESPONDENCE] — TR-[XXX] issued to [recipient]. [X] documents transmitted [for construction/tender/etc.]`

## Transmittal Register (status check)

```sql
SELECT t.transmittal_number, t.sent_to, t.sent_date, t.purpose,
       COUNT(ti.id) as doc_count
FROM transmittals t
LEFT JOIN transmittal_items ti ON ti.transmittal_id = t.id
GROUP BY t.id
ORDER BY t.transmittal_number;
```

## Output Files

- Issued transmittals: `outputs/correspondence/TR-[XXX]-[recipient-abbreviated]-[date].docx`
- Transmittal register export: `outputs/reports/transmittal-register-[project]-[date].xlsx`
