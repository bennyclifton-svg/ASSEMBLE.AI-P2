/**
 * Debug script: generate a DOCX with objectivesVisible=false and unzip its XML
 * for inspection. Run: npx tsx scripts/debug-docx.ts
 */
import { exportRFTNewToDOCX } from '../src/lib/export/docx-enhanced';
import type { RFTExportData } from '../src/lib/export/rft-export';
import * as fs from 'fs';
import * as path from 'path';

const baseData: RFTExportData = {
    projectName: 'Lighthouse Residences',
    address: '12 Burraway Road, Wentworth Point, NSW 2127',
    documentLabel: 'Request For Tender, Architecture 01',
    issuedDate: '03/05/2026',
    objectivesVisible: false,
    objectives: {
        planning: [
            'Obtain standard Development Approval (DA) compliant with local council regulations and NCC requirements.',
            'Conduct a detailed site investigation to assess geological, environmental, and contamination aspects.',
        ],
        functional: [
            '34 high-quality apartment units designed for diverse buyer demographics and efficient space utilisation.',
            // The user PDF showed this row with literal HTML — replicate it
            '<p>Incorporate air conditioning systems to ensure thermal comfort and energy efficiency in accordance with NCC requirements.</p>',
        ],
        quality: ['Incorporate premium finishes that comply with NCC 2022 for durability and aesthetic appeal.'],
        compliance: [],
    },
    brief: {
        service: '<p>Architectural design services including <strong>concept design</strong>, schematic design, and DA documentation.</p><ul><li>Site analysis</li><li>Concept options</li></ul>',
        deliverables: '<p>Drawing set, specification, and DA submission package.</p>',
    },
    activities: [
        { id: '1', parentId: null, name: 'Concept Design', startDate: '2026-05-01', endDate: '2026-06-15', color: null, sortOrder: 0 },
        { id: '2', parentId: null, name: 'DA Lodgement', startDate: '2026-06-15', endDate: '2026-07-30', color: null, sortOrder: 1 },
    ],
    feeItems: [
        { activity: 'Concept Design — fixed lump sum' },
        { activity: 'DA Documentation — fixed lump sum' },
    ],
    transmittalDocs: [
        { drawingNumber: 'A-100', drawingName: 'Site Plan', originalName: 'A-100 Site Plan.pdf', drawingRevision: 'A', categoryName: 'Drawings', subcategoryName: 'Architecture' },
        { drawingNumber: null, drawingName: null, originalName: 'Project Brief.pdf', drawingRevision: null, categoryName: 'Reports', subcategoryName: null },
    ],
};

async function main() {
    for (const visible of [false, true]) {
        const payload: RFTExportData = { ...baseData, objectivesVisible: visible };
        const buf = await exportRFTNewToDOCX(payload);
        const out = path.join('scripts', `debug-${visible ? 'visible' : 'hidden'}.docx`);
        fs.writeFileSync(out, buf);
        console.log(`Wrote ${out} (${buf.length} bytes, objectivesVisible=${visible})`);
    }
}

main().catch(err => { console.error(err); process.exit(1); });
