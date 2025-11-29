import { db } from './index';
import { categories } from './schema';
import { DOCUMENT_CATEGORIES } from '../constants/categories';

export async function seedCategories() {
    console.log('Seeding categories...');

    const categoriesToSeed = Object.values(DOCUMENT_CATEGORIES).map(cat => ({
        id: cat.id,
        name: cat.name,
        isSystem: true, // Mark as system categories
    }));

    try {
        // Insert categories (ignore if they already exist)
        for (const category of categoriesToSeed) {
            await db.insert(categories)
                .values(category)
                .onConflictDoNothing();
        }

        console.log(`Seeded ${categoriesToSeed.length} categories`);
    } catch (error) {
        console.error('Error seeding categories:', error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    seedCategories()
        .then(() => {
            console.log('Category seeding complete');
            process.exit(0);
        })
        .catch((error) => {
            console.error('Category seeding failed:', error);
            process.exit(1);
        });
}
