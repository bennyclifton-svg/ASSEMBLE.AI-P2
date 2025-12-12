/**
 * Knowledge Library Types
 * Static library categories for organization-wide document management.
 * These integrate with the RAG embedding system (007-RAG spec).
 */

export const KNOWLEDGE_LIBRARY_TYPES = [
  { id: 'due-diligence', name: 'Due Diligence', color: '#ce9178' },
  { id: 'house', name: 'House', color: '#4ec9b0' },
  { id: 'apartments', name: 'Apartments', color: '#569cd6' },
  { id: 'fitout', name: 'Fitout', color: '#dcdcaa' },
  { id: 'industrial', name: 'Industrial', color: '#c586c0' },
  { id: 'remediation', name: 'Remediation', color: '#9cdcfe' },
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
