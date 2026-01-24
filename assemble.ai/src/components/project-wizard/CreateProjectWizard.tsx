'use client';

import { useState } from 'react';
import { ProjectTypeId } from '@/lib/data/templates/project-types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ProjectTypeSelector } from './ProjectTypeSelector';
import { ProjectTypeDetailsForm } from './ProjectTypeDetailsForm';
import { ProjectTypeReviewStep } from './ProjectTypeReviewStep';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreateProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (projectId: string) => void;
}

type WizardStep = 'type' | 'details' | 'review';

export function CreateProjectWizard({
  isOpen,
  onClose,
  onProjectCreated
}: CreateProjectWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('type');
  const [selectedType, setSelectedType] = useState<ProjectTypeId | null>(null);
  const [projectName, setProjectName] = useState('');
  const [address, setAddress] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: { id: WizardStep; label: string; number: number }[] = [
    { id: 'type', label: 'Select Type', number: 1 },
    { id: 'details', label: 'Project Details', number: 2 },
    { id: 'review', label: 'Review', number: 3 }
  ];

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep);
  const canGoNext =
    (currentStep === 'type' && selectedType !== null) ||
    (currentStep === 'details' && projectName.trim() !== '') ||
    currentStep === 'review';

  const handleNext = () => {
    if (currentStep === 'type') setCurrentStep('details');
    else if (currentStep === 'details') setCurrentStep('review');
  };

  const handleBack = () => {
    if (currentStep === 'details') setCurrentStep('type');
    else if (currentStep === 'review') setCurrentStep('details');
  };

  const handleCreate = async () => {
    if (!selectedType || !projectName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/projects/create-from-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: selectedType,
          projectName: projectName.trim(),
          address: address.trim() || undefined,
          estimatedCost: estimatedCost ? parseInt(estimatedCost) : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create project');
      }

      const data = await response.json();
      onProjectCreated(data.projectId);
      handleReset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReset = () => {
    setCurrentStep('type');
    setSelectedType(null);
    setProjectName('');
    setAddress('');
    setEstimatedCost('');
    setError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-[var(--color-text-primary)]">
            Create New Project
          </DialogTitle>
        </DialogHeader>

        <div className="mb-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex items-center">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                      currentStepIndex >= index
                        ? 'bg-[var(--color-accent-green)] text-white'
                        : 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]'
                    )}
                  >
                    {currentStepIndex > index ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={cn(
                      'ml-2 text-sm font-medium',
                      currentStepIndex >= index
                        ? 'text-[var(--color-text-primary)]'
                        : 'text-[var(--color-text-muted)]'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-4 transition-colors',
                      currentStepIndex > index
                        ? 'bg-[var(--color-accent-green)]'
                        : 'bg-[var(--color-border)]'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-[400px]">
          {currentStep === 'type' && (
            <ProjectTypeSelector
              selectedType={selectedType}
              onSelectType={setSelectedType}
            />
          )}

          {currentStep === 'details' && selectedType && (
            <ProjectTypeDetailsForm
              projectType={selectedType}
              projectName={projectName}
              address={address}
              estimatedCost={estimatedCost}
              onProjectNameChange={setProjectName}
              onAddressChange={setAddress}
              onEstimatedCostChange={setEstimatedCost}
            />
          )}

          {currentStep === 'review' && selectedType && (
            <ProjectTypeReviewStep
              projectType={selectedType}
              projectName={projectName}
              address={address}
              estimatedCost={estimatedCost}
            />
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <div className="flex justify-between pt-4 border-t border-[var(--color-border)]">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 'type' || isCreating}
            className="border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isCreating}
              className="border-[var(--color-border)] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-tertiary)]"
            >
              Cancel
            </Button>

            {currentStep !== 'review' ? (
              <Button
                onClick={handleNext}
                disabled={!canGoNext || isCreating}
                className="bg-[var(--color-accent-green)] hover:opacity-90 text-white"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCreate}
                disabled={!canGoNext || isCreating}
                className="bg-[var(--color-accent-green)] hover:opacity-90 text-white"
              >
                {isCreating ? 'Creating...' : 'Create Project'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
