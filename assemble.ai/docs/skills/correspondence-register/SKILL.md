---
name: correspondence-register
tier: 2
description: Correspondence register scaffold — numbering rules, register queries, status tracking, and register export. Provides the SQL patterns and display formats for managing both outbound and inbound registers.
agent: correspondence
---

# Skill: Correspondence Register

**Tier 2 — Scaffold skill.** Provides the register management patterns, numbering rules, status tracking, and export formats. Correspondence Agent applies to the project's `project.db`.

## When to Load This Skill

Load when the user asks to:
- Check correspondence register
- Find a specific piece of correspondence
- Export the register to Excel
- Report on outstanding/overdue items
- Understand correspondence numbering
- Query the inbound register

## Register Series (from settings.json)

```json
{
  "register": {
    "numbering": {
      "correspondence": "COR",
      "rfi": "RFI",
      "site_instruction": "SI",
      "transmittal": "TR",
      "inbound": "IN"
    }
  }
}
```

## Getting the Next Reference Number

```sql
-- Next COR number
SELECT 'COR-' || PRINTF('%03d', COALESCE(MAX(CAST(SUBSTR(reference, 5) AS INTEGER)), 0) + 1)
FROM correspondence_register WHERE series = 'COR';

-- Next RFI number
SELECT 'RFI-' || PRINTF('%03d', COALESCE(MAX(CAST(SUBSTR(reference, 5) AS INTEGER)), 0) + 1)
FROM correspondence_register WHERE series = 'RFI';

-- Next SI number
SELECT 'SI-' || PRINTF('%03d', COALESCE(MAX(CAST(SUBSTR(reference, 4) AS INTEGER)), 0) + 1)
FROM correspondence_register WHERE series = 'SI';

-- Next TR number
SELECT 'TR-' || PRINTF('%03d', COALESCE(MAX(CAST(SUBSTR(transmittal_number, 4) AS INTEGER)), 0) + 1)
FROM transmittals;

-- Next IN number
SELECT 'IN-' || PRINTF('%03d', COALESCE(MAX(CAST(SUBSTR(reference, 4) AS INTEGER)), 0) + 1)
FROM inbound_register;
```

## Register Queries

### Full outbound register
```sql
SELECT reference, date_sent, type, to_name, to_organisation, subject,
       response_required, response_due_date, response_received, status
FROM correspondence_register
ORDER BY series, CAST(SUBSTR(reference, INSTR(reference, '-') + 1) AS INTEGER);
```

### Outstanding / overdue items
```sql
SELECT reference, date_sent, to_name, subject, response_due_date,
       JULIANDAY('now') - JULIANDAY(response_due_date) as days_overdue
FROM correspondence_register
WHERE response_required = TRUE
  AND response_received = FALSE
  AND response_due_date IS NOT NULL
ORDER BY response_due_date;
```

### By type
```sql
SELECT reference, date_sent, to_name, subject, status
FROM correspondence_register
WHERE series = '[COR/RFI/SI/TR]'
ORDER BY date_sent DESC;
```

### Inbound register
```sql
SELECT reference, date_received, from_name, from_organisation, subject,
       classification, time_bar_date, status, routed_to
FROM inbound_register
ORDER BY date_received DESC;
```

### Correspondence thread (inbound linked to outbound)
```sql
SELECT 'INBOUND' as direction, i.reference, i.date_received as date,
       i.from_name as party, i.subject, i.classification as type
FROM inbound_register i WHERE i.reference = '[IN-XXX]'
UNION ALL
SELECT 'OUTBOUND' as direction, c.reference, c.date_sent,
       c.to_name, c.subject, c.type
FROM correspondence_register c
WHERE c.reference IN (SELECT response_ref FROM inbound_register WHERE reference = '[IN-XXX]')
ORDER BY date;
```

## Register Display Formats

### Outbound Register Summary
```
CORRESPONDENCE REGISTER — [Project Name]  |  As at [Date]
─────────────────────────────────────────────────────────────────────────────────────────────────
Ref      | Date     | Type     | To                       | Subject                  | Status
─────────────────────────────────────────────────────────────────────────────────────────────────
COR-001  | [date]   | email    | [recipient]              | [subject]                | Sent
COR-002  | [date]   | letter   | [recipient]              | [subject]                | Sent
RFI-001  | [date]   | rfi      | [recipient]              | [subject]                | ⚠ OVERDUE
RFI-002  | [date]   | rfi      | [recipient]              | [subject]                | Responded
SI-001   | [date]   | si       | [recipient]              | [subject]                | Acknowledged
TR-001   | [date]   | transmit | [recipient]              | [subject]                | Sent
─────────────────────────────────────────────────────────────────────────────────────────────────
Total: [X] | Outstanding responses: [X] | Overdue: [X]
```

### Outstanding Items Alert
```
OUTSTANDING CORRESPONDENCE — [Date]
─────────────────────────────────────────────────────────────────────
Ref     | To              | Subject            | Due      | Days Over
─────────────────────────────────────────────────────────────────────
RFI-002 | [recipient]     | [subject]          | [date]   | [X] days
COR-005 | [recipient]     | [subject]          | [date]   | [X] days
─────────────────────────────────────────────────────────────────────
```

## Register Maintenance

### Updating status
```sql
-- Mark as responded
UPDATE correspondence_register
SET response_received = TRUE, response_date = '[date]', status = 'responded'
WHERE reference = '[REF]';

-- Mark as closed (no response needed, or all resolved)
UPDATE correspondence_register
SET status = 'closed'
WHERE reference = '[REF]';
```

### Adding an inbound registration
```sql
INSERT INTO inbound_register
  (reference, date_received, from_name, from_organisation, from_email,
   subject, classification, time_bar_date, summary, routed_to, status)
VALUES
  ('IN-[XXX]', '[date]', '[name]', '[org]', '[email]',
   '[subject]', '[classification]', '[time_bar_date or NULL]',
   '[2-3 sentence summary]', '[agent]', 'received');
```

## Export to Excel

When the user requests a register export, generate an `.xlsx` file with two tabs:
1. **Outbound Register** — full correspondence_register table
2. **Inbound Register** — full inbound_register table
3. **Outstanding Items** — filtered view of items needing response

Save to: `outputs/reports/correspondence-register-[project]-[date].xlsx`
