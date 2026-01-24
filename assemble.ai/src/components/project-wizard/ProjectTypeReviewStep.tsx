'use client';

import { ProjectTypeId, projectTypes } from '@/lib/data/templates/project-types';
import { costPlanTemplates } from '@/lib/data/templates/cost-plan-templates';
import { programTemplates } from '@/lib/data/templates/program-templates';
import { CheckCircle2 } from 'lucide-react';

interface ProjectTypeReviewStepProps {
  projectType: ProjectTypeId;
  projectName: string;
  address: string;
  estimatedCost: string;
}

export function ProjectTypeReviewStep({
  projectType,
  projectName,
  address,
  estimatedCost
}: ProjectTypeReviewStepProps) {
  const config = projectTypes[projectType];
  const costLines = costPlanTemplates[projectType];
  const programActivities = programTemplates[projectType];

  const formatCurrency = (value: string) => {
    if (!value) return '$0';
    return '$' + parseInt(value).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          Review & Create
        </h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Review your project configuration before creating
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
            Project Information
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Type:</span>
              <span className="text-[var(--color-text-primary)] font-medium">{config.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-text-muted)]">Name:</span>
              <span className="text-[var(--color-text-primary)] font-medium">{projectName}</span>
            </div>
            {address && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Address:</span>
                <span className="text-[var(--color-text-primary)]">{address}</span>
              </div>
            )}
            {estimatedCost && (
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Estimated Cost:</span>
                <span className="text-[var(--color-text-primary)] font-medium">
                  {formatCurrency(estimatedCost)}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg p-4">
          <h4 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3">
            Template Configuration
          </h4>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-accent-green)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Consultant Disciplines
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {config.disciplines.length} disciplines will be created: {config.disciplines.slice(0, 3).join(', ')}
                  {config.disciplines.length > 3 && ` and ${config.disciplines.length - 3} more`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-accent-green)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Contractor Trades
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {config.trades.length} trades will be created: {config.trades.slice(0, 3).join(', ')}
                  {config.trades.length > 3 && ` and ${config.trades.length - 3} more`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-accent-green)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Cost Plan
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {costLines.length} cost line items across categories: Consultant Fees, Construction, Contingency
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-accent-green)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Program Template
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  {programActivities.length} activities from {programActivities[0]?.name} to {programActivities[programActivities.length - 1]?.name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-accent-green)] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Project Objectives
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Pre-populated functional, quality, budget, and program objectives
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <p className="text-sm text-[var(--color-text-primary)]">
            <span className="font-semibold">Note:</span> All templates can be customized after project creation.
            You can add, remove, or modify disciplines, trades, cost items, and program activities as needed.
          </p>
        </div>
      </div>
    </div>
  );
}
