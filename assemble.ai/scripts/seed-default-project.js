import { db } from './src/lib/db/index.js';
import { projects } from './src/lib/db/schema.js';

async function seedDefaultProject() {
    try {
        // Insert default project
        await db.insert(projects).values({
            id: 'default-project',
            name: 'Default Project',
            code: 'DEFAULT',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }).onConflictDoNothing();

        console.log('✅ Default project seeded successfully');
    } catch (error) {
        console.error('❌ Error seeding default project:', error);
    }
    process.exit(0);
}

seedDefaultProject();
