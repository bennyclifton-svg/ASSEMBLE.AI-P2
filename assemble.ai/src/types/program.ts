// Program Module Types (Feature 015)

export type DependencyType = 'FS' | 'SS' | 'FF';

export interface ProgramActivity {
    id: string;
    projectId: string;
    parentId: string | null;
    name: string;
    startDate: string | null;
    endDate: string | null;
    collapsed: boolean;
    color: string | null;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
    // Computed/joined fields
    children?: ProgramActivity[];
    milestones?: ProgramMilestone[];
    expectedOutputs?: ProgramActivityExpectedOutput[];
    evidenceLinks?: ProgramActivityEvidenceLink[];
}

export interface ProgramDependency {
    id: string;
    projectId: string;
    fromActivityId: string;
    toActivityId: string;
    type: DependencyType;
    createdAt: string;
}

export interface ProgramMilestone {
    id: string;
    activityId: string;
    name: string;
    date: string;
    sortOrder: number;
    createdAt: string;
}

export type ProgramEvidenceType = 'document' | 'correspondence' | 'database_record';
export type ProgramEvidenceLinkStatus = 'candidate' | 'confirmed' | 'rejected';

export interface ProgramActivityExpectedOutput {
    id: string;
    projectId: string;
    activityId: string;
    label: string;
    description: string | null;
    evidenceType: ProgramEvidenceType | null;
    isRequired: boolean;
    sortOrder: number;
    createdAt: string;
    updatedAt: string;
}

export interface ProgramActivityEvidenceLink {
    id: string;
    projectId: string;
    activityId: string;
    expectedOutputId: string | null;
    evidenceType: ProgramEvidenceType;
    evidenceId: string;
    databaseEntityType: string | null;
    status: ProgramEvidenceLinkStatus;
    confidence: number | null;
    note: string | null;
    linkedBy: string;
    createdAt: string;
    updatedAt: string;
}

// API Request/Response Types
export interface CreateActivityRequest {
    name: string;
    parentId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
}

export interface UpdateActivityRequest {
    name?: string;
    parentId?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    collapsed?: boolean;
    sortOrder?: number;
}

export interface CreateDependencyRequest {
    fromActivityId: string;
    toActivityId: string;
    type: DependencyType;
}

export interface CreateMilestoneRequest {
    name: string;
    date: string;
}

export interface ReorderActivitiesRequest {
    activities: Array<{
        id: string;
        parentId: string | null;
        sortOrder: number;
    }>;
}

export interface InsertTemplateRequest {
    templateKey: string;
    insertAfterActivityId?: string;
}

// Full program data response
export interface ProgramData {
    activities: ProgramActivity[];
    dependencies: ProgramDependency[];
    milestones: ProgramMilestone[];
}

// Template structure
export interface ProgramTemplate {
    key: string;
    name: string;
    activities: Array<{
        name: string;
        children?: string[];
    }>;
}

// Zoom level
export type ZoomLevel = 'week' | 'month';

// Color palette for auto-assignment
export const PROGRAM_COLORS = [
    '#6B7280', // Gray
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#14B8A6', // Teal
] as const;
