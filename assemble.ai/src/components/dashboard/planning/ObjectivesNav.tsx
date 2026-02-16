'use client';

import { useState, useEffect } from 'react';
import { Check, Target } from 'lucide-react';
import { DiamondIcon } from '@/components/ui/diamond-icon';

interface ObjectivesNavProps {
  projectId: string;
  data: any;
  profileData: any;
  onShowObjectives?: () => void;
  isActive?: boolean;
}

export function ObjectivesNav({ projectId, data, profileData, onShowObjectives, isActive = false }: ObjectivesNavProps) {
  // Check if profile is complete enough for AI generation
  const canGenerate = profileData?.buildingClass && profileData?.projectType && profileData?.subclass?.length > 0;

  // Check if objectives have content
  const hasFunctionalQuality = data?.functionalQuality?.content || data?.functional;
  const hasPlanningCompliance = data?.planningCompliance?.content || data?.quality;
  const hasAnyContent = hasFunctionalQuality || hasPlanningCompliance;

  // Check if objectives are AI-generated
  const isAiGenerated = data?.functionalQuality?.source === 'ai_generated' ||
                        data?.functionalQuality?.source === 'ai_polished';

  return (
    <div className={`nav-panel-section py-3 ${isActive ? 'nav-panel-active' : ''}`}>
      <button
        onClick={onShowObjectives}
        className="nav-panel-header w-full"
      >
        <div className="flex items-center gap-1.5">
          <Target className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <h3 className="nav-panel-title text-base font-medium text-[var(--color-text-primary)] transition-colors">
            Objectives
          </h3>
        </div>
        {hasAnyContent && (
          <span className="flex items-center gap-1 text-xs text-[var(--color-accent-green)]">
            <Check className="w-3 h-3" /> {isAiGenerated ? 'AI' : 'Set'}
          </span>
        )}
      </button>

      {/* Summary of current state */}
      <div className="nav-panel-content mt-2 space-y-1.5">
        {hasAnyContent ? (
          <>
            {/* Preview of objectives */}
            <div className="text-xs text-[var(--color-text-muted)] line-clamp-2">
              {hasFunctionalQuality && (
                <span className="block truncate">
                  <span className="text-[var(--color-text-secondary)]">Functional:</span>{' '}
                  {data?.functionalQuality?.content || data?.functional}
                </span>
              )}
            </div>
            {isAiGenerated && (
              <div className="flex items-center gap-1 text-xs text-[var(--color-accent-purple)]">
                <DiamondIcon className="w-3 h-3" />
                <span>AI Generated from Profile</span>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
