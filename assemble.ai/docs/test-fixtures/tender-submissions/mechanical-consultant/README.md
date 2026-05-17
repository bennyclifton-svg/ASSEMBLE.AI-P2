# Mechanical Consultant Tender Test Fixtures

These three mock tender submissions are designed for testing the tender evaluation price workflow.

Package: Mechanical Services Consultant  
Project: Lighthouse Residences  
Basis: AUD, ex GST

## Files

1. `01-northline-mechanical-consultants.md`
   - Base tender: $156,000
   - Balanced pricing structure.
   - Clear Adds and Subs.
   - Several VM savings.
   - Explicit exclusions for NatHERS, smoke modelling and acoustic engineering.

2. `02-harbour-air-building-services.md`
   - Base tender: $149,500
   - Lower base price but more exclusions.
   - Uses `Assumed included`, `Excluded`, and `TBC` status language.
   - Clarifies that some items are only design-review level, not formal reporting.
   - Good for testing normalisation through Adds and Subs.

3. `03-axis-mechanical-design.md`
   - Base tender: $168,750
   - Higher base price but includes more meetings, inspections and mechanical cost estimating.
   - Contains negative deductive normalisation items.
   - Includes CO2 monitoring and explicit clarification requests.
   - Good for testing negative Adds and Subs and VM options.

## Suggested Evaluation Rows

If you want a clean test, set up cost-plan or price rows similar to:

- Schematic Design
- Detailed Design
- Construction Certificate Documentation
- Tender Support / Tender Assistance
- Contract Administration
- Natural Ventilation Assessment
- Basement Ventilation / CFD Modelling
- Mechanical Cost Estimate
- Consultant Coordination Meetings
- Site Inspections

## Features These Fixtures Exercise

- Different tender totals.
- Similar but non-identical price schedules.
- Included / assumed included / excluded / TBC language.
- Adds and Subs with positive values.
- Adds and Subs with negative deductive values.
- Value Management options with savings and additional costs.
- Clarification-worthy scope gaps.
- Multi-file package compatibility if you later split price, scope and clarifications into separate PDFs.

## Suggested Manual Test

1. Create or open a Mechanical consultant evaluation.
2. Shortlist three firms matching the three tenderer names.
3. Convert each markdown file to PDF.
4. Drag each PDF onto the matching firm column in Evaluation Price.
5. Confirm base price lines populate.
6. Manually test cell status editing with `included`, `assumed included`, `excluded`, `TBC`, `N/A`.
7. Add VM rows from the VM options and test Adopt / TBD / No / Base.
8. Award one firm.
9. Push selected rows to the cost plan.
