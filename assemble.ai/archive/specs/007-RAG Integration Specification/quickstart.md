# Quickstart: RAG Document Intelligence

**Date**: 2025-11-29 | **Estimated Setup**: 30-45 minutes

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 20+ installed
- [ ] Docker and Docker Compose installed
- [ ] Access to API keys (see Environment Variables)

---

## 1. Environment Variables

Add the following to your `.env.local`:

```bash
# PostgreSQL (for pgvector)
POSTGRES_URL=postgresql://postgres:postgres@localhost:5433/assemble_rag
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=assemble_rag

# Redis (for BullMQ)
REDIS_URL=redis://localhost:6379

# Voyage AI (embeddings)
VOYAGE_API_KEY=your_voyage_api_key

# LlamaParse (document parsing)
LLAMA_CLOUD_API_KEY=your_llama_cloud_api_key

# Unstructured (fallback parsing)
UNSTRUCTURED_API_KEY=your_unstructured_api_key

# Cohere (fallback reranking)
COHERE_API_KEY=your_cohere_api_key

# BAAI Reranker (primary) - if using hosted service
# BAAI_API_URL=https://your-baai-endpoint
# BAAI_API_KEY=your_baai_key

# Anthropic (already configured)
ANTHROPIC_API_KEY=your_anthropic_api_key
```

### Getting API Keys

| Service | Sign Up | Pricing |
|---------|---------|---------|
| [Voyage AI](https://www.voyageai.com/) | Dashboard → API Keys | Pay-per-use |
| [LlamaCloud](https://cloud.llamaindex.ai/) | Free tier available | Free/Paid |
| [Unstructured](https://unstructured.io/) | API signup | Pay-per-page |
| [Cohere](https://cohere.com/) | Free trial available | Free tier |

---

## 2. Infrastructure Setup

### Option A: Docker Compose (Recommended)

Create `docker-compose.rag.yml` in project root:

```yaml
version: '3.8'

services:
  postgres-rag:
    image: pgvector/pgvector:pg16
    container_name: assemble-postgres-rag
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: assemble_rag
    ports:
      - "5433:5432"
    volumes:
      - postgres_rag_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: assemble-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_rag_data:
  redis_data:
```

Start services:

```bash
docker-compose -f docker-compose.rag.yml up -d
```

Verify:

```bash
# Check PostgreSQL
docker exec assemble-postgres-rag psql -U postgres -d assemble_rag -c "SELECT 1"

# Check Redis
docker exec assemble-redis redis-cli ping
```

### Option B: Manual Installation

<details>
<summary>PostgreSQL with pgvector</summary>

```bash
# macOS
brew install postgresql@16
brew services start postgresql@16

# Install pgvector
git clone https://github.com/pgvector/pgvector.git
cd pgvector
make
make install

# Create database
createdb assemble_rag
psql assemble_rag -c "CREATE EXTENSION vector"
```

</details>

<details>
<summary>Redis</summary>

```bash
# macOS
brew install redis
brew services start redis

# Linux
sudo apt-get install redis-server
sudo systemctl start redis
```

</details>

---

## 3. Install Dependencies

```bash
cd assemble.ai

# Install new dependencies
npm install \
  drizzle-orm pg \
  bullmq ioredis \
  @langchain/langgraph \
  llamaindex \
  voyageai \
  cohere-ai \
  pgvector
```

---

## 4. Database Migration

Create and run the PostgreSQL migration:

```bash
# Generate migration
npx drizzle-kit generate:pg --schema=./src/lib/db/rag-schema.ts --out=./drizzle/rag

# Run migration
npx drizzle-kit push:pg --config=drizzle.rag.config.ts
```

Or run SQL directly:

```bash
# Connect to PostgreSQL
docker exec -it assemble-postgres-rag psql -U postgres -d assemble_rag

# Run migration SQL from data-model.md
```

---

## 5. Start Background Worker

The document processing worker runs separately from Next.js:

```bash
# Development
npm run worker:dev

# Or directly
npx tsx watch ./workers/document-processor/index.ts
```

Add to `package.json`:

```json
{
  "scripts": {
    "worker:dev": "tsx watch ./workers/document-processor/index.ts",
    "worker:start": "node ./workers/document-processor/dist/index.js"
  }
}
```

---

## 6. Verify Setup

Run the health check:

```bash
curl http://localhost:3000/api/retrieval/health
```

Expected response:

```json
{
  "status": "healthy",
  "components": {
    "pgvector": { "status": "healthy", "latencyMs": 12 },
    "voyage": { "status": "healthy", "latencyMs": 234 },
    "baaiReranker": { "status": "healthy", "latencyMs": 156 },
    "cohereReranker": { "status": "healthy", "latencyMs": 189 }
  }
}
```

---

## 7. Test Document Sync

1. Upload a document via the UI
2. Select it and click "Sync to AI"
3. Watch the sync status change: `pending` → `processing` → `synced`
4. Check chunks in database:

```sql
SELECT id, section_title, token_count
FROM document_chunks
WHERE document_id = 'your-document-id'
LIMIT 10;
```

---

## 8. Test Report Generation

```bash
curl -X POST http://localhost:3000/api/reports/generate \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "your-project-id",
    "reportType": "tender_request",
    "title": "Fire Services Tender Request",
    "discipline": "Fire Services",
    "documentSetIds": ["your-document-set-id"]
  }'
```

---

## Troubleshooting

### PostgreSQL Connection Failed

```bash
# Check if running
docker ps | grep postgres-rag

# Check logs
docker logs assemble-postgres-rag

# Verify pgvector extension
docker exec assemble-postgres-rag psql -U postgres -d assemble_rag -c "SELECT extname FROM pg_extension WHERE extname = 'vector'"
```

### Redis Connection Failed

```bash
# Check if running
docker ps | grep redis

# Test connection
redis-cli ping
```

### Worker Not Processing

```bash
# Check worker logs
npm run worker:dev

# Check BullMQ queue
# Install Bull Board for monitoring
npm install @bull-board/express
```

### Embedding Errors

```bash
# Test Voyage API
curl -X POST https://api.voyageai.com/v1/embeddings \
  -H "Authorization: Bearer $VOYAGE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": "test", "model": "voyage-large-2-instruct"}'
```

---

## Development Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│ Terminal 1: Next.js                                             │
│ npm run dev                                                     │
├─────────────────────────────────────────────────────────────────┤
│ Terminal 2: Worker                                              │
│ npm run worker:dev                                              │
├─────────────────────────────────────────────────────────────────┤
│ Terminal 3: Docker services                                     │
│ docker-compose -f docker-compose.rag.yml up                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. [ ] Implement document sync UI component
2. [ ] Build Smart Context panel
3. [ ] Add report generation streaming
4. [ ] Configure HNSW index after initial load
5. [ ] Set up Bull Board for queue monitoring

See [tasks.md](./tasks.md) for the full implementation breakdown.
