# Data Model: Resizable Three-Column Layout

## Entities

### Project
Represents a construction project.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| name | string | Yes | Project name |
| code | string | No | Project code (e.g., "PRJ-001") |
| status | enum | Yes | 'active', 'archived', 'pending' |

### LayoutConfig (Client-Side)
Stores the user's session-based layout preferences.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| leftWidth | number | Yes | Width of Planning column (percentage) |
| centerWidth | number | Yes | Width of Consultant column (percentage) |
| rightWidth | number | Yes | Width of Document column (percentage) |

## Relationships

- A `Project` is the context for the dashboard.
- `LayoutConfig` is independent of `Project` in this MVP (global session preference), but could be scoped to Project in future.
