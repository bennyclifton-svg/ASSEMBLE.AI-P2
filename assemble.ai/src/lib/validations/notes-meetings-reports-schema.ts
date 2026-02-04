/**
 * Zod Validation Schemas for Notes, Meetings & Reports Module
 * Feature: 021-notes-meetings-reports
 *
 * This module provides validation schemas for all API endpoints
 * in the Notes, Meetings & Reports system.
 */

import { z } from 'zod';

// ============================================================================
// NOTES VALIDATION
// ============================================================================

export const noteColorSchema = z.enum(['yellow', 'blue', 'green', 'pink']);

export const createNoteSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  color: noteColorSchema.optional(),
});

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  isStarred: z.boolean().optional(),
  color: noteColorSchema.optional(),
  reportingPeriodStart: z.string().nullable().optional(),
  reportingPeriodEnd: z.string().nullable().optional(),
});

// ============================================================================
// MEETINGS VALIDATION
// ============================================================================

export const meetingAgendaTypeSchema = z.enum(['standard', 'detailed', 'custom']);

export const createMeetingSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  meetingDate: z.string().optional(),
  agendaType: meetingAgendaTypeSchema.optional(),
});

export const updateMeetingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  meetingDate: z.string().nullable().optional(),
  agendaType: meetingAgendaTypeSchema.optional(),
  reportingPeriodStart: z.string().nullable().optional(),
  reportingPeriodEnd: z.string().nullable().optional(),
});

export const stakeholderGroupSchema = z.enum(['client', 'authority', 'consultant', 'contractor']);

export const addAttendeeSchema = z.object({
  stakeholderId: z.string().min(1).optional(),  // Uses nanoid, not UUID
  adhocName: z.string().max(100).optional(),
  adhocFirm: z.string().max(100).optional(),
  adhocGroup: stakeholderGroupSchema.optional(),
  adhocSubGroup: z.string().max(100).optional(),
}).refine(
  data => data.stakeholderId || data.adhocName,
  { message: 'Either stakeholderId or adhocName must be provided' }
);

export const updateAttendeeSchema = z.object({
  isAttending: z.boolean().optional(),
  isDistribution: z.boolean().optional(),
});

export const updateSectionSchema = z.object({
  content: z.string().optional(),
  sectionLabel: z.string().min(1).max(100).optional(),
});

export const reorderSectionsSchema = z.object({
  sectionIds: z.array(z.string().uuid()),
});

export const generateSectionsSchema = z.object({
  agendaType: meetingAgendaTypeSchema,
});

// ============================================================================
// REPORTS VALIDATION
// ============================================================================

export const reportContentsTypeSchema = z.enum(['standard', 'detailed', 'custom']);

export const createReportSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(200).optional(),
  reportDate: z.string().optional(),
  preparedFor: z.string().max(200).optional(),
  preparedBy: z.string().max(200).optional(),
  contentsType: reportContentsTypeSchema.optional(),
});

export const updateReportSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  reportDate: z.string().nullable().optional(),
  preparedFor: z.string().max(200).nullable().optional(),
  preparedBy: z.string().max(200).nullable().optional(),
  contentsType: reportContentsTypeSchema.optional(),
  reportingPeriodStart: z.string().nullable().optional(),
  reportingPeriodEnd: z.string().nullable().optional(),
});

export const generateReportSectionsSchema = z.object({
  contentsType: reportContentsTypeSchema,
});

// ============================================================================
// SHARED VALIDATION
// ============================================================================

export const transmittalSaveSchema = z.object({
  documentIds: z.array(z.string().uuid()),
});

export const exportFormatSchema = z.enum(['pdf', 'docx']);

export const exportSchema = z.object({
  format: exportFormatSchema,
});

export const emailSchema = z.object({
  subject: z.string().max(200).optional(),
  includeAttachments: z.boolean().optional(),
});

// ============================================================================
// AI GENERATION VALIDATION
// ============================================================================

export const contextTypeSchema = z.enum(['meeting', 'report']);

export const generateContentSchema = z.object({
  projectId: z.string().min(1),
  sectionKey: z.string().min(1),
  sectionLabel: z.string().min(1),
  contextType: contextTypeSchema,
  contextId: z.string().min(1),
  reportingPeriodStart: z.string().optional(),
  reportingPeriodEnd: z.string().optional(),
  existingContent: z.string().optional(),
  stakeholderId: z.string().min(1).optional(),
});

export const toneSchema = z.enum(['professional', 'formal', 'concise']);

export const polishContentSchema = z.object({
  content: z.string().min(1),
  sectionKey: z.string().min(1),
  tone: toneSchema.optional(),
});

export const generateNoteContentSchema = z.object({
  noteId: z.string().min(1),
  projectId: z.string().min(1),
  existingContent: z.string().optional(),
  existingTitle: z.string().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
export type AddAttendeeInput = z.infer<typeof addAttendeeSchema>;
export type UpdateAttendeeInput = z.infer<typeof updateAttendeeSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type ReorderSectionsInput = z.infer<typeof reorderSectionsSchema>;
export type GenerateSectionsInput = z.infer<typeof generateSectionsSchema>;
export type CreateReportInput = z.infer<typeof createReportSchema>;
export type UpdateReportInput = z.infer<typeof updateReportSchema>;
export type GenerateReportSectionsInput = z.infer<typeof generateReportSectionsSchema>;
export type TransmittalSaveInput = z.infer<typeof transmittalSaveSchema>;
export type ExportInput = z.infer<typeof exportSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type GenerateContentInput = z.infer<typeof generateContentSchema>;
export type PolishContentInput = z.infer<typeof polishContentSchema>;
export type MeetingAgendaType = z.infer<typeof meetingAgendaTypeSchema>;
export type ReportContentsType = z.infer<typeof reportContentsTypeSchema>;
export type StakeholderGroup = z.infer<typeof stakeholderGroupSchema>;
export type ContextType = z.infer<typeof contextTypeSchema>;
export type Tone = z.infer<typeof toneSchema>;
export type ExportFormat = z.infer<typeof exportFormatSchema>;
export type GenerateNoteContentInput = z.infer<typeof generateNoteContentSchema>;
export type NoteColorInput = z.infer<typeof noteColorSchema>;
