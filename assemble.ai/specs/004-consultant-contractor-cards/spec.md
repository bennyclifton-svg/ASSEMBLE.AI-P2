# Feature Specification: Consultant & Contractor Cards

**Branch**: `004-consultant-contractor-cards`  
**Date**: 2025-11-23  
**Status**: Ready for Refinement  
**Related Feature**: Planning Card (defines active Disciplines and Trades)

## Overview
Two separate but similar horizontal card galleries:
1. **Consultants** – filtered by Discipline (Architectural, Structural, MEP, etc.)
2. **Contractors** – filtered by Trade (Concrete, Electrical, Roofing, etc.)

Both support manual entry, edit, delete, and AI-assisted creation via drag & drop of emails, PDFs, business cards, or pasted text.

## User Stories (P1)

**US-01** As a Project Manager, I want discipline tabs at the top of the Consultant section so that I can instantly filter and view only Firms for the active disciplines defined in the Planning Card.

**US-02** As a Project Manager, I want trade tabs at the top of the Contractors section so that I can instantly filter Firms by their trade/specialty.

**US-03** As a Project Manager, I want to drag & drop an email, vCard, PDF, or business card image (or paste text) anywhere on the Firm card  so that the AI extracts and auto-populates a the firm card with Name/Company, Role/Trade, Email, Phone, Organization, etc., dramatically reducing data entry time.

**US-04** As a Project Manager, I want to manually add, edit, or delete Firm records with a clean card-based layout that scrolls horizontally when needed.

## Functional Requirements

| ID    | Requirement |
|------|------------|
| FR-001 | System MUST display Firms as horizontal, scrollable cards grouped/filtered by Discipline tabs (tabs = active disciplines from Planning Card) |
| FR-002 | System MUST display Firms as horizontal, scrollable cards grouped/filtered by Trade tabs (tabs = only active trades as selected in the Planning Card do not show empty tabs for trades that are not active) |
| FR-003 | System MUST allow drag & drop of files (PDF, images, .msg, .eml) or pasted text → AI parses and suggests a new card (user confirms/edits before save) |
| FR-004 | System MUST support manual "Add Firm" button that creates a blank editable card at the end of the current tab |
| FR-005 | System MUST allow inline editing and deletion of any card (with confirmation on delete) |
| FR-006 | System MUST prevent duplicate consultants with the same email OR same company name + discipline (user warning + option to merge) |
| FR-007 | System MUST prevent duplicate contractors with the same company name + trade |
| FR-008 | All data MUST be persisted to the database and survive page refresh/project reload |
| FR-009 | Empty tabs (no Firm cards in a discipline/trade) MUST still be visible if the discipline/trade is active in the Planning Card |

## Data Model (Updated & Consistent)

**Consultant**
- id
- companyName (e.g. "Arup", "Jane Doe Consulting")
- contactPerson (optional)
- discipline (from Planning Card active list)
- email
- phone
- mobile
- address
- abn
- notes
- shorlisted (toggle on/off)

**Contractor**
- id
- companyName
- trade (single select from the 21 master trades)
- contactPerson (optional)
- email
- phone
- address
- abn
- notes
- shorlisted (toggle on/off)

## Non-Functional & Edge Cases
- Cards should be responsive and remain usable on tablet (touch scrolling)
- Drag & drop zone should have clear visual affordance + tooltip
- If AI confidence < 70%, show warning and require manual review
- Deleting the last card in a discipline/trade keeps the empty tab visible

## Success Criteria

| ID   | Metric |
|------|-------|
| SC-001 | User can add a consultant/contractor (manual) in < 30 seconds |
| SC-002 | User can add a consultant/contractor via drag & drop + AI in < 15 seconds (after drop) |
| SC-003 | ≥ 90% field extraction accuracy on real-world emails/business cards (tested on 50 samples) |
| SC-004 | 100% of records persisted correctly after page reload |
| SC-005 | No duplicate records can be created accidentally |

## Out of Scope (for now)
- Bulk CSV import
- Integration with external directories (LinkedIn, Outlook)
- Sending tender packages (separate future feature)

### Final Suggestion
Run a 30-minute refinement session with the team using this cleaned version — it will save days of back-and-forth during development.
