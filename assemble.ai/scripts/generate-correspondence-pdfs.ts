/**
 * Generates two demo PDFs for the marketing video on AI document compare:
 *
 *   1. City of Parramatta Council RFI (CON-2026-014) — acoustic plant noise
 *   2. Acoustic Logic Rev B response to that RFI
 *
 * Both write to demo-uploads/correspondence/. No DB, no seed integration —
 * the user uploads + drives the workflow live in the app.
 *
 * Compatible with the project's pdf-parse fallback path (compress: false, pdfVersion 1.4).
 *
 * Run:  npx tsx scripts/generate-correspondence-pdfs.ts
 */
import { join } from 'path';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

const OUT_DIR = join(__dirname, '..', 'demo-uploads', 'correspondence');

interface Section {
  heading?: string;
  body: string[];
}

interface DocumentSeed {
  filename: string;
  letterhead: string[];
  title: string;
  intro: string[];
  sections: Section[];
  signoff: string[];
}

const COUNCIL_RFI: DocumentSeed = {
  filename: 'City-of-Parramatta-RFI-CON-2026-014.pdf',
  letterhead: [
    'CITY OF PARRAMATTA COUNCIL',
    'Civic Place, Level 17, 126 Church Street, Parramatta NSW 2150',
    'PO Box 32, Parramatta NSW 2124',
    'T  02 9806 5050   |   council@cityofparramatta.nsw.gov.au',
  ],
  title: 'REQUEST FOR INFORMATION (RFI)',
  intro: [
    'Date: 12 March 2026',
    'Our Reference: CON-2026-014',
    'Your Reference: DA-2025-0142, Condition #14',
    '',
    'To:    Coastal Living Pty Ltd',
    '       (Marcus O\'Brien, Owner\'s Representative)',
    '       Project: Lighthouse Residences',
    '       Address: 12 Burroway Road, Wentworth Point NSW 2127',
    '',
    'Subject: Acoustic compliance — rooftop mechanical plant noise',
    '         (City of Parramatta DCP 2023, Section 4.3 Acoustic Amenity)',
  ],
  sections: [
    {
      body: [
        'Council has reviewed the supporting acoustic information submitted with the development application',
        'for the above project (Acoustic Logic Pty Ltd, Report AL-2025-204-RevA, dated 14 May 2025) and notes',
        'that further information is required prior to the issue of the Construction Certificate amendment',
        'covering the rooftop plant area.',
        '',
        'In particular, the original report does not adequately address recent changes to the rooftop plant',
        'arising from VAR-002 (MSB capacity uplift) and the addition of further condenser units. A revised',
        'acoustic assessment is required to demonstrate that the rooftop plant — as now proposed — will comply',
        'with NSW EPA INP 2000 amenity and sleep disturbance criteria, and with City of Parramatta DCP 2023',
        'Section 4.3.2 (maximum 40 dB(A) at boundary).',
      ],
    },
    {
      heading: 'Information required',
      body: [
        'The revised acoustic assessment must address each of the following items:',
        '',
        '1. Updated mechanical plant schedule reflecting the variation to AHU-3 (per VAR-002) and the',
        '   additional condenser units now proposed.',
        '',
        '2. Predicted noise levels at the nearest residential receiver under both day-time (07:00–22:00)',
        '   and night-time (22:00–07:00) conditions, demonstrating compliance with:',
        '     (a) NSW EPA INP 2000 amenity criterion: LAeq,15min ≤ 5 dB above measured background (LA90);',
        '     (b) NSW EPA INP 2000 sleep disturbance criterion: LA1,1min ≤ 52 dB(A) at 1 m from facade;',
        '     (c) City of Parramatta DCP 2023 Section 4.3.2: maximum 40 dB(A) at the boundary.',
        '',
        '3. Cumulative noise modelling that includes ALL rooftop sources operating concurrently:',
        '     - VRV condensers',
        '     - AHU-3 (revised model)',
        '     - Stair B pressurisation fan',
        '     - Lift machine room exhaust',
        '',
        '4. Any proposed acoustic treatments (e.g. enclosures, gravel ballast, spring isolation) and the',
        '   predicted noise reduction that each treatment delivers.',
        '',
        '5. Proposed verification methodology, including in-situ acoustic testing at Practical Completion',
        '   prior to issue of the Occupation Certificate.',
      ],
    },
    {
      heading: 'Response timeframe',
      body: [
        'A complete revised acoustic assessment addressing each of the five items above is required within',
        '21 days of the date of this notice. Failure to provide an adequate response within that period may',
        'result in further compliance investigation under Council\'s powers in Part 9 of the Environmental',
        'Planning and Assessment Act 1979 (NSW), and may delay the Construction Certificate amendment for',
        'the rooftop plant area.',
        '',
        'If you require clarification on any of the above items, please contact the undersigned officer',
        'directly. Council reserves the right to request additional information following review of the',
        'revised assessment.',
      ],
    },
  ],
  signoff: [
    'Yours sincerely,',
    '',
    'Lisa Tran',
    'Senior Development Assessment Officer',
    'City of Parramatta Council',
    'l.tran@cityofparramatta.nsw.gov.au',
    'Direct: 02 9806 5151',
    '',
    'cc:  ASJB Architects (David Liu, Project Architect)',
    '     Norman Disney & Young (Tom Bennett, Services Lead)',
    '     Acoustic Logic Pty Ltd (Daniel Webb, Acoustic Consultant)',
  ],
};

const ACOUSTIC_REV_B: DocumentSeed = {
  filename: 'Acoustic-Logic-Rev-B-Plant-Noise.pdf',
  letterhead: [
    'ACOUSTIC LOGIC PTY LTD',
    'ABN 93 099 821 776',
    'Level 5, 219 Castlereagh Street, Sydney NSW 2000',
    'T  02 8755 8888   |   sydney@acousticlogic.com.au',
  ],
  title: 'ACOUSTIC ASSESSMENT — REVISION B\nROOFTOP MECHANICAL PLANT NOISE',
  intro: [
    'Project:        Lighthouse Residences',
    'Address:        12 Burroway Road, Wentworth Point NSW 2127',
    'Report No.:     AL-2026-204-RevB',
    'Date:           24 April 2026',
    'Prepared by:    Daniel Webb, M.AAS, RPEQ — Acoustic Consultant',
    'Project Ref:    PO-LH-CONS-009',
    'Supersedes:     AL-2025-204-RevA (14 May 2025)',
  ],
  sections: [
    {
      heading: 'Executive Summary',
      body: [
        'This Revision B acoustic assessment has been prepared specifically to address the City of Parramatta',
        'Council Request for Information dated 12 March 2026 (Reference: CON-2026-014), issued under',
        'DA-2025-0142 Condition #14 in respect of rooftop mechanical plant noise.',
        '',
        'This Rev B revises and supersedes Rev A (AL-2025-204-RevA, 14 May 2025) by addressing each of the',
        'five items raised in the Council RFI. In summary:',
        '',
        '  - The revised plant schedule (per VAR-002 MSB uplift) has been incorporated.',
        '  - Predicted noise levels at the nearest residential receiver have been calculated for both',
        '    day-time and night-time conditions.',
        '  - Cumulative modelling captures all rooftop noise sources operating concurrently.',
        '  - Acoustic treatments are specified and their predicted reductions tabulated.',
        '  - A verification methodology is set out for in-situ testing prior to Occupation Certificate.',
        '',
        'On the basis of the analysis presented in this Rev B assessment, the rooftop mechanical plant —',
        'with the recommended treatments installed — is predicted to comply with all relevant criteria:',
        'NSW EPA INP 2000 amenity and sleep disturbance, and City of Parramatta DCP 2023 Section 4.3.2.',
      ],
    },
    {
      heading: 'Item 1 — Updated Plant Schedule (per VAR-002)',
      body: [
        'The plant schedule has been updated to reflect VAR-002 (MSB capacity uplift, approved 12 February',
        '2026) and the additional condenser units now proposed.',
        '',
        '  Source                                     Sound Power (dB(A) at 1 m)',
        '  -----------------------------------------  ---------------------------',
        '  4 × Daikin VRV condensers (RXYQ20T)        67 dB(A) each',
        '  1 × AHU-3 (revised — Trane CSAA042)        73 dB(A) supply / 70 dB(A) return',
        '  1 × Stair B pressurisation fan (Fantech)   68 dB(A)',
        '  2 × Lift machine room exhaust (Fantech)    64 dB(A) each',
        '',
        'Manufacturer data sheets for each item are appended to this report.',
      ],
    },
    {
      heading: 'Item 2 — Predicted Levels at Nearest Residential Receiver',
      body: [
        'Nearest residential receiver: 15 Burroway Road, located 32 m east of the rooftop plant area.',
        '',
        'Background noise survey was conducted on 18–19 March 2026 across day-time and night-time periods.',
        'Measured LA90 background levels:',
        '',
        '  Day-time   (07:00–22:00):  48 dB(A)',
        '  Night-time (22:00–07:00):  38 dB(A)',
        '',
        'Cumulative predicted levels at the receiver, with all rooftop plant operating, after application',
        'of the treatments described in Item 4:',
        '',
        '  Period      Predicted    Permitted (INP 2000)    DCP boundary    Outcome',
        '  ----------  -----------  ----------------------  --------------  ----------',
        '  Day-time    38 dB(A)     53 dB(A) [bg + 5]       40 dB(A)        COMPLIANT',
        '  Night-time  35 dB(A)     43 dB(A) [bg + 5]       40 dB(A)        COMPLIANT',
        '',
        'Sleep disturbance assessment:',
        '',
        '  LA1,1min predicted at 1 m from facade of nearest receiver: 41 dB(A)',
        '  Criterion (NSW EPA INP 2000):                              52 dB(A)',
        '  Outcome:                                                    COMPLIANT',
      ],
    },
    {
      heading: 'Item 3 — Cumulative Modelling Methodology',
      body: [
        'Predicted levels have been calculated using SoundPLAN v8.2 acoustic propagation software, with',
        'all rooftop sources active concurrently. Inputs:',
        '',
        '  - Manufacturer-published sound power levels for each plant item (Item 1).',
        '  - Octave-band spectra applied where available; A-weighted single-figure values otherwise.',
        '  - Site terrain modelled from survey data.',
        '  - Atmospheric absorption per ISO 9613-1, ground absorption per ISO 9613-2.',
        '  - Reflective surfaces (rooftop deck, parapet) modelled.',
        '',
        'No allowance has been taken for any directivity benefit beyond manufacturer-published data.',
        'Predictions therefore represent a conservative cumulative scenario.',
      ],
    },
    {
      heading: 'Item 4 — Proposed Treatments',
      body: [
        'The following acoustic treatments are required to achieve the levels in Item 2:',
        '',
        '  Treatment                                      Predicted reduction',
        '  ---------------------------------------------  --------------------',
        '  Acoustic enclosure to AHU-3 (Rw 25 minimum)    -15 dB(A) at receiver',
        '  50 mm gravel ballast across rooftop plant      -3 dB(A) reflection benefit',
        '  Spring isolators on AHU-3 (1 Hz fn)            Vibration isolation only',
        '  Anti-vibration mounts on all VRV condensers    Vibration isolation only',
        '',
        'Without these treatments, predicted day-time level rises to 53 dB(A) at the receiver — at the',
        'permitted limit but exceeding DCP boundary control. Treatments are therefore mandatory for',
        'compliance and have been incorporated into the project specification (Section 23 Mechanical,',
        'Item M-AC-04 issued under SI-014 dated 22 April 2026).',
      ],
    },
    {
      heading: 'Item 5 — Verification Methodology',
      body: [
        'In-situ acoustic verification will be performed at Practical Completion, prior to issue of the',
        'Occupation Certificate. The verification programme comprises:',
        '',
        '  - Day-time and night-time measurements at the boundary of 15 Burroway Road.',
        '  - All rooftop plant operating at peak demand during measurement.',
        '  - Cumulative measurement integrated over 15 minutes (LAeq,15min) per period.',
        '  - Sleep-disturbance LA1,1min measured during night-time period.',
        '  - Tolerance against predictions: ±2 dB acceptable; >2 dB triggers re-investigation.',
        '',
        'A verification report will be issued to Council under DA-2025-0142 Condition #14 prior to',
        'Occupation Certificate. If predicted levels are not achieved on test, additional treatments',
        '(further enclosure works, alternative plant) will be designed and installed before reissue of',
        'the verification report.',
      ],
    },
    {
      heading: 'Compliance Statement',
      body: [
        'Acoustic Logic Pty Ltd confirms, on the basis of the analysis presented in this Rev B assessment',
        'and subject to the treatments specified in Item 4 being installed and the verification programme',
        'in Item 5 being satisfactorily completed, that the rooftop mechanical plant for Lighthouse',
        'Residences will COMPLY with:',
        '',
        '  - NSW EPA INP 2000 — amenity criteria (LAeq,15min ≤ 5 dB above background);',
        '  - NSW EPA INP 2000 — sleep disturbance criteria (LA1,1min ≤ 52 dB(A));',
        '  - City of Parramatta DCP 2023, Section 4.3.2 — 40 dB(A) at boundary.',
      ],
    },
    {
      heading: 'Limitations',
      body: [
        'This assessment is based on the project documentation current at the date of issue and the',
        'manufacturer data referenced. Any subsequent changes to plant selection, location, or operating',
        'mode may invalidate the predictions and shall require re-assessment. The verification programme',
        'in Item 5 is binding only to the extent that all treatments in Item 4 are installed in accordance',
        'with the project specification.',
      ],
    },
  ],
  signoff: [
    'Prepared by:',
    '',
    'Daniel Webb',
    'M.AAS, RPEQ',
    'Acoustic Consultant',
    'Acoustic Logic Pty Ltd',
    'T:  02 8755 8888',
    'E:  dwebb@acousticlogic.com.au',
  ],
};

async function generate(seed: DocumentSeed): Promise<string> {
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, seed.filename);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      compress: false,
      pdfVersion: '1.4',
    });
    const stream = createWriteStream(path);
    doc.pipe(stream);

    // Letterhead
    doc.fontSize(11).font('Helvetica-Bold').text(seed.letterhead[0]);
    doc.font('Helvetica').fontSize(9);
    for (const line of seed.letterhead.slice(1)) doc.text(line);
    doc.moveDown(1.5);

    // Title
    doc.fontSize(13).font('Helvetica-Bold').text(seed.title, { align: 'left' });
    doc.moveDown();

    // Intro block
    doc.fontSize(10).font('Helvetica');
    for (const line of seed.intro) doc.text(line);
    doc.moveDown(1.2);

    // Sections
    for (const s of seed.sections) {
      if (s.heading) {
        doc.fontSize(11).font('Helvetica-Bold').text(s.heading);
        doc.moveDown(0.4);
        doc.fontSize(10).font('Helvetica');
      }
      for (const line of s.body) doc.text(line);
      doc.moveDown(1);
    }

    // Signoff
    doc.moveDown(0.5);
    for (const line of seed.signoff) doc.text(line);

    doc.end();
    stream.on('finish', () => resolve(path));
    stream.on('error', reject);
  });
}

(async () => {
  console.log('Generating correspondence PDFs...');
  const a = await generate(COUNCIL_RFI);
  console.log('  wrote', a);
  const b = await generate(ACOUSTIC_REV_B);
  console.log('  wrote', b);
  console.log('\nDone. Drag these into the app to drive the demo.');
})();
