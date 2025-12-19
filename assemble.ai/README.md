# Assemble.ai

Enterprise project management and procurement platform for architectural and construction firms.

## Features

- **Project Management** - Dashboard with planning, objectives, stakeholders, and risk tracking
- **Document Management** - Upload, versioning, categorization, and transmittal schedules
- **Consultant & Contractor Management** - Manage disciplines, trades, firms, and procurement status
- **Cost Planning** - Excel-like interface with fiscal year allocations, variations, and invoices
- **Tender Evaluation** - AI-powered pricing extraction from tender PDFs using Claude
- **Report Generation** - TRR, RFT, Addendum reports with DOCX/PDF export
- **Knowledge Source** - Per-project RAG with auto-sync from Knowledge category tile and AI-assisted Brief generation

## Tech Stack

| Category | Technologies |
|----------|-------------|
| Frontend | Next.js 16, React 19, Tailwind CSS 4, Radix UI |
| Backend | Next.js API Routes, Drizzle ORM |
| Database | PostgreSQL + pgvector (Docker) |
| AI/ML | Anthropic Claude, Voyage AI embeddings, Cohere reranking |
| Storage | Supabase |
| Queue | BullMQ + Upstash Redis |

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL/Redis)
- npm

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment file:
   ```bash
   cp .env.example .env.local
   ```
4. Configure environment variables (see .env.example for required keys)

5. Start database services:
   ```bash
   npm run db:up
   ```

6. Push database schema:
   ```bash
   npm run db:push
   npm run db:rag:push
   ```

7. Start development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Environment Variables

Key services requiring configuration:

- **ANTHROPIC_API_KEY** - Claude AI for document parsing
- **SUPABASE_POSTGRES_URL** - PostgreSQL with pgvector
- **UPSTASH_REDIS_URL** - Redis for BullMQ job queue
- **VOYAGE_API_KEY** - Document embeddings
- **POLAR_ACCESS_TOKEN** - Subscription billing (optional)
- **SESSION_SECRET** - Session token signing

See `.env.example` for complete list.

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run db:up        # Start Docker containers
npm run db:push      # Push schema to PostgreSQL
npm run db:studio    # Open Drizzle Studio
npm run worker:dev   # Start background worker
```

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/    # Protected dashboard routes
│   ├── (public)/       # Public pages (landing, pricing)
│   └── api/            # API routes
├── components/         # React components
│   ├── consultants/    # Consultant management
│   ├── contractors/    # Contractor management
│   ├── cost-plan/      # Cost planning
│   ├── documents/      # Document management
│   ├── evaluation/     # Tender evaluation
│   └── reports/        # Report generation
└── lib/
    ├── db/             # Database schema and clients
    ├── hooks/          # React hooks
    └── services/       # Business logic
```

## License

Proprietary


## General Overview for Landing Page
### Revised Overview of ASSEMBLE.AI-P2 Application Intent

**Project Name:** ASSEMBLE.AI (Phase 2 / Prototype 2)

**Core Intent:**  
ASSEMBLE.AI is an enterprise-grade SaaS platform tailored for architectural and construction firms, focusing on comprehensive project management, procurement, and operational efficiency. It integrates AI capabilities to automate complex tasks like document analysis and knowledge retrieval, enabling firms to handle large-scale projects from planning to execution while reducing manual effort and improving accuracy. The platform serves as a centralized hub for managing workflows, costs, teams, and documentation in the architecture, engineering, and construction (AEC) industry.

**Key Features and Functionalities (Based on README Specifications):**
- **Project Management:** A robust dashboard for overseeing project planning, setting objectives, identifying stakeholders, and tracking risks to ensure projects stay on schedule and within scope.
- **Document Management:** Secure upload, versioning, categorization, and scheduling of transmittals for construction documents, drawings, and contracts, promoting collaboration and compliance.
- **Consultant & Contractor Management:** Tools to organize disciplines (e.g., structural, electrical), trades, firms, and procurement statuses, streamlining vendor selection and onboarding.
- **Cost Planning:** An intuitive, Excel-like interface for budgeting across fiscal years, managing variations, and processing invoices to maintain financial control.
- **Tender Evaluation:** AI-driven extraction of pricing data from tender PDFs using Claude (Anthropic's AI model), automating bid analysis for faster, more accurate evaluations.
- **Report Generation:** Automated creation of key reports like Tender Recommendation Reports (TRR), Requests for Tender (RFT), and Addendums, with export options to DOCX or PDF for professional deliverables.
- **Knowledge Source:** Project-specific Retrieval-Augmented Generation (RAG) system that auto-syncs from a dedicated knowledge tile, combined with AI-assisted generation of project briefs to provide contextual insights and decision support.

**Target Audience:**  
Architectural firms, construction companies, engineering teams, and project managers in the AEC sector who deal with complex, multi-stakeholder projects requiring procurement, cost oversight, and regulatory compliance. It's ideal for enterprises seeking to digitize and AI-optimize traditional workflows.

**Overall Goal:**  
To empower AEC professionals to "assemble" and execute projects seamlessly by combining traditional project management tools with cutting-edge AI integrations, ultimately reducing time-to-completion, minimizing errors in procurement and costing, and enhancing knowledge-driven decision-making in a high-stakes industry.

This revised overview incorporates the provided README specifications, highlighting the platform's focus on the AEC domain with AI enhancements. It overrides any prior assumptions about AI consulting and positions ASSEMBLE.AI as a specialized tool for construction efficiency. Use this as a prompt base for generating landing page copy, emphasizing benefits like AI automation, streamlined procurement, and enterprise scalability (e.g., for hero headlines, feature sections, and testimonials).