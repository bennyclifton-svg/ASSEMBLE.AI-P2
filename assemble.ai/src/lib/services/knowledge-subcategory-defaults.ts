import { db, subcategories, categories } from '@/lib/db';
import { eq, and, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const KNOWLEDGE_CATEGORY_IDS = [
  'planning', 'procurement', 'delivery', 'authorities',
  'scheme-design', 'detail-design', 'ifc-design',
] as const;

export const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  planning: [
    'Feaso', 'Title', 'Site Analysis', 'Design Brief', 'DD Planning',
    'DD Environmental', 'DD Technical', 'DD Heritage', 'Development Application',
  ],
  procurement: ['EOI', 'RFT', 'Addendum', 'Submission', 'Evaluation', 'TRR'],
  delivery: [
    'LOI', 'FIOA & Contract', 'Insurance & BGs', 'Management Plans',
    'Progress Claims', 'Variations', 'Programme & EOT', 'RFI & Notices',
    'CC PC OC', 'Commissioning', 'Defects', 'Reports', 'Photos',
  ],
  authorities: ['Council', 'Electricity', 'Gas', 'Water', 'Telco', 'Traffic', 'Certifier', 'Heritage'],
  'scheme-design': [],
  'detail-design': [],
  'ifc-design': [],
};

/**
 * Ensure category rows exist in the categories table for the knowledge categories.
 */
async function ensureCategoryRows() {
  for (const catId of KNOWLEDGE_CATEGORY_IDS) {
    const existing = await db.select().from(categories).where(eq(categories.id, catId));
    if (existing.length === 0) {
      const name = catId.charAt(0).toUpperCase() + catId.slice(1);
      await db.insert(categories).values({ id: catId, name, isSystem: true });
    }
  }
}

/**
 * Seed default knowledge subcategories for a project if none exist.
 * Returns true if defaults were seeded, false if rows already existed.
 */
export async function seedKnowledgeDefaults(projectId: string): Promise<boolean> {
  // Check if any knowledge subcategories exist for this project
  const existing = await db
    .select()
    .from(subcategories)
    .where(
      and(
        eq(subcategories.projectId, projectId),
        inArray(subcategories.categoryId, [...KNOWLEDGE_CATEGORY_IDS])
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return false;
  }

  await ensureCategoryRows();

  const rows: { id: string; categoryId: string; projectId: string; name: string; isSystem: boolean; sortOrder: number }[] = [];

  for (const [categoryId, names] of Object.entries(DEFAULT_SUBCATEGORIES)) {
    names.forEach((name, index) => {
      rows.push({
        id: nanoid(),
        categoryId,
        projectId,
        name,
        isSystem: true,
        sortOrder: index,
      });
    });
  }

  if (rows.length > 0) {
    await db.insert(subcategories).values(rows);
  }

  return true;
}
