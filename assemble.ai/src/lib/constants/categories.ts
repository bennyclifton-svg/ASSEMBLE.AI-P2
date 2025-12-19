// Category constants for document categorization
// These categories are fixed across all projects

export const DOCUMENT_CATEGORIES = {
    // Row 1 Categories
    PLANNING: {
        id: 'planning',
        name: 'Planning',
        color: '#8B7355', // Warm Brown
        hasSubcategories: false,
        row: 1,
    },
    SCHEME_DESIGN: {
        id: 'scheme-design',
        name: 'Scheme Design',
        color: '#5B9E9E', // Teal
        hasSubcategories: true,
        subcategorySource: 'consultants' as const,
        row: 1,
    },
    DETAIL_DESIGN: {
        id: 'detail-design',
        name: 'Detail Design',
        color: '#7B68A6', // Soft Purple
        hasSubcategories: true,
        subcategorySource: 'consultants' as const,
        row: 1,
    },
    PROCUREMENT: {
        id: 'procurement',
        name: 'Procurement',
        color: '#A67373', // Muted red
        hasSubcategories: false,
        row: 1,
    },
    DELIVERY: {
        id: 'delivery',
        name: 'Delivery',
        color: '#7A9B7E', // Sage Green
        hasSubcategories: false,
        row: 1,
    },
    // Row 2 Categories
    CONSULTANTS: {
        id: 'consultants',
        name: 'Consultants',
        color: '#555555', // Gray (same as upload tile border)
        hasSubcategories: true,
        subcategorySource: 'consultants' as const,
        row: 2,
    },
    CONTRACTORS: {
        id: 'contractors',
        name: 'Contractors',
        color: '#555555', // Gray (same as upload tile border)
        hasSubcategories: true,
        subcategorySource: 'contractors' as const,
        row: 2,
    },
    ADMINISTRATION: {
        id: 'administration',
        name: 'Administration',
        color: '#6B7B8C', // Slate Gray
        hasSubcategories: false,
        row: 2,
    },
    KNOWLEDGE: {
        id: 'knowledge',
        name: 'Knowledge',
        color: '#6B9BD1', // Sky Blue (AI/knowledge indicator)
        hasSubcategories: false,
        row: 2,
        isKnowledgeSource: true, // Triggers auto-RAG when files dropped/assigned
    },
} as const;

export type CategoryId = keyof typeof DOCUMENT_CATEGORIES;

export interface Category {
    id: string;
    name: string;
    color: string;
    hasSubcategories: boolean;
    subcategorySource?: 'consultants' | 'contractors';
    row: number;
    isKnowledgeSource?: boolean; // When true, triggers auto-RAG on file drop/assign
}

export interface Subcategory {
    id: string;
    name: string;
    parentCategoryId: string;
}

export interface ActiveCategory extends Category {
    subcategories?: Subcategory[];
}

// Helper to get all categories as an array
export function getAllCategories(): Category[] {
    return Object.values(DOCUMENT_CATEGORIES);
}

// Helper to get categories by row
export function getCategoriesByRow(row: number): Category[] {
    return Object.values(DOCUMENT_CATEGORIES).filter(cat => cat.row === row);
}

// Helper to get category by ID
export function getCategoryById(id: string): Category | undefined {
    return Object.values(DOCUMENT_CATEGORIES).find(cat => cat.id === id);
}

// Helper to get category by name (case-insensitive)
export function getCategoryByName(name: string): Category | undefined {
    const normalizedName = name.toLowerCase();
    return Object.values(DOCUMENT_CATEGORIES).find(
        cat => cat.name.toLowerCase() === normalizedName
    );
}
