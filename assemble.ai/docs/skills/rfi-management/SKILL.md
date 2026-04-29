---
name: rfi-management
tier: 2
description: RFI (Request for Information) form template, numbering, issuance, tracking, and response matching. Scaffold for structured design or construction RFIs with numbered register and response tracking.
agent: correspondence
---

# Skill: RFI Management

**Tier 2 — Scaffold skill.** Provides the RFI form template, numbering system, and response tracking process. Correspondence Agent applies to the specific query.

## When to Load This Skill

Load when the user or a requesting agent asks to:
- Raise an RFI to a consultant or contractor
- Issue a request for information or clarification
- Check the status of outstanding RFIs
- Record an RFI response
- Export the RFI register

## RFI Form Template

```
REQUEST FOR INFORMATION
══════════════════════════════════════════════════════════
RFI No:         RFI-[XXX]
Project:        [Project Name]
Contract:       [Contract reference — if construction phase]
Date:           [DD Month YYYY]
To:             [Recipient name and organisation]
From:           [PM / Superintendent name]
Discipline:     [Architectural / Structural / Mechanical / Hydraulic / Electrical / Civil / Other]
Drawing Ref:    [Drawing number and revision — if applicable]
Spec Ref:       [Specification section and clause — if applicable]
Response By:    [DD Month YYYY — typically 5-10 business days]
Priority:       [Routine / Urgent — state reason if urgent]
══════════════════════════════════════════════════════════

QUERY:

[State the question clearly and specifically. Reference the exact drawing number,
revision, gridline, level, detail number, or specification clause being queried.
Avoid ambiguous language.]

[If the query relates to a clash or conflict between documents, state both 
references and describe the conflict.]

[Attach or reference any markup drawings, sketches, or photographs that clarify
the query.]

══════════════════════════════════════════════════════════

RESPONSE:

[Left blank — to be completed by recipient]




Responded by: ________________________    Date: ________________

[If the response constitutes a design change or variation, the responding party
should note this clearly and the Superintendent will assess accordingly.]
══════════════════════════════════════════════════════════
```

## RFI Numbering

RFIs use the `RFI-XXX` series. Query the next number:
```sql
SELECT COALESCE(MAX(CAST(SUBSTR(reference, 5) AS INTEGER)), 0) + 1
FROM correspondence_register
WHERE series = 'RFI';
-- Format as RFI-001, RFI-002, etc.
```

## Issuing an RFI

1. Draft the RFI form using the template above
2. Assign the next RFI number
3. Present to user for approval
4. On approval: save to `outputs/correspondence/RFI-[XXX]-[recipient]-[date].docx`
5. Log to `correspondence_register`:
   ```
   reference:         'RFI-XXX'
   series:            'RFI'
   date_sent:         [date]
   type:              'rfi'
   to_name:           [recipient]
   to_organisation:   [org]
   to_email:          [email]
   subject:           'RFI-[XXX]: [brief description of query]'
   requesting_agent:  [agent that triggered the RFI, or 'user']
   response_required: TRUE
   response_due_date: [response by date]
   status:            'sent'
   ```
6. Update PROJECT_MEMORY Activity Log:
   `[DATE] [CORRESPONDENCE] — RFI-[XXX] issued to [recipient] re: [brief subject]. Response due [date].`

## RFI Register (status check)

When the user asks for RFI status:

```sql
SELECT reference, to_name, subject, date_sent, response_due_date,
       response_received, response_date, status
FROM correspondence_register
WHERE series = 'RFI'
ORDER BY CAST(SUBSTR(reference, 5) AS INTEGER);
```

Present as a clear table:

```
RFI REGISTER — [Project Name]  |  As at [Date]
─────────────────────────────────────────────────────────────────────────────────────────
RFI No   | To               | Subject              | Issued   | Due     | Status
─────────────────────────────────────────────────────────────────────────────────────────
RFI-001  | [recipient]      | [subject]            | [date]   | [date]  | RESPONDED [date]
RFI-002  | [recipient]      | [subject]            | [date]   | [date]  | ⚠ OVERDUE
RFI-003  | [recipient]      | [subject]            | [date]   | [date]  | OUTSTANDING
─────────────────────────────────────────────────────────────────────────────────────────
Total: [X]  |  Responded: [X]  |  Outstanding: [X]  |  Overdue: [X]
```

## Recording an RFI Response

When the user provides an RFI response:
1. Update `correspondence_register`:
   ```sql
   UPDATE correspondence_register
   SET response_received = TRUE, response_date = '[date]', status = 'responded'
   WHERE reference = 'RFI-[XXX]';
   ```
2. Save the response to `outputs/correspondence/RFI-[XXX]-RESPONSE-[date].pdf` (or user-provided file)
3. Notify the requesting agent: "RFI-[XXX] response received from [recipient] on [date]. [Brief summary of response.]"
4. If the response indicates a design change or variation: flag to the relevant agent (Design Agent or Delivery Agent)

## Overdue RFI Handling

If an RFI is past its response due date and no response has been received:
- Flag to the user: "RFI-[XXX] response from [recipient] is overdue by [X days]. Last due: [date]."
- Offer to draft a follow-up / reminder email
- If the overdue RFI is blocking construction activities, flag urgency to the Orchestrator

## Output Files

- Issued RFIs: `outputs/correspondence/RFI-[XXX]-[recipient-abbreviated]-[date].docx`
- RFI register export: `outputs/reports/rfi-register-[project]-[date].xlsx`
