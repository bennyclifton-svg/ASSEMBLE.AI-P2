---
name: final-account
tier: 2
description: Final account preparation process and template. Covers all components from contract sum through to agreed final account, including variations, provisional sums, retention, and DLP financial close-out.
agent: finance
---

# Skill: Final Account

**Tier 2 — Scaffold skill.** Provides the final account process and template structure. Finance Agent applies to project specifics using data from `project.db` registers.

## When to Load This Skill

Load when the user asks for:
- Final account preparation
- Project financial close-out
- Final payment certificate
- Retention release
- "Close out the finances"

## Prerequisites

Before preparing the final account:
- [ ] Practical Completion (PC) has been certified (or is imminent)
- [ ] Defects Liability Period (DLP) has commenced (or is near end for full close-out)
- [ ] All variations have been assessed (check `variation_register` in `project.db`)
- [ ] All provisional sums have been adjusted (confirm with Delivery Agent)
- [ ] Final progress claim has been received or is anticipated
- [ ] No outstanding notices or directions (check `notices_directions` table)

If prerequisites are not met, note which items are outstanding and prepare a **preliminary final account** with estimated amounts for outstanding items.

## Final Account Components

### Step 1: Pull Data from Registers

Query `project.db`:
```sql
-- All approved variations
SELECT var_number, description, approved_amount, status
FROM variation_register
WHERE status = 'approved'
ORDER BY var_number;

-- All progress claims
SELECT claim_number, period, claimed_amount, certified_amount, paid, payment_date
FROM progress_claims
ORDER BY claim_number;

-- Outstanding notices/directions
SELECT reference, type, subject, status
FROM notices_directions
WHERE status != 'closed';
```

### Step 2: Assemble Final Account Statement

```
FINAL ACCOUNT STATEMENT
─────────────────────────────────────────────────────────
Project:      [Name]
Contractor:   [Name]
Contract:     [AS4000 / AS2124 / AS4902 / ABIC]
Date of PC:   [DD Month YYYY]
DLP End:      [DD Month YYYY]
Prepared:     Finance Agent  |  Date: [DD Month YYYY]
Status:       [PRELIMINARY / AGREED / CERTIFIED]
─────────────────────────────────────────────────────────

A. CONTRACT SUM
   Original Contract Sum:                      $[amount]

B. VARIATIONS — APPROVED
   [List all approved variations individually]
   VAR-001: [description]                      $[amount]
   VAR-002: [description]                      $[amount]
   ...
   Total Approved Variations:                  $[amount]

C. VARIATIONS — DISPUTED / PENDING
   [List any unresolved variations]
   VAR-XXX: [description] — [status/note]      $[claimed] / $[assessed]
   Note: Disputed amounts are not included in the final account until resolved.
   Potential exposure:                         $[assessed amount]

D. PROVISIONAL SUMS — ADJUSTMENTS
   PS-001: [description]
     Allowed:   $[original PS amount]
     Actual:    $[final cost]
     Adjustment: $[+/- amount]
   ...
   Total PS Adjustments:                      +/- $[amount]

E. RISE & FALL / PRICE FLUCTUATION
   [If contract includes a rise and fall clause]
   Adjustment for material price changes:      $[amount]
   [State the clause, index used, and calculation basis]
   — or — "No rise and fall clause in this contract."

F. RECOVERY ITEMS / SET-OFFS
   [Any amounts the Principal/Superintendent is entitled to deduct]
   Liquidated damages ([X] days × $[rate]):   -$[amount]
   Uncompleted works:                         -$[amount]
   Cost of rectification works:               -$[amount]
   Other deductions:                          -$[amount]
   Total Deductions:                          -$[amount]

─────────────────────────────────────────────────────────
FINAL CONTRACT SUM:                             $[amount]
─────────────────────────────────────────────────────────

G. AMOUNTS PREVIOUSLY CERTIFIED & PAID
   Total progress claims certified (PC-001 through PC-[last]): $[amount]
   Less: Retention held:                                       ($[amount])
   ──────────────────────────────────────────────────────────────────────
   Net Paid to Date (ex. retention):                           $[amount]

H. RETENTION POSITION
   Retention at PC:                            $[amount]  ([X]%)
   To be released at PC:                       $[amount]  (50% — practical completion)
   To be released at DLP end:                  $[amount]  (50% — defects liability end)
   Or per contract terms:                      [Describe actual retention terms]

I. FINAL PAYMENT
   Final Contract Sum:                         $[amount]  (from F above)
   Less: Total Certified & Paid:              ($[amount])
   Less: Retention to be Released at DLP end: ($[amount]) [timing note]
   ──────────────────────────────────────────────────────────────────────
   AMOUNT DUE — FINAL CERTIFICATE:            $[amount]

J. RETENTION RELEASE SCHEDULE
   At PC (50% retention release):              $[amount]  Due: [date]
   At DLP end (remaining retention release):   $[amount]  Due: [date — DLP end date]
```

### Step 3: Update Budget Reconciliation

After finalising the contract, update the full TDC:

```
FINAL BUDGET RECONCILIATION
─────────────────────────────────────────────────────────
                              Budget     Final     Variance
Construction (final acct):    $[amount]  $[amount]  +/-$[X]
Professional fees:            $[amount]  $[amount]  +/-$[X]
Authority charges:            $[amount]  $[amount]  +/-$[X]
Finance costs:                $[amount]  $[amount]  +/-$[X]
Land & acquisition:           $[amount]  $[amount]  $0 (sunk)
Marketing & selling:          $[amount]  $[amount]  +/-$[X]
Contingency used:             $[amount]  $[amount]  +/-$[X]
─────────────────────────────────────────────────────────
TOTAL DEVELOPMENT COST:       $[amount]  $[amount]  +/-$[X]
Variance:                                           [X.X]%
─────────────────────────────────────────────────────────
Project Margin (final):                             [X.X]%
Target Margin:                                      [X.X]%
Margin Outcome:                          [ABOVE / BELOW / AT TARGET]
```

### Step 4: Lessons Learned — Financial

Record in PROJECT_MEMORY Activity Log and `process_learnings` table:
- Variance between pre-tender estimate and final account: $X (X%)
- Main sources of variation (top 3)
- Contingency adequacy assessment
- Any cost estimation accuracy improvements recommended

## Output Files

Save to: `outputs/reports/`
- `final-account-[project]-[date].xlsx` — final account statement + budget reconciliation
- `final-account-summary-[project]-[date].md` — narrative summary for PROJECT_MEMORY

## Update PROJECT_MEMORY After Completion

```
## Key Metrics (updated at project close)
- **Final Contract Sum:** $[amount]
- **Total Development Cost (Final):** $[amount]
- **Project Margin (Final):** [X.X]%
- **Contingency Used:** $[amount] of $[original] ([X]%)
```

Activity log entry:
`[DATE] [FINANCE] — Final account settled at $[amount]. TDC final $[amount] vs budget $[amount] ([X.X]% variance). Project margin [X.X]% vs target [X.X]%.`
