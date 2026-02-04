import { z } from 'zod';

// Project Details Schema - allow empty strings for partial updates
export const projectDetailsSchema = z.object({
    projectName: z.string().optional(),
    address: z.string().optional(),
    legalAddress: z.string().optional(),
    zoning: z.string().optional(),
    jurisdiction: z.string().optional(),
    lotArea: z.union([z.number().positive(), z.string()]).optional(),
    numberOfStories: z.union([z.number().int().positive(), z.string()]).optional(),
    buildingClass: z.string().optional(),
    tenderReleaseDate: z.string().optional(),
});

// Project Objectives Schema
export const projectObjectivesSchema = z.object({
    functional: z.string().optional(),
    quality: z.string().optional(),
    budget: z.string().optional(),
    program: z.string().optional(),
});

// Project Stage Schema
export const projectStageSchema = z.object({
    stageNumber: z.number().int().min(1).max(5),
    stageName: z.string().min(1),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    duration: z.number().int().positive().optional(),
    status: z.enum(['not_started', 'in_progress', 'completed']),
});

// Risk Schema
export const riskSchema = z.object({
    title: z.string().min(1, 'Risk title is required'),
    description: z.string().optional(),
    likelihood: z.enum(['low', 'medium', 'high']).optional(),
    impact: z.enum(['low', 'medium', 'high']).optional(),
    mitigation: z.string().optional(),
    status: z.enum(['identified', 'mitigated', 'closed']),
});

// Stakeholder Schema
export const stakeholderSchema = z.object({
    name: z.string().min(1, 'Stakeholder name is required'),
    role: z.string().optional(),
    organization: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
});

// Consultant Status Schema
export const consultantStatusSchema = z.object({
    statusType: z.enum(['brief', 'tender', 'rec', 'award']),
    isActive: z.boolean(),
});

// Contractor Status Schema
export const contractorStatusSchema = z.object({
    statusType: z.enum(['brief', 'tender', 'rec', 'award']),
    isActive: z.boolean(),
});

// Inline Edit Field Schema (generic)
export const inlineEditSchema = z.object({
    value: z.string(),
});

// Type exports
export type ProjectDetailsInput = z.infer<typeof projectDetailsSchema>;
export type ProjectObjectivesInput = z.infer<typeof projectObjectivesSchema>;
export type ProjectStageInput = z.infer<typeof projectStageSchema>;
export type RiskInput = z.infer<typeof riskSchema>;
export type StakeholderInput = z.infer<typeof stakeholderSchema>;
export type ConsultantStatusInput = z.infer<typeof consultantStatusSchema>;
export type ContractorStatusInput = z.infer<typeof contractorStatusSchema>;
