import { ProjectTypeId } from './project-types';

export interface ProgramActivityTemplate {
  name: string;
  phase: string;
  durationWeeks: number;
  dependencies?: string[];
  isMilestone?: boolean;
}

export const programTemplates: Record<ProjectTypeId, ProgramActivityTemplate[]> = {
  house: [
    { name: 'Briefing & Site Analysis', phase: 'Pre-Design', durationWeeks: 3, isMilestone: false },
    { name: 'Schematic Design', phase: 'Design', durationWeeks: 5, dependencies: ['Briefing & Site Analysis'] },
    { name: 'Development Approval', phase: 'Approvals', durationWeeks: 12, dependencies: ['Schematic Design'], isMilestone: true },
    { name: 'Construction Documentation', phase: 'Documentation', durationWeeks: 6, dependencies: ['Development Approval'] },
    { name: 'Tender & Award', phase: 'Procurement', durationWeeks: 5, dependencies: ['Construction Documentation'], isMilestone: true },
    { name: 'Construction', phase: 'Construction', durationWeeks: 40, dependencies: ['Tender & Award'] },
    { name: 'Practical Completion', phase: 'Completion', durationWeeks: 2, dependencies: ['Construction'], isMilestone: true },
    { name: 'Defects Liability Period', phase: 'Post-Construction', durationWeeks: 52, dependencies: ['Practical Completion'] }
  ],

  apartments: [
    { name: 'Feasibility & Brief', phase: 'Pre-Design', durationWeeks: 10, isMilestone: false },
    { name: 'Concept Design', phase: 'Design', durationWeeks: 8, dependencies: ['Feasibility & Brief'] },
    { name: 'Schematic Design', phase: 'Design', durationWeeks: 10, dependencies: ['Concept Design'] },
    { name: 'Development Approval', phase: 'Approvals', durationWeeks: 36, dependencies: ['Schematic Design'], isMilestone: true },
    { name: 'Design Development', phase: 'Design', durationWeeks: 14, dependencies: ['Development Approval'] },
    { name: 'Construction Documentation', phase: 'Documentation', durationWeeks: 18, dependencies: ['Design Development'] },
    { name: 'Marketing & Pre-Sales', phase: 'Marketing', durationWeeks: 26, dependencies: ['Schematic Design'] },
    { name: 'Procurement & Contract', phase: 'Procurement', durationWeeks: 14, dependencies: ['Construction Documentation', 'Marketing & Pre-Sales'], isMilestone: true },
    { name: 'Construction', phase: 'Construction', durationWeeks: 90, dependencies: ['Procurement & Contract'] },
    { name: 'Practical Completion', phase: 'Completion', durationWeeks: 16, dependencies: ['Construction'], isMilestone: true },
    { name: 'Defects Liability Period', phase: 'Post-Construction', durationWeeks: 104, dependencies: ['Practical Completion'] }
  ],

  fitout: [
    { name: 'Briefing & Surveys', phase: 'Pre-Design', durationWeeks: 2, isMilestone: false },
    { name: 'Concept Design', phase: 'Design', durationWeeks: 3, dependencies: ['Briefing & Surveys'] },
    { name: 'Design Development', phase: 'Design', durationWeeks: 4, dependencies: ['Concept Design'] },
    { name: 'Documentation', phase: 'Documentation', durationWeeks: 3, dependencies: ['Design Development'] },
    { name: 'Building Approval', phase: 'Approvals', durationWeeks: 4, dependencies: ['Documentation'], isMilestone: true },
    { name: 'Procurement', phase: 'Procurement', durationWeeks: 4, dependencies: ['Documentation'] },
    { name: 'Construction', phase: 'Construction', durationWeeks: 10, dependencies: ['Building Approval', 'Procurement'] },
    { name: 'FF&E & Move-in', phase: 'Completion', durationWeeks: 2, dependencies: ['Construction'], isMilestone: true }
  ],

  industrial: [
    { name: 'Brief & Feasibility', phase: 'Pre-Design', durationWeeks: 6, isMilestone: false },
    { name: 'Concept Design', phase: 'Design', durationWeeks: 5, dependencies: ['Brief & Feasibility'] },
    { name: 'Development Approval', phase: 'Approvals', durationWeeks: 16, dependencies: ['Concept Design'], isMilestone: true },
    { name: 'Construction Documentation', phase: 'Documentation', durationWeeks: 8, dependencies: ['Development Approval'] },
    { name: 'Procurement', phase: 'Procurement', durationWeeks: 8, dependencies: ['Construction Documentation'], isMilestone: true },
    { name: 'Construction', phase: 'Construction', durationWeeks: 32, dependencies: ['Procurement'] },
    { name: 'Commissioning & Handover', phase: 'Completion', durationWeeks: 4, dependencies: ['Construction'], isMilestone: true }
  ],

  remediation: [
    { name: 'Site Assessment (Phase 1 & 2 ESA)', phase: 'Investigation', durationWeeks: 8, isMilestone: false },
    { name: 'Remediation Action Plan', phase: 'Planning', durationWeeks: 8, dependencies: ['Site Assessment (Phase 1 & 2 ESA)'], isMilestone: true },
    { name: 'Procurement', phase: 'Procurement', durationWeeks: 6, dependencies: ['Remediation Action Plan'] },
    { name: 'Remediation Works', phase: 'Works', durationWeeks: 16, dependencies: ['Procurement'] },
    { name: 'Validation Sampling', phase: 'Validation', durationWeeks: 6, dependencies: ['Remediation Works'] },
    { name: 'Site Audit', phase: 'Audit', durationWeeks: 6, dependencies: ['Validation Sampling'], isMilestone: true }
  ]
};
