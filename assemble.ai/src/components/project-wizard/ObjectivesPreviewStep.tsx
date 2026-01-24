'use client';

/**
 * Objectives Preview Step
 * Generates and displays objectives with template substitution
 * Feature: 018-project-initiator
 */

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { generateObjectives } from '@/lib/utils/template-substitution';
import type { QuestionAnswers, ProjectTypeId } from '@/lib/types/project-initiator';

interface ObjectivesPreviewStepProps {
  projectId: string;
  projectType: ProjectTypeId;
  answers: QuestionAnswers;
  onComplete: () => void;
  onBack: () => void;
}

interface Objectives {
  functional: string;
  quality: string;
  budget: string;
  program: string;
}

export function ObjectivesPreviewStep({
  projectId,
  projectType,
  answers,
  onComplete,
  onBack,
}: ObjectivesPreviewStepProps) {
  const [objectives, setObjectives] = useState<Objectives | null>(null);
  const [editedObjectives, setEditedObjectives] = useState<Objectives | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAndGenerateObjectives() {
      try {
        setLoading(true);
        setError(null);

        // Load objective templates
        const templatesModule = await import('@/lib/data/objective-templates.json');
        const templatesData = (templatesModule.default || templatesModule) as any;

        // Access the objectivesTemplates object
        const objectivesTemplates = templatesData.objectivesTemplates || templatesData;
        const template = objectivesTemplates[projectType];

        if (!template) {
          throw new Error(`No template found for project type: ${projectType}`);
        }

        // Skip metadata object
        if (template.version || template.lastUpdated) {
          throw new Error(`Invalid template for project type: ${projectType}`);
        }

        // Generate objectives with substitution
        const generated = generateObjectives(template, { answers });
        setObjectives(generated);
        setEditedObjectives(generated);
      } catch (err) {
        console.error('Failed to generate objectives:', err);
        setError(err instanceof Error ? err.message : 'Failed to load objectives');
      } finally {
        setLoading(false);
      }
    }

    loadAndGenerateObjectives();
  }, [projectType, answers]);

  const handleApply = async () => {
    if (!editedObjectives) return;

    try {
      setApplying(true);
      setError(null);

      // Call initialization API
      const response = await fetch(`/api/planning/${projectId}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType,
          answers,
          objectives: editedObjectives,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize project');
      }

      onComplete();
    } catch (err) {
      console.error('Failed to apply objectives:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply objectives');
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !editedObjectives) {
    return (
      <div className="space-y-4">
        <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg text-sm">
          <p className="font-medium text-destructive">Error</p>
          <p className="text-muted-foreground mt-1">{error || 'Failed to load objectives'}</p>
        </div>
        <div className="flex justify-between pt-4 border-t">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  const objectiveFields: Array<{ key: keyof Objectives; label: string; description: string }> = [
    {
      key: 'functional',
      label: 'Functional Objective',
      description: 'What the project will deliver and achieve',
    },
    {
      key: 'quality',
      label: 'Quality Objective',
      description: 'Standards, finishes, and quality requirements',
    },
    {
      key: 'budget',
      label: 'Budget Objective',
      description: 'Financial targets and cost expectations',
    },
    {
      key: 'program',
      label: 'Program Objective',
      description: 'Timeline, milestones, and delivery schedule',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-sm">
        <p className="font-medium">Review and edit objectives</p>
        <p className="text-muted-foreground mt-1">
          These objectives were generated based on your answers. You can edit them before applying.
        </p>
      </div>

      {/* Objectives */}
      <div className="space-y-4">
        {objectiveFields.map((field) => (
          <div key={field.key} className="space-y-2">
            <div>
              <label className="font-medium text-sm">{field.label}</label>
              <p className="text-xs text-muted-foreground">{field.description}</p>
            </div>
            <textarea
              value={editedObjectives[field.key]}
              onChange={(e) =>
                setEditedObjectives((prev) =>
                  prev ? { ...prev, [field.key]: e.target.value } : null
                )
              }
              rows={3}
              className="w-full p-3 border rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="text-xs text-muted-foreground text-right">
              {editedObjectives[field.key].length} characters
            </div>
          </div>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg text-sm">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={onBack}
          disabled={applying}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          ← Back
        </button>
        <button
          onClick={handleApply}
          disabled={applying}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {applying && <Loader2 className="w-4 h-4 animate-spin" />}
          {applying ? 'Applying...' : 'Apply'}
        </button>
      </div>
    </div>
  );
}
