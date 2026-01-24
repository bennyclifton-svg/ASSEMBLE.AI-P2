'use client';

import { Building2, Building, Paintbrush, Factory, Hammer } from 'lucide-react';
import { ProjectTypeId, projectTypes } from '@/lib/data/templates/project-types';
import { cn } from '@/lib/utils';

interface ProjectTypeSelectorProps {
  selectedType: ProjectTypeId | null;
  onSelectType: (type: ProjectTypeId) => void;
}

const iconMap = {
  Building2,
  Building,
  Paintbrush,
  Factory,
  Hammer
};

export function ProjectTypeSelector({ selectedType, onSelectType }: ProjectTypeSelectorProps) {
  const projectTypesList: ProjectTypeId[] = ['house', 'apartments', 'fitout', 'industrial', 'remediation'];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
          Select Project Type
        </h3>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          Choose the type of project to automatically configure disciplines, trades, and templates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projectTypesList.map((typeId) => {
          const config = projectTypes[typeId];
          const IconComponent = iconMap[config.icon as keyof typeof iconMap];
          const isSelected = selectedType === typeId;

          return (
            <button
              key={typeId}
              onClick={() => onSelectType(typeId)}
              className={cn(
                'flex flex-col items-center p-6 rounded-lg border-2 transition-all',
                'hover:border-[var(--color-accent-green)] hover:bg-[var(--color-bg-tertiary)]',
                isSelected
                  ? 'border-[var(--color-accent-green)] bg-[var(--color-bg-tertiary)]'
                  : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)]'
              )}
            >
              <div
                className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center mb-4',
                  isSelected
                    ? 'bg-[var(--color-accent-green)]'
                    : 'bg-[var(--color-bg-tertiary)]'
                )}
              >
                <IconComponent
                  className={cn(
                    'w-8 h-8',
                    isSelected ? 'text-white' : 'text-[var(--color-text-primary)]'
                  )}
                />
              </div>
              <h4 className="text-base font-semibold text-[var(--color-text-primary)] mb-2">
                {config.name}
              </h4>
              <p className="text-sm text-[var(--color-text-muted)] text-center">
                {config.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
