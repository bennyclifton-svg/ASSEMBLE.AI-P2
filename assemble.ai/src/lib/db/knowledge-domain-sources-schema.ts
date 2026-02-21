/**
 * Knowledge Domain Sources Schema
 *
 * Tracks provenance, versioning, and applicability of knowledge domain content.
 * Each record links to a documentSet and provides metadata about where the
 * domain content originated, its version, and which projects/states it applies to.
 */

import {
    pgTable,
    text,
    timestamp,
    boolean,
    jsonb,
    index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { documentSets } from './rag-schema';

export const knowledgeDomainSources = pgTable(
    'knowledge_domain_sources',
    {
        id: text('id').primaryKey(),
        documentSetId: text('document_set_id')
            .notNull()
            .references(() => documentSets.id, { onDelete: 'cascade' }),
        sourceType: text('source_type', {
            enum: ['prebuilt_seed', 'user_uploaded', 'organization_library'],
        }).notNull(),
        sourceVersion: text('source_version'), // e.g., "1.0.0", "NCC 2022"
        lastVerifiedAt: timestamp('last_verified_at'),
        applicableProjectTypes: text('applicable_project_types').array(),
        // e.g., ['refurb', 'extend', 'new']
        applicableStates: text('applicable_states').array(),
        // e.g., ['NSW', 'VIC', 'QLD']
        isActive: boolean('is_active').default(true),
        metadata: jsonb('metadata'), // Flexible field for additional provenance data
        createdAt: timestamp('created_at').defaultNow(),
        updatedAt: timestamp('updated_at').defaultNow(),
    },
    (table) => [
        index('idx_kds_document_set').on(table.documentSetId),
        index('idx_kds_source_type').on(table.sourceType),
        index('idx_kds_active').on(table.isActive),
        // GIN indexes for array columns will be created via raw SQL migration:
        // CREATE INDEX idx_kds_project_types ON knowledge_domain_sources USING GIN (applicable_project_types);
        // CREATE INDEX idx_kds_states ON knowledge_domain_sources USING GIN (applicable_states);
    ]
);

export const knowledgeDomainSourcesRelations = relations(knowledgeDomainSources, ({ one }) => ({
    documentSet: one(documentSets, {
        fields: [knowledgeDomainSources.documentSetId],
        references: [documentSets.id],
    }),
}));
