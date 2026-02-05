import { db } from './index';
import { categories, subcategories } from './schema';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_CATEGORIES = [
    'Planning',
    'Scheme Design',
    'Detail Design',
    'Procurement',
    'Delivery',
    'Consultants',
    'Contractors',
    'Administration',
    'Cost Planning',
];

const CONSULTANT_SUBCATEGORIES = [
    'Access', 'Acoustic', 'Arborist', 'Architect', 'ASP3', 'BASIX', 'Building Code Advice',
    'Bushfire', 'Building Certifier', 'Civil', 'Cost Planning', 'Ecology', 'Electrical',
    'ESD', 'Facade', 'Fire Engineering', 'Fire Services', 'Flood', 'Geotech', 'Hazmat',
    'Hydraulic', 'Interior', 'Landscape', 'Mechanical', 'NBN', 'Passive Fire',
    'Roof Access', 'Site Investigation', 'Stormwater', 'Structural', 'Survey', 'Traffic',
    'Vertical Transport', 'Waste Management', 'Wastewater', 'Waterproofing'
];

const CONTRACTOR_SUBCATEGORIES = [
    'Earthworks', 'Concrete', 'Masonry', 'Carpenter', 'Steel Fixer', 'Roofer', 'Plumber',
    'Electrician', 'HVAC Technician', 'Insulation Installer', 'Drywaller', 'Plasterer',
    'Tiler', 'Flooring Installer', 'Painter', 'Glazier', 'Cabinetmaker', 'Mason', 'Welder',
    'Scaffolder', 'Landscaper'
];

async function seed() {
    console.log('🌱 Seeding database...');

    for (const catName of DEFAULT_CATEGORIES) {
        const catId = uuidv4();
        await db.insert(categories).values({
            id: catId,
            name: catName,
            isSystem: true,
        }).onConflictDoNothing();

        if (catName === 'Consultants') {
            for (const subName of CONSULTANT_SUBCATEGORIES) {
                await db.insert(subcategories).values({
                    id: uuidv4(),
                    categoryId: catId,
                    name: subName,
                    isSystem: true,
                }).onConflictDoNothing();
            }
        }

        if (catName === 'Contractors') {
            for (const subName of CONTRACTOR_SUBCATEGORIES) {
                await db.insert(subcategories).values({
                    id: uuidv4(),
                    categoryId: catId,
                    name: subName,
                    isSystem: true,
                }).onConflictDoNothing();
            }
        }
    }

    console.log('✅ Seeding complete!');
}

seed().catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
});
