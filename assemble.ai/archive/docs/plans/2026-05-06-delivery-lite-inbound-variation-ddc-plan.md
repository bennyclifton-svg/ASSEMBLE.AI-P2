# Delivery-Lite Inbound Variation DDC Plan

## Goal

Implement the first Demand-Driven Context cycle for agentic issue-variation handling.

The first workflow starts from an API-ingested contractor email, auto-triages high-confidence variation claims, prepares a Delivery-led assessment path, creates approval-gated workflow proposals, and drafts/registers an outbound response inside Assemble. Real mailbox polling and real provider send are deferred.

## Locked Decisions

- Existing `docs/skills/*` are source material, not runtime backlog.
- First DDC stream is `issue variation`.
- First trigger is an API-ingested contractor variation claim.
- Auto-triage is allowed; contractual commitments and outbound sending remain approval-gated.
- Cycle 1 uses Delivery-lite, limited to contractor variation claims.
- Delivery owns entitlement/contract framing and produces a correspondence brief.
- Correspondence formatting/registering is a separate approval-gated action.
- Missing-info claims still create a `Forecast` variation and draft a request-for-particulars response.
- Complete-enough claims draft an assessment response.
- Contract assessment may use a conservative standard-form assumption with a verification caveat.
- DDC cycle logs live under `docs/ddc/issue-variation/cycles/`.

## Todo

- [x] Add a runtime `delivery` specialist with a narrow Delivery-lite prompt.
- [x] Give Delivery-lite read tools and only one write path: `start_issue_variation_workflow`.
- [x] Route contractor variation-claim intents to Delivery where relevant.
- [x] Add an inbound variation-claim triage service:
  - [x] deterministic candidate rules;
  - [x] classifier result shape;
  - [x] confidence threshold;
  - [x] extracted facts and missing-info list.
- [x] Call auto-triage after inbound correspondence ingestion.
- [x] Extend issue-variation workflow input for:
  - [x] inbound correspondence id;
  - [x] contractor identity;
  - [x] Delivery assessment summary;
  - [x] missing-info branch;
  - [x] outbound correspondence brief.
- [x] Add an approval-gated outbound correspondence draft/register action.
- [x] Link outbound correspondence back to inbound correspondence.
- [x] Add Cycle 1 fixture and log under `docs/ddc/issue-variation/cycles/`.
- [x] Surface variation triage on correspondence list/detail views.
- [x] Add a correspondence Review action that opens the workflow in chat approvals.
- [x] Materialise stored auto-triage workflow previews into approval-gated workflow steps.
- [x] Add focused tests:
  - [x] high-confidence contractor claim auto-triages;
  - [x] incomplete claim creates `Forecast` variation plus request-for-particulars draft;
  - [x] complete-enough claim creates `Forecast` variation plus assessment-response draft;
  - [x] no outbound send happens without approval;
  - [x] correspondence view exposes stored triage without leaking workflow input;
  - [x] existing workflow previews can be materialised without creating duplicate workflow runs.

## Deferred

- Real Outlook/Gmail polling.
- Real provider send.
- Full Delivery Agent scope: EOTs, progress claims, defects, practical completion, site instructions, notices, and subcontract procurement.
- Full executed-contract document retrieval and clause extraction.
