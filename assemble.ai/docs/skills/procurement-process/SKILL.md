---
name: procurement-process
tier: 2
description: Shared procurement scaffold used by both Procurement Agent (head contractor) and Delivery Agent (subcontractors/trade packages). Covers market sounding, tender document preparation, tender period management, Q&A, and subcontract formation. Adapts to head contractor or trade package context.
agents: [procurement, delivery]
---

# Procurement Process Scaffold

## When to Load

Load this skill when:
- Preparing an EOI or RFT for a head contractor (Procurement Agent)
- Preparing an RFQ or RFT for a trade package (Delivery Agent)
- Managing a tender period (queries, addenda, extensions)
- Forming a subcontract or head contract

This scaffold provides templates and process guidance. The calling agent applies project-specific judgment within the scaffold.

---

## Context: Head Contractor vs Trade Package

This skill is used in two contexts. The process is the same — the scale and formality differ.

| Element | Head Contractor (Procurement Agent) | Trade Package (Delivery Agent) |
|---------|--------------------------------------|-------------------------------|
| Document name | RFT (Request for Tender) | RFQ (Request for Quote) or RFT |
| Tender list | 3–5 shortlisted contractors | 3–4 subcontractors per trade |
| EOI | Often required for projects >$5M | Rarely used for trade packages |
| Contract form | AS 4000, AS 2124, AS 4902, ABIC | Subcontract (back-to-back with head contract) |
| Evaluation rigour | Formal — price + 8 non-price criteria | Simplified — price + experience + safety |
| Correspondent | Correspondence Agent | Correspondence Agent |

---

## Phase 1: Market Sounding (Pre-Tender)

Before issuing tender documents, understand the market.

### Steps

1. **Define the tender list**
   - For head contractors: use EOI shortlist or direct selection
   - For trade packages: identify 3–4 capable subcontractors per trade
   - Consider: relevant experience, capacity, geographic coverage, previous performance

2. **Check market conditions**
   - Is the trade currently busy? (affects pricing and commitment)
   - Any known issues with specific subcontractors?
   - Is the programme realistic for current market lead times?

3. **Long-lead identification**
   - Flag any packages requiring early procurement due to lead times
   - Examples: structural steel, precast concrete, lifts, façade systems, mechanical plant
   - Notify Program Agent of long-lead packages and their procurement programme

4. **Tender list output:**
```
TENDER LIST — [Project Name]
Package: [Head Contract / TP-XX Trade Name]
Date: [date]

| # | Contractor / Subcontractor | Previous Experience | Capacity Status | Contact |
|---|---------------------------|--------------------|-----------------|---------| 
| 1 | [name] | [relevant project] | [available/busy] | [email] |
| 2 | [name] | [relevant project] | [available/busy] | [email] |
...

Recommendation: Proceed to RFT/RFQ with the above list.
```

---

## Phase 2: Tender Document Preparation

### 2.1 Invitation / Cover Letter Template

```
[PROJECT LETTERHEAD]

[Date]

[Contractor/Subcontractor name and address]

RE: INVITATION TO TENDER
Project: [Project Name]
Address: [Site Address]
Package: [Head Contract / Trade Package description]
Reference: [RFT/RFQ reference number]

Dear [name],

We are pleased to invite [company name] to tender for the above-referenced 
[contract/trade package].

PROJECT OVERVIEW
[2–3 sentences: project type, size, location, delivery model]

TENDER DOCUMENTS
The following documents are enclosed / available for download:
[list documents]

KEY DATES
| Milestone | Date |
|-----------|------|
| RFT/RFQ issue | [date] |
| Site inspection (mandatory/optional) | [date, time, location] |
| Queries deadline | [date] |
| Tender close | [date, time] |
| Anticipated award | [date] |

SUBMISSION REQUIREMENTS
Tenders must be submitted by [time] on [date] to [submission method/address].
Late tenders will not be accepted.

Please confirm your intention to tender by [date] to [contact].

Yours faithfully,

[Name]
[Title]
[Organisation]
[Contact details]
```

### 2.2 Conditions of Tendering Template

Key clauses to include:

```
CONDITIONS OF TENDERING
Project: [Name] | Package: [description] | Ref: [number]

1. INTERPRETATION
   1.1 "Tenderer" means the party submitting a tender response.
   1.2 "Principal" means [client entity name].

2. PROBITY
   2.1 Tenderers must not engage in collusion, canvassing, or improper 
       communication with other tenderers.
   2.2 Tenderers must disclose any conflict of interest immediately.
   2.3 The Principal reserves the right to disqualify any tender where 
       a conflict of interest is not disclosed.

3. CONFIDENTIALITY
   3.1 Tender documents are confidential and must not be shared 
       with third parties without written consent.

4. QUERIES
   4.1 All queries must be submitted in writing by [queries deadline].
   4.2 Responses will be issued to all tenderers simultaneously as addenda.
   4.3 No oral representations will be binding.

5. ADDENDA
   5.1 The Principal may issue addenda amending the tender documents.
   5.2 All addenda must be acknowledged by the tenderer.
   5.3 Tenders must incorporate all issued addenda.

6. SITE INSPECTION
   6.1 A site inspection will be held on [date] at [time].
   6.2 Attendance is [mandatory / strongly recommended].
   6.3 Tenderers are responsible for satisfying themselves as to 
       site conditions before submitting their tender.

7. TENDER SUBMISSION
   7.1 Tenders must be submitted by [time] on [date].
   7.2 Late tenders will not be accepted unless the Principal, at its 
       sole discretion, grants an extension.
   7.3 Tenders must be submitted [electronically via / by hard copy to] 
       [submission address].

8. EVALUATION
   8.1 The Principal is not bound to accept the lowest-priced tender.
   8.2 The Principal reserves the right to accept or reject any tender 
       in its absolute discretion.
   8.3 The evaluation will consider [price and non-price criteria / 
       price as primary criterion].
   8.4 The Principal reserves the right to negotiate with any tenderer.

9. COSTS
   9.1 Tenderers bear all costs of preparing and submitting their tender.
   9.2 The Principal is not liable for any tender preparation costs.

10. NO CONTRACT
    10.1 This invitation to tender does not constitute an offer or 
         agreement. No contract is formed until a formal contract 
         is executed by both parties.
```

### 2.3 Form of Tender Template

```
FORM OF TENDER
Project: [Name] | Package: [description] | Ref: [number]

To: [Principal name and address]

We, [Tenderer company name] (ABN: [number]), having examined the tender 
documents listed below, hereby offer to [construct / supply and install] 
the works described therein for the sum of:

TENDER PRICE (excluding GST): $ ______________________

TENDER PRICE (including GST): $ ______________________

We confirm that:
☐ We have read and understood all tender documents
☐ We have visited the site and satisfied ourselves as to site conditions
☐ We have acknowledged all addenda (Addendum Nos: _________)
☐ Our tender is valid for [45 / 60 / 90] days from the date of tender close
☐ We do not have any conflict of interest to declare / 
   We declare the following conflict of interest: _________________
☐ We have attached all required schedules and supporting information

QUALIFICATIONS AND EXCLUSIONS:
[Tenderer to list any qualifications, exclusions, or assumptions here.
If none, state "Nil".]

Signed: ______________________  Date: _______________
Name:   ______________________
Title:  ______________________
Company: _____________________
```

### 2.4 Pricing Schedule Template (.xlsx structure)

**Sheet 1 — Lump Sum Breakdown:**
```
| Trade | Description | Amount (excl GST) | Notes |
|-------|-------------|-------------------|-------|
| Preliminaries (time-related) | | | |
| Preliminaries (fixed) | | | |
| Demolition | | | |
| Excavation / civil | | | |
| Piling / foundations | | | |
| Concrete structure | | | |
| Masonry | | | |
| Steel structure | | | |
| Façade / cladding | | | |
| Waterproofing | | | |
| Roofing | | | |
| Carpentry / joinery | | | |
| Windows / glazing | | | |
| Doors / hardware | | | |
| Plasterboard / linings | | | |
| Tiling / floor finishes | | | |
| Painting | | | |
| Mechanical services | | | |
| Electrical services | | | |
| Hydraulic services | | | |
| Fire services | | | |
| Lifts | | | |
| Landscaping | | | |
| Provisional sums | | | |
| Contingency allowance | | | |
| SUBTOTAL (excl margin) | | | |
| Margin / overhead / profit | | | |
| TOTAL LUMP SUM (excl GST) | | | |
| GST (10%) | | | |
| TOTAL LUMP SUM (incl GST) | | | |
```

**Sheet 2 — Schedule of Rates:**
```
| Item | Unit | Rate (excl GST) | Notes |
|------|------|-----------------|-------|
| Labour — Carpenter | hr | | |
| Labour — Concreter | hr | | |
| Labour — Electrician | hr | | |
| Labour — Plumber | hr | | |
| Labour — General labourer | hr | | |
| Plant — Excavator (20T) | hr | | |
| Plant — Crane (mobile, 50T) | hr | | |
| Materials — Concrete (25MPa) | m³ | | |
| Materials — Reinforcement (N16) | tonne | | |
```

---

## Phase 3: Tender Period Management

### Query Management Log

```
TENDER QUERY LOG
Project: [Name] | Package: [description]

| # | Date Received | Tenderer | Query Summary | Addendum No | Date Issued |
|---|--------------|----------|---------------|-------------|-------------|
| 1 | | | | | |
```

**Query response rules:**
- All responses issued to ALL tenderers simultaneously
- Technical queries: route to Design Agent for technical content before responding
- Scope queries: clarify with the user before responding
- No binding oral responses — everything in writing

### Addendum Template

```
ADDENDUM [No.] — [Date]
Project: [Name] | Package: [description] | Original RFT Ref: [number]

This addendum forms part of the tender documents. All tenderers must 
acknowledge receipt below.

AMENDMENTS:

1. [Section/clause reference]
   Original text: "[original wording]"
   Amended text: "[new wording]"

2. [Additional information / clarification]
   [Content]

3. [Additional drawings / documents issued]
   [List any new documents attached]

---
ACKNOWLEDGEMENT (return to [contact] by [date]):
Tenderer: _____________________
Signed: _____________________
Date: _____________________
```

---

## Phase 4: Tender Evaluation

Defer to the **Tender Evaluation** skill for the full evaluation matrix, scoring methodology, and report template.

Quick reference — evaluation inputs needed:
- Completed tender submissions from all tenderers
- Pre-tender estimate from Finance Agent
- Non-price scoring matrix (prepared when RFT issued)
- Reference check responses (if conducted)
- Interview scoring sheets (if interviews conducted)

---

## Phase 5: Subcontract / Contract Formation

### Head Contract
Defer to the **Contract Formation** skill for contract clause references and special conditions drafting.

### Subcontract (Trade Packages — Delivery Agent)

Key subcontract principles:
1. **Back-to-back with head contract** — subcontract obligations should mirror the head contract where possible
2. **Flow-down provisions** — program, reporting, quality, safety obligations flow down
3. **Pay when paid** — caution: "pay when paid" provisions have limited enforceability under security of payment legislation in NSW
4. **Security of payment** — subcontractors have rights under the Building and Construction Industry Security of Payment Act 1999 (NSW). Do not attempt to exclude these rights.
5. **Insurance** — require public liability ≥ $20M, workers comp, and any specialist insurances

### Trade Package Subcontract Checklist

```
☐ Scope of works defined (include drawings and spec sections)
☐ Contract price agreed
☐ Programme obligations — key milestones, interface dates
☐ Insurance certificates received (check limits and expiry)
☐ Head contract provisions flowed down
☐ Quality requirements referenced (inspection hold points)
☐ Safety requirements referenced (SWMS, inductions)
☐ Payment terms confirmed (match head contract payment cycle)
☐ Retention percentage confirmed
☐ DLP period confirmed
☐ Warranty period confirmed
☐ Subcontract signed by both parties
☐ Subcontractor added to trade package register
```

---

## Trade Package Register

Maintain in project.db and as .xlsx export:

```
| Package | Trade | Tenderers | Recommended | Award Value | Status | Award Date |
|---------|-------|-----------|-------------|-------------|--------|------------|
| TP-01 | Demolition | 3 | [name] | $[x] | Awarded | [date] |
| TP-02 | Piling | 4 | - | - | Tendering | - |
| TP-03 | Concrete | - | - | - | Scoping | - |
```

Status values: Scoping → Tendering → Evaluating → Recommended → Awarded → On-site → Complete
