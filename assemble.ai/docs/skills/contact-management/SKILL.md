---
name: contact-management
tier: 1
description: Tier 1 skill — contact directory management. Correspondence Agent uses general knowledge to add, update, and query contacts in the project.db contacts table. No scaffold required.
agent: correspondence
---

# Skill: Contact Management

**Tier 1 — No scaffold required.** The Correspondence Agent manages the contact directory using straightforward SQL operations on `project.db`. This skill is a reference document.

## When This Skill Applies

- Adding a new contact to the directory
- Updating existing contact details
- Looking up contact details for correspondence
- Listing contacts by role or distribution group
- Deactivating a contact who has left the project

## Contact Table Structure

```sql
CREATE TABLE contacts (
    id              INTEGER PRIMARY KEY,
    name            TEXT NOT NULL,
    organisation    TEXT,
    role            TEXT,           -- 'architect', 'structural_engineer', 'contractor', 'council', etc.
    email           TEXT,
    phone           TEXT,
    address         TEXT,           -- for formal letters
    distribution    TEXT,           -- 'all', 'design_team', 'contractor', 'authorities'
    is_active       BOOLEAN DEFAULT TRUE,
    notes           TEXT
);
```

## Common Operations

### Add a contact
```sql
INSERT INTO contacts (name, organisation, role, email, phone, address, distribution)
VALUES ('[name]', '[org]', '[role]', '[email]', '[phone]', '[address]', '[distribution]');
```

### Update contact details
```sql
UPDATE contacts
SET email = '[new email]', phone = '[new phone]'
WHERE name = '[name]' AND organisation = '[org]';
```

### Look up a contact by role
```sql
SELECT name, organisation, email, phone
FROM contacts
WHERE role = '[role]' AND is_active = TRUE;
```

### List all active contacts
```sql
SELECT name, organisation, role, email, phone
FROM contacts
WHERE is_active = TRUE
ORDER BY role, name;
```

### Distribution list lookup
```sql
SELECT name, email
FROM contacts
WHERE distribution IN ('all', '[specific_group]') AND is_active = TRUE;
```

### Deactivate a contact
```sql
UPDATE contacts SET is_active = FALSE WHERE id = [id];
```

## Typical Role Values

- `principal` — project owner/developer
- `project_manager` — PM (could be same as principal rep)
- `architect`
- `structural_engineer`
- `mechanical_engineer`
- `hydraulic_engineer`
- `electrical_engineer`
- `civil_engineer`
- `geotechnical_engineer`
- `acoustic_consultant`
- `traffic_consultant`
- `landscape_architect`
- `quantity_surveyor` (external QS if engaged)
- `head_contractor`
- `superintendent`
- `council` — council contact for DA
- `certifier` — private certifier / council certifier
- `financier`
- `legal_counsel`
- `real_estate_agent`

## Typical Distribution Groups

- `all` — full distribution (principal, PM, design team, contractor)
- `design_team` — architect + consultants
- `contractor` — head contractor and superintendent
- `authorities` — council, certifier, utilities
- `internal` — principal and PM only

## When a Contact Is Not Found

If the user or a requesting agent needs to send correspondence to someone not in the directory:
1. Ask the user for: name, organisation, role, email, postal address (for letters), phone
2. Add to the contacts table
3. Proceed with the correspondence

"I don't have [name / recipient role] in the contact directory. Please provide their name, organisation, and email address so I can add them and proceed."
