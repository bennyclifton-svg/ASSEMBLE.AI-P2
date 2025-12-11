/**
 * BriefScopeTab Component
 *
 * Displays Brief fields (Services, Fee, Program) for consultants
 * or Scope fields (Works, Price, Program) for contractors.
 * Uses InlineEditField for auto-saving on blur.
 */

'use client';

import { InlineEditField } from '@/components/dashboard/planning/InlineEditField';

interface BriefScopeTabProps {
  /** 'discipline' for consultants, 'trade' for contractors */
  contextType: 'discipline' | 'trade';
  // Consultant Brief fields
  briefServices?: string;
  briefFee?: string;
  briefProgram?: string;
  onUpdateBrief?: (field: 'briefServices' | 'briefFee' | 'briefProgram', value: string) => Promise<void>;
  // Contractor Scope fields
  scopeWorks?: string;
  scopePrice?: string;
  scopeProgram?: string;
  onUpdateScope?: (field: 'scopeWorks' | 'scopePrice' | 'scopeProgram', value: string) => Promise<void>;
}

export function BriefScopeTab({
  contextType,
  briefServices = '',
  briefFee = '',
  briefProgram = '',
  onUpdateBrief,
  scopeWorks = '',
  scopePrice = '',
  scopeProgram = '',
  onUpdateScope,
}: BriefScopeTabProps) {
  if (contextType === 'discipline') {
    // Consultant Brief fields
    return (
      <div className="space-y-4">
        <InlineEditField
          label="Services"
          value={briefServices}
          onSave={(value) => onUpdateBrief?.('briefServices', value) ?? Promise.resolve()}
          placeholder="Describe the services required..."
          multiline
          minRows={4}
        />
        <InlineEditField
          label="Fee"
          value={briefFee}
          onSave={(value) => onUpdateBrief?.('briefFee', value) ?? Promise.resolve()}
          placeholder="Enter fee structure and budget..."
          multiline
          minRows={4}
        />
        <InlineEditField
          label="Program"
          value={briefProgram}
          onSave={(value) => onUpdateBrief?.('briefProgram', value) ?? Promise.resolve()}
          placeholder="Enter program and timeline requirements..."
          multiline
          minRows={4}
        />
      </div>
    );
  }

  // Contractor Scope fields
  return (
    <div className="space-y-4">
      <InlineEditField
        label="Works"
        value={scopeWorks}
        onSave={(value) => onUpdateScope?.('scopeWorks', value) ?? Promise.resolve()}
        placeholder="Describe the scope of works..."
        multiline
        minRows={4}
      />
      <InlineEditField
        label="Price"
        value={scopePrice}
        onSave={(value) => onUpdateScope?.('scopePrice', value) ?? Promise.resolve()}
        placeholder="Enter pricing structure..."
        multiline
        minRows={4}
      />
      <InlineEditField
        label="Program"
        value={scopeProgram}
        onSave={(value) => onUpdateScope?.('scopeProgram', value) ?? Promise.resolve()}
        placeholder="Enter program and timeline requirements..."
        multiline
        minRows={4}
      />
    </div>
  );
}
