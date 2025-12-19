/**
 * T231: useFieldGeneration Hook
 *
 * Universal React hook for AI-assisted field generation.
 * Calls /api/retrieval/generate-field endpoint with automatic
 * context resolution and input interpretation.
 */

'use client';

import { useState, useCallback } from 'react';
import type { FieldType, InputInterpretation } from '@/lib/constants/field-types';

/**
 * Source information returned from generation
 */
export interface GenerationSource {
  chunkId: string;
  documentName: string;
  relevanceScore: number;
}

/**
 * Response from the generate-field API
 */
export interface GenerateFieldResponse {
  content: string;
  sources: GenerationSource[];
  inputInterpretation: InputInterpretation;
}

/**
 * Options for the useFieldGeneration hook
 */
export interface UseFieldGenerationOptions {
  fieldType: FieldType;
  projectId: string;
  disciplineId?: string;
  tradeId?: string;
  additionalContext?: {
    firmName?: string;
    evaluationData?: object;
    sectionTitle?: string;
  };
}

/**
 * Return type for the useFieldGeneration hook
 */
export interface UseFieldGenerationReturn {
  /**
   * Generate content for the field
   * @param userInput - User's input (instruction, content to enhance, or empty)
   * @returns Promise resolving to the generated content and sources
   */
  generate: (userInput: string) => Promise<GenerateFieldResponse>;

  /**
   * Whether generation is currently in progress
   */
  isGenerating: boolean;

  /**
   * Error from the last generation attempt (null if successful)
   */
  error: Error | null;

  /**
   * Result from the last generation (null if none yet)
   */
  lastGeneration: GenerateFieldResponse | null;

  /**
   * Clear the last error
   */
  clearError: () => void;

  /**
   * Clear the last generation result
   */
  clearLastGeneration: () => void;
}

/**
 * Universal hook for AI-assisted field generation
 *
 * @example
 * ```tsx
 * const { generate, isGenerating, error } = useFieldGeneration({
 *   fieldType: 'brief.service',
 *   projectId: 'proj-123',
 *   disciplineId: 'disc-456',
 * });
 *
 * // Generate with instruction
 * const result = await generate('list 4 key services');
 *
 * // Generate by enhancing existing content
 * const result = await generate('Fire engineering design and consultation...');
 *
 * // Generate from context (empty input)
 * const result = await generate('');
 * ```
 */
export function useFieldGeneration(
  options: UseFieldGenerationOptions
): UseFieldGenerationReturn {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastGeneration, setLastGeneration] = useState<GenerateFieldResponse | null>(null);

  const generate = useCallback(
    async (userInput: string): Promise<GenerateFieldResponse> => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch('/api/retrieval/generate-field', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: options.projectId,
            fieldType: options.fieldType,
            userInput: userInput.trim(),
            disciplineId: options.disciplineId,
            tradeId: options.tradeId,
            additionalContext: options.additionalContext,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({
            error: 'Generation failed',
          }));
          throw new Error(errorData.error || `Generation failed (${response.status})`);
        }

        const result: GenerateFieldResponse = await response.json();
        setLastGeneration(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        throw error;
      } finally {
        setIsGenerating(false);
      }
    },
    [options.projectId, options.fieldType, options.disciplineId, options.tradeId, options.additionalContext]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearLastGeneration = useCallback(() => {
    setLastGeneration(null);
  }, []);

  return {
    generate,
    isGenerating,
    error,
    lastGeneration,
    clearError,
    clearLastGeneration,
  };
}

/**
 * Simplified hook for generating brief service content
 */
export function useBriefServiceGeneration(projectId: string, disciplineId: string) {
  return useFieldGeneration({
    fieldType: 'brief.service',
    projectId,
    disciplineId,
  });
}

/**
 * Simplified hook for generating brief deliverables content
 */
export function useBriefDeliverablesGeneration(projectId: string, disciplineId: string) {
  return useFieldGeneration({
    fieldType: 'brief.deliverables',
    projectId,
    disciplineId,
  });
}

/**
 * Simplified hook for generating scope of works content
 */
export function useScopeWorksGeneration(projectId: string, tradeId: string) {
  return useFieldGeneration({
    fieldType: 'scope.works',
    projectId,
    tradeId,
  });
}
