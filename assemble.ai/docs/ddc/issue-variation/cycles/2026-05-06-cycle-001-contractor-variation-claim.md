# Cycle 001 - Contractor Variation Claim

## Demand

Prove the first issue-variation loop from API-ingested inbound correspondence.

## Inbound Fixture

From: ABC Constructions Pty Ltd <contracts@abcconstructions.com.au>

Subject: Variation claim - latent rock excavation

Body:

ABC Constructions submits a variation claim for latent condition rock excavation. Claimed amount is $42,000 plus 4 working days. Please confirm instruction so works can proceed.

Attachment: VO-004 Excavation Breakdown.pdf

## Expected Triage

- Classification: `variation_claim`
- Responsible agent: `delivery`
- Confidence: high enough for auto-triage
- Completeness: `complete_enough`
- Workflow: `issue-variation`
- Variation status: `Forecast`
- Outbound branch: `assessment_response`

## Demand Checklist

- [x] Delivery-lite runtime specialist.
- [x] Contractor variation-claim routing.
- [x] Deterministic inbound variation-claim triage.
- [x] Workflow input carries inbound correspondence, contractor, Delivery assessment, and outbound brief.
- [x] Outbound correspondence draft/register action.
- [x] Approval-gated outbound correspondence step.
- [x] Real user-facing workflow preview from inbound register.
- [x] Compact provenance trace for triage, drafting, and context source.
- [ ] Real mail-provider send adapter.
- [ ] Executed-contract document retrieval and clause extraction.

## Pass Bar

The API-ingested email should be registered, triaged, stored with a preview workflow plan, and classified without creating any unapproved contractual commitment. When the workflow is started by a user-facing agent run, approval cards should create the Forecast variation, note, and outbound response draft in sequence.

## Cycle Result

GREEN on 2026-05-07.

Observed project: `1777266180115-9fqfsefms`

Observed inbound correspondence: `95fae5c5-bf40-497e-83f6-2b6a90f3064b`

The API-ingested email was auto-triaged as a contractor variation claim. The user-facing review workflow opened from the correspondence panel and produced approval cards for:

- Forecast Contractor variation: latent rock excavation, `$42,000`, submitted `2026-05-07`, requested by ABC Constructions Pty Ltd.
- Project note: Contractor variation claim - latent rock excavation.
- Outbound assessment response draft to `contracts@abcconstructions.com.au`.

All cards applied successfully. The Delivery scaffold chat message is now hidden once the approval cards above it are resolved.

The outbound correspondence was produced by the deterministic Delivery-lite issue-variation template path, not by an LLM call and not by the knowledge libraries. This exposed a new user need: show provenance without making the correspondence panel busy. The compact trace disclosure now records source, trigger, agent, workflow, draft mode, approval gate, proposed actions, and whether LLM or library context was used.

## Next Demand

- Build the optional Deep Delivery Assessment path that can use LLM reasoning, read tools, and knowledge-library retrieval when the user wants a stronger contract-administration review.
- Add a real mail-provider send adapter after the draft/register path remains stable.
