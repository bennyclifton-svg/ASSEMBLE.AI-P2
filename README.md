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
