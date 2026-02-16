'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText } from 'lucide-react';
import { useToast } from '@/lib/hooks/use-toast';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { AttachmentSection } from '@/components/notes-meetings-reports/shared/AttachmentSection';
import { useObjectivesTransmittal } from '@/lib/hooks/use-objectives-transmittal';
import type { ObjectiveContent, ObjectiveSource, ProfileContext } from '@/types/profiler';

interface ObjectivesProfilerSectionProps {
  projectId: string;
  profileData: any;
  objectivesData: any;
  onUpdate: () => void;
  onSaveTransmittal?: () => void;
  onLoadTransmittal?: () => void;
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
  const [localContent, setLocalContent] = useState(objective?.content || '');
  const lastSavedRef = useRef(objective?.content || '');

  useEffect(() => {
    if (objective?.content !== lastSavedRef.current) {
      setLocalContent(objective?.content || '');
      lastSavedRef.current = objective?.content || '';
    }
  }, [objective?.content]);

  const handleContentChange = useCallback((newContent: string) => {
    setLocalContent(newContent);
  }, []);

  const handleBlur = useCallback(() => {
    if (localContent !== lastSavedRef.current) {
      const newObjective: ObjectiveContent = {
        content: localContent,
        source: 'manual' as ObjectiveSource,
        originalAi: objective?.originalAi || null,
        editHistory: objective?.editHistory
          ? [...objective.editHistory, objective.content]
          : objective?.content ? [objective.content] : null,
      };
      onChange(newObjective);
      lastSavedRef.current = localContent;
    }
  }, [localContent, objective, onChange]);

  return (
    <div className="rounded overflow-hidden flex flex-col">
      {/* Segmented ribbon header - matches RFT/TRR/Evaluation style */}
      <div className="flex items-stretch gap-0.5 p-2">
        {/* Left segment: icon + label */}
        <div
          className="flex items-center px-3 py-3 backdrop-blur-md border border-[var(--color-border)]/50 shadow-sm rounded-l-md"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
        >
          <FileText className="w-4 h-4" style={{ color: 'var(--color-accent-copper)' }} />
          <span className="ml-2 text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">{label}</span>
        </div>
        {/* Right segment: action buttons */}
        <div
          className="flex items-center gap-3 px-3 py-3 backdrop-blur-md border border-[var(--color-border)]/50 shadow-sm rounded-r-md"
          style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-secondary) 60%, transparent)' }}
        >
          {headerActions}
        </div>
      </div>

      {/* Content area with drop shadow and rich text editor */}
      <div
        className="flex-1 mx-2 mb-2 rounded-md overflow-hidden backdrop-blur-md"
        style={{ backgroundColor: 'color-mix(in srgb, var(--color-bg-primary) 60%, transparent)' }}
      >
        <RichTextEditor
          content={localContent}
          onChange={handleContentChange}
          onBlur={handleBlur}
          placeholder={`Enter ${label.toLowerCase()} objectives...`}
          variant="compact"
          toolbarVariant="full"
          transparentBg
          className="shadow-sm"
        />
      </div>
    </div>
  );
}

type ObjectiveSection = 'functionalQuality' | 'planningCompliance';

export function ObjectivesProfilerSection({ projectId, profileData, objectivesData, onUpdate, onSaveTransmittal, onLoadTransmittal }: ObjectivesProfilerSectionProps) {
  const { toast } = useToast();
  const [generatingSection, setGeneratingSection] = useState<ObjectiveSection | null>(null);
  const [polishingSection, setPolishingSection] = useState<ObjectiveSection | null>(null);

  // Document attachments for objectives extraction
  const { documents: attachedDocuments, isLoading: isLoadingTransmittals } = useObjectivesTransmittal(projectId);

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

  // Save objectives to database
  const saveObjectives = async (
    fq: ObjectiveContent | null,
    pc: ObjectiveContent | null
  ) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/objectives`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          functionalQuality: fq,
          planningCompliance: pc,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to save objectives');
      }

      onUpdate();
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: error instanceof Error ? error.message : 'Failed to save objectives',
        variant: 'destructive',
      });
    }
  };

  // Handlers for manual edits that persist to database
  const handleFunctionalQualityChange = (content: ObjectiveContent) => {
    setFunctionalQuality(content);
    saveObjectives(content, planningCompliance);
  };

  const handlePlanningComplianceChange = (content: ObjectiveContent) => {
    setPlanningCompliance(content);
    saveObjectives(functionalQuality, content);
  };

  // Check if can generate from either documents or profile
  const hasAttachedDocuments = attachedDocuments.length > 0;
  const canGenerateFromProfile = profileData?.buildingClass && profileData?.projectType && profileData?.subclass?.length > 0;
  const canGenerate = canGenerateFromProfile || hasAttachedDocuments;

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
        variant: 'success',
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
        variant: 'success',
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

    // Determine button styling - active generating/polishing buttons stay vibrant
    const getGenerateButtonClasses = () => {
      if (isGenerating) {
        // Active generating state - vibrant color, no opacity reduction
        return 'text-[var(--color-accent-copper)] cursor-wait';
      }
      if (!canGenerate || isAnyOperationInProgress) {
        return 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50';
      }
      return 'text-[var(--color-accent-copper)] hover:opacity-80';
    };

    const getPolishButtonClasses = () => {
      if (isPolishing) {
        // Active polishing state - vibrant color, no opacity reduction
        return 'text-[var(--color-accent-copper)] cursor-wait';
      }
      if (!canPolish || isAnyOperationInProgress) {
        return 'text-[var(--color-text-muted)] cursor-not-allowed opacity-50';
      }
      return 'text-[var(--color-accent-copper)] hover:opacity-80';
    };

    return (
      <>
        <button
          onClick={() => handleGenerate(section)}
          disabled={!canGenerate || isAnyOperationInProgress}
          className={`
            flex items-center gap-1.5 text-sm font-medium transition-all
            ${getGenerateButtonClasses()}
          `}
          title={
            hasAttachedDocuments
              ? 'Extract objectives from attached documents'
              : canGenerateFromProfile
              ? 'Generate objectives from profile'
              : 'Complete profile or attach documents to enable'
          }
        >
          <DiamondIcon className={`w-4 h-4 ${isGenerating ? 'animate-diamond-spin' : ''}`} variant="empty" />
          <span className={isGenerating ? 'animate-text-aurora' : ''}>
            {isGenerating ? 'Generating...' : 'Generate'}
          </span>
        </button>
        <button
          onClick={() => handlePolish(section)}
          disabled={!canPolish || isAnyOperationInProgress}
          className={`
            flex items-center gap-1.5 text-sm font-medium transition-all
            ${getPolishButtonClasses()}
          `}
          title={canPolish ? 'Polish existing objectives' : 'Add content to enable'}
        >
          <DiamondIcon className={`w-4 h-4 ${isPolishing ? 'animate-diamond-spin' : ''}`} variant="filled" />
          <span className={isPolishing ? 'animate-text-aurora' : ''}>
            {isPolishing ? 'Polishing...' : 'Polish'}
          </span>
        </button>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Functional & Quality Objectives */}
        <ObjectiveEditor
          label="Functional & Quality"
          objective={functionalQuality}
          onChange={handleFunctionalQualityChange}
          isGenerating={generatingSection === 'functionalQuality'}
          isPolishing={polishingSection === 'functionalQuality'}
          headerActions={createActionButtons('functionalQuality')}
        />

        {/* Planning & Compliance Objectives */}
        <ObjectiveEditor
          label="Planning & Compliance"
          objective={planningCompliance}
          onChange={handlePlanningComplianceChange}
          isGenerating={generatingSection === 'planningCompliance'}
          isPolishing={polishingSection === 'planningCompliance'}
          headerActions={createActionButtons('planningCompliance')}
        />
      </div>

      {/* Document Attachments */}
      <div className="px-2">
        <AttachmentSection
          documents={attachedDocuments.map(d => ({
            id: d.id,
            documentId: d.documentId,
            documentName: d.documentName || d.fileName || 'Unknown',
            categoryName: d.categoryName || null,
            subcategoryName: d.subcategoryName || null,
            revision: d.versionNumber || 0,
            addedAt: d.addedAt || '',
            drawingNumber: d.drawingNumber || null,
            drawingName: d.drawingName || null,
            drawingRevision: d.drawingRevision || null,
          }))}
          isLoading={isLoadingTransmittals}
          onSave={onSaveTransmittal}
          onLoad={onLoadTransmittal}
          compact
        />
      </div>
    </div>
  );
}
