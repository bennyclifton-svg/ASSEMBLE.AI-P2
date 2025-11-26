# Data Model: Planning Card

## Entities

### Project (existing)
Represents a construction project (already exists in database).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| name | string | Yes | Project name |
| code | string | No | Project code (e.g., "PRJ-001") |
| status | enum | Yes | 'active', 'archived', 'pending' |

### ProjectDetails
Stores the 8 detail fields for a project.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| projectId | string | Yes | Foreign key to Project |
| projectName | string | Yes | Project name (denormalized for display) |
| address | string | Yes | Project address |
| legalAddress | string | No | Legal address (if different) |
| zoning | string | No | Zoning classification |
| jurisdiction | string | No | Local government jurisdiction |
| lotArea | number | No | Lot area in square meters |
| numberOfStories | number | No | Number of stories/floors |
| buildingClass | string | No | Building classification |
| updatedAt | timestamp | Yes | Last update timestamp |

### ProjectObjectives
Stores the 4 objective fields.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| projectId | string | Yes | Foreign key to Project |
| functional | text | No | Functional objectives |
| quality | text | No | Quality objectives |
| budget | text | No | Budget objectives |
| program | text | No | Program objectives |
| updatedAt | timestamp | Yes | Last update timestamp |

### ProjectStage
Represents each of the 5 project stages.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| projectId | string | Yes | Foreign key to Project |
| stageNumber | number | Yes | Stage number (1-5) |
| stageName | string | Yes | Stage name (e.g., "Initiation") |
| startDate | date | No | Stage start date |
| endDate | date | No | Stage end date |
| duration | number | No | Duration in days |
| status | enum | Yes | 'not_started', 'in_progress', 'completed' |
| updatedAt | timestamp | Yes | Last update timestamp |

### Risk
Represents individual risk items.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| projectId | string | Yes | Foreign key to Project |
| title | string | Yes | Risk title |
| description | text | No | Detailed description |
| likelihood | enum | No | 'low', 'medium', 'high' |
| impact | enum | No | 'low', 'medium', 'high' |
| mitigation | text | No | Mitigation strategy |
| status | enum | Yes | 'identified', 'mitigated', 'closed' |
| order | number | Yes | Display order |
| updatedAt | timestamp | Yes | Last update timestamp |

### Stakeholder
Represents project stakeholders.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| projectId | string | Yes | Foreign key to Project |
| name | string | Yes | Stakeholder name |
| role | string | No | Role/position |
| organization | string | No | Organization name |
| email | string | No | Email address |
| phone | string | No | Phone number |
| order | number | Yes | Display order |
| updatedAt | timestamp | Yes | Last update timestamp |

### ConsultantDiscipline
Represents a consultant discipline with toggle state.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| projectId | string | Yes | Foreign key to Project |
| disciplineName | string | Yes | Discipline name (e.g., "Architect") |
| isEnabled | boolean | Yes | Toggle state (on/off) |
| order | number | Yes | Display order |
| updatedAt | timestamp | Yes | Last update timestamp |

### ConsultantStatus
Tracks the 4 status states for each consultant discipline.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| disciplineId | string | Yes | Foreign key to ConsultantDiscipline |
| statusType | enum | Yes | 'brief', 'tender', 'rec', 'award' |
| isActive | boolean | Yes | Status active/inactive |
| completedAt | timestamp | No | When status was completed |
| updatedAt | timestamp | Yes | Last update timestamp |

### ContractorTrade
Represents a contractor trade with toggle state.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| projectId | string | Yes | Foreign key to Project |
| tradeName | string | Yes | Trade name (e.g., "Electrical") |
| isEnabled | boolean | Yes | Toggle state (on/off) |
| order | number | Yes | Display order |
| updatedAt | timestamp | Yes | Last update timestamp |

### ContractorStatus
Tracks the 4 status states for each contractor trade.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| tradeId | string | Yes | Foreign key to ContractorTrade |
| statusType | enum | Yes | 'brief', 'tender', 'rec', 'award' |
| isActive | boolean | Yes | Status active/inactive |
| completedAt | timestamp | No | When status was completed |
| updatedAt | timestamp | Yes | Last update timestamp |

### RevisionHistory
Stores change history for audit trail.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| projectId | string | Yes | Foreign key to Project |
| entityType | string | Yes | Entity type (e.g., "ProjectDetails") |
| entityId | string | Yes | ID of changed entity |
| fieldName | string | Yes | Name of changed field |
| oldValue | text | No | Previous value |
| newValue | text | No | New value |
| userId | string | Yes | User who made the change |
| userName | string | Yes | User name (denormalized) |
| createdAt | timestamp | Yes | When change was made |

### GISCache
Cached data from GIS APIs.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Unique identifier (UUID) |
| address | string | Yes | Normalized address (unique) |
| zoning | string | No | Zoning classification |
| jurisdiction | string | No | Jurisdiction |
| lotArea | number | No | Lot area |
| rawData | json | No | Full GIS response |
| cachedAt | timestamp | Yes | When data was cached |
| expiresAt | timestamp | Yes | Cache expiration |

## Relationships

```
Project (1) ──< (N) ProjectDetails
Project (1) ──< (N) ProjectObjectives
Project (1) ──< (N) ProjectStage
Project (1) ──< (N) Risk
Project (1) ──< (N) Stakeholder
Project (1) ──< (N) ConsultantDiscipline
Project (1) ──< (N) ContractorTrade

ConsultantDiscipline (1) ──< (N) ConsultantStatus
ContractorTrade (1) ──< (N) ContractorStatus

Project (1) ──< (N) RevisionHistory
```

## Default Data

### Consultant Disciplines (Default List)
1. Architect
2. Structural Engineer
3. Civil Engineer
4. Mechanical Engineer
5. Electrical Engineer
6. Hydraulic Engineer
7. Fire Engineer
8. Acoustic Consultant
9. Landscape Architect
10. Town Planner

### Contractor Trades (Default List)
1. Demolition
2. Earthworks
3. Concrete
4. Structural Steel
5. Brickwork
6. Carpentry
7. Roofing
8. Plumbing
9. Electrical
10. HVAC
11. Fire Protection
12. Painting
13. Flooring
14. Glazing
15. Landscaping
