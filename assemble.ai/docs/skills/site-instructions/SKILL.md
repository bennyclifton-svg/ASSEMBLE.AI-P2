---
name: site-instructions
tier: 3
description: Site instruction (SI) form template and issuance scaffold. Tier 3 stub for Phase 1 — template structure provided, full contract clause references to be loaded as reference material in Phase 4.
agent: correspondence
phase: 1-stub
---

# Skill: Site Instructions

**Tier 3 — Full skill with reference material.**

> **Phase 1 stub:** This skill contains the SI template and process. Full contract clause reference tables (AS 4000, AS 2124, AS 4902, ABIC) for superintendent authority to issue instructions will be added as Tier 3 reference files in Phase 4. Until then, the Correspondence Agent uses training knowledge for clause references and must flag the limitation clearly.

## When to Load This Skill

Load when the user or Delivery Agent asks to:
- Issue a site instruction to the contractor
- Give a formal instruction regarding works execution on site
- Direct the contractor to do, not do, or stop doing something on site

## What a Site Instruction Is

A Site Instruction (SI) is a formal instruction from the Superintendent to the Head Contractor regarding the execution of the Works on site. It has contractual weight. Under AS 4000 (clause 23), the Superintendent can give directions in writing during the contract.

Key characteristics:
- Issued by the Superintendent (or Superintendent's Representative)
- Directed to the Head Contractor
- Must state whether it constitutes a variation or not
- Numbered in the SI series (SI-001, SI-002, ...)
- Requires acknowledgement of receipt by contractor

## Site Instruction Form Template

```
[LETTERHEAD]
[Company Name]
[Address]
ABN: [ABN]
──────────────────────────────────────────────────────────────

SITE INSTRUCTION

SI No:          SI-[XXX]
Project:        [Project Name]
Contract:       [Contract reference number]
Date:           [DD Month YYYY]
To:             [Head Contractor — company name]
Attn:           [Site Manager / Superintendent's Rep / PM contact]
From:           [Superintendent name]
                Superintendent

INSTRUCTION:

[Numbered paragraphs — specific, unambiguous, measurable]

1.  [State the instruction. Reference specific location on site (gridline,
    level, area), drawing number, or specification clause if applicable.]

2.  [If multiple items, list each as a separate numbered instruction.]

3.  [If the instruction relates to rectification of defective work, state:
    "The work described in paragraph X does not comply with the Contract
    requirements. The Contractor is instructed to rectify this work in 
    accordance with the Contract. The cost of rectification is at the
    Contractor's risk unless the Contractor demonstrates otherwise."]

──────────────────────────────────────────────────────────────

CONTRACT AUTHORITY:
⚠ Phase 1 stub: Insert correct clause reference here.
Training knowledge basis: AS 4000 cl.23 / AS 2124 cl.23 / ABIC cl.[X]
[In Phase 4, the site-instructions skill will load the contract-specific 
clause table as reference material. Until then, verify the correct clause 
reference for the project's contract form.]

──────────────────────────────────────────────────────────────

VARIATION STATUS:
[Choose one:]
☐ This Site Instruction constitutes a variation to the Contract.
   The Contractor is directed to submit a quotation for the varied work
   within [X] business days in accordance with clause [XX].

☐ This Site Instruction does not constitute a variation to the Contract.
   This instruction is within the existing scope of the Works.

──────────────────────────────────────────────────────────────

Issued by: ________________________    Date: ________________
[Superintendent Name]
Superintendent

cc: [Principal / PM — for awareness]
    [file]

ACKNOWLEDGEMENT (to be signed and returned by Contractor):
Received by: ________________________    Date: ________________
```

## SI Numbering

SIs use the `SI-XXX` series:
```sql
SELECT COALESCE(MAX(CAST(SUBSTR(reference, 4) AS INTEGER)), 0) + 1
FROM correspondence_register
WHERE series = 'SI';
-- Format as SI-001, SI-002, etc.
```

## Issuing a Site Instruction

1. Draft the SI using the template above
2. **Flag to user:** "This is a Site Instruction — it has contractual weight. Please confirm the instruction text, variation status, and contract clause reference are correct before approving."
3. Present to user for approval
4. On approval:
   a. Save to `outputs/correspondence/SI-[XXX]-[date].docx`
   b. Log to `correspondence_register`:
      ```
      reference: 'SI-[XXX]', series: 'SI', type: 'site_instruction'
      to_name: [contractor], subject: 'SI-[XXX]: [brief instruction description]'
      contract_clause: '[clause number — from user or Delivery Agent]'
      requesting_agent: 'delivery' (or 'user')
      response_required: TRUE (contractor should acknowledge receipt)
      status: 'sent'
      ```
5. Log to `notices_directions` table (as a direction):
   ```sql
   INSERT INTO notices_directions (reference, date_issued, type, from_party, to_party, subject, contract_clause, status)
   VALUES ('SI-[XXX]', '[date]', 'site_instruction', 'Superintendent', '[Contractor]', '[subject]', '[clause]', 'issued');
   ```
6. Update PROJECT_MEMORY Activity Log:
   `[DATE] [CORRESPONDENCE] — SI-[XXX] issued to [contractor]. [Brief subject.] [Variation / Not variation.]`

## Phase 4 Enhancement

In Phase 4, this skill will be upgraded to full Tier 3 with contract-specific clause tables loaded as reference files:
- `contract-as4000-clauses.md` — AS 4000 superintendent authority clauses
- `contract-as2124-clauses.md` — AS 2124 architect/superintendent clauses
- `contract-as4902-clauses.md` — AS 4902 clauses
- `contract-abic-clauses.md` — ABIC contract clauses

Until then, always:
1. Check the contract form in `settings.json` (`project.contract_form`)
2. Note the clause is from training knowledge
3. Recommend the user verify the clause reference before issuing a contractual instruction
