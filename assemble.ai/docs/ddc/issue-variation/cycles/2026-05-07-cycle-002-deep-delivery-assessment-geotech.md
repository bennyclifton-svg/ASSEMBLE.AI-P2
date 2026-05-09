# Cycle 002 - Deep Delivery Assessment With Geotech Evidence

## Demand

Move beyond Delivery-lite template drafting. A more complicated contractor variation claim needs a reviewable assessment artifact, evidence-aware response drafting, and a follow-up path where the user can ask Delivery to revise the assessment.

## Inbound Fixture

From: ABC Constructions Pty Ltd <contracts@abcconstructions.com.au>

Subject: Variation claim - latent rock excavation

Complicating evidence:

- Geotechnical report GT-01 notes possible sandstone floaters.
- Superintendent instruction SI-014 directed excavation to continue.
- VO-004 Excavation Breakdown.pdf gives a headline cost but not full dockets.
- Contractor claims 4 working days but provides no critical-path narrative.

## Expected Assessment

- Assessment mode: `deep_delivery`
- Responsible agent: `delivery`
- Variation status remains `Forecast`
- Assessment note becomes the reviewable artifact.
- Outbound response is generated from the assessment artifact and remains approval-gated.
- Trace records `LLM-assisted`, documents reviewed, and whether knowledge-library context was used.

## Demand Checklist

- [x] Deep Delivery assessment fields for documents, knowledge references, entitlement, quantum, programme, and evidence gaps.
- [x] Reviewable assessment note formatting.
- [x] Deep assessment outbound response drafting.
- [x] Compact trace support for LLM-assisted template generation and documents reviewed.
- [x] Workflow path to revise an existing assessment note and draft a replacement outbound response.
- [x] Orchestrator routing for follow-up prompts such as geotech assessment iteration.
- [ ] Browser-run the workflow against a real complicated inbound item.
- [ ] Add contract-document read tools once executed contract records are reliably available.

## Pass Bar

Delivery must say what evidence it relied on, what remains unverified, and must not approve entitlement, quantum, or time by implication. A user follow-up such as "add more evaluation about the geotech report" should update the assessment note and draft a revised outbound response without creating a duplicate variation.

## Cycle Result

GREEN at unit/workflow level on 2026-05-07.

Implemented:

- First-pass deep assessment support inside the issue-variation workflow.
- New `issue-variation-assessment-revision` workflow for iterative assessment updates.
- New Delivery tool: `start_issue_variation_assessment_revision_workflow`.
- Routing for variation-claim assessment follow-ups to Delivery.
- Trace persistence through outbound correspondence approval so the correspondence panel can show LLM-assisted context and documents reviewed.

Not yet proven in browser against live project data. That remains the next RED cycle.
