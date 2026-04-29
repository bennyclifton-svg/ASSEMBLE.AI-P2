---
name: da-approvals
tier: 3
description: DA coordination skill — compiles DA package, manages council-specific lodgement checklists, tracks post-lodgement RFIs, conditions of consent, and Section 4.55 modifications. NSW default; adapt for other jurisdictions.
agents: [design]
---

# DA / Approvals Skill

## Tier 3 — Council-Specific Requirements

This is a Tier 3 skill. The base skill provides the standard DA framework for NSW. For council-specific requirements (Marrickville/Inner West, City of Sydney, Northern Beaches, etc.), append the relevant council's DA checklist and any LGA-specific controls to this context.

**Jurisdiction default:** NSW  
**Primary legislation:** Environmental Planning and Assessment Act 1979 (EP&A Act)  
**Key instruments:** Local Environmental Plans (LEPs), Development Control Plans (DCPs), State Environmental Planning Policies (SEPPs)

---

## When to Load

Load this skill when:
- The user asks about DA preparation, lodgement, or status
- A DA package needs to be compiled
- Council RFIs need to be tracked
- Conditions of consent have been issued
- A Section 4.55 modification is being considered

---

## DA Package Components

Compile the following documents. All must reference the same design revision — check consistency before lodgement.

### Mandatory (all DAs)

| Component | Prepared By | Your Role |
|-----------|------------|-----------|
| Development Application form | You (draft for user to sign) | Complete all fields; confirm owner's consent if applicant ≠ owner |
| Statement of Environmental Effects (SEE) | Town Planner | Review for completeness; confirm all planning controls addressed |
| Architectural drawings — DA issue | Architect | Verify complete set, correct revision, stamped "DA ISSUE" |
| Shadow diagrams | Architect | Check all required times: 9am, 12pm, 3pm at June solstice minimum |
| Survey plan | Surveyor | Must be current (within 12 months), show existing trees, levels, boundaries |
| BASIX certificate | ESD Consultant | Must match current design — regenerate if design changed after certificate issued |
| Waste management plan | You or consultant | Council-specific template required |

### Common Additional Requirements (confirm with council)

| Component | When Required | Prepared By |
|-----------|--------------|-------------|
| Landscape plan | Most residential / mixed use | Landscape Architect |
| Stormwater concept | All DAs with impervious area | Civil Engineer |
| Traffic impact assessment | Developments generating >10 trips/hr or council threshold | Traffic Engineer |
| Acoustic assessment | Within noise-affected areas, entertainment uses | Acoustic Engineer |
| BCA / NCC assessment | Class 2+ or complex compliance | BCA Consultant |
| Access report (DDA) | Class 2+, commercial | Access Consultant |
| Geotechnical report | Slopes >15%, fill sites, reactive soils | Geotech Consultant |
| Contamination report | Previously industrial land, service stations, dry cleaners | Environmental Consultant |
| Heritage impact statement | Heritage-listed or heritage conservation area | Heritage Consultant |
| Species impact statement | If threatened species may be affected | Ecologist |
| Political donations disclosure | NSW mandatory — all DAs | You (draft for user to sign) |
| Construction management plan | Often required for projects >$1M | You or consultant |

---

## Pre-Lodgement Meeting

Recommend a pre-lodgement meeting with council before preparing a complex DA. This is especially important for:
- Departures from the LEP/DCP controls
- Sensitive sites (heritage, bushfire, flooding, contamination)
- Unusual or innovative designs
- Projects with known community sensitivity

**Pre-lodgement meeting preparation:**
1. Prepare a concise project description (1 page) — site address, zoning, proposed use, GFA, height, car parking
2. Identify the key issues you want council to comment on — list them as questions
3. Bring concept-level drawings — enough to understand the proposal, not DA-ready
4. Record the meeting and request written advice if possible

---

## Council Lodgement Checklist

### Standard NSW DA Lodgement Checklist

```
DOCUMENTATION
☐ Completed DA form (signed by applicant and owner)
☐ Owner's consent form (if applicant ≠ owner)
☐ Political donations disclosure declaration
☐ Correct DA fee paid (check council fee schedule — usually based on construction cost)

PLANS AND DRAWINGS
☐ Site plan / location plan (show surrounding context)
☐ Site analysis plan (existing features, trees, levels, services)
☐ Floor plans — all levels including basement, roof plan
☐ Elevations — all four elevations minimum
☐ Sections — minimum two cross-sections
☐ Shadow diagrams — June 21, 9am / 12pm / 3pm minimum
☐ Landscape plan
☐ All drawings stamped "DA ISSUE" and consistent revision
☐ Scale bar on all plans (do not rely on dimensions alone)

REPORTS
☐ Statement of Environmental Effects (SEE)
☐ BASIX certificate (current, matching design)
☐ Survey plan (current)
☐ Stormwater concept plan
☐ Waste management plan

ADDITIONAL (if applicable)
☐ Traffic impact assessment
☐ Acoustic assessment
☐ Heritage impact statement
☐ Geotechnical report
☐ Contamination report / preliminary site investigation
☐ Access report
☐ BCA preliminary assessment
☐ NatHERS certificate (if BASIX residential)
☐ Species impact statement / biodiversity assessment
☐ Flood study / hydraulic report (if flood-affected land)
☐ Construction management plan

FORMAT
☐ All documents in PDF format
☐ File sizes per council requirements (typically <100MB per file)
☐ Document naming per council requirements (if specified)
☐ Lodgement via NSW Planning Portal (eplanning.nsw.gov.au) for most councils
```

---

## Lodgement Process (NSW)

### Via NSW Planning Portal

Most NSW councils now require lodgement through the NSW Planning Portal:

1. **Create application** at eplanning.nsw.gov.au
2. **Select application type:** Development Application
3. **Enter address** — portal will identify the council and applicable instruments
4. **Complete online form** — mirrors the paper DA form
5. **Upload documents** — attach all required documents
6. **Calculate and pay fee** — portal calculates based on estimated cost of works
7. **Submit** — portal routes to the relevant council
8. **Track** via portal — all correspondence, RFIs, and determination will appear

**Fee calculation:**
- Based on estimated cost of works (ECW)
- Different fee schedules per council — portal usually calculates automatically
- If in doubt, call the council's duty planner

### After Lodgement
- Council will issue an **Application Reference Number** (usually DA/YYYY/XXXXXX)
- **Neighbour notification** period (typically 14-28 days) — council notifies adjoining properties
- **Assessment period** begins after notification closes
- Target determination period: 40 business days (statutory clock)

---

## Post-Lodgement Tracking

### Request for Additional Information (RFI)

Council may issue an RFI (also called "Request for Information" or "Section 4.55 Additional Information Request"). When received:

1. **Log the RFI** — date received, reference number, deadline for response
2. **Review each item** — categorise as: architectural response / consultant response / additional report required
3. **Coordinate responses** — route to relevant consultant via Correspondence Agent
4. **Clock stops** during RFI period — the statutory clock pauses until response is submitted
5. **Submit response** via Planning Portal — upload all response documents together
6. **Confirm receipt** with council

**RFI response format:**
```
RESPONSE TO REQUEST FOR ADDITIONAL INFORMATION
DA Reference: [council reference]
Date of RFI: [date]
Date of Response: [date]

[For each item]:
Item [X]: [Council's question]
Response: [Your answer / see attached consultant report]
Document reference: [attached document name]
```

### Neighbour Objections
- Monitor for objections during notification period
- If objections received, log them and review against the development's merits
- Consider whether design changes can address valid concerns without compromising the scheme
- Advise user on whether to respond to objections or wait for assessment officer to address them

### Assessment Officer Contact
- Identify the assessment officer assigned to the DA (usually noted in council's acknowledgement letter)
- Maintain professional communication — do not pressure for determination
- Respond promptly to any queries
- Request a meeting if the assessment is progressing slowly or if issues have arisen

---

## DA Determination

### If Approved

When the determination notice is received:

1. **Read all conditions carefully** — log every condition in the DA Conditions Register (see below)
2. **Categorise conditions** by when they must be satisfied:
   - **Prior to Construction Certificate (CC) / CDC:** Must be addressed before building work starts
   - **Prior to commencement of works:** May differ from CC conditions
   - **During construction:** Ongoing obligations
   - **Prior to occupation / occupation certificate:** Must be satisfied before occupation
   - **Ongoing:** Permanent obligations post-occupation
3. **Flag any conditions that require consultant action** — assign responsible party
4. **Notify Program Agent** — conditions affecting timeline
5. **Notify Finance Agent** — conditions requiring additional expenditure
6. **Update PROJECT_MEMORY** — DA approved, conditions count, key dates

### If Refused

If the DA is refused:
1. **Read the reasons for refusal** carefully
2. **Assess whether reasons are addressable** through design changes or additional information
3. **Options:**
   - **Review and appeal** to the Land and Environment Court (within 6 months of determination)
   - **Modify and re-lodge** — address the refusal reasons, re-submit as a new DA or amended application
   - **Negotiate with council** — request a meeting to understand whether there is a path to approval
4. **Do not panic** — many DAs are approved on review or after addressing reasons for refusal

---

## DA Conditions Register

Maintain all conditions in the database and as a tracking spreadsheet:

```sql
-- Already in schema.sql
SELECT * FROM da_conditions ORDER BY category, condition_number;
```

**Tracking spreadsheet columns:**
```
| Cond No | Category | Description | Responsible Party | Status | Due Date | Evidence | Notes |
```

**Status values:** Outstanding → In Progress → Submitted to Council → Satisfied

---

## Section 4.55 Modifications (NSW)

After DA approval, changes to the approved development require a modification application under Section 4.55 of the EP&A Act.

### Types of Modifications

| Type | When to Use | Notes |
|------|------------|-------|
| **S4.55(1)** — Minor error, misdescription | Clerical errors, typographical errors in the consent | Simple — usually approved without assessment |
| **S4.55(1A)** — Minimal environmental impact | Small changes that don't significantly affect the environment | Common — design changes that don't increase bulk, height, or intensity |
| **S4.55(2)** — Other modifications | Substantial changes that may have greater environmental impact | Full assessment required — treated almost like a new DA |

### When to Recommend a Section 4.55

Advise user to seek a Section 4.55 modification when:
- Architectural changes materially differ from approved drawings
- Additional GFA or height proposed
- Change of use within the approved development
- Conditions of consent need to be modified
- External appearance changes that council may object to

**Important:** Working within the approved design without material changes does NOT require a modification. Construction-level decisions that don't change the approved design are not modifications.

### Modification Application Process
1. Prepare modification drawings showing changes (clouded for clarity)
2. Prepare a covering statement explaining: what changed, why, and why the modification is justified
3. If applicable: updated BASIX certificate, updated consultant reports
4. Lodge via NSW Planning Portal as a Modification Application
5. Fee: typically a percentage of original DA fee

---

## Construction Certificate / CDC

After DA approval, a Construction Certificate (CC) or Complying Development Certificate (CDC) is required before work starts.

### Construction Certificate (CC)
- Issued by a **Private Certifier** (PCA) or council
- Confirms detailed construction drawings comply with the BCA/NCC and DA conditions
- Required before any physical work commences
- Certifier will be appointed as **Principal Certifying Authority (PCA)**

### Complying Development Certificate (CDC)
- A faster alternative for developments that meet specific requirements under State Environmental Planning Policy (Exempt and Complying Development Codes)
- Issued by private certifier only
- Combines DA and CC into one assessment
- Not available for all developments — confirm eligibility early

### Certifier Appointment
Once a PCA is appointed:
1. Log certifier details in project.db contacts table
2. Notify Program Agent of the CC/CDC programme
3. Coordinate delivery of CC conditions compliance documentation
4. PCA will conduct mandatory inspections during construction — coordinate with Delivery Agent

---

## Tone & Behaviour for This Skill

- **Completeness-focused.** The most common reason DAs are delayed is missing or inconsistent documentation. Always check that all consultants' reports reference the same design revision.
- **Jurisdiction-aware.** NSW default, but flag when the project is in another state — EP&A Act references, council portals, and fee schedules differ. Ask user to confirm jurisdiction at task start.
- **Council-specific.** No two councils are exactly the same. When council-specific requirements are loaded (Tier 3 reference material), follow them precisely. When they're not, use the standard NSW checklist and recommend a pre-lodgement meeting.
- **Time-bar aware.** Statutory clocks run on DA assessments. Know when the clock is running, when it stops, and when the user's time limits apply (e.g., 6-month appeal window).
