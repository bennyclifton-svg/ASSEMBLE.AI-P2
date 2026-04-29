---
name: milestone-tracking
tier: 1
description: Tier 1 skill — milestone tracking against baseline. Program Agent uses general knowledge to compare actuals vs baseline, calculate variance, and flag slippage. No scaffold required.
agent: program
---

# Skill: Milestone Tracking

**Tier 1 — No scaffold required.** The Program Agent tracks milestones using the baseline programme and actual/forecast dates from project data. This skill is a reference document, not a scaffold — the agent operates from its training knowledge and project context.

## When This Skill Applies

- Recording an achieved milestone date
- Updating a forecast milestone date
- Checking programme status
- Asking "how are we tracking?" or "are we on time?"

## What the Program Agent Does

1. **Read** the current baseline programme from PROJECT_MEMORY or `outputs/trackers/`
2. **Compare** each milestone: baseline vs actual (if achieved) or forecast (if future)
3. **Calculate variance** = forecast/actual date − baseline date (positive = late, negative = early)
4. **Flag** any milestone where variance exceeds watchdog thresholds (5 days amber, 15 days red, 30 days critical)
5. **Check critical path** — flag whether slipping milestones are on the critical path
6. **Update** PROJECT_MEMORY Key Metrics with current forecast completion date and programme variance
7. **Write alert** to watchdog if thresholds breached

## Milestone Status Format

```
| Milestone              | Baseline    | Actual/Forecast | Variance   | Status        |
|------------------------|-------------|-----------------|------------|---------------|
| [milestone name]       | [date]      | [date] (A)      | [+/-X days]| ✅ ON TIME    |
| [milestone name]       | [date]      | [date] (F)      | [+X days]  | ⚠ AMBER      |
| [milestone name]       | [date]      | [date] (F)      | [+X days]  | 🔴 RED        |
| [milestone name]       | [date]      | [date] (F)      | [+X days]  | 🚨 CRITICAL   |
```
(A) = Actual achieved | (F) = Current forecast

## Updating PROJECT_MEMORY

After every milestone update, write:

```markdown
## Key Metrics (updated)
- **Target Completion:** [baseline PC date]
- **Current Forecast Completion:** [current forecast PC date]
- **Programme Variance:** [+/- X days / X weeks]
```

Activity log entry:
`[DATE] [PROGRAM] — [Milestone name] [achieved on date / forecast revised to date]. Variance [X days] vs baseline. [Critical path note if applicable.]`
