\u003c!--
Sync Impact Report - Constitution Update
Version: 1.1.0 → 1.2.0
Change Type: MINOR (Added new core principle)
Date: 2025-11-22

Modified Principles:
- Added "IX. Spreadsheet-Native UX"

Added Sections:
- Principle IX details

Removed Sections:
- None

Templates Requiring Updates:
- ✅ plan-template.md - Constitution Check section aligns with principles
- ✅ spec-template.md - Requirements and success criteria align with domain focus
- ✅ tasks-template.md - Task organization supports AI-first and domain principles

Follow-up TODOs:
- None
--\u003e

# assemble.ai Constitution

## Core Principles

### I. Intelligent Document Repository

**assemble.ai** MUST provide a robust, NotebookLM-inspired document system as the foundation of all workflows.

**Rules:**
- **Drag-and-Drop Ingestion**: System MUST support drag-and-drop for multiple files simultaneously (up to 20MB per file).
- **Automatic Version Control**: System MUST automatically detect and track versions (V1, V2) based on filename matching (e.g., "Plans_L1_V1.pdf" -> "Plans_L1_V2.pdf").
- **Flexible Context Selection**: Users MUST be able to select specific combinations of files/versions for different tenders or tasks.
- **Source of Truth**: The repository is the single source of truth for all AI processing.

**Rationale:** Construction projects rely on hundreds of evolving documents. Managing these versions and selecting the right subset for each tender is the critical first step before any AI processing can occur.

---

### II. Domain-First Intelligence

**assemble.ai** MUST prioritize construction domain expertise in all features. The platform is not a generic project management tool—it is a construction-specific AI assistant.

**Rules:**
- All AI features MUST understand construction terminology, workflows, and document types
- Generic solutions that ignore construction context are REJECTED
- Features MUST reduce manual work specific to construction tender preparation
- User interfaces MUST use construction industry language, not generic PM terms

**Rationale:** The core value proposition is eliminating construction-specific manual work. Generic tools already exist and have failed to solve this problem.

---

### III. AI-Powered Automation

AI is not optional—it is the primary mechanism for value delivery. Manual processes are the problem we're solving.

**Rules:**
- Document ingestion MUST use AI to extract structured data
- Tender package generation MUST be AI-driven with intelligent document collation
- Brief generation MUST produce project-specific, focused content (not generic templates)
- Tender evaluation MUST provide both quantitative and qualitative AI analysis
- All automation MUST be transparent—users can see what the AI did and why

**Rationale:** The 50% time waste comes from manual assembly work. AI automation is the only scalable solution for small firms managing 3-5 concurrent projects.

---

### IV. Financial Visibility Throughout Lifecycle

Cost tracking is not an afterthought—it is a first-class concern from project inception through delivery.

**Rules:**
- Financial data MUST flow seamlessly: Preliminary Cost → Tender Award → Cost Tracking
- Real-time cost visibility MUST be available at all project stages
- Budget vs. actual tracking MUST be automatic, not manual reconciliation
- Cost overruns MUST be flagged proactively, not discovered retroactively
- All financial features MUST integrate with tender and project workflows

**Rationale:** Cost overruns stem from undefined scopes and lack of visibility. Financial tracking must be embedded in the workflow, not bolted on.

---

### V. Small Firm Optimization

Features MUST be designed for 1-5 person construction management firms, not enterprise organizations.

**Rules:**
- Onboarding MUST be simple—no multi-week training programs
- Features MUST enable one PM to manage 3-5 active projects concurrently
- Pricing MUST be accessible to small firms (not enterprise-only)
- Workflows MUST reduce administrative overhead, not add complexity
- No features that require dedicated IT staff or infrastructure teams

**Rationale:** Small firms lack resources for complex tools. The platform must be immediately useful without extensive setup or training.

---

### VI. Sharp, Actionable Outputs

All generated content MUST be specific, focused, and actionable—not generic boilerplate.

**Rules:**
- Tender briefs MUST be project-specific, referencing actual project details
- Generated scopes MUST be clear and testable, reducing variation potential
- Email communications MUST be professional and context-aware
- Document collation MUST be intelligent, not just file concatenation
- All outputs MUST be readable and usable by consultants/contractors without clarification

**Rationale:** Generic, bloated briefs are the current problem. AI-generated content must be demonstrably better than manual work.

---

### VII. Integration Over Isolation

**assemble.ai** MUST work with existing tools, not replace them entirely.

**Rules:**
- Document import MUST support common formats (PDF, Word, Excel, CAD references)
- Email dispatch MUST integrate with standard email providers
- File storage MAY integrate with existing solutions (Dropbox, Google Drive) where beneficial
- Export capabilities MUST allow data portability
- No vendor lock-in—users can extract their data at any time

**Rationale:** Small firms already use tools like Dropbox and email. The platform should enhance their workflow, not force wholesale replacement.

---

### VIII. Test-Driven Quality

Testing is mandatory for all critical workflows, especially AI-driven features.

**Rules:**
- All AI document processing MUST have validation tests
- Tender generation workflows MUST have end-to-end tests
- Financial calculations MUST have comprehensive unit tests
- Email dispatch and communication features MUST have integration tests
- Breaking changes MUST be caught by tests before deployment

**Rationale:** AI features can fail silently or produce incorrect results. Automated testing ensures reliability and catches regressions.

---

### IX. Spreadsheet-Native UX

**assemble.ai** MUST utilize Excel-like interfaces for data-heavy interactions, recognizing that spreadsheets are the lingua franca of construction.

**Rules:**
- **FortuneSheet Integration**: Data grids MUST utilize FortuneSheet (or similar open-source alternative) to provide a familiar spreadsheet experience.
- **Target Modules**: This is MANDATORY for Tender Evaluation (Quantitative) and Cost Planning modules.
- **Interaction Model**: Users MUST be able to perform standard spreadsheet actions (copy/paste, drag-to-fill, cell editing) where appropriate.
- **Data Density**: Interfaces MUST support high information density for financial data, avoiding "whitespace-heavy" modern web trends in these specific modules.

**Rationale:** Construction professionals spend their lives in Excel. Forcing them into paginated, low-density web tables for financial work reduces productivity and adoption.

---

## Development Workflow

### Code Review
- All code changes MUST be reviewed before merging to main branch
- Reviews MUST verify alignment with constitution principles
- AI-generated code MUST be validated for construction domain accuracy

### Branching Strategy
- Feature branches for all new development
- Branch naming: `[number]-[feature-name]` (e.g., `001-tender-generation`)
- Main branch MUST always be deployable

### CI/CD Requirements
- Automated tests MUST pass before merge
- Linting and formatting MUST be enforced
- Deployment to staging MUST be automatic on main branch merge

---

## Performance \u0026 Scale Expectations

### User Scale
- Platform MUST support 100+ concurrent users (small firm focus, but room to grow)
- Individual PM MUST be able to manage 3-5 active projects without performance degradation

### Response Times
- Document upload and AI processing: \u003c 30 seconds for typical tender documents
- Tender package generation: \u003c 2 minutes for standard packages
- UI interactions: \u003c 500ms for standard page loads
- Real-time cost updates: \u003c 1 second after data entry

### Data Volume
- Support projects with 100+ documents per tender package
- Handle 50+ active projects per firm
- Retain historical project data for 7+ years (construction industry standard)

---

## Security \u0026 Compliance

### Data Protection
- All project data MUST be encrypted at rest and in transit
- User authentication MUST be secure (OAuth2 or equivalent)
- Role-based access control MUST be enforced (PM, consultant, contractor roles)
- Audit logs MUST track all financial and tender-related actions

### Construction Industry Requirements
- Document retention MUST comply with construction industry standards (7+ years)
- Tender submissions MUST maintain confidentiality until award
- Financial data MUST be accurate and auditable

---

## Governance

### Constitution Authority
This constitution supersedes all other development practices and decisions. When in doubt, refer to these principles.

### Amendment Process
1. Proposed changes MUST be documented with rationale
2. Changes MUST be reviewed by project stakeholders
3. Version number MUST be incremented per semantic versioning:
   - **MAJOR**: Backward-incompatible principle changes or removals
   - **MINOR**: New principles or material expansions
   - **PATCH**: Clarifications, wording fixes, non-semantic refinements
4. All dependent templates MUST be updated for consistency

### Compliance Review
- All feature specifications MUST reference relevant constitution principles
- Implementation plans MUST include a "Constitution Check" section
- Code reviews MUST verify alignment with principles
- Violations MUST be justified in writing (see plan-template.md Complexity Tracking)

### Complexity Justification
Any architectural complexity or deviation from simplicity MUST be explicitly justified:
- Why is the complexity needed?
- What simpler alternative was rejected and why?
- How does this serve the core principles?

---

**Version**: 1.2.0 | **Ratified**: 2025-11-22 | **Last Amended**: 2025-11-22
