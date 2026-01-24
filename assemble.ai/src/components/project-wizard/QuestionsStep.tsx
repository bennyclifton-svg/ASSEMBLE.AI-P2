'use client';

/**
 * Questions Step
 * Displays quick setup questions (single and multi-select)
 * Feature: 018-project-initiator (Streamlined Workflow)
 */

import { useState, useEffect } from 'react';
import { Loader2, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import { generateObjectives } from '@/lib/utils/template-substitution';
import type { ProjectType, QuestionAnswers, QuickSetupQuestion } from '@/lib/types/project-initiator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface QuestionsStepProps {
  projectId: string;
  projectType: ProjectType;
  initialAnswers?: QuestionAnswers;
  onComplete: () => void;
  onBack: () => void;
}

export function QuestionsStep({ projectId, projectType, initialAnswers = {}, onComplete, onBack }: QuestionsStepProps) {
  const [answers, setAnswers] = useState<QuestionAnswers>(initialAnswers);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const questions = projectType.quickSetupQuestions;

  const [currentTab, setCurrentTab] = useState<string>(questions[0]?.id || '');
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());

  const handleSingleSelect = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleMultiSelect = (questionId: string, value: string) => {
    setAnswers((prev) => {
      const current = prev[questionId];
      const currentArray = Array.isArray(current) ? current : [];

      if (currentArray.includes(value)) {
        // Remove value
        const newValues = currentArray.filter((v) => v !== value);
        return {
          ...prev,
          [questionId]: newValues.length > 0 ? newValues : undefined,
        };
      } else {
        // Add value
        return {
          ...prev,
          [questionId]: [...currentArray, value],
        };
      }
    });
  };

  const handleSkip = () => {
    // Use first option as default for each unanswered question
    const defaultAnswers: QuestionAnswers = { ...answers };
    questions.forEach((q) => {
      if (!answers[q.id] && q.options.length > 0) {
        defaultAnswers[q.id] = q.type === 'multiple' ? [q.options[0].value] : q.options[0].value;
      }
    });

    setAnswers(defaultAnswers);

    // Mark all questions as completed
    const allQuestionIds = new Set(questions.map(q => q.id));
    setCompletedQuestions(allQuestionIds);

    // Navigate to first tab to review
    setCurrentTab(questions[0]?.id || '');
  };

  const handleGenerate = async (answersToUse: QuestionAnswers = answers) => {
    // Validate that at least one answer exists for each question
    const hasAllAnswers = questions.every((q) => {
      const answer = answersToUse[q.id];
      if (!answer) return false;
      if (Array.isArray(answer)) return answer.length > 0;
      return true;
    });

    if (!hasAllAnswers) {
      alert('Please answer all questions or click Skip to use defaults.');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      // Load objective templates
      const templatesModule = await import('@/lib/data/objective-templates.json');
      const templatesData = (templatesModule.default || templatesModule) as any;
      const objectivesTemplates = templatesData.objectivesTemplates || templatesData;
      const template = objectivesTemplates[projectType.id];

      if (!template) {
        throw new Error(`No template found for project type: ${projectType.id}`);
      }

      if (template.version || template.lastUpdated) {
        throw new Error(`Invalid template for project type: ${projectType.id}`);
      }

      // Generate objectives with substitution
      const generated = generateObjectives(template, { answers: answersToUse });

      // Call initialization API to save objectives and enable disciplines
      const response = await fetch(`/api/planning/${projectId}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType: projectType.id,
          answers: answersToUse,
          objectives: generated,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initialize project');
      }

      onComplete();
    } catch (err) {
      console.error('Failed to generate objectives:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate objectives');
    } finally {
      setGenerating(false);
    }
  };

  const isAnswered = (questionId: string): boolean => {
    const answer = answers[questionId];
    if (!answer) return false;
    if (Array.isArray(answer)) return answer.length > 0;
    return true;
  };

  const canProceed = questions.every((q) => isAnswered(q.id));

  const getQuestionStatus = (questionId: string): 'completed' | 'active' | 'not-started' => {
    if (completedQuestions.has(questionId)) return 'completed';
    if (currentTab === questionId) return 'active';
    return 'not-started';
  };

  // Auto-progress to next tab when current question is answered
  useEffect(() => {
    const currentIndex = questions.findIndex(q => q.id === currentTab);
    if (currentIndex >= 0 && isAnswered(currentTab)) {
      // Mark as completed
      setCompletedQuestions(prev => new Set([...prev, currentTab]));

      // Auto-advance to next tab if not on last question
      if (currentIndex < questions.length - 1) {
        setTimeout(() => {
          setCurrentTab(questions[currentIndex + 1].id);
        }, 300); // 300ms delay for visual feedback
      }
    }
  }, [answers, currentTab, questions]);

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSkip}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            Use Defaults
          </button>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {completedQuestions.size} of {questions.length} completed
          </span>
        </div>
        <button
          onClick={() => handleGenerate()}
          disabled={!canProceed || generating}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 whitespace-nowrap"
        >
          {generating && <Loader2 className="w-4 h-4 animate-spin" />}
          {generating ? 'Submitting...' : 'Submit Answers'}
        </button>
      </div>

      {/* Tabs */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="w-full h-auto justify-start flex-wrap gap-2 p-1">
          {questions.map((question, index) => {
            const status = getQuestionStatus(question.id);
            return (
              <TabsTrigger
                key={question.id}
                value={question.id}
                className="flex-shrink-0 px-0 py-0 h-auto data-[state=active]:bg-transparent data-[state=active]:shadow-none"
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                    status === 'completed' && 'bg-green-500 text-white',
                    status === 'active' && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2',
                    status === 'not-started' && 'bg-muted text-muted-foreground'
                  )}
                >
                  {status === 'completed' ? <Check className="w-4 h-4" /> : index + 1}
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {questions.map((question, index) => (
          <TabsContent key={question.id} value={question.id} className="mt-4 min-h-[400px]">
            <div className="space-y-3">
              {/* Question Header */}
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">{question.question}</h3>
                {question.helpText && (
                  <p className="text-sm text-muted-foreground">{question.helpText}</p>
                )}
              </div>

              {/* Options */}
              <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                {question.type === 'single' ? (
                  // Single Select (Radio)
                  <div className="space-y-2">
                    {question.options.map((option) => {
                      const IconComponent = option.icon ? (Icons[option.icon as keyof typeof Icons] as any) : null;
                      const isSelected = answers[question.id] === option.value;

                      return (
                        <button
                          key={option.value}
                          onClick={() => handleSingleSelect(question.id, option.value)}
                          className={`w-full p-2.5 border rounded-lg text-left transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50 hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {IconComponent && (
                              <IconComponent className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-sm">{option.label}</div>
                              {option.metadata && (
                                <div className="text-xs text-muted-foreground mt-0.5 space-x-3">
                                  {option.metadata.gfa && <span>GFA: {option.metadata.gfa}m²</span>}
                                  {option.metadata.units && <span>{option.metadata.units}</span>}
                                  {option.metadata.costPerSqm && <span>${option.metadata.costPerSqm}/m²</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  // Multi Select (Checkbox)
                  <div className="space-y-2">
                    {question.options.map((option) => {
                      const IconComponent = option.icon ? (Icons[option.icon as keyof typeof Icons] as any) : null;
                      const currentAnswer = answers[question.id];
                      const isSelected = Array.isArray(currentAnswer) && currentAnswer.includes(option.value);

                      return (
                        <button
                          key={option.value}
                          onClick={() => handleMultiSelect(question.id, option.value)}
                          className={`w-full p-2.5 border rounded-lg text-left transition-colors ${
                            isSelected
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:border-primary/50 hover:bg-accent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'
                              }`}
                            >
                              {isSelected && <Icons.Check className="w-3 h-3 text-primary-foreground" />}
                            </div>
                            {IconComponent && (
                              <IconComponent className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                            )}
                            <div className="flex-1 font-medium text-sm">{option.label}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Tab Navigation Hints */}
              <div className="flex items-center justify-end pt-3 border-t text-sm text-muted-foreground gap-4">
                <span>{index + 1} of {questions.length}</span>
                <button
                  onClick={() => {
                    const currentIndex = questions.findIndex(q => q.id === currentTab);
                    if (currentIndex < questions.length - 1) {
                      setCurrentTab(questions[currentIndex + 1].id);
                    }
                  }}
                  disabled={index === questions.length - 1}
                  className="hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Error Display */}
      {error && (
        <div className="p-3 border border-destructive/50 bg-destructive/10 rounded-lg text-sm">
          <p className="text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
