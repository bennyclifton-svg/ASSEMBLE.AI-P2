# AI Prompt Architecture Redesign + TRR Generation

**Date**: 2026-02-16
**Status**: Approved for implementation

## Problem

All 13 AI content generation features use prompts crammed into the `user` message with no system prompt separation. The identity is a generic "professional project management assistant" across all features. Section prompts are vague one-liners that don't specify structure, audience, or output format.

## Solution

### 1. Shared System Prompt Foundation

Every AI call gets a **system message** with a shared PM persona:

```
You are an experienced construction project management professional working on projects in Australia. You write in the first person plural ("we recommend", "our assessment") as though you are part of the project management team.

PROFESSIONAL CONTEXT:
- You work within the Australian construction industry (NCC, Australian Standards, state planning frameworks)
- Your audience is project stakeholders: clients, consultants, contractors, and authorities
- You communicate like a senior PM — direct, factual, action-oriented
- You never pad content with filler or generic statements

WRITING STYLE:
- Lead with the most important information (inverted pyramid)
- Use active voice: "We instructed the contractor" not "The contractor was instructed"
- Be specific: "$45,000 over budget" not "slightly over budget"
- Flag risks and decisions needed — don't bury them
- When data is missing, state what's needed rather than inventing facts
- When making professional inferences, mark them: "[Based on typical Class 2 projects...]" or "[Subject to confirmation...]"

FORMATTING:
- Use bullet points for lists of 3+ items
- Use bold for key figures, dates, and decision points
- Keep paragraphs to 2-3 sentences maximum
- No headers unless the section is longer than 200 words
```

### 2. Feature-Specific System Prompt Layers

Each feature appends context-specific instructions to the system message:

- **Meeting Agenda**: Forward-looking, frames discussion topics, highlights decisions needed
- **Project Report**: Formal status reporting, evidence-based, third-person for reports
- **Note Content**: Internal working document, extract/synthesize from sources
- **RFT Sections**: Procurement document, precise/unambiguous, legally significant
- **TRR Fields**: Evidence-based recommendation, traceable to evaluation data

### 3. Enriched Section Prompts

Replace one-liner section prompts with structured templates that specify:
- Output structure (paragraphs, bullets, tables)
- What to include and what to omit
- How to handle missing data
- Audience expectations

### 4. TRR AI Generation (NEW)

New dedicated endpoint `/api/trr/[id]/generate` that:
- Fetches evaluation price data, non-price scores, firms, addenda
- Generates Executive Summary, Clarifications, or Recommendation
- Uses field-specific prompt templates with rich project context
- Returns generated content + metadata about sources used

### 5. Model Selection

- **Content Generation** (meetings, reports, TRR): `claude-sonnet-4` (quality matters)
- **RFT Section Generation**: Upgrade from `claude-haiku-4.5` to `claude-sonnet-4` for external-facing documents
- **Extraction** (invoices, variations, planning): Keep `claude-haiku-4.5` (speed/cost)

## Implementation Plan

### Step 1: Create shared prompt module
- New file: `src/lib/prompts/system-prompts.ts`
- Export BASE_SYSTEM_PROMPT and feature-specific prompt builders
- Export enriched SECTION_PROMPTS

### Step 2: Update ai-content-generation.ts
- Add system message to Anthropic API calls
- Use feature-specific system prompts for meetings vs reports
- Replace SECTION_PROMPTS with enriched versions

### Step 3: Update note-content-generation.ts
- Add system message
- Use note-specific system prompt

### Step 4: Update generate-section.ts (LangGraph RFT)
- Add system message with RFT-specific prompt
- Upgrade model to claude-sonnet-4

### Step 5: Create TRR generation endpoint
- New route: `/api/trr/[id]/generate`
- Fetch evaluation data, non-price scores, firms, addenda
- Field-specific prompt templates (executiveSummary, clarifications, recommendation)
- Return generated content + sources metadata

### Step 6: Wire up TRR frontend
- Enable AI generation in TRRShortTab
- Pass enableAIGeneration, fieldType, projectId, stakeholderId to TRREditableSection

### Step 7: Update field-types.ts
- Add TRR-specific prompt templates
- Remove generic fallbacks for TRR fields
