/**
 * @deprecated PostgreSQL is the only supported database for SiteWise.au.
 *
 * This file remains as a short compatibility shim for older table imports.
 * Do not add table declarations, enums, or domain types here; import from
 * `@/lib/db`, `@/lib/db/pg-schema`, `@/types/*`, or validation modules.
 */

export * from './pg-schema';

