/**
 * Inline Instruction Utilities
 * Intelligence Layer - Pillar 3: // Inline Instructions
 *
 * Utilities for scanning, validating, and replacing // instructions
 * in TipTap/ProseMirror editors. Uses ProseMirror transactions to
 * preserve undo history (Ctrl+Z restores the original instruction).
 */

import type { Editor } from '@tiptap/core';
import type { EditorState } from '@tiptap/pm/state';
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model';

// ============================================================================
// TYPES
// ============================================================================

export interface InstructionMatch {
  /** The instruction text after "//" (trimmed) */
  instruction: string;
  /** The full text of the paragraph containing the instruction */
  fullText: string;
  /** Start position of the paragraph node in the document */
  paragraphFrom: number;
  /** End position of the paragraph node in the document */
  paragraphTo: number;
  /** Start position of the "//" marker within the paragraph's text content */
  markerOffset: number;
}

// ============================================================================
// SCANNING
// ============================================================================

/**
 * Find the first // instruction in the editor document.
 * Returns null if no instruction is found.
 */
export function findFirstInstruction(
  state: EditorState
): InstructionMatch | null {
  const { doc } = state;
  let result: InstructionMatch | null = null;

  doc.descendants((node, pos) => {
    if (result) return false;
    if (node.type.name !== 'paragraph') return;

    const text = node.textContent;
    const regex = /(?<!:)\/\/(.*)/;
    const match = regex.exec(text);

    if (match) {
      result = {
        instruction: match[1].trim(),
        fullText: text,
        paragraphFrom: pos,
        paragraphTo: pos + node.nodeSize,
        markerOffset: match.index,
      };
      return false;
    }
  });

  return result;
}

/**
 * Check if the editor document contains any // instructions.
 * Lightweight check for showing/hiding the Execute button.
 */
export function hasInstructions(state: EditorState): boolean {
  const { doc } = state;
  let found = false;

  doc.descendants((node) => {
    if (found) return false;
    if (!node.isText || !node.text) return;

    if (/(?<!:)\/\//.test(node.text)) {
      found = true;
      return false;
    }
  });

  return found;
}

/**
 * Re-find an instruction by matching its text content.
 * Used after API call to relocate the instruction in case
 * the document changed during the request.
 */
export function refindInstruction(
  state: EditorState,
  instructionText: string
): InstructionMatch | null {
  const { doc } = state;
  let result: InstructionMatch | null = null;

  doc.descendants((node, pos) => {
    if (result) return false;
    if (node.type.name !== 'paragraph') return;

    const text = node.textContent;
    const regex = /(?<!:)\/\/(.*)/;
    const match = regex.exec(text);

    if (match && match[1].trim() === instructionText) {
      result = {
        instruction: instructionText,
        fullText: text,
        paragraphFrom: pos,
        paragraphTo: pos + node.nodeSize,
        markerOffset: match.index,
      };
      return false;
    }
  });

  return result;
}

// ============================================================================
// VALIDATION
// ============================================================================

export function validateInstruction(instruction: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = instruction.trim();

  if (!trimmed) {
    return {
      valid: false,
      error: 'Please add an instruction after //. Example: // summarize the tender responses',
    };
  }

  if (trimmed.length > 500) {
    return {
      valid: false,
      error: `Instruction is too long (${trimmed.length}/500 characters). Please shorten your instruction.`,
    };
  }

  return { valid: true };
}

// ============================================================================
// CONTENT EXTRACTION
// ============================================================================

/**
 * Extract surrounding content from the editor for context.
 * Returns the editor's HTML content capped at 10,000 characters.
 */
export function extractSurroundingContent(editor: Editor): string {
  return editor.getHTML().slice(0, 10000);
}

// ============================================================================
// REPLACEMENT
// ============================================================================

/**
 * Replace the // instruction paragraph with AI-generated HTML content.
 * Uses a ProseMirror transaction to preserve undo history.
 *
 * @returns true if replacement succeeded, false otherwise
 */
export function replaceInstructionWithContent(
  editor: Editor,
  match: InstructionMatch,
  htmlContent: string
): boolean {
  const { state, view } = editor;
  const { schema } = state;

  // Parse the HTML content into ProseMirror nodes
  const domParser = ProseMirrorDOMParser.fromSchema(schema);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  const parsedSlice = domParser.parseSlice(tempDiv);

  if (!parsedSlice.content.childCount) {
    console.warn('[instruction-utils] Parsed HTML produced no content');
    return false;
  }

  // Determine replacement range
  const from = match.paragraphFrom;
  const to = match.paragraphTo;

  // Create and dispatch the transaction
  const tr = state.tr.replaceWith(from, to, parsedSlice.content);

  // Dispatch (preserves undo stack)
  view.dispatch(tr);

  return true;
}
