'use client';

/**
 * Project Initiator Modal
 * 2-step streamlined wizard for project type and questions
 * Feature: 018-project-initiator (Streamlined Workflow)
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TypeSelectionStep } from './TypeSelectionStep';
import { QuestionsStep } from './QuestionsStep';
import type { ProjectType, QuestionAnswers, ProjectTypeId } from '@/lib/types/project-initiator';

type WizardStep = 'type-selection' | 'questions';

interface ProjectInitiatorModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  initialProjectTypeId?: ProjectTypeId;
}

export function ProjectInitiatorModal({
  projectId,
  isOpen,
  onClose,
  onComplete,
  initialProjectTypeId,
}: ProjectInitiatorModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('type-selection');
  const [selectedType, setSelectedType] = useState<ProjectType | null>(null);
  const [previousAnswers, setPreviousAnswers] = useState<QuestionAnswers>({});
  const [loadingAnswers, setLoadingAnswers] = useState(false);

  // Load initial project type and skip to questions if provided
  useEffect(() => {
    if (isOpen && initialProjectTypeId) {
      loadInitialProjectType(initialProjectTypeId);
    }
  }, [isOpen, initialProjectTypeId]);

  // Load previous answers when modal opens
  useEffect(() => {
    if (isOpen && projectId) {
      loadPreviousAnswers();
    }
  }, [isOpen, projectId]);

  const loadInitialProjectType = async (typeId: ProjectTypeId) => {
    try {
      const data = await import('@/lib/data/project-types.json');
      const type = data.projectTypes.types.find((t) => t.id === typeId);

      if (type) {
        setSelectedType(type);
        setCurrentStep('questions');
      }
    } catch (error) {
      console.error('Failed to load initial project type:', error);
    }
  };

  const loadPreviousAnswers = async () => {
    try {
      setLoadingAnswers(true);
      const response = await fetch(`/api/planning/${projectId}/objectives`);

      if (response.ok) {
        const data = await response.json();
        if (data.questionAnswers) {
          setPreviousAnswers(data.questionAnswers);
        }
      }
    } catch (error) {
      console.error('Failed to load previous answers:', error);
    } finally {
      setLoadingAnswers(false);
    }
  };

  const handleTypeSelect = (type: ProjectType) => {
    setSelectedType(type);
    setCurrentStep('questions');
  };

  const handleQuestionsComplete = () => {
    // Objectives are populated directly by QuestionsStep
    handleComplete();
  };

  const handleBack = () => {
    if (currentStep === 'questions') {
      setCurrentStep('type-selection');
    }
  };

  const handleComplete = () => {
    // Reset state
    setCurrentStep('type-selection');
    setSelectedType(null);
    setPreviousAnswers({});
    onComplete();
  };

  const handleCancel = () => {
    // Reset state
    setCurrentStep('type-selection');
    setSelectedType(null);
    setPreviousAnswers({});
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 'type-selection' && 'Select Project Type'}
            {currentStep === 'questions' && `Quick Setup: ${selectedType?.name}`}
          </DialogTitle>
        </DialogHeader>

        {currentStep === 'type-selection' && (
          <TypeSelectionStep onSelect={handleTypeSelect} />
        )}

        {currentStep === 'questions' && selectedType && (
          <QuestionsStep
            projectId={projectId}
            projectType={selectedType}
            initialAnswers={previousAnswers}
            onComplete={handleQuestionsComplete}
            onBack={handleBack}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
