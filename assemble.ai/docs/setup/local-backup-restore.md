# Local Backup and Restore

This is the first project backup format for the local/private Sitewise appliance. It is deliberately a smokeable recovery path, not a full archive product.

## Create a Backup

```bash
npm run project:backup -- --project-id <project-id>
```

By default this writes a zip file to `.sitewise-backups/`. You can choose a path:

```bash
npm run project:backup -- --project-id <project-id> --out .sitewise-backups/my-project.zip
```

The backup contains:

- `manifest.json` with project identity, backup format version, app version, schema markers, creation time, included table counts, and local file payload metadata
- `data/project-records.json` with project-scoped database rows
- `files/` with local `uploads/` payloads referenced by backed-up file assets

## Restore a Backup

```bash
npm run project:restore -- --backup .sitewise-backups/my-project.zip
```

Restore creates a clean project namespace with new row ids so the original project can remain in the same database. You can pin the restored project id or display name:

```bash
npm run project:restore -- --backup .sitewise-backups/my-project.zip --project-id restored-project-id --project-name "My Project Restored"
```

If the target database uses a different organization id, pass it explicitly:

```bash
npm run project:restore -- --backup .sitewise-backups/my-project.zip --organization-id <org-id>
```

## Smoke Verification

Run this after local bootstrap:

```bash
npm run local:backup-smoke
```

The smoke check creates a temporary project with a document file in local storage, backs it up, deletes the file payload, restores into a second project namespace, verifies the restored file content, then cleans up the temporary rows and file.

## Current Coverage

Included in this first format:

- project shell, details, profile, objectives, stages, risks, and stakeholder records
- cost plan rows, allocations, comments, variations, invoices, and snapshots
- program activities, dependencies, milestones, expected outputs, and evidence links
- document repository metadata, versions, linked transmittals, and local file payloads
- notes, meetings, reports, addenda, RFT records, briefing sessions, and correspondence records

Not covered yet:

- auth users, organizations, billing, model/provider secrets, and global company records
- RAG chunks, embeddings, generated report workspace state, and queue/Redis state
- cloud/Supabase storage payload retrieval
- incremental, encrypted, scheduled, or remote backups
- cross-version migration guarantees beyond recording the source schema marker

Restore is intended for an initialized local/private database with the current schema already applied. If the backup came from a different app/schema version, inspect `manifest.json` before restoring.
