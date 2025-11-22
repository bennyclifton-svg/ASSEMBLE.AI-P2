'use client';

import { InlineEditField } from './InlineEditField';

interface ObjectivesSectionProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
}

export function ObjectivesSection({ projectId, data, onUpdate }: ObjectivesSectionProps) {
    const updateField = async (field: string, value: string) => {
        const payload = {
            functional: data?.functional,
            quality: data?.quality,
            budget: data?.budget,
            program: data?.program,
            [field]: value,
        };

        await fetch(`/api/planning/${projectId}/objectives`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        onUpdate();
    };

    return (
        <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
            <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Objectives</h3>
            <div className="space-y-4">
                <InlineEditField
                    label="Functional"
                    value={data?.functional || ''}
                    onSave={(v) => updateField('functional', v)}
                    placeholder="Enter functional objectives"
                    multiline
                />
                <InlineEditField
                    label="Quality"
                    value={data?.quality || ''}
                    onSave={(v) => updateField('quality', v)}
                    placeholder="Enter quality objectives"
                    multiline
                />
                <InlineEditField
                    label="Budget"
                    value={data?.budget || ''}
                    onSave={(v) => updateField('budget', v)}
                    placeholder="Enter budget objectives"
                    multiline
                />
                <InlineEditField
                    label="Program"
                    value={data?.program || ''}
                    onSave={(v) => updateField('program', v)}
                    placeholder="Enter program objectives"
                    multiline
                />
            </div>
        </div>
    );
}
