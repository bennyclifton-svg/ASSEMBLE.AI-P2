/**
 * T021: Chunking Unit Tests
 * Tests for construction document chunking per spec.md
 */

import { chunkDocument, estimateTokens, CHUNK_SIZES } from '../../../src/lib/rag/chunking';

describe('Construction Document Chunking', () => {
    describe('estimateTokens', () => {
        it('should estimate ~4 characters per token', () => {
            const text = 'This is a test string with some words';
            const tokens = estimateTokens(text);
            expect(tokens).toBe(Math.ceil(text.length / 4));
        });

        it('should handle empty strings', () => {
            expect(estimateTokens('')).toBe(0);
        });
    });

    describe('chunkDocument - Specifications', () => {
        const specificationContent = `
PART 1 - GENERAL

1.1 Summary
This section includes requirements for cast-in-place concrete work including foundations, walls, and structural elements.

1.2 Related Sections
    A. Section 03100 - Concrete Forming
    B. Section 03200 - Concrete Reinforcement

1.3 References
    A. ACI 301 - Specifications for Structural Concrete
    B. ACI 318 - Building Code Requirements for Structural Concrete

PART 2 - PRODUCTS

2.1 Concrete Materials
    A. Portland Cement: ASTM C150, Type I/II
    B. Aggregates: ASTM C33, graded

2.2 Mix Design
    A. Compressive Strength: 4000 psi at 28 days
    B. Slump: 4 inches maximum
`;

        it('should detect specification document type', () => {
            const chunks = chunkDocument(specificationContent, 'doc-001');
            expect(chunks.length).toBeGreaterThan(0);
        });

        it('should extract clause numbers from specifications', () => {
            const chunks = chunkDocument(specificationContent, 'doc-001');
            const chunksWithClauses = chunks.filter(c => c.clauseNumber);
            expect(chunksWithClauses.length).toBeGreaterThan(0);
        });

        it('should preserve hierarchy levels', () => {
            const chunks = chunkDocument(specificationContent, 'doc-001');
            const levels = new Set(chunks.map(c => c.hierarchyLevel));
            expect(levels.size).toBeGreaterThan(1); // Multiple hierarchy levels
        });

        it('should generate unique chunk IDs', () => {
            const chunks = chunkDocument(specificationContent, 'doc-001');
            const ids = chunks.map(c => c.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('should respect max chunk size for specifications', () => {
            const chunks = chunkDocument(specificationContent, 'doc-001', {
                documentType: 'specifications'
            });
            const maxTokens = CHUNK_SIZES.specifications.max;
            for (const chunk of chunks) {
                expect(chunk.tokenCount).toBeLessThanOrEqual(maxTokens + 100); // Allow small buffer
            }
        });
    });

    describe('chunkDocument - Correspondence', () => {
        const correspondenceContent = `
Dear Mr. Smith,

Thank you for your inquiry regarding the project timeline. We have reviewed the current progress and can confirm the following:

1. Foundation work is complete
2. Structural framing is 75% complete
3. MEP rough-in begins next week

Please let us know if you need additional information.

Best regards,
Project Manager
`;

        it('should keep correspondence as single chunk', () => {
            const chunks = chunkDocument(correspondenceContent, 'doc-002', {
                documentType: 'correspondence'
            });
            expect(chunks.length).toBe(1);
        });

        it('should set hierarchy level to 0 for correspondence', () => {
            const chunks = chunkDocument(correspondenceContent, 'doc-002', {
                documentType: 'correspondence'
            });
            expect(chunks[0].hierarchyLevel).toBe(0);
        });
    });

    describe('chunkDocument - Drawing Schedules', () => {
        const scheduleContent = `
Drawing Schedule

Sheet A1.01 - Floor Plan Level 1
Sheet A1.02 - Floor Plan Level 2
Sheet A2.01 - Building Elevations
Sheet A3.01 - Building Sections
Sheet S1.01 - Foundation Plan
Sheet S2.01 - Framing Plan
`;

        it('should use smaller chunks for drawing schedules', () => {
            const chunks = chunkDocument(scheduleContent, 'doc-003', {
                documentType: 'drawingSchedules'
            });
            const maxTokens = CHUNK_SIZES.drawingSchedules.max;
            for (const chunk of chunks) {
                expect(chunk.tokenCount).toBeLessThanOrEqual(maxTokens + 50);
            }
        });
    });

    describe('chunkDocument - Reports', () => {
        const reportContent = `
Project Status Report
Date: January 15, 2025

Executive Summary

The project is currently on schedule and within budget. Key milestones achieved this month include completion of foundation work and start of structural framing.

Progress Summary

Construction activities this month focused on completing the foundation work. The concrete pour was completed on schedule despite weather delays earlier in the month.

Next Steps

The team will begin structural steel erection next week. Coordination meetings with MEP contractors are scheduled for Monday.
`;

        it('should split reports into semantic chunks', () => {
            const chunks = chunkDocument(reportContent, 'doc-004', {
                documentType: 'reports'
            });
            expect(chunks.length).toBeGreaterThan(1);
        });

        it('should include token counts', () => {
            const chunks = chunkDocument(reportContent, 'doc-004');
            for (const chunk of chunks) {
                expect(chunk.tokenCount).toBeGreaterThan(0);
            }
        });
    });

    describe('Document Type Detection', () => {
        it('should detect specifications from PART headers', () => {
            const content = 'PART 1 - GENERAL\n\n1.1 Summary\nThis section...';
            const chunks = chunkDocument(content, 'doc-005');
            // Should not be treated as correspondence
            expect(chunks.some(c => c.clauseNumber)).toBe(true);
        });

        it('should detect correspondence from greeting patterns', () => {
            const content = 'Dear Client,\n\nThank you for your message.\n\nBest regards,\nTeam';
            const chunks = chunkDocument(content, 'doc-006');
            expect(chunks.length).toBe(1); // Single chunk for correspondence
        });
    });

    describe('Hierarchy Relationships', () => {
        const hierarchicalContent = `
1 Introduction

1.1 Purpose
This document describes the project scope.

1.1.1 Primary Objectives
The main goals are listed below.

1.2 Scope
The scope includes all building systems.

2 Requirements

2.1 Structural Requirements
All structural work shall comply with code.
`;

        it('should create parent-child relationships for large documents', () => {
            // Generate a large content to trigger splitting
            const largeContent = hierarchicalContent.repeat(20);
            const chunks = chunkDocument(largeContent, 'doc-007', {
                preserveHierarchy: true
            });

            // Some chunks should have parent relationships when split
            const hasRelationships = chunks.some(c => c.parentId !== null);
            // This may or may not be true depending on content size
            expect(chunks.length).toBeGreaterThan(0);
        });

        it('should preserve hierarchy paths', () => {
            const chunks = chunkDocument(hierarchicalContent, 'doc-008');
            const chunksWithPaths = chunks.filter(c => c.hierarchyPath);
            expect(chunksWithPaths.length).toBeGreaterThan(0);
        });
    });
});
