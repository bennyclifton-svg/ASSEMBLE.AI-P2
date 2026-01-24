'use client';

/**
 * Type Selection Step
 * Grid of 14 project types with category filtering
 * Feature: 018-project-initiator
 */

import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import type { ProjectType, ProjectCategory } from '@/lib/types/project-initiator';

interface TypeSelectionStepProps {
  onSelect: (type: ProjectType) => void;
}

const categories: (ProjectCategory | 'All')[] = [
  'All',
  'Pre-Development',
  'Residential',
  'Commercial',
  'Industrial',
  'Refurbishment',
];

export function TypeSelectionStep({ onSelect }: TypeSelectionStepProps) {
  const [projectTypes, setProjectTypes] = useState<ProjectType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ProjectCategory | 'All'>('Residential');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProjectTypes() {
      try {
        const data = await import('@/lib/data/project-types.json');
        setProjectTypes(data.projectTypes.types as ProjectType[]);
      } catch (error) {
        console.error('Failed to load project types:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProjectTypes();
  }, []);

  const filteredTypes =
    selectedCategory === 'All'
      ? projectTypes
      : projectTypes.filter((type) => type.category === selectedCategory);

  const formatBudgetRange = (min: number, max: number, currency: string) => {
    const formatAmount = (amount: number) => {
      if (amount >= 1_000_000) {
        return `$${(amount / 1_000_000).toFixed(1)}M`;
      }
      return `$${(amount / 1_000).toFixed(0)}k`;
    };
    return `${formatAmount(min)} - ${formatAmount(max)} ${currency}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground">Loading project types...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Type Categories */}
      <div>
        <h3 className="text-base font-semibold mb-4">Project Type</h3>
        <div className="flex flex-wrap gap-3">
          {categories.slice(1).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Project Sub Types */}
      <div>
        <h3 className="text-base font-semibold mb-4">Project Sub Types</h3>
        <div className="grid grid-cols-1 gap-4 [@media(min-width:500px)]:grid-cols-2 [@media(min-width:900px)]:grid-cols-3">
        {filteredTypes.map((type) => {
          const IconComponent = Icons[type.icon as keyof typeof Icons] as any;

          return (
            <button
              key={type.id}
              onClick={() => onSelect(type)}
              className="p-6 border rounded-lg text-left hover:border-primary hover:bg-accent transition-colors group"
            >
              <div className="flex items-start gap-4">
                {IconComponent && (
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <IconComponent className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg mb-1">{type.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {type.description}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    {formatBudgetRange(
                      type.typicalBudgetRange.min,
                      type.typicalBudgetRange.max,
                      type.typicalBudgetRange.currency
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
        </div>

        {filteredTypes.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No project types found in this category.
          </div>
        )}
      </div>
    </div>
  );
}
