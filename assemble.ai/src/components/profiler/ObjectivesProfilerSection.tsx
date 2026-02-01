'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import type { ObjectiveContent, ObjectiveSource, ProfileContext } from '@/types/profiler';

interface ObjectivesProfilerSectionProps {
  projectId: string;
  profileData: any;
  objectivesData: any;
  onUpdate: () => void;
}

interface ObjectiveEditorProps {
  label: string;
  objective: ObjectiveContent | null;
  onChange: (content: ObjectiveContent) => void;
  isGenerating: boolean;
  isPolishing: boolean;
  /** Render action buttons inline with header */
  headerActions?: React.ReactNode;
}

function ObjectiveEditor({ label, objective, onChange, isGenerating, isPolishing, headerActions }: ObjectiveEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(objective?.content || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditValue(objective?.content || '');
  }, [objective?.content]);

  // Focus and position cursor at end only when entering edit mode
  useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      // Reset height to recalculate
      textarea.style.height = 'auto';
      // Set to scrollHeight with minimum of 100px
      const newHeight = Math.max(textarea.scrollHeight, 100);
      textarea.style.height = newHeight + 'px';
      // Focus without selecting text - place cursor at end with no selection
      textarea.focus({ preventScroll: true });
      const len = textarea.value.length;
      textarea.setSelectionRange(len, len);
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editValue.trim() !== objective?.content) {
      const newObjective: ObjectiveContent = {
        content: editValue.trim(),
        source: 'manual' as ObjectiveSource,
        originalAi: objective?.originalAi || null,
        editHistory: objective?.editHistory
          ? [...objective.editHistory, objective.content]
          : objective?.content ? [objective.content] : null,
      };
      onChange(newObjective);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  return (
    <div className="border border-[var(--color-border)] rounded overflow-hidden flex flex-col">
      {/* Header with copper tint background - matches Brief section */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--color-accent-copper-tint)] border-b border-[var(--color-border)]">
        <span className="text-[var(--color-accent-copper)] font-medium text-sm uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-3">
          {headerActions}
        </div>
      </div>

      {/* Content area - matches Brief section textarea styling */}
      <div className="flex-1">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => {
              setEditValue(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.max(e.target.scrollHeight, 100) + 'px';
            }}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="w-full border-0 rounded-none bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] resize-y min-h-[100px] p-4 hover:bg-[var(--color-bg-primary)] transition-colors cursor-text focus:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
            placeholder={`Enter ${label.toLowerCase()} objectives...`}
          />
        ) : objective?.content ? (
          <div
            className="w-full bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)] min-h-[100px] p-4 hover:bg-[var(--color-bg-primary)] transition-colors cursor-text text-sm whitespace-pre-wrap"
            onClick={() => setIsEditing(true)}
          >
            {objective.content}
          </div>
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="w-full bg-[var(--color-bg-secondary)] min-h-[100px] p-4 hover:bg-[var(--color-bg-primary)] transition-colors cursor-text text-sm text-[var(--color-text-muted)]"
          >
            Enter {label.toLowerCase()} objectives...
          </div>
        )}
      </div>
    </div>
  );
}

type ObjectiveSection = 'functionalQuality' | 'planningCompliance';

export function ObjectivesProfilerSection({ projectId, profileData, objectivesData, onUpdate }: ObjectivesProfilerSectionProps) {
  const { toast } = useToast();
  const [generatingSection, setGeneratingSection] = useState<ObjectiveSection | null>(null);
  const [polishingSection, setPolishingSection] = useState<ObjectiveSection | null>(null);

  // Local state for objectives
  const [functionalQuality, setFunctionalQuality] = useState<ObjectiveContent | null>(
    objectivesData?.functionalQuality || null
  );
  const [planningCompliance, setPlanningCompliance] = useState<ObjectiveContent | null>(
    objectivesData?.planningCompliance || null
  );

  // Sync with external data
  useEffect(() => {
    if (objectivesData) {
      setFunctionalQuality(objectivesData.functionalQuality || null);
      setPlanningCompliance(objectivesData.planningCompliance || null);
    }
  }, [objectivesData]);

  // Check if profile is complete for generation
  const canGenerate = profileData?.buildingClass && profileData?.projectType && profileData?.subclass?.length > 0;

  // Check if can polish each section (need existing content)
  const canPolishFunctional = !!functionalQuality?.content;
  const canPolishPlanning = !!planningCompliance?.content;

  // Generate objectives from profile for a specific section
  const handleGenerate = async (section: ObjectiveSection) => {
    if (!canGenerate) {
      toast({
        title: 'Profile Required',
        description: 'Please complete the project profile before generating objectives',
        variant: 'destructive',
      });
      return;
    }

    setGeneratingSection(section);
    try {
      const response = await fetch(`/api/projects/${projectId}/objectives/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileId: profileData.id, section }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate objectives');
      }

      const result = await response.json();

      // Update only the requested section
      if (section === 'functionalQuality' && result.data.functionalQuality) {
        setFunctionalQuality({
          content: result.data.functionalQuality,
          source: 'ai_generated',
          originalAi: result.data.functionalQuality,
          editHistory: null,
        });
      } else if (section === 'planningCompliance' && result.data.planningCompliance) {
        setPlanningCompliance({
          content: result.data.planningCompliance,
          source: 'ai_generated',
          originalAi: result.data.planningCompliance,
          editHistory: null,
        });
      }

      toast({
        title: 'Objectives Generated',
        description: `${section === 'functionalQuality' ? 'Functional & Quality' : 'Planning & Compliance'} objectives are ready for review`,
      });

      onUpdate();
    } catch (error) {
      toast({
        title: 'Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate objectives',
        variant: 'destructive',
      });
    } finally {
      setGeneratingSection(null);
    }
  };

  // Polish existing objectives for a specific section
  const handlePolish = async (section: ObjectiveSection) => {
    const content = section === 'functionalQuality' ? functionalQuality?.content : planningCompliance?.content;
    if (!content) {
      toast({
        title: 'Content Required',
        description: 'Please enter objectives content before polishing',
        variant: 'destructive',
      });
      return;
    }

    setPolishingSection(section);
    try {
      const response = await fetch(`/api/projects/${projectId}/objectives/polish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to polish objectives');
      }

      const result = await response.json();

      // Update only the requested section with polished content
      if (section === 'functionalQuality' && result.data.polished) {
        setFunctionalQuality({
          content: result.data.polished,
          source: 'ai_polished',
          originalAi: functionalQuality?.originalAi || null,
          editHistory: functionalQuality?.content
            ? [...(functionalQuality.editHistory || []), functionalQuality.content]
            : null,
        });
      } else if (section === 'planningCompliance' && result.data.polished) {
        setPlanningCompliance({
          content: result.data.polished,
          source: 'ai_polished',
          originalAi: planningCompliance?.originalAi || null,
          editHistory: planningCompliance?.content
            ? [...(planningCompliance.editHistory || []), planningCompliance.content]
            : null,
        });
      }

      toast({
        title: 'Objectives Polished',
        description: `${section === 'functionalQuality' ? 'Functional & Quality' : 'Planning & Compliance'} content has been improved`,
      });

      onUpdate();
    } catch (error) {
      toast({
        title: 'Polish Failed',
        description: error instanceof Error ? error.message : 'Failed to polish objectives',
        variant: 'destructive',
      });
    } finally {
      setPolishingSection(null);
    }
  };

  // Helper to check if any operation is in progress
  const isAnyOperationInProgress = generatingSection !== null || polishingSection !== null;

  // Generate action buttons for a specific section
  const createActionButtons = (section: ObjectiveSection) => {
    const canPolish = section === 'functionalQuality' ? canPolishFunctional : canPolishPlanning;
    const isGenerating = generatingSection === section;
    const isPolishing = polishingSection === section;

    return (
      <>
        <button
          onClick={() => handleGenerate(section)}
          disabled={!canGenerate || isAnyOperationInProgress}
          className={`
            flex items-center gap-1.5 text-sm font-medium transition-all
            ${canGenerate && !isAnyOperationInProgress
              ? 'text-[var(--color-accent-copper)] hover:opacity-80'
              : 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
            }
          `}
          title={canGenerate ? 'Generate objectives from profile' : 'Complete profile to enable'}
        >
          <DiamondIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} variant="empty" />
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
        <button
          onClick={() => handlePolish(section)}
          disabled={!canPolish || isAnyOperationInProgress}
          className={`
            flex items-center gap-1.5 text-sm font-medium transition-all
            ${canPolish && !isAnyOperationInProgress
              ? 'text-[var(--color-accent-copper)] hover:opacity-80'
              : 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50'
            }
          `}
          title={canPolish ? 'Polish existing objectives' : 'Add content to enable'}
        >
          <DiamondIcon className={`w-4 h-4 ${isPolishing ? 'animate-spin' : ''}`} variant="filled" />
          {isPolishing ? 'Polishing...' : 'Polish'}
        </button>
      </>
    );
  };

  return (
    <div className="grid grid-cols-2 gap-4">
        {/* Functional & Quality Objectives */}
        <ObjectiveEditor
          label="Functional & Quality"
          objective={functionalQuality}
          onChange={setFunctionalQuality}
          isGenerating={generatingSection === 'functionalQuality'}
          isPolishing={polishingSection === 'functionalQuality'}
          headerActions={createActionButtons('functionalQuality')}
        />

        {/* Planning & Compliance Objectives */}
        <ObjectiveEditor
          label="Planning & Compliance"
          objective={planningCompliance}
          onChange={setPlanningCompliance}
          isGenerating={generatingSection === 'planningCompliance'}
          isPolishing={polishingSection === 'planningCompliance'}
          headerActions={createActionButtons('planningCompliance')}
        />
      </div>
  );
}
