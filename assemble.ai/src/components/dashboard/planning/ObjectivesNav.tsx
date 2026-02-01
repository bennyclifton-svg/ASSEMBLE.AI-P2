'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { CornerBracketIcon } from '@/components/ui/corner-bracket-icon';
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
    <div className={`nav-panel-section py-3 pl-2 pr-3 ${isActive ? 'nav-panel-active' : ''}`}>
      <button
        onClick={onShowObjectives}
        className="nav-panel-header w-full"
      >
        <h3 className="nav-panel-title text-sm font-semibold text-[var(--color-text-primary)] transition-colors">
          Objectives
        </h3>
        <div className="flex items-center gap-2">
          {hasAnyContent && (
            <span className="flex items-center gap-1 text-xs text-[var(--color-accent-green)]">
              <Check className="w-3 h-3" /> {isAiGenerated ? 'AI' : 'Set'}
            </span>
          )}
          <CornerBracketIcon
            direction={isActive ? 'right' : 'left'}
            gradient={isActive}
            className={`nav-panel-chevron w-3.5 h-3.5 ${!isActive ? 'text-[var(--color-text-muted)]' : ''} transition-colors`}
          />
        </div>
      </button>

      {/* Summary of current state */}
      <div className="mt-2 space-y-1.5">
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
        ) : !canGenerate ? (
          <p className="text-xs text-[var(--color-text-muted)]">
            Complete profile to enable AI generation
          </p>
        ) : null}
      </div>
    </div>
  );
}
