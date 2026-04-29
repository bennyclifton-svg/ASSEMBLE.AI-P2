/**
 * Generates three short, punchy PDFs for the pre-DA / pre-lodgement marketing demo.
 *
 *   1. City of Parramatta pre-lodgement RFI — three acoustic concerns
 *   2. NDY mechanical memo — plant schedule + acoustic input data
 *   3. Acoustic Logic response memo — checks each council item against the mechanical data
 *
 * The three documents are intentionally tight (~1 page each) so the demo viewer
 * can grasp the workflow at a glance.
 *
 * Run:  npx tsx scripts/generate-pre-lodgement-pdfs.ts
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

const COUNCIL_PRE_LODGEMENT: DocumentSeed = {
  filename: 'City-of-Parramatta-Pre-Lodgement-PL-2025-0089.pdf',
  letterhead: [
    'CITY OF PARRAMATTA COUNCIL',
    '126 Church Street, Parramatta NSW 2150',
    'T  02 9806 5050   |   council@cityofparramatta.nsw.gov.au',
  ],
  title: 'PRE-LODGEMENT MEETING — OUTCOME LETTER',
  intro: [
    'Date:           14 February 2025',
    'Reference:      PL-2025-0089',
    'Project:        Lighthouse Residences (proposed) — 12 Burroway Road, Wentworth Point',
    'Applicant:      Coastal Living Pty Ltd',
    'Meeting held:   11 February 2025',
  ],
  sections: [
    {
      body: [
        'Thank you for attending the pre-lodgement meeting on 11 February 2025. This letter sets out the',
        'matters Council requires the design team to address prior to formal DA lodgement.',
      ],
    },
    {
      heading: 'Acoustic matters to be addressed',
      body: [
        '1. Mechanical plant noise',
        '   Demonstrate compliance of all rooftop mechanical plant with the City of Parramatta DCP 2023',
        '   Section 4.3.2 (40 dB(A) at boundary) at the nearest residential receiver (15 Burroway Road).',
        '',
        '2. Construction noise and vibration',
        '   Provide a Construction Noise & Vibration Management Plan (CNVMP) framework consistent with',
        '   the NSW EPA Interim Construction Noise Guideline.',
        '',
        '3. Traffic noise — rooftop communal terrace',
        '   The proposed rooftop communal terrace faces Burroway Road. Council requires the road traffic',
        '   noise assessment to extend beyond the apartment levels and include the rooftop terrace.',
      ],
    },
    {
      body: [
        'Each of the above is to be addressed in supporting documentation lodged with the DA. Failure to',
        'address any item may result in a formal RFI post-lodgement and may delay determination.',
      ],
    },
  ],
  signoff: [
    'Lisa Tran',
    'Senior Development Assessment Officer',
    'City of Parramatta Council',
  ],
};

const NDY_MECHANICAL_MEMO: DocumentSeed = {
  filename: 'NDY-Mechanical-Memo-NDY-MEM-LH-001.pdf',
  letterhead: [
    'NORMAN DISNEY & YOUNG',
    'Level 6, 77 Pacific Highway, North Sydney NSW 2060',
    'T  02 9080 6900   |   sydney@ndy.com',
  ],
  title: 'MECHANICAL ENGINEERING MEMO — INPUT DATA FOR ACOUSTIC ASSESSMENT',
  intro: [
    'Date:           28 February 2025',
    'Reference:      NDY-MEM-LH-001',
    'Project:        Lighthouse Residences — 12 Burroway Road, Wentworth Point',
    '',
    'To:    Daniel Webb, Acoustic Logic Pty Ltd',
    'cc:    David Liu, SJB Architects',
    '       Marcus O\'Brien, Coastal Living Pty Ltd',
  ],
  sections: [
    {
      body: [
        'Issued in response to Council pre-lodgement feedback PL-2025-0089 dated 14 February 2025.',
        'Provides the rooftop plant schedule and manufacturer sound power data required by the acoustic',
        'consultant to assess compliance with DCP 2023 Section 4.3.2.',
      ],
    },
    {
      heading: 'Rooftop plant schedule',
      body: [
        '  Source                                       Sound Power (dB(A) at 1 m)',
        '  -------------------------------------------  ---------------------------',
        '  4 × Daikin VRV condensers (RXYQ20T)          67 dB(A) each',
        '  1 × AHU-3 (Trane CSAA042)                    73 dB(A) supply / 70 dB(A) return',
        '  1 × Stair pressurisation fan (Fantech)       68 dB(A)',
        '  2 × Lift machine room exhaust (Fantech)      64 dB(A) each',
      ],
    },
    {
      heading: 'Engineering recommendations',
      body: [
        '- Acoustic enclosure to AHU-3 (minimum Rw 25). Space allocation confirmed in roof plan.',
        '- Spring vibration isolators (1 Hz natural frequency) on AHU-3 plinth.',
        '- Anti-vibration mounts on all VRV condenser units.',
        '- Plant location set back 4 m from the western parapet to maximise screening from receiver.',
      ],
    },
    {
      body: [
        'This memo is engineering input only — it does not constitute an acoustic compliance assessment.',
        'The acoustic consultant is requested to model cumulative noise levels at the nearest residential',
        'receiver and confirm DCP compliance.',
      ],
    },
  ],
  signoff: [
    'Tom Bennett',
    'Services Lead — Mech / Elec / Hyd',
    'Norman Disney & Young',
  ],
};

const ACOUSTIC_RESPONSE: DocumentSeed = {
  filename: 'Acoustic-Logic-Pre-Lodgement-Response-AL-MEM-2025-014.pdf',
  letterhead: [
    'ACOUSTIC LOGIC PTY LTD',
    'Level 5, 219 Castlereagh Street, Sydney NSW 2000',
    'T  02 8755 8888   |   sydney@acousticlogic.com.au',
  ],
  title: 'RESPONSE TO COUNCIL PRE-LODGEMENT FEEDBACK',
  intro: [
    'Date:           12 March 2025',
    'Reference:      AL-MEM-2025-014',
    'Project:        Lighthouse Residences — 12 Burroway Road, Wentworth Point',
    '',
    'In response to:  PL-2025-0089 (City of Parramatta, 14 Feb 2025)',
    'Informed by:     NDY-MEM-LH-001 (NDY mechanical memo, 28 Feb 2025)',
    '',
    'To:    Marcus O\'Brien, Coastal Living Pty Ltd',
    'cc:    City of Parramatta Council',
  ],
  sections: [
    {
      heading: 'Item-by-item response',
      body: [
        '1. Mechanical plant noise — ADDRESSED',
        '   Cumulative modelling using NDY plant schedule (NDY-MEM-LH-001) predicts 38 dB(A) day-time and',
        '   35 dB(A) night-time at the nearest receiver (15 Burroway Road, 32 m east), assuming the AHU-3',
        '   acoustic enclosure (Rw 25) is installed per NDY recommendation. Below the 40 dB(A) DCP boundary',
        '   limit. Compliant with INP 2000 amenity and sleep disturbance criteria.',
        '',
        '2. Construction noise and vibration — ADDRESSED',
        '   A CNVMP framework has been prepared consistent with the NSW EPA Interim Construction Noise',
        '   Guideline (Sect. 4.3 of the supporting acoustic report). Out-of-hours work limits and high-noise',
        '   activity sequencing addressed.',
        '',
        '3. Rooftop communal terrace — traffic noise — PARTIALLY ADDRESSED',
        '   The acoustic report assesses road traffic noise for apartment levels 1–6 but does not yet',
        '   include the rooftop communal terrace, which Council specifically raised. The terrace faces',
        '   Burroway Road on the northern elevation.',
        '',
        '   RECOMMENDATION: Extend the assessment to include the rooftop terrace prior to DA lodgement.',
        '   Estimated 1–2 days additional work. Lodging without it is likely to attract a formal RFI from',
        '   Council and delay determination by 2–4 weeks.',
      ],
    },
  ],
  signoff: [
    'Daniel Webb',
    'M.AAS, RPEQ — Acoustic Consultant',
    'Acoustic Logic Pty Ltd',
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

    doc.fontSize(11).font('Helvetica-Bold').text(seed.letterhead[0]);
    doc.font('Helvetica').fontSize(9);
    for (const line of seed.letterhead.slice(1)) doc.text(line);
    doc.moveDown(1.2);

    doc.fontSize(13).font('Helvetica-Bold').text(seed.title);
    doc.moveDown(0.6);

    doc.fontSize(10).font('Helvetica');
    for (const line of seed.intro) doc.text(line);
    doc.moveDown(0.8);

    for (const s of seed.sections) {
      if (s.heading) {
        doc.fontSize(11).font('Helvetica-Bold').text(s.heading);
        doc.moveDown(0.3);
        doc.fontSize(10).font('Helvetica');
      }
      for (const line of s.body) doc.text(line);
      doc.moveDown(0.8);
    }

    doc.moveDown(0.4);
    for (const line of seed.signoff) doc.text(line);

    doc.end();
    stream.on('finish', () => resolve(path));
    stream.on('error', reject);
  });
}

(async () => {
  console.log('Generating pre-lodgement PDFs...');
  for (const seed of [COUNCIL_PRE_LODGEMENT, NDY_MECHANICAL_MEMO, ACOUSTIC_RESPONSE]) {
    const p = await generate(seed);
    console.log('  wrote', p);
  }
  console.log('\nDone. Drag the three into the app to drive the pre-DA demo.');
})();
