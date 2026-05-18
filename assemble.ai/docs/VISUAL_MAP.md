# Sitewise Visual Architecture Map

This map reflects the current local/private appliance shape after the May 14 RFI and setup work.

## Route Map

```mermaid
graph TD
    subgraph Public["Public"]
        LP["/"]
        PR["/pricing"]
        LG["/login"]
        RG["/register"]
        ST["/setup/status"]
    end

    subgraph Workspace["Authenticated Workspace"]
        PJ["/projects"]
        PW["/projects/[projectId]"]
        CP["/projects/[projectId]/cost-plan"]
        AD["/admin"]
    end

    subgraph APIs["Key APIs"]
        H["/api/health"]
        RFI["/api/projects/[projectId]/rfis"]
        RFX["/api/projects/[projectId]/rfis/[rfiId]/exports"]
        MEM["/api/projects/[projectId]/ai-memory"]
        WR["/api/projects/[projectId]/weekly-report-draft"]
    end

    LP --> LG
    LG --> PJ
    PJ --> PW
    PW --> CP
    ST --> H
    PW --> RFI
    PW --> MEM
    PW --> WR
    RFI --> RFX
```

## Local Appliance

```mermaid
flowchart LR
    User["PM in browser"] --> Next["Next.js app"]
    Next --> DB[("PostgreSQL + pgvector")]
    Next --> Redis[("Redis")]
    Next --> Files["Local uploads storage"]
    Next --> Model["Model providers"]
    Redis --> DocWorker["Document worker"]
    Redis --> DrawWorker["Drawing worker"]
    DocWorker --> DB
    DocWorker --> Files
    DrawWorker --> DB
    DrawWorker --> Files
    Health["/api/health and /setup/status"] --> Next
    Backup["project backup/restore"] --> DB
    Backup --> Files
```

## Workspace Domains

```mermaid
mindmap
    root((Sitewise))
        Project Truth
            Project profile
            Objectives
            Stakeholders
            Documents
            Stored files
        Cost And Program
            Cost plan
            Variations
            Invoices
            Program activities
            Milestones
            Risks
        Communication
            Notes
            Meetings
            Reports
            Weekly report draft
            Correspondence
            Transmittals
        RFI Pilot
            Typed register
            Evidence links
            Response lifecycle
            Audit trail
            Versioned exports
            Action-backed AI draft
        AI Boundary
            Context assembly
            RAG excerpts
            Advisory memory
            Approval gates
            Action registry
```

## Typed RFI Flow

```mermaid
sequenceDiagram
    participant PM
    participant UI as RFI Register UI
    participant API as RFI API
    participant Service as RFI Service
    participant DB as PostgreSQL
    participant Storage

    PM->>UI: Create or edit RFI
    UI->>API: POST/PATCH typed RFI fields
    API->>Service: validate project/org scope
    Service->>DB: write rfi_records
    API-->>UI: RFI with reference, display state, row version

    PM->>UI: Link evidence
    UI->>API: POST evidence target
    API->>Service: validate document/note/correspondence target
    Service->>DB: write rfi_evidence_links

    PM->>UI: Record response / close / reopen
    UI->>API: lifecycle action
    Service->>DB: update rfi_records and rfi_audit_events

    PM->>UI: Generate PDF/DOCX
    UI->>API: POST export format
    Service->>Storage: store rendered artefact
    Service->>DB: append rfi_issued_artefacts version
```

## Agent Write Boundary

```mermaid
flowchart TD
    Chat["Chat / specialist / workflow"] --> ActionTool["Action-backed tool"]
    ActionTool --> Registry["Application Action Registry"]
    Registry --> Preview["Validation and proposed diff"]
    Preview --> Approval["Explicit approval card"]
    Approval --> Apply["Action apply handler"]
    Apply --> Domain["Domain service"]
    Domain --> DB[("PostgreSQL")]
    Apply --> Events["Project events"]
    Apply --> Audit["Action invocation / audit trail"]
```

## Weekly Report Draft

```mermaid
flowchart TD
    Start["Weekly draft button or create_weekly_report_draft"] --> Action["Registered action"]
    Action --> Generator["weekly-report-draft service"]
    Generator --> Context["assembleContext"]
    Generator --> RFI["Typed RFI read model"]
    Context --> Records["Project records"]
    Context --> Rag["Document/RAG excerpts"]
    Context --> Memory["Approved AI memory - advisory"]
    Generator --> Model["Generation model"]
    Model --> Normalize["Normalize facts, assumptions, recommendations, questions"]
    Normalize --> Report["Draft report and sections"]
```
