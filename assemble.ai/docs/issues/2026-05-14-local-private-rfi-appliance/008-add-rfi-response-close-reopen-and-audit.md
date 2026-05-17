# 008 - Add RFI response, close/reopen, and audit trail

**Type:** AFK
**Triage category:** `enhancement`
**Triage label:** `ready-for-agent`
**Source PRD:** `archive/docs/prds/2026-05-14-local-private-rfi-appliance-prd.md`
**User stories covered:** 17, 21, 49

## What to build

Complete the core RFI lifecycle by recording responses, closing and reopening RFIs, and exposing audit history for the key transitions. The slice should make the RFI register usable for day-to-day follow-up.

## Acceptance criteria

- [x] A PM can record an RFI response with response text, response date, and optional linked evidence.
- [x] Recording a response moves the RFI into the appropriate responded state.
- [x] A PM can close a responded RFI and reopen it if further clarification is needed.
- [x] Invalid lifecycle transitions are rejected with clear errors.
- [x] Each lifecycle change leaves an audit trail that identifies the actor, timestamp, previous state, and new state.
- [x] Register UI refreshes after response, close, and reopen actions.
- [x] Tests cover valid transitions, invalid transitions, audit rows, and project refresh behavior.

## Blocked by

- `006-create-typed-rfi-register-mvp.md`

---

## Implementation Notes

- Added RFI response text/date fields and a lifecycle audit table for response, close, and reopen transitions.
- Added explicit domain-service methods for `recordResponse`, `close`, and `reopen`; direct status edits can no longer bypass those lifecycle actions for responded/closed transitions.
- Added response, close, and reopen API routes that carry actor context into the audit trail and emit project refresh events.
- Extended the register UI with a response panel, optional response evidence linking, close/reopen controls, and audit history.
- Verified with focused service, API, and register UI tests.
