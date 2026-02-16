/**
 * Test script for drawing extraction filename parsing
 * Run with: npx tsx scripts/test-drawing-extraction.ts
 */

import { extractFromFilename } from '../src/lib/services/drawing-extraction';

// Add test filenames here
const testFilenames = [
    // LT-XX pattern with attached square bracket revision (user's files)
    '15-068s 74-76 Kitchener Parade LT01[B].pdf',
    '15-068s 74-76 Kitchener Parade LT00[B].pdf',
    '15-068s 74-76 Kitchener Parade LT02[B].pdf',
    // CC-XX pattern with single letter revision at end
    '1115 CC-11 LEVEL 08 E.pdf',
    '1115 CC-12 ROOF PLAN D.pdf',
    '1115 CC-01 SETOUT PLAN D.pdf',
    '1115 CC-02 BASEMENT 2 F.pdf',
    '1115 CC-03 BASEMENT 1 F.pdf',
    '1115 CC-04 GROUND FLOOR J.pdf',
    '1115 CC-05 LEVEL 01 H.pdf',
    '1115 CC-06 LEVEL 02 F.pdf',
    '1115 CC-07 LEVEL 03 E.pdf',
    '1115 CC-08 LEVEL 05 E.pdf',
    '1115 CC-09 LEVEL 06 E.pdf',
    '1115 CC-10 LEVEL 07 F.pdf',
    // H-XXX pattern with square bracket revision
    'H-101 [C].pdf',
    'H-102 [D].pdf',
    'H-103 [D].pdf',
    'H-000 [C].pdf',
    'H-100 [C].pdf',
    // Architectural drawings from screenshot (AI was extracting incorrectly)
    '1115 CC-46 WET AREAS A.pdf',
    '1115 CC-52 FIXTURES & FINISHES A.pdf',
    '1115 CC-08 LEVEL 05 E.pdf',
    '1115 CC-43 ELEC LEVEL 07 B.pdf',
    '1115 CC-29 RCP LEVEL 02 C.pdf',
    '1115 CC-28 RCP LEVEL 01 C.pdf',
    '1115 CC-31 RCP LEVEL 05 C.pdf',
    '1115 CC-32 RCP LEVEL 06 C.pdf',
    '1115 CC-33 RCP LEVEL 07 C.pdf',
    '1115 CC-37 ELEC GROUND FLOOR B.pdf',
    '1115 CC-34 RCP LEVEL 08 C.pdf',
];

console.log('Drawing Extraction Test Results\n');
console.log('='.repeat(100));
console.log(
    'Filename'.padEnd(45),
    'Drawing #'.padEnd(12),
    'Name'.padEnd(20),
    'Rev'.padEnd(6),
    'Conf'
);
console.log('='.repeat(100));

for (const filename of testFilenames) {
    const result = extractFromFilename(filename);

    if (result) {
        console.log(
            filename.padEnd(45),
            (result.drawingNumber || '-').padEnd(12),
            (result.drawingName || '-').substring(0, 18).padEnd(20),
            (result.drawingRevision || '-').padEnd(6),
            result.confidence.toString()
        );
    } else {
        console.log(
            filename.padEnd(45),
            'FAILED TO EXTRACT'.padEnd(12)
        );
    }
}

console.log('='.repeat(100));
