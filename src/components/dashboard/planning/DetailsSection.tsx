'use client';

import { InlineEditField } from './InlineEditField';

interface DetailsSectionProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
}

export function DetailsSection({ projectId, data, onUpdate }: DetailsSectionProps) {
    const updateField = async (field: string, value: string) => {
        // Prepare payload with defaults for required fields
        // Convert null to empty string for string fields, undefined for optional fields
        const payload = {
            projectName: data?.projectName || '',
            address: data?.address || '',
            legalAddress: data?.legalAddress || '',
            zoning: data?.zoning || '',
            jurisdiction: data?.jurisdiction || '',
            lotArea: data?.lotArea || '',
            numberOfStories: data?.numberOfStories || '',
            buildingClass: data?.buildingClass || '',
            [field]: value, // Override with new value
        };

        console.log('Sending payload:', payload);

        const res = await fetch(`/api/planning/${projectId}/details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error('Save failed:', res.status, errorText);
            throw new Error(`Save failed: ${errorText}`);
        }

        console.log('Save successful');
        onUpdate();
    };

    return (
        <div className="bg-[#252526] rounded-lg p-6 border border-[#3e3e42]">
            <h3 className="text-lg font-semibold text-[#cccccc] mb-4">Details</h3>
            <div className="grid grid-cols-2 gap-4">
                <InlineEditField
                    label="Project Name"
                    value={data?.projectName || ''}
                    onSave={(v) => updateField('projectName', v)}
                    placeholder="Enter project name"
                />
                <InlineEditField
                    label="Building Class"
                    value={data?.buildingClass || ''}
                    onSave={(v) => updateField('buildingClass', v)}
                    placeholder="Enter building class"
                />
                <InlineEditField
                    label="Address"
                    value={data?.address || ''}
                    onSave={(v) => updateField('address', v)}
                    placeholder="Enter address"
                />
                <InlineEditField
                    label="Legal Address"
                    value={data?.legalAddress || ''}
                    onSave={(v) => updateField('legalAddress', v)}
                    placeholder="Enter legal address"
                />
                <InlineEditField
                    label="Zoning"
                    value={data?.zoning || ''}
                    onSave={(v) => updateField('zoning', v)}
                    placeholder="Enter zoning"
                />
                <InlineEditField
                    label="Jurisdiction"
                    value={data?.jurisdiction || ''}
                    onSave={(v) => updateField('jurisdiction', v)}
                    placeholder="Enter jurisdiction"
                />
                <InlineEditField
                    label="Lot Area (m²)"
                    value={data?.lotArea?.toString() || ''}
                    onSave={(v) => updateField('lotArea', v)}
                    placeholder="Enter lot area"
                />
                <InlineEditField
                    label="Number of Stories"
                    value={data?.numberOfStories?.toString() || ''}
                    onSave={(v) => updateField('numberOfStories', v)}
                    placeholder="Enter number of stories"
                />
            </div>
        </div>
    );
}
