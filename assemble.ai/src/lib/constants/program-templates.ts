// Program Module Templates (Feature 015)

import type { ProgramTemplate } from '@/types/program';

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
    {
        key: 'design',
        name: 'Design Phase',
        activities: [
            {
                name: 'Design Phase',
                children: [
                    'Concept Design',
                    'Schematic Design',
                    'Design Development',
                    'Documentation',
                ],
            },
        ],
    },
    {
        key: 'tender',
        name: 'Tender Phase',
        activities: [
            {
                name: 'Tender Phase',
                children: [
                    'Tender Preparation',
                    'Tender Period',
                    'Tender Evaluation',
                    'Contract Award',
                ],
            },
        ],
    },
    {
        key: 'construction',
        name: 'Construction Phase',
        activities: [
            {
                name: 'Construction Phase',
                children: [
                    'Mobilization',
                    'Structure',
                    'Fitout',
                    'Commissioning',
                    'Defects',
                ],
            },
        ],
    },
    {
        key: 'consultant',
        name: 'Consultant Engagement',
        activities: [
            {
                name: 'Consultant Engagement',
                children: [
                    'Brief',
                    'EOI',
                    'RFP',
                    'Evaluation',
                    'Appointment',
                ],
            },
        ],
    },
];

export function getTemplateByKey(key: string): ProgramTemplate | undefined {
    return PROGRAM_TEMPLATES.find((t) => t.key === key);
}
