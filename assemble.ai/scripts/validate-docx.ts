/**
 * Unzip and validate XML in generated DOCX files.
 * Run: npx tsx scripts/validate-docx.ts
 */
import * as fs from 'fs';
import * as path from 'path';
import { DOMParser } from '@xmldom/xmldom';

function check(label: string, xmlPath: string) {
    if (!fs.existsSync(xmlPath)) {
        console.log(`SKIP: ${xmlPath} (not found)`);
        return;
    }
    console.log(`\n=== ${label} ===`);
    const docXml = fs.readFileSync(xmlPath, 'utf-8');
    console.log(`\ndocument.xml length: ${docXml.length}`);

    const errors: string[] = [];
    const parser = new DOMParser({
        errorHandler: {
            warning: (m) => errors.push(`WARN: ${m}`),
            error: (m) => errors.push(`ERROR: ${m}`),
            fatalError: (m) => errors.push(`FATAL: ${m}`),
        },
    });
    parser.parseFromString(docXml, 'application/xml');
    if (errors.length === 0) {
        console.log('XML parse: clean');
    } else {
        console.log('XML parse errors:');
        for (const e of errors) console.log(`  ${e}`);
    }

    // Count w:p and w:tbl
    const pCount = (docXml.match(/<w:p[> /]/g) || []).length;
    const tCount = (docXml.match(/<w:tbl[> ]/g) || []).length;
    console.log(`Paragraphs: ${pCount}, Tables: ${tCount}`);
}

check('hidden', 'scripts/hidden-extract/word/document.xml');
check('visible', 'scripts/visible-extract/word/document.xml');
