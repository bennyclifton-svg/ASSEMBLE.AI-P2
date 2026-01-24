/**
 * Notes, Meetings & Reports Module Types
 * Feature: 021-notes-meetings-reports
 *
 * This module provides type definitions for the Notes, Meetings & Reports system
 * that enables project communication capture and reporting.
 */

import type { Stakeholder } from './stakeholder';

// Forward declarations for related types
interface Document {
  id: string;
  name: string;
  category: string;
  revision?: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  address?: string;
}

// ============================================================================
// NOTES TYPES
// ============================================================================

export interface Note {
  id: string;
  projectId: string;
  organizationId: string;
  title: string;
  content: string | null;
  isStarred: boolean;
  reportingPeriodStart: string | null;
  reportingPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface NoteWithTransmittals extends Note {
  transmittals: NoteTransmittal[];
}

export interface NoteTransmittal {
  id: string;
  noteId: string;
  documentId: string;
  addedAt: string;
  document?: Document;
}

export interface CreateNoteRequest {
  projectId: string;
  title?: string;
  content?: string;
}

export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  isStarred?: boolean;
  reportingPeriodStart?: string | null;
  reportingPeriodEnd?: string | null;
}

// ============================================================================
// MEETINGS TYPES
// ============================================================================

export type MeetingAgendaType = 'standard' | 'detailed' | 'custom';

export const MEETING_AGENDA_TYPES: MeetingAgendaType[] = ['standard', 'detailed', 'custom'];

export const MEETING_AGENDA_TYPE_LABELS: Record<MeetingAgendaType, string> = {
  standard: 'Standard',
  detailed: 'Detailed',
  custom: 'Custom',
};

export interface Meeting {
  id: string;
  projectId: string;
  organizationId: string;
  title: string;
  meetingDate: string | null;
  agendaType: MeetingAgendaType;
  reportingPeriodStart: string | null;
  reportingPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface MeetingWithDetails extends Meeting {
  sections: MeetingSection[];
  attendees: MeetingAttendee[];
  transmittals: MeetingTransmittal[];
  project?: Project;
}

export interface MeetingSection {
  id: string;
  meetingId: string;
  sectionKey: string;
  sectionLabel: string;
  content: string | null;
  sortOrder: number;
  parentSectionId: string | null;
  stakeholderId: string | null;
  createdAt: string;
  updatedAt: string;
  childSections?: MeetingSection[];
  stakeholder?: Stakeholder;
}

export interface MeetingAttendee {
  id: string;
  meetingId: string;
  stakeholderId: string | null;
  adhocName: string | null;
  adhocFirm: string | null;
  adhocGroup: string | null;
  adhocSubGroup: string | null;
  isAttending: boolean;
  isDistribution: boolean;
  createdAt: string;
  stakeholder?: Stakeholder;
}

export interface MeetingTransmittal {
  id: string;
  meetingId: string;
  documentId: string;
  addedAt: string;
  document?: Document;
}

export interface CreateMeetingRequest {
  projectId: string;
  title?: string;
  meetingDate?: string;
  agendaType?: MeetingAgendaType;
}

export interface UpdateMeetingRequest {
  title?: string;
  meetingDate?: string;
  agendaType?: MeetingAgendaType;
  reportingPeriodStart?: string | null;
  reportingPeriodEnd?: string | null;
}

export interface AddAttendeeRequest {
  stakeholderId?: string;
  adhocName?: string;
  adhocFirm?: string;
  adhocGroup?: string;
  adhocSubGroup?: string;
}

export interface UpdateAttendeeRequest {
  isAttending?: boolean;
  isDistribution?: boolean;
}

export interface UpdateSectionRequest {
  content?: string;
  sectionLabel?: string;
}

export interface ReorderSectionsRequest {
  sectionIds: string[];
}

export interface GenerateSectionsRequest {
  agendaType: MeetingAgendaType;
}

// ============================================================================
// REPORTS TYPES
// ============================================================================

export type ReportContentsType = 'standard' | 'detailed' | 'custom';

export const REPORT_CONTENTS_TYPES: ReportContentsType[] = ['standard', 'detailed', 'custom'];

export const REPORT_CONTENTS_TYPE_LABELS: Record<ReportContentsType, string> = {
  standard: 'Standard',
  detailed: 'Detailed',
  custom: 'Custom',
};

export interface Report {
  id: string;
  projectId: string;
  organizationId: string;
  title: string;
  reportDate: string | null;
  preparedFor: string | null;
  preparedBy: string | null;
  contentsType: ReportContentsType;
  reportingPeriodStart: string | null;
  reportingPeriodEnd: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface ReportWithDetails extends Report {
  sections: ReportSection[];
  attendees: ReportAttendee[];
  transmittals: ReportTransmittal[];
  project?: Project;
}

export interface ReportSection {
  id: string;
  reportId: string;
  sectionKey: string;
  sectionLabel: string;
  content: string | null;
  sortOrder: number;
  parentSectionId: string | null;
  stakeholderId: string | null;
  createdAt: string;
  updatedAt: string;
  childSections?: ReportSection[];
  stakeholder?: Stakeholder;
}

export interface ReportAttendee {
  id: string;
  reportId: string;
  stakeholderId: string | null;
  adhocName: string | null;
  adhocFirm: string | null;
  adhocGroup: string | null;
  adhocSubGroup: string | null;
  isAttending: boolean;
  isDistribution: boolean;
  createdAt: string;
  stakeholder?: Stakeholder;
}

export interface ReportTransmittal {
  id: string;
  reportId: string;
  documentId: string;
  addedAt: string;
  document?: Document;
}

export interface CreateReportRequest {
  projectId: string;
  title?: string;
  reportDate?: string;
  preparedFor?: string;
  preparedBy?: string;
  contentsType?: ReportContentsType;
}

export interface UpdateReportRequest {
  title?: string;
  reportDate?: string;
  preparedFor?: string;
  preparedBy?: string;
  contentsType?: ReportContentsType;
  reportingPeriodStart?: string | null;
  reportingPeriodEnd?: string | null;
}

export interface GenerateReportSectionsRequest {
  contentsType: ReportContentsType;
}

// ============================================================================
// AI GENERATION TYPES
// ============================================================================

export type AIContextType = 'meeting' | 'report';
export type AITone = 'professional' | 'formal' | 'concise';

export interface GenerateContentRequest {
  projectId: string;
  sectionKey: string;
  sectionLabel: string;
  contextType: AIContextType;
  contextId: string;
  reportingPeriodStart?: string;
  reportingPeriodEnd?: string;
  existingContent?: string;
  stakeholderId?: string;
}

export interface GenerateContentResponse {
  content: string;
  sourcesUsed: {
    notes: number;
    procurementDocs: number;
  };
}

export interface PolishContentRequest {
  content: string;
  sectionKey: string;
  tone?: AITone;
}

export interface PolishContentResponse {
  content: string;
}

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface TransmittalSaveRequest {
  documentIds: string[];
}

export type ExportFormat = 'pdf' | 'docx';

export interface ExportRequest {
  format: ExportFormat;
}

export interface EmailRequest {
  subject?: string;
  includeAttachments?: boolean;
}

// ============================================================================
// LIST RESPONSE TYPES
// ============================================================================

export interface NotesListResponse {
  notes: Note[];
  total: number;
}

export interface MeetingsListResponse {
  meetings: Meeting[];
  total: number;
}

export interface ReportsListResponse {
  reports: Report[];
  total: number;
}

// ============================================================================
// SECTION DEFINITION TYPES
// ============================================================================

export interface SectionDefinition {
  key: string;
  label: string;
  sortOrder: number;
}

export interface DetailedSectionMapping {
  procurement: readonly string[];
  planning_authorities: readonly string[];
  design: readonly string[];
}
