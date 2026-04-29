---
name: email-drafting
tier: 1
description: Tier 1 skill — professional email drafting from a content brief. Correspondence Agent uses general knowledge to write professional construction emails. No scaffold required.
agent: correspondence
---

# Skill: Email Drafting

**Tier 1 — No scaffold required.** The Correspondence Agent drafts professional emails from a content brief using its training knowledge. This skill is a reference document, not a loaded scaffold.

## When This Skill Applies

- Drafting day-to-day emails to consultants, contractor, council, stakeholders
- Following up on an RFI, action, or previous correspondence
- Sending information or forwarding a document informally
- Any email that does not require a formal letterhead

## What the Correspondence Agent Does

1. **Identify** the recipient from the contact directory (or ask user for details)
2. **Understand** the content brief — what needs to be communicated, any action required
3. **Draft** in professional construction email format
4. **Present** to user for approval before sending

## Email Format

```
TO:      [recipient email]
CC:      [cc list — from distribution list or user instruction]
FROM:    [PM email — from settings.json letterhead.email]
SUBJECT: [Project Name] — [Concise subject]

Dear [First name / Mr/Ms Last name for more formal contexts],

Re: [Project Reference] — [Subject]

[Opening: state the purpose of the email in the first sentence]

[Body: clear paragraphs, one topic per paragraph]

[If action required: state clearly]
"Please [specific action] by [date]."

[Closing: brief and professional]

Kind regards,

[PM Name]
[PM Title]
[Company]
[Phone]
```

## Style Notes

- Australian English spelling
- No contractions (do not, will not, cannot)
- No casual language (Hi, Hey, Just checking in, FYI)
- One clear topic per email where possible
- Lead with the main point — don't bury the purpose
- State any action required and its deadline clearly

## After Approval

When the user approves:
1. Log to `correspondence_register` with series COR-XXX or the appropriate series
2. Update status to 'sent'
3. Save copy to `outputs/correspondence/`
4. Update PROJECT_MEMORY Activity Log if the correspondence is significant
