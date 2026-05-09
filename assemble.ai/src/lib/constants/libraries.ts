/**
 * Knowledge Library Types
 * Static library categories for organization-wide document management.
 * These integrate with the RAG embedding system (007-RAG spec).
 */

export const KNOWLEDGE_LIBRARY_TYPES = [
  { id: 'due-diligence', name: 'Due Diligence', color: 'var(--sw-peach)' },
  { id: 'house', name: 'House', color: 'var(--color-success)' },
  { id: 'apartments', name: 'Apartments', color: '#569cd6' },
  { id: 'fitout', name: 'Fitout', color: 'var(--sw-amber)' },
  { id: 'industrial', name: 'Industrial', color: 'var(--sw-lav)' },
  { id: 'remediation', name: 'Remediation', color: 'var(--sw-cyan)' },
] as const;

export type LibraryType = typeof KNOWLEDGE_LIBRARY_TYPES[number]['id'];

export type KnowledgeLibraryType = {
  id: LibraryType;
  name: string;
  color: string;
};

/**
 * Get library type by ID
 */
export function getLibraryType(id: string): KnowledgeLibraryType | undefined {
  return KNOWLEDGE_LIBRARY_TYPES.find(lib => lib.id === id);
}

/**
 * Validate if a string is a valid library type
 */
export function isValidLibraryType(type: string): type is LibraryType {
  return KNOWLEDGE_LIBRARY_TYPES.some(lib => lib.id === type);
}
