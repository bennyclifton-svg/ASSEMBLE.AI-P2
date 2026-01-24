'use client';

import { Input } from '@/components/ui/input';
import { ProjectTypeId, projectTypes } from '@/lib/data/templates/project-types';

interface ProjectTypeDetailsFormProps {
  projectType: ProjectTypeId;
  projectName: string;
  address: string;
  estimatedCost: string;
  onProjectNameChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onEstimatedCostChange: (value: string) => void;
}

export function ProjectTypeDetailsForm({
  projectType,
  projectName,
  address,
  estimatedCost,
  onProjectNameChange,
  onAddressChange,
  onEstimatedCostChange
}: ProjectTypeDetailsFormProps) {
  const config = projectTypes[projectType];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          Project Details
        </h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Configuring a <span className="font-medium text-[var(--color-text-primary)]">{config.name}</span> project
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Project Name <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            placeholder="Enter project name"
            value={projectName}
            onChange={(e) => onProjectNameChange(e.target.value)}
            className="bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] focus:border-[var(--color-accent-green)]"
            required
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            A clear, descriptive name for your project
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Project Address
          </label>
          <Input
            type="text"
            placeholder="Enter project address (optional)"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            className="bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] focus:border-[var(--color-accent-green)]"
          />
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Site address or location
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Estimated Cost (AUD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              $
            </span>
            <Input
              type="text"
              placeholder="0"
              value={estimatedCost}
              onChange={(e) => {
                const value = e.target.value.replace(/[^0-9]/g, '');
                onEstimatedCostChange(value);
              }}
              className="bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] focus:border-[var(--color-accent-green)] pl-7"
            />
          </div>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">
            Optional budget estimate to pre-populate cost planning
          </p>
        </div>
      </div>

      <div className="bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-lg p-4">
        <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">
          What will be created:
        </h4>
        <ul className="text-sm text-[var(--color-text-muted)] space-y-1">
          <li>• {config.disciplines.length} consultant disciplines</li>
          <li>• {config.trades.length} contractor trades</li>
          <li>• Pre-configured cost plan with {config.feeItems.length + config.priceItems.length} line items</li>
          <li>• Program template with typical project phases</li>
          <li>• Project objectives template</li>
        </ul>
      </div>
    </div>
  );
}
