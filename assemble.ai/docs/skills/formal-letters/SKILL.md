---
name: formal-letters
tier: 2
description: Formal letter scaffold with letterhead template, numbered paragraph structure, and signature block. Used for superintendent's directions, contractual notices, formal instructions, and council submissions.
agent: correspondence
---

# Skill: Formal Letters

**Tier 2 — Scaffold skill.** Provides the formal letter template structure, letterhead configuration, and formal correspondence conventions. Correspondence Agent applies to the specific content.

## When to Load This Skill

Load when the user or a requesting agent asks for:
- Formal letter (any type requiring project letterhead)
- Superintendent's direction or formal instruction
- Contractual notice
- Council submission or formal application
- Any correspondence requiring numbered paragraphs and a formal signature block

## Letterhead Configuration

Pull letterhead details from `settings.json`:
```json
{
  "letterhead": {
    "company_name": "[from settings]",
    "address": "[from settings]",
    "abn": "[from settings]",
    "logo_path": "assets/logo.png",
    "phone": "[from settings]",
    "email": "[from settings]"
  }
}
```

If letterhead fields are not yet configured (empty strings), note in the draft: "[LETTERHEAD: Configure in settings.json before sending]"

## Formal Letter Template

```
[LETTERHEAD]
[Company Name]
[Address]
ABN: [ABN]
Phone: [Phone]  |  Email: [Email]
──────────────────────────────────────────────────────

[Date: DD Month YYYY]
[Reference: COR-XXX]

[Recipient Name]
[Recipient Title]
[Company / Organisation]
[Address]

Dear [Mr/Ms Last Name],

Re: [Project Name]
    [Contract reference if applicable]
    [Subject — concise and specific]

[Body — numbered paragraphs for all formal/contractual letters]

1.  [Opening paragraph — state the purpose]

2.  [Context / background — factual, specific dates and references]

3.  [Main content — clear, unambiguous, measurable where required]

4.  [Action required from recipient — specific with timeframe]

5.  [Consequences of non-compliance, if applicable under the contract — 
    factual statement of contract provisions, not threats]

[Closing: use "Yours faithfully" for unknown recipients or formal contexts;
"Yours sincerely" where you have an established relationship]

Yours faithfully,


[PM / Superintendent Name]
[Title]
[Company]

cc: [distribution list — e.g., Principal, legal counsel, file]
enc: [list of enclosures, if any]
```

## Specific Letter Types

### Superintendent's Direction

Use the following structure when issuing a direction under the contract:

```
Pursuant to clause [XX] of the [AS4000 / AS2124 / AS4902 / ABIC] Contract,
the Superintendent hereby directs [the Contractor] to:

1.  [Specific direction — clear, unambiguous, measurable, with location/drawing references]

2.  [Additional directions if applicable]

[Variation statement — choose one:]
Option A (variation): "This direction constitutes a variation to the Contract.
The Contractor is directed to provide a quotation for the varied work within
[X] business days in accordance with clause [XX]."

Option B (not a variation): "For the avoidance of doubt, this direction does
not constitute a variation to the Contract and is within the existing scope
of the Works."

Please acknowledge receipt of this direction in writing within [X] business days.
```

### Contractual Notice (Show Cause, Time Bar, etc.)

```
CONTRACTUAL NOTICE

Pursuant to clause [XX] of the Contract, [the Superintendent / the Principal]
hereby gives notice that:

1.  [State the specific grounds and facts — clause number, breach or event, dates]

2.  [State the required response or action, including timeframe specified in the clause]

3.  [State the consequences of non-compliance as provided in the contract]

⚠ TIME-BAR NOTE: [If this notice has a response deadline — flag to user before sending]
"This notice requires a response within [X days] of [receipt / date] under clause [XX].
Response deadline: [calculated date]. Please review and approve promptly."
```

## Reference Numbering

All formal letters use the `COR-XXX` series unless the content is an RFI (RFI-XXX), SI (SI-XXX), or Transmittal (TR-XXX).

Query the `correspondence_register` table to get the next available reference number:
```sql
SELECT COALESCE(MAX(CAST(SUBSTR(reference, 5) AS INTEGER)), 0) + 1
FROM correspondence_register
WHERE series = 'COR';
-- Format result as 'COR-' + zero-padded 3 digits: COR-001, COR-002, etc.
```

## Output

Save the approved letter as:
- Draft: present as markdown for review
- Final: `outputs/correspondence/COR-[XXX]-[recipient-abbreviated]-[date].docx` (and .pdf)

Log to `correspondence_register`:
- reference, series, date_sent, type ('letter'), to_name, to_organisation, to_email, subject, contract_clause (if applicable), requesting_agent, response_required, response_due_date
