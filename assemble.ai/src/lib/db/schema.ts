/**
 * @deprecated PostgreSQL is the only supported database for SiteWise.au.
 *
 * This file remains as a short compatibility shim while older imports are
 * migrated. Do not add table declarations here; import from `@/lib/db` or
 * `@/lib/db/pg-schema` for new code.
 */

export * from './pg-schema';

export const stakeholderGroupEnum = ['client', 'authority', 'consultant', 'contractor'] as const;
export type StakeholderGroup = (typeof stakeholderGroupEnum)[number];

export const tenderStatusTypeEnum = ['brief', 'tender', 'rec', 'award'] as const;
export type TenderStatusType = (typeof tenderStatusTypeEnum)[number];

export const submissionStatusEnum = [
    'pending',
    'submitted',
    'approved',
    'rejected',
    'withdrawn',
] as const;
export type SubmissionStatus = (typeof submissionStatusEnum)[number];

export const meetingAgendaTypeEnum = ['standard', 'detailed', 'custom'] as const;
export type MeetingAgendaType = (typeof meetingAgendaTypeEnum)[number];

export const reportContentsTypeEnum = ['standard', 'detailed', 'custom'] as const;
export type ReportContentsType = (typeof reportContentsTypeEnum)[number];

