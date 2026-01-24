'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Save } from 'lucide-react';
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

  // Auto-resize textarea when entering edit mode or content changes
  useLayoutEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      // Reset height to recalculate
      textarea.style.height = 'auto';
      // Set to scrollHeight with minimum of 80px
      const newHeight = Math.max(textarea.scrollHeight, 80);
      textarea.style.height = newHeight + 'px';
      // Focus without selecting text - place cursor at end with no selection
      textarea.focus({ preventScroll: true });
      const len = textarea.value.length;
      textarea.setSelectionRange(len, len);
    }
  }, [isEditing, editValue]);

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

  const handleCancel = () => {
    setEditValue(objective?.content || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave();
    }
  };

  return (
    <div className="overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">{label}</span>
        <div className="flex items-center gap-3">
          {headerActions}
        </div>
      </div>

      <div className="p-3 bg-[var(--color-bg-secondary)]">
        {isGenerating || isPolishing ? (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-3">
              <DiamondIcon className="w-8 h-8 text-[var(--color-accent-copper)] animate-spin-ease" />
              <p className="text-sm text-[var(--color-text-muted)]">
                {isGenerating ? 'Generating objectives...' : 'Polishing content...'}
              </p>
            </div>
          </div>
        ) : isEditing ? (
          <div className="space-y-3">
            <textarea
              ref={textareaRef}
              value={editValue}
              onChange={(e) => {
                setEditValue(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.max(e.target.scrollHeight, 80) + 'px';
              }}
              onKeyDown={handleKeyDown}
              className="w-full text-sm bg-transparent border border-[var(--color-accent-copper)]/40 rounded-sm shadow-none outline-none focus:outline-none focus:ring-0 focus:border-[var(--color-accent-copper)]/40 text-[var(--color-text-secondary)] resize-none"
              style={{ minHeight: '80px', padding: '0', margin: '0' }}
              placeholder={`Enter ${label.toLowerCase()} objectives...`}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--color-text-muted)]">Ctrl+Enter to save, Esc to cancel</span>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-xs bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-xs bg-[var(--color-accent-primary)] text-[var(--color-bg-primary)] hover:opacity-90 transition-colors flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  Save
                </button>
              </div>
            </div>
          </div>
        ) : objective?.content ? (
          <div
            className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap cursor-text border border-transparent rounded-sm transition-colors hover:border-[var(--color-accent-copper)]/20"
            onClick={() => setIsEditing(true)}
          >
            {objective.content}
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full py-4 text-sm text-[var(--color-text-muted)] border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-accent-primary)]/50 hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Click to add {label.toLowerCase()} objectives...
          </button>
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
  const [isSaving, setIsSaving] = useState(false);

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

  // Save objectives
  const handleSave = async () => {
    if (!functionalQuality?.content && !planningCompliance?.content) {
      toast({
        title: 'No Content',
        description: 'Please add at least one objective before saving',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/objectives`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionalQuality,
          planningCompliance,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save objectives');
      }

      toast({
        title: 'Objectives Saved',
        description: 'Your project objectives have been updated',
      });

      onUpdate();
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save objectives',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Check if there are unsaved changes
  const hasChanges =
    JSON.stringify(functionalQuality) !== JSON.stringify(objectivesData?.functionalQuality) ||
    JSON.stringify(planningCompliance) !== JSON.stringify(objectivesData?.planningCompliance);

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
          <DiamondIcon className="w-4 h-4" variant="empty" />
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
          <DiamondIcon className="w-4 h-4" variant="filled" />
          {isPolishing ? 'Polishing...' : 'Polish'}
        </button>
      </>
    );
  };

  return (
    <div className="bg-[var(--color-bg-primary)] p-2">
      <div className="space-y-3">
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

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className={`
            w-full py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2
            ${hasChanges && !isSaving
              ? 'bg-[var(--color-accent-primary)] text-[var(--color-bg-primary)] hover:opacity-90'
              : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
            }
          `}
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 border-2 border-[var(--color-bg-primary)]/30 border-t-[var(--color-bg-primary)] rounded-full animate-spin" />
              Saving...
            </>
          ) : hasChanges ? (
            <>
              <Save className="w-4 h-4" />
              Save Objectives
            </>
          ) : (
            'No Changes'
          )}
        </button>
      </div>
    </div>
  );
}
