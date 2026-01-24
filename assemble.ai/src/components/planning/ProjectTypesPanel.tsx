'use client';

/**
 * Project Types Panel
 * Shows 5 category cards for project type selection
 * Feature: 018-project-initiator (Streamlined Workflow)
 */

import React, { useState } from 'react';
import { Building, Home, Briefcase, Factory, Wrench, Search } from 'lucide-react';
import type { ProjectTypeId } from '@/lib/types/project-initiator';

interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  types: Array<{
    id: ProjectTypeId;
    name: string;
    description: string;
  }>;
}

const CATEGORIES: Category[] = [
  {
    id: 'pre-development',
    name: 'Pre-Development',
    icon: Search,
    description: 'Due diligence and feasibility',
    types: [
      { id: 'due-diligence', name: 'Due Diligence', description: 'Assessment of existing assets' },
      { id: 'feasibility', name: 'Feasibility Study', description: 'Development viability assessment' },
    ],
  },
  {
    id: 'residential',
    name: 'Residential',
    icon: Home,
    description: 'Housing and residential',
    types: [
      { id: 'house', name: 'House', description: 'Single detached dwelling' },
      { id: 'apartments', name: 'Apartments', description: 'Multi-unit residential' },
      { id: 'apartments-btr', name: 'Apartments (BTR)', description: 'Build-to-rent apartments' },
      { id: 'student-housing', name: 'Student Housing', description: 'Student accommodation' },
      { id: 'townhouses', name: 'Townhouses', description: 'Multi-dwelling townhouses' },
      { id: 'retirement-living', name: 'Retirement Living', description: 'Aged care and retirement' },
    ],
  },
  {
    id: 'commercial',
    name: 'Commercial',
    icon: Briefcase,
    description: 'Office and retail spaces',
    types: [
      { id: 'office', name: 'Office', description: 'Commercial office building' },
      { id: 'retail', name: 'Retail', description: 'Shopping and retail spaces' },
    ],
  },
  {
    id: 'industrial',
    name: 'Industrial',
    icon: Factory,
    description: 'Warehouses and manufacturing',
    types: [
      { id: 'industrial', name: 'Industrial', description: 'Warehouse and manufacturing facilities' },
    ],
  },
  {
    id: 'refurbishment',
    name: 'Refurbishment',
    icon: Wrench,
    description: 'Fitouts and upgrades',
    types: [
      { id: 'fitout', name: 'Fitout', description: 'Interior fitout of existing building' },
      { id: 'refurbishment', name: 'Refurbishment', description: 'Upgrade of existing building' },
      { id: 'remediation', name: 'Remediation', description: 'Contamination remediation' },
    ],
  },
];

interface ProjectTypesPanelProps {
  projectId: string;
  currentProjectType?: ProjectTypeId | null;
  onSelectProjectType: (typeId: ProjectTypeId) => void;
}

export function ProjectTypesPanel({
  projectId,
  currentProjectType,
  onSelectProjectType,
}: ProjectTypesPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId === selectedCategory ? null : categoryId);
  };

  const handleTypeClick = (typeId: ProjectTypeId) => {
    onSelectProjectType(typeId);
  };

  return (
    <div className="space-y-4">
      {/* Project Type */}
      <div>
        <div className="grid grid-cols-1 gap-2">
        {CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.id;
          const hasCurrentType = category.types.some((t) => t.id === currentProjectType);

          const IconComponent = category.icon;

          return (
            <button
              key={category.id}
              onClick={() => handleCategoryClick(category.id)}
              className={`
                relative px-3 py-2 rounded border transition-all
                flex items-center gap-3 w-full group
                ${isSelected
                  ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)]'
                  : 'border-copper hover:border-[rgba(212,165,116,0.6)] hover:bg-[var(--color-accent-copper-tint)]'
                }
                ${hasCurrentType ? 'ring-1 ring-[var(--color-accent-copper)]' : ''}
              `}
            >
              <div className={`flex-shrink-0 transition-colors ${isSelected ? 'text-white' : 'text-muted-foreground'}`}>
                <IconComponent className="w-4 h-4" />
              </div>
              <div className="text-left flex-1">
                <div className={`text-xs transition-colors ${isSelected ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>
                  {category.name}
                </div>
              </div>
              {hasCurrentType && (
                <div className="absolute top-1 right-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-copper)]"></div>
                </div>
              )}
            </button>
          );
        })}
        </div>
      </div>

      {/* Project Sub Types */}
      {selectedCategory && (
        <div>
          <div className="grid grid-cols-1 gap-2">
            {CATEGORIES.find((c) => c.id === selectedCategory)?.types.map((type) => {
              const isCurrentType = type.id === currentProjectType;

              return (
                <button
                  key={type.id}
                  onClick={() => handleTypeClick(type.id)}
                  className={`
                    px-3 py-2 rounded border text-left transition-all w-full group
                    ${isCurrentType
                      ? 'border-[var(--color-accent-copper)] bg-[var(--color-accent-copper-tint)]'
                      : 'border-copper hover:border-[rgba(212,165,116,0.6)] hover:bg-[var(--color-accent-copper-tint)]'
                    }
                  `}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs transition-colors ${isCurrentType ? 'text-white' : 'text-[var(--color-text-muted)]'}`}>
                        {type.name}
                      </div>
                    </div>
                    {isCurrentType && (
                      <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent-copper)] flex-shrink-0"></div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
