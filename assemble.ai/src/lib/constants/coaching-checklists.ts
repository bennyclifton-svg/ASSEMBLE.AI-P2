/**
 * Coaching Engine - Checklist Definitions
 *
 * 23 pre-built coaching checklists with ~130 items, organized by module.
 * Checklists are filtered by coaching category (derived from project type)
 * and lifecycle stage (derived from project staging).
 */

// ============================================
// Types
// ============================================

export const COACHING_CATEGORIES = [
    'residential',
    'multi_residential',
    'commercial',
    'industrial',
    'fitout',
    'advisory',
] as const;

export type CoachingCategory = (typeof COACHING_CATEGORIES)[number];

export const LIFECYCLE_STAGES = [
    'initiation',
    'design',
    'procurement',
    'delivery',
    'closeout',
    'always',
] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

export const COACHING_MODULES = [
    'cost_plan',
    'procurement',
    'program',
    'documents',
    'reports',
    'stakeholders',
] as const;

export type CoachingModule = (typeof COACHING_MODULES)[number];

export interface ChecklistItemTemplate {
    id: string;          // e.g., 'CP-01-1'
    label: string;       // Short action label
    description: string; // Detailed guidance text
}

export interface ChecklistTemplate {
    templateId: string;             // e.g., 'CP-01'
    title: string;
    module: CoachingModule;
    categories: CoachingCategory[] | 'ALL';
    stages: LifecycleStage[];
    items: ChecklistItemTemplate[];
    sortOrder: number;
}

// ============================================
// Project Type to Coaching Category Mapping
// ============================================

/**
 * Maps the project's initiator type (from the project creation wizard)
 * to one of the 6 coaching categories.
 */
export const PROJECT_TYPE_TO_CATEGORY: Record<string, CoachingCategory> = {
    // Residential
    'house': 'residential',
    'townhouses': 'residential',
    // Multi-residential
    'apartments': 'multi_residential',
    'apartments-btr': 'multi_residential',
    'student-housing': 'multi_residential',
    'retirement-living': 'multi_residential',
    // Commercial
    'office': 'commercial',
    'retail': 'commercial',
    // Industrial
    'industrial': 'industrial',
    // Fitout
    'fitout': 'fitout',
    'refurbishment': 'fitout',
    // Advisory
    'due-diligence': 'advisory',
    'feasibility': 'advisory',
    'remediation': 'advisory',
};

/**
 * Get the coaching category for a project based on its type.
 * Falls back to 'commercial' if the type is not mapped.
 */
export function getCoachingCategory(projectType: string | null | undefined): CoachingCategory {
    if (!projectType) return 'commercial';
    return PROJECT_TYPE_TO_CATEGORY[projectType] ?? 'commercial';
}

// ============================================
// COST PLAN MODULE CHECKLISTS
// ============================================

const CP_01: ChecklistTemplate = {
    templateId: 'CP-01',
    title: 'Budget Establishment',
    module: 'cost_plan',
    categories: 'ALL',
    stages: ['initiation', 'design'],
    sortOrder: 1,
    items: [
        { id: 'CP-01-1', label: 'Confirm cost plan sections match project structure', description: 'FEES, CONSULTANTS, CONSTRUCTION, CONTINGENCY sections should reflect your procurement route' },
        { id: 'CP-01-2', label: 'Verify each cost line has a budget value', description: 'Lines with $0 budget create misleading reports — enter estimates or mark as TBC' },
        { id: 'CP-01-3', label: 'Check contingency percentage is appropriate', description: 'Residential: 5-10%, Commercial: 8-10%, Remediation: 20-30%' },
        { id: 'CP-01-4', label: 'Confirm currency and GST settings', description: 'Check project settings for AUD/NZD and GST-inclusive/exclusive' },
        { id: 'CP-01-5', label: 'Link cost lines to stakeholders', description: 'Each line should map to a consultant discipline or contractor trade' },
        { id: 'CP-01-6', label: 'Enter approved contract values for awarded disciplines', description: 'Approved contract column should reflect signed contracts' },
    ],
};

const CP_02: ChecklistTemplate = {
    templateId: 'CP-02',
    title: 'Cost Monitoring',
    module: 'cost_plan',
    categories: 'ALL',
    stages: ['delivery'],
    sortOrder: 2,
    items: [
        { id: 'CP-02-1', label: 'Review forecast vs budget variance', description: 'Flag any line item where forecast exceeds budget by >5%' },
        { id: 'CP-02-2', label: 'Confirm all approved variations are entered', description: 'Cross-check variation register against correspondence' },
        { id: 'CP-02-3', label: 'Verify invoice amounts match progress claims', description: 'Invoice total per contractor should align with certified claims' },
        { id: 'CP-02-4', label: 'Check contingency drawdown rate', description: 'If >50% contingency spent before 50% construction complete, escalate' },
        { id: 'CP-02-5', label: 'Review provisional sum reconciliation', description: 'PS items should be reconciled as actual costs become known' },
        { id: 'CP-02-6', label: 'Update forecast completion cost', description: 'Ensure forecast = approved contract + approved variations + anticipated variations' },
    ],
};

const CP_03: ChecklistTemplate = {
    templateId: 'CP-03',
    title: 'Residential-Specific Cost Checks',
    module: 'cost_plan',
    categories: ['residential'],
    stages: ['design', 'procurement'],
    sortOrder: 3,
    items: [
        { id: 'CP-03-1', label: 'Confirm PC allowances are realistic for finishes', description: 'Kitchen ($15k-40k), Bathrooms ($10k-25k), Flooring ($5k-15k) — confirm with client selections' },
        { id: 'CP-03-2', label: 'Verify provisional sums are itemized, not lump', description: 'PS for site costs, landscaping, and services should be broken down' },
        { id: 'CP-03-3', label: 'Check landscape budget is adequate', description: 'Typically 3-8% of construction cost for residential' },
        { id: 'CP-03-4', label: 'Review site preparation allowance', description: 'Account for demolition, tree removal, excavation, retaining walls' },
        { id: 'CP-03-5', label: 'Confirm authority fee allowances', description: 'DA fees, CC fees, long service levy (0.35% in NSW), Section 94/7.12 contributions' },
    ],
};

const CP_04: ChecklistTemplate = {
    templateId: 'CP-04',
    title: 'Multi-Residential Cost Checks',
    module: 'cost_plan',
    categories: ['multi_residential'],
    stages: ['design', 'procurement'],
    sortOrder: 4,
    items: [
        { id: 'CP-04-1', label: 'Verify cost plan reflects unit mix and areas', description: 'Cross-check GFA and apartment count against architects area schedule' },
        { id: 'CP-04-2', label: 'Check demolition and site remediation allowances', description: 'Multi-res sites often have existing structures and contamination risk' },
        { id: 'CP-04-3', label: 'Confirm services infrastructure costs', description: 'Substation contribution, sewer augmentation, water main upgrade' },
        { id: 'CP-04-4', label: 'Review fire services cost allowance', description: 'SEPP 65 compliance, sprinklers (mandatory >25m effective height)' },
        { id: 'CP-04-5', label: 'Check basement/parking cost per space', description: 'Typically $50-80k per space for basement parking' },
        { id: 'CP-04-6', label: 'Verify facade cost rate against design intent', description: 'Unitised curtain wall vs. conventional cladding cost differential' },
    ],
};

const CP_05: ChecklistTemplate = {
    templateId: 'CP-05',
    title: 'Commercial / Industrial Cost Checks',
    module: 'cost_plan',
    categories: ['commercial', 'industrial'],
    stages: ['design', 'procurement'],
    sortOrder: 5,
    items: [
        { id: 'CP-05-1', label: 'Verify base building vs. fitout cost split', description: 'Ensure tenant works are excluded from base build cost plan' },
        { id: 'CP-05-2', label: 'Check ESD cost premium is included', description: 'Green Star / NABERS compliance typically adds 3-8%' },
        { id: 'CP-05-3', label: 'Confirm lift strategy cost alignment', description: 'Number of lifts, speed, and type (passenger/goods) affect cost significantly' },
        { id: 'CP-05-4', label: 'Review BMS and smart building allowances', description: 'Building management system costs for commercial: $40-80/m2' },
        { id: 'CP-05-5', label: 'Check loading dock and access infrastructure', description: 'Industrial: loading dock height, turning circles, hardstand spec' },
    ],
};

const CP_06: ChecklistTemplate = {
    templateId: 'CP-06',
    title: 'Fitout Cost Checks',
    module: 'cost_plan',
    categories: ['fitout'],
    stages: ['design', 'procurement'],
    sortOrder: 6,
    items: [
        { id: 'CP-06-1', label: 'Confirm landlord make-good obligations vs. new fitout scope', description: 'Clarify existing conditions and what stays/goes' },
        { id: 'CP-06-2', label: 'Separate FF&E budget from construction budget', description: 'Furniture, fixtures, and equipment should be tracked independently' },
        { id: 'CP-06-3', label: 'Verify AV/ICT allowance reflects specifications', description: 'Meeting rooms, collaboration spaces, AV infrastructure' },
        { id: 'CP-06-4', label: 'Check after-hours access and construction constraints', description: 'After-hours work typically adds 20-40% labour premium' },
        { id: 'CP-06-5', label: 'Review ceiling grid and services coordination', description: 'Existing plenum height may constrain services routing' },
    ],
};

const CP_07: ChecklistTemplate = {
    templateId: 'CP-07',
    title: 'Advisory / Remediation Cost Checks',
    module: 'cost_plan',
    categories: ['advisory'],
    stages: ['always'],
    sortOrder: 7,
    items: [
        { id: 'CP-07-1', label: 'Confirm fee estimates for all consultant scopes', description: 'Due diligence typically involves multiple specialist consultants' },
        { id: 'CP-07-2', label: 'Verify contingency reflects uncertainty level', description: 'Pre-acquisition: 25-40%, Post-RAP: 15-25%' },
        { id: 'CP-07-3', label: 'Check disposal cost rates are current', description: 'Contaminated soil disposal: check EPA levy rates and landfill capacity' },
        { id: 'CP-07-4', label: 'Include long-term monitoring cost allowance', description: 'Post-remediation monitoring can span 2-5 years' },
        { id: 'CP-07-5', label: 'Verify insurance and bond requirements', description: 'Performance bonds (5-10% of contract), professional indemnity' },
    ],
};

// ============================================
// PROCUREMENT MODULE CHECKLISTS
// ============================================

const PR_01: ChecklistTemplate = {
    templateId: 'PR-01',
    title: 'Pre-Tender Preparation',
    module: 'procurement',
    categories: 'ALL',
    stages: ['design', 'procurement'],
    sortOrder: 1,
    items: [
        { id: 'PR-01-1', label: 'Define scope of services for each discipline/trade', description: 'Brief services field should be complete before issuing RFT' },
        { id: 'PR-01-2', label: 'Set fee/price expectations in brief', description: 'Brief fee or scope price should reference budget allowance' },
        { id: 'PR-01-3', label: 'Identify minimum 3 firms per discipline/trade', description: 'Competition requires at least 3 tenderers; 4-5 preferred' },
        { id: 'PR-01-4', label: 'Verify insurance requirements are documented', description: 'PI, PL, WC minimums must be specified in RFT' },
        { id: 'PR-01-5', label: 'Confirm evaluation criteria and weightings', description: 'Price/non-price split defined before tender issue (typically 60/40 or 70/30)' },
        { id: 'PR-01-6', label: 'Prepare document set for RFT', description: 'Select relevant project documents to include in tender package' },
    ],
};

const PR_02: ChecklistTemplate = {
    templateId: 'PR-02',
    title: 'During Tender Period',
    module: 'procurement',
    categories: 'ALL',
    stages: ['procurement'],
    sortOrder: 2,
    items: [
        { id: 'PR-02-1', label: 'Log all tender queries', description: 'Use addenda to issue formal responses to tenderer questions' },
        { id: 'PR-02-2', label: 'Issue addenda for scope clarifications', description: 'Material changes must be formally communicated to all tenderers' },
        { id: 'PR-02-3', label: 'Check tender closing date hasn\'t passed', description: 'Ensure you evaluate before the window closes' },
        { id: 'PR-02-4', label: 'Confirm all shortlisted firms have submitted', description: 'Follow up with non-responsive firms before closing date' },
    ],
};

const PR_03: ChecklistTemplate = {
    templateId: 'PR-03',
    title: 'Tender Evaluation',
    module: 'procurement',
    categories: 'ALL',
    stages: ['procurement'],
    sortOrder: 3,
    items: [
        { id: 'PR-03-1', label: 'Complete non-price evaluation for all firms', description: 'Score methodology, experience, key personnel, program' },
        { id: 'PR-03-2', label: 'Complete price evaluation and normalize lump sums', description: 'Ensure all submissions are compared on same basis (incl/excl)' },
        { id: 'PR-03-3', label: 'Check for qualifications and exclusions', description: 'Flag any conditional pricing or scope exclusions in submissions' },
        { id: 'PR-03-4', label: 'Verify reference checks are completed', description: 'Minimum 2 references checked per recommended firm' },
        { id: 'PR-03-5', label: 'Prepare Tender Recommendation Report', description: 'TRR must document evaluation process and justify recommendation' },
        { id: 'PR-03-6', label: 'Compare recommended tender against budget', description: 'Ensure the recommended price is within cost plan allowance' },
    ],
};

const PR_04: ChecklistTemplate = {
    templateId: 'PR-04',
    title: 'Award and Appointment',
    module: 'procurement',
    categories: 'ALL',
    stages: ['procurement'],
    sortOrder: 4,
    items: [
        { id: 'PR-04-1', label: 'Confirm contract form is appropriate', description: 'AS4000, AS4902, ABIC, or bespoke — match to project risk profile' },
        { id: 'PR-04-2', label: 'Verify insurance certificates received', description: 'Current certificates for PI, PL, WC before signing' },
        { id: 'PR-04-3', label: 'Confirm security/bond arrangements', description: 'Bank guarantee or retention as per contract' },
        { id: 'PR-04-4', label: 'Update cost plan with approved contract value', description: 'Replace budget with actual contracted amounts' },
        { id: 'PR-04-5', label: 'Notify unsuccessful tenderers', description: 'Professional courtesy and compliance with some procurement policies' },
    ],
};

const PR_05: ChecklistTemplate = {
    templateId: 'PR-05',
    title: 'Residential Builder Checks',
    module: 'procurement',
    categories: ['residential'],
    stages: ['procurement'],
    sortOrder: 5,
    items: [
        { id: 'PR-05-1', label: 'Verify builder\'s license (QBCC/VBA/NSW Fair Trading)', description: 'License must be current and cover the project value' },
        { id: 'PR-05-2', label: 'Check Home Building Compensation Fund cover', description: 'Mandatory in NSW for residential work >$20,000' },
        { id: 'PR-05-3', label: 'Review fixed-price vs. cost-plus contract structure', description: 'Residential clients generally prefer fixed-price for certainty' },
        { id: 'PR-05-4', label: 'Verify payment schedule complies with SOPA', description: 'Progress payments must align with Security of Payment Act' },
        { id: 'PR-05-5', label: 'Check defect liability period terms', description: 'Residential: minimum 6 months, ideally 12 months' },
    ],
};

const PR_06: ChecklistTemplate = {
    templateId: 'PR-06',
    title: 'Multi-Residential / Commercial Procurement',
    module: 'procurement',
    categories: ['multi_residential', 'commercial'],
    stages: ['procurement'],
    sortOrder: 6,
    items: [
        { id: 'PR-06-1', label: 'Confirm head contractor prequalification requirements', description: 'Financial capacity, project value threshold, safety record' },
        { id: 'PR-06-2', label: 'Verify subcontractor procurement approach', description: 'Head contractor-managed or client-nominated subcontractors' },
        { id: 'PR-06-3', label: 'Check construction program is attached to contract', description: 'Program must be a contract document' },
        { id: 'PR-06-4', label: 'Confirm liquidated damages rate is appropriate', description: 'Typically $500-5,000/day depending on project value and type' },
        { id: 'PR-06-5', label: 'Review design responsibility allocation', description: 'Confirm D&C vs. traditional split in contract' },
    ],
};

// ============================================
// PROGRAM MODULE CHECKLISTS
// ============================================

const PG_01: ChecklistTemplate = {
    templateId: 'PG-01',
    title: 'Program Setup',
    module: 'program',
    categories: 'ALL',
    stages: ['initiation', 'design'],
    sortOrder: 1,
    items: [
        { id: 'PG-01-1', label: 'Create WBS with appropriate hierarchy', description: 'Activities should be grouped by phase/trade, not just listed flat' },
        { id: 'PG-01-2', label: 'Set project start and target completion dates', description: 'Anchor the program to known milestones (DA lodgement, lease start, etc.)' },
        { id: 'PG-01-3', label: 'Define critical path activities', description: 'Identify the longest chain of dependent activities' },
        { id: 'PG-01-4', label: 'Add key milestones', description: 'DA approval, CC issue, site possession, practical completion' },
        { id: 'PG-01-5', label: 'Set dependencies between activities', description: 'Finish-to-start dependencies capture real sequencing' },
        { id: 'PG-01-6', label: 'Confirm program aligns with cost plan stages', description: 'Each cost line\'s master stage should map to program phases' },
    ],
};

const PG_02: ChecklistTemplate = {
    templateId: 'PG-02',
    title: 'Program Monitoring',
    module: 'program',
    categories: 'ALL',
    stages: ['delivery'],
    sortOrder: 2,
    items: [
        { id: 'PG-02-1', label: 'Update actual start/finish dates weekly', description: 'Keep program current to track real progress' },
        { id: 'PG-02-2', label: 'Review critical path for delays', description: 'Any delay on critical path = project delay' },
        { id: 'PG-02-3', label: 'Check float consumption on non-critical activities', description: 'Negative float indicates slippage risk' },
        { id: 'PG-02-4', label: 'Verify contractor program aligns with master program', description: 'Subcontractor programs should nest within the master program' },
        { id: 'PG-02-5', label: 'Document delay events with causes', description: 'Record weather, supply chain, design change delays formally' },
    ],
};

const PG_03: ChecklistTemplate = {
    templateId: 'PG-03',
    title: 'Residential Program Milestones',
    module: 'program',
    categories: ['residential'],
    stages: ['always'],
    sortOrder: 3,
    items: [
        { id: 'PG-03-1', label: 'DA/CDC approval date set', description: 'Critical gate — all design must be approved before construction' },
        { id: 'PG-03-2', label: 'CC issuance tracked', description: 'Construction Certificate required before physical works begin' },
        { id: 'PG-03-3', label: 'Slab pour milestone', description: 'First major construction milestone — triggers progress claim' },
        { id: 'PG-03-4', label: 'Frame and roof milestone', description: 'Lock-up stage imminent after framing complete' },
        { id: 'PG-03-5', label: 'Lock-up stage', description: 'Weatherproof building — typically 40-50% of construction period' },
        { id: 'PG-03-6', label: 'Fixing stage', description: 'Internal linings, cabinetry, tiling' },
        { id: 'PG-03-7', label: 'Practical completion', description: 'Building ready for occupation' },
        { id: 'PG-03-8', label: 'Defect liability period end', description: 'Typically 6-12 months post-PC' },
    ],
};

const PG_04: ChecklistTemplate = {
    templateId: 'PG-04',
    title: 'Multi-Residential / Commercial Program Milestones',
    module: 'program',
    categories: ['multi_residential', 'commercial', 'industrial'],
    stages: ['always'],
    sortOrder: 4,
    items: [
        { id: 'PG-04-1', label: 'DA determination date', description: 'Track actual vs. estimated DA timeline' },
        { id: 'PG-04-2', label: 'CC/BA issue date', description: 'Construction commencement gate' },
        { id: 'PG-04-3', label: 'Demolition and site preparation completion', description: 'Often a separate early works contract' },
        { id: 'PG-04-4', label: 'Structural completion (top-out)', description: 'Highest floor slab poured — major milestone' },
        { id: 'PG-04-5', label: 'Facade completion', description: 'Building envelope sealed — enables internal works' },
        { id: 'PG-04-6', label: 'Services rough-in completion', description: 'Mechanical, electrical, hydraulic, fire' },
        { id: 'PG-04-7', label: 'Fit-out and finishes', description: 'Internal completion by zone or floor' },
        { id: 'PG-04-8', label: 'Practical completion', description: 'Building ready for occupation' },
        { id: 'PG-04-9', label: 'Defect liability period end', description: 'Typically 12 months for commercial' },
        { id: 'PG-04-10', label: 'Final completion', description: 'All defects resolved, bonds released' },
    ],
};

// ============================================
// DOCUMENTS MODULE CHECKLISTS
// ============================================

const DC_01: ChecklistTemplate = {
    templateId: 'DC-01',
    title: 'Document Management',
    module: 'documents',
    categories: 'ALL',
    stages: ['always'],
    sortOrder: 1,
    items: [
        { id: 'DC-01-1', label: 'Establish document category structure', description: 'Categories should reflect project disciplines and procurement stages' },
        { id: 'DC-01-2', label: 'Upload all RFT documents before tender issue', description: 'Tenderers need complete information — check document set' },
        { id: 'DC-01-3', label: 'Maintain current drawing register', description: 'Latest revision of all drawings should be uploaded and categorized' },
        { id: 'DC-01-4', label: 'Index all received tender submissions', description: 'Each firm\'s submission should be uploaded and linked to their profile' },
        { id: 'DC-01-5', label: 'File all consultant reports', description: 'Design reports, specialist reports, authority correspondence' },
        { id: 'DC-01-6', label: 'Ensure document sets are synced for RAG', description: 'Documents in knowledge repos should show "synced" status' },
    ],
};

const DC_02: ChecklistTemplate = {
    templateId: 'DC-02',
    title: 'Due Diligence / Advisory Documents',
    module: 'documents',
    categories: ['advisory'],
    stages: ['always'],
    sortOrder: 2,
    items: [
        { id: 'DC-02-1', label: 'Upload site survey/title search', description: 'Certificate of title, survey plan, easement details' },
        { id: 'DC-02-2', label: 'Upload contamination assessment reports', description: 'Phase 1 and Phase 2 ESA reports' },
        { id: 'DC-02-3', label: 'Upload planning certificates (149/10.7)', description: 'Section 10.7 certificate from council' },
        { id: 'DC-02-4', label: 'Upload existing condition reports', description: 'Building condition assessment, structural assessment' },
        { id: 'DC-02-5', label: 'Upload heritage assessment if applicable', description: 'Statement of Heritage Impact' },
        { id: 'DC-02-6', label: 'Upload lease documents if tenant project', description: 'Lease terms, make-good provisions, landlord requirements' },
    ],
};

// ============================================
// REPORTS MODULE CHECKLISTS
// ============================================

const RP_01: ChecklistTemplate = {
    templateId: 'RP-01',
    title: 'Report Preparation',
    module: 'reports',
    categories: 'ALL',
    stages: ['always'],
    sortOrder: 1,
    items: [
        { id: 'RP-01-1', label: 'Set correct reporting period dates', description: 'Reports should cover a specific reporting period (typically monthly)' },
        { id: 'RP-01-2', label: 'Review all section content before issuing', description: 'Read through each section for accuracy and completeness' },
        { id: 'RP-01-3', label: 'Cross-check cost figures against cost plan', description: 'Report cost commentary must match the actual cost plan data' },
        { id: 'RP-01-4', label: 'Verify program commentary reflects current status', description: 'Dates and progress percentages should be current' },
        { id: 'RP-01-5', label: 'Confirm risk register is up to date', description: 'Report risk section should reflect current risk assessment' },
        { id: 'RP-01-6', label: 'Include photographs if construction stage', description: 'Site photos should be dated and captioned' },
    ],
};

const RP_02: ChecklistTemplate = {
    templateId: 'RP-02',
    title: 'Meeting Preparation',
    module: 'reports',
    categories: 'ALL',
    stages: ['always'],
    sortOrder: 2,
    items: [
        { id: 'RP-02-1', label: 'Set meeting date and attendees', description: 'Confirm stakeholder attendance before distributing agenda' },
        { id: 'RP-02-2', label: 'Attach previous meeting minutes for reference', description: 'Continuity requires referencing prior actions' },
        { id: 'RP-02-3', label: 'Prepare agenda sections for each discipline', description: 'Each active discipline/trade should have a discussion point' },
        { id: 'RP-02-4', label: 'Include project documents in transmittal', description: 'Meeting participants need access to referenced documents' },
        { id: 'RP-02-5', label: 'Flag items requiring decision', description: 'Decision items should be prominently marked in agenda' },
    ],
};

// ============================================
// STAKEHOLDERS MODULE CHECKLISTS
// ============================================

const SH_01: ChecklistTemplate = {
    templateId: 'SH-01',
    title: 'Stakeholder Setup',
    module: 'stakeholders',
    categories: 'ALL',
    stages: ['initiation'],
    sortOrder: 1,
    items: [
        { id: 'SH-01-1', label: 'Add all client-side stakeholders', description: 'Owner, project manager, superintendent, QS' },
        { id: 'SH-01-2', label: 'Add all relevant authorities', description: 'Council, fire (FRNSW), transport, EPA, heritage' },
        { id: 'SH-01-3', label: 'Add all required consultant disciplines', description: 'Architecture, structural, services, specialist as needed' },
        { id: 'SH-01-4', label: 'Add all required contractor trades', description: 'Head contractor and/or trade packages as per procurement route' },
        { id: 'SH-01-5', label: 'Confirm contact details are complete', description: 'Name, email, phone for each stakeholder' },
        { id: 'SH-01-6', label: 'Set tender status for each procurement stakeholder', description: 'Initialize at "Brief" stage for new consultants/contractors' },
    ],
};

const SH_02: ChecklistTemplate = {
    templateId: 'SH-02',
    title: 'Authority Management',
    module: 'stakeholders',
    categories: 'ALL',
    stages: ['design', 'procurement'],
    sortOrder: 2,
    items: [
        { id: 'SH-02-1', label: 'Document submission requirements per authority', description: 'What each authority needs (DA, CC, BCA report, access report)' },
        { id: 'SH-02-2', label: 'Track submission dates and reference numbers', description: 'Submission ref and date should be entered for each lodgement' },
        { id: 'SH-02-3', label: 'Monitor approval status', description: 'Track pending/approved/rejected for each authority submission' },
        { id: 'SH-02-4', label: 'Flag conditions of consent', description: 'DA conditions that affect design or construction must be tracked' },
    ],
};

// ============================================
// ALL CHECKLIST TEMPLATES
// ============================================

export const ALL_CHECKLIST_TEMPLATES: ChecklistTemplate[] = [
    // Cost Plan
    CP_01, CP_02, CP_03, CP_04, CP_05, CP_06, CP_07,
    // Procurement
    PR_01, PR_02, PR_03, PR_04, PR_05, PR_06,
    // Program
    PG_01, PG_02, PG_03, PG_04,
    // Documents
    DC_01, DC_02,
    // Reports
    RP_01, RP_02,
    // Stakeholders
    SH_01, SH_02,
];

// ============================================
// Dynamic Checklist Rules
// ============================================

export type ChecklistCondition =
    | 'has_ps_items'
    | 'has_authorities'
    | 'state_is'
    | 'stage_is'
    | 'cost_line_has_contract'
    | 'contingency_below'
    | 'has_variations';

export type ChecklistAction =
    | 'hide'
    | 'highlight'
    | 'move_to_top'
    | 'auto_check'
    | 'show_warning';

export interface ChecklistRule {
    itemId: string;
    condition: ChecklistCondition;
    negate?: boolean;          // If true, rule fires when condition is FALSE
    conditionValue?: string;
    action: ChecklistAction;
    message?: string;
}

export const CHECKLIST_RULES: ChecklistRule[] = [
    // Hide PS reconciliation if no provisional sum items
    {
        itemId: 'CP-02-5',
        condition: 'has_ps_items',
        negate: true,
        action: 'hide',
        message: 'No provisional sum items in this project',
    },
    // Highlight contingency if below 5%
    {
        itemId: 'CP-02-4',
        condition: 'contingency_below',
        conditionValue: '5',
        action: 'highlight',
        message: 'Contingency is below 5% — review recommended',
    },
    // Show warning on contingency if below 5%
    {
        itemId: 'CP-02-4',
        condition: 'contingency_below',
        conditionValue: '5',
        action: 'show_warning',
        message: 'Contingency is below 5% — review recommended',
    },
    // Hide authority management items if no authorities
    {
        itemId: 'SH-02-1',
        condition: 'has_authorities',
        negate: true,
        action: 'hide',
        message: 'No authorities added to project',
    },
    {
        itemId: 'SH-02-2',
        condition: 'has_authorities',
        negate: true,
        action: 'hide',
        message: 'No authorities added to project',
    },
    {
        itemId: 'SH-02-3',
        condition: 'has_authorities',
        negate: true,
        action: 'hide',
        message: 'No authorities added to project',
    },
    {
        itemId: 'SH-02-4',
        condition: 'has_authorities',
        negate: true,
        action: 'hide',
        message: 'No authorities added to project',
    },
    // Move forecast update to top during delivery
    {
        itemId: 'CP-02-6',
        condition: 'stage_is',
        conditionValue: 'delivery',
        action: 'move_to_top',
    },
];

// ============================================
// Utility Functions
// ============================================

/**
 * Get all checklist templates applicable to a project.
 * Filters by coaching category and lifecycle stage.
 */
export function getChecklistsForProject(
    coachingCategory: CoachingCategory,
    currentStage: LifecycleStage
): ChecklistTemplate[] {
    return ALL_CHECKLIST_TEMPLATES.filter((template) => {
        // Check category match
        const categoryMatch =
            template.categories === 'ALL' ||
            template.categories.includes(coachingCategory);

        // Check stage match: show current stage + 'always' checklists
        const stageMatch =
            template.stages.includes('always') ||
            template.stages.includes(currentStage);

        return categoryMatch && stageMatch;
    });
}
