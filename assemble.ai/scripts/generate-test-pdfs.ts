/**
 * Test PDF Generator for Mosaic Apartments Bankstown
 * Generates 37 realistic PDF documents for end-to-end testing
 */

import PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

const BASE_PATH = path.join(__dirname, '../tests/Mosaic-Apartments-Bankstown');

// Project Constants
const PROJECT = {
  name: 'Mosaic Apartments',
  address: '74-76 Kitchener Parade, Bankstown NSW 2200',
  daNumber: 'DA-915/2014',
  description: '8-storey residential development comprising 33 apartments over 2 basement levels',
  principal: {
    name: 'Fullerton Property Pty Ltd',
    abn: '12 345 678 901',
    address: 'Level 12, 100 William Street, Sydney NSW 2000',
    contact: 'Michael Chen',
    email: 'mchen@fullertonproperty.com.au',
    phone: '02 9123 4567'
  },
  superintendent: {
    name: 'Foresight Management Pty Ltd',
    abn: '23 456 789 012',
    address: 'Suite 5, 45 Market Street, Sydney NSW 2000',
    contact: 'Sarah Thompson',
    email: 'sthompson@foresightmgmt.com.au',
    phone: '02 9234 5678'
  }
};

// Consultant Data
const CONSULTANTS = {
  architecture: [
    { name: 'Design Workshop Australia', abn: '34 567 890 123', fee: 485000, address: 'Level 8, 56 Pitt Street, Sydney NSW 2000', contact: 'James Wilson', email: 'jwilson@dwa.com.au', phone: '02 9345 6789' },
    { name: 'PTW Architects', abn: '45 678 901 234', fee: 520000, address: 'Level 15, 1 Bligh Street, Sydney NSW 2000', contact: 'Emma Roberts', email: 'eroberts@ptw.com.au', phone: '02 9456 7890' },
    { name: 'SJB Architects', abn: '56 789 012 345', fee: 495000, address: 'Level 5, 50 Holt Street, Surry Hills NSW 2010', contact: 'David Lee', email: 'dlee@sjb.com.au', phone: '02 9567 8901' }
  ],
  structural: [
    { name: 'JJ Marino & Associates', abn: '67 890 123 456', fee: 185000, address: 'Suite 10, 123 King Street, Sydney NSW 2000', contact: 'Joseph Marino', email: 'jmarino@jjmarino.com.au', phone: '02 9678 9012' },
    { name: 'Northrop Consulting Engineers', abn: '78 901 234 567', fee: 195000, address: 'Level 7, 80 Pacific Highway, North Sydney NSW 2060', contact: 'Andrew Smith', email: 'asmith@northrop.com.au', phone: '02 9789 0123' },
    { name: 'BG&E Consulting Engineers', abn: '89 012 345 678', fee: 178000, address: 'Level 3, 25 Bligh Street, Sydney NSW 2000', contact: 'Michelle Brown', email: 'mbrown@bge.com.au', phone: '02 9890 1234' }
  ],
  mechanical: [
    { name: 'Insync Services Pty Ltd', abn: '90 123 456 789', fee: 145000, address: 'Unit 4, 88 Alexander Street, Crows Nest NSW 2065', contact: 'Peter Chang', email: 'pchang@insyncservices.com.au', phone: '02 9901 2345' },
    { name: 'Stantec Australia', abn: '01 234 567 890', fee: 158000, address: 'Level 9, 44 Market Street, Sydney NSW 2000', contact: 'Lisa Wang', email: 'lwang@stantec.com', phone: '02 9012 3456' },
    { name: 'Norman Disney & Young', abn: '12 345 678 901', fee: 152000, address: 'Level 6, 77 Pacific Highway, North Sydney NSW 2060', contact: 'Robert Taylor', email: 'rtaylor@ndy.com', phone: '02 9123 4567' }
  ],
  electrical: [
    { name: 'Simpson Kotzman', abn: '23 456 789 012', fee: 125000, address: 'Level 4, 55 Clarence Street, Sydney NSW 2000', contact: 'Daniel Kim', email: 'dkim@simpsonkotzman.com.au', phone: '02 9234 5678' },
    { name: 'Stowe Australia', abn: '34 567 890 123', fee: 132000, address: 'Suite 8, 100 Walker Street, North Sydney NSW 2060', contact: 'Jennifer Adams', email: 'jadams@stowe.com.au', phone: '02 9345 6789' },
    { name: 'JHA Consulting Engineers', abn: '45 678 901 234', fee: 128000, address: 'Level 2, 33 York Street, Sydney NSW 2000', contact: 'Mark Johnson', email: 'mjohnson@jha.com.au', phone: '02 9456 7890' }
  ],
  landscape: [
    { name: 'Taylor Brammer Landscape Architects', abn: '56 789 012 345', fee: 78000, address: 'Studio 3, 12 Danks Street, Waterloo NSW 2017', contact: 'Sophie Taylor', email: 'staylor@taylorbrammer.com.au', phone: '02 9567 8901' },
    { name: 'Aspect Studios', abn: '67 890 123 456', fee: 85000, address: 'Level 2, 4 Grosvenor Place, Sydney NSW 2000', contact: 'Chris Martin', email: 'cmartin@aspect.net.au', phone: '02 9678 9012' },
    { name: 'Turf Design Studio', abn: '78 901 234 567', fee: 82000, address: 'Suite 1, 46 Wentworth Avenue, Surry Hills NSW 2010', contact: 'Anna White', email: 'awhite@turfdesign.com.au', phone: '02 9789 0123' }
  ]
};

// Contractor Data
const CONTRACTORS = [
  { name: 'Project Built Pty Ltd', abn: '89 012 345 678', price: 14250000, program: 18, address: 'Level 10, 201 Kent Street, Sydney NSW 2000', contact: 'Steven Park', email: 'spark@projectbuilt.com.au', phone: '02 9890 1234' },
  { name: 'Growthbuilt Pty Ltd', abn: '90 123 456 789', price: 14875000, program: 19, address: 'Level 5, 55 Pyrmont Bridge Road, Pyrmont NSW 2009', contact: 'Amanda Foster', email: 'afoster@growthbuilt.com.au', phone: '02 9901 2345' },
  { name: 'Deicorp Construction Pty Ltd', abn: '01 234 567 890', price: 14450000, program: 18, address: 'Level 8, 333 George Street, Sydney NSW 2000', contact: 'Tony Andriotakis', email: 'tandriotakis@deicorp.com.au', phone: '02 9012 3456' }
];

// Helper function to format currency
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

// Helper function to format date
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Create PDF document with standard settings
function createPDF(): typeof PDFDocument.prototype {
  return new PDFDocument({
    size: 'A4',
    margins: { top: 50, bottom: 50, left: 50, right: 50 }
  });
}

// Add header to PDF
function addHeader(doc: typeof PDFDocument.prototype, title: string, subtitle?: string) {
  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
  if (subtitle) {
    doc.moveDown(0.3);
    doc.fontSize(12).font('Helvetica').text(subtitle, { align: 'center' });
  }
  doc.moveDown(1.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(1);
}

// Add project info block
function addProjectInfo(doc: typeof PDFDocument.prototype) {
  doc.fontSize(10).font('Helvetica-Bold').text('Project:', { continued: true });
  doc.font('Helvetica').text(` ${PROJECT.name}`);
  doc.font('Helvetica-Bold').text('Location:', { continued: true });
  doc.font('Helvetica').text(` ${PROJECT.address}`);
  doc.font('Helvetica-Bold').text('DA Number:', { continued: true });
  doc.font('Helvetica').text(` ${PROJECT.daNumber}`);
  doc.moveDown(1);
}

// Add section heading
function addSection(doc: typeof PDFDocument.prototype, title: string) {
  doc.moveDown(0.5);
  doc.fontSize(12).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
  doc.moveDown(0.5);
}

// ================== CONSULTANT TENDER SUBMISSIONS ==================

function generateConsultantSubmission(
  consultant: typeof CONSULTANTS.architecture[0],
  discipline: string,
  disciplineDesc: string,
  outputPath: string
) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Cover Page
  doc.fontSize(24).font('Helvetica-Bold').text(consultant.name, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(16).font('Helvetica').text('Fee Proposal', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(14).text(`${disciplineDesc} Services`, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12).text(`${PROJECT.name}`, { align: 'center' });
  doc.text(`${PROJECT.address}`, { align: 'center' });
  doc.moveDown(4);
  doc.fontSize(10).text(`Prepared for:`, { align: 'center' });
  doc.text(`${PROJECT.principal.name}`, { align: 'center' });
  doc.moveDown(2);
  doc.text(`Date: ${formatDate(new Date('2015-09-15'))}`, { align: 'center' });
  doc.text(`Reference: FP-${discipline.toUpperCase().substring(0, 3)}-2015-001`, { align: 'center' });

  // Page 2 - Cover Letter
  doc.addPage();
  addHeader(doc, 'Cover Letter');

  doc.fontSize(10).font('Helvetica');
  doc.text(`${formatDate(new Date('2015-09-15'))}`);
  doc.moveDown();
  doc.text(PROJECT.principal.contact);
  doc.text(PROJECT.principal.name);
  doc.text(PROJECT.principal.address);
  doc.moveDown();
  doc.text(`Dear ${PROJECT.principal.contact.split(' ')[0]},`);
  doc.moveDown();
  doc.text(`Re: Fee Proposal - ${disciplineDesc} Services for ${PROJECT.name}`);
  doc.moveDown();
  doc.text(`Thank you for the opportunity to submit our fee proposal for the ${disciplineDesc.toLowerCase()} services for the above project. We are pleased to present our submission and confirm our strong interest in this commission.`);
  doc.moveDown();
  doc.text(`${consultant.name} has extensive experience in similar residential developments across Sydney and we believe our expertise will contribute significantly to the success of this project.`);
  doc.moveDown();
  doc.text(`Our proposed lump sum fee for the full scope of ${disciplineDesc.toLowerCase()} services is ${formatCurrency(consultant.fee)} (excluding GST).`);
  doc.moveDown();
  doc.text(`We look forward to discussing this proposal with you and are available to meet at your convenience.`);
  doc.moveDown(2);
  doc.text('Yours sincerely,');
  doc.moveDown(2);
  doc.text(consultant.contact);
  doc.text('Director');
  doc.text(consultant.name);

  // Page 3 - Company Profile
  doc.addPage();
  addHeader(doc, 'Company Profile');

  addSection(doc, 'About Us');
  doc.fontSize(10).font('Helvetica');
  doc.text(`${consultant.name} is a leading ${disciplineDesc.toLowerCase()} practice based in Sydney with over 20 years of experience delivering high-quality projects across the residential, commercial, and mixed-use sectors.`);
  doc.moveDown();
  doc.text(`Our team comprises experienced professionals who are committed to design excellence, technical innovation, and sustainable outcomes. We pride ourselves on our collaborative approach and strong relationships with clients, consultants, and contractors.`);

  addSection(doc, 'Company Details');
  doc.text(`ABN: ${consultant.abn}`);
  doc.text(`Address: ${consultant.address}`);
  doc.text(`Contact: ${consultant.contact}`);
  doc.text(`Email: ${consultant.email}`);
  doc.text(`Phone: ${consultant.phone}`);

  addSection(doc, 'Key Personnel');
  doc.font('Helvetica-Bold').text(`${consultant.contact} - Project Director`);
  doc.font('Helvetica').text(`25 years experience in ${disciplineDesc.toLowerCase()} practice`);
  doc.text(`Registered ${discipline === 'architecture' ? 'Architect NSW' : 'Professional Engineer'}`);
  doc.moveDown();
  doc.font('Helvetica-Bold').text('Senior Project Manager - TBC');
  doc.font('Helvetica').text(`15 years experience in residential developments`);
  doc.moveDown();
  doc.font('Helvetica-Bold').text('Project Coordinator - TBC');
  doc.font('Helvetica').text(`8 years experience in multi-unit residential`);

  // Page 4 - Relevant Experience
  doc.addPage();
  addHeader(doc, 'Relevant Experience');

  const projects = [
    { name: 'The Avenue Apartments', location: 'Hurstville NSW', value: '$18M', units: 45, year: 2014 },
    { name: 'Parkside Residences', location: 'Parramatta NSW', value: '$22M', units: 52, year: 2013 },
    { name: 'Urban Edge', location: 'Mascot NSW', value: '$16M', units: 38, year: 2012 }
  ];

  projects.forEach((proj, index) => {
    addSection(doc, `Project ${index + 1}: ${proj.name}`);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Location: ${proj.location}`);
    doc.text(`Project Value: ${proj.value}`);
    doc.text(`Units: ${proj.units} apartments`);
    doc.text(`Completion: ${proj.year}`);
    doc.moveDown();
    doc.text(`This project involved ${disciplineDesc.toLowerCase()} services for a multi-storey residential development similar in scale and complexity to the Mosaic Apartments. Our team delivered comprehensive documentation and contract administration services throughout the project lifecycle.`);
    doc.moveDown();
  });

  // Page 5 - Fee Breakdown
  doc.addPage();
  addHeader(doc, 'Fee Proposal');

  addProjectInfo(doc);

  addSection(doc, 'Scope of Services');
  doc.fontSize(10).font('Helvetica');
  doc.text(`We propose to provide the following ${disciplineDesc.toLowerCase()} services:`);
  doc.moveDown(0.5);
  const services = discipline === 'architecture'
    ? ['Schematic Design', 'Design Development', 'Construction Documentation', 'Contract Administration', 'Tender period services', 'Site inspections and certifications']
    : ['Concept design and feasibility', 'Detailed design and calculations', 'Construction documentation', 'Shop drawing review', 'Site inspections', 'As-built documentation'];
  services.forEach(s => doc.text(`• ${s}`));

  addSection(doc, 'Fee Breakdown by Stage');

  const stages = [
    { name: 'Schematic Design', percent: 15, amount: consultant.fee * 0.15 },
    { name: 'Design Development', percent: 25, amount: consultant.fee * 0.25 },
    { name: 'Construction Documentation', percent: 40, amount: consultant.fee * 0.40 },
    { name: 'Contract Administration', percent: 20, amount: consultant.fee * 0.20 }
  ];

  doc.fontSize(10);
  stages.forEach(stage => {
    doc.font('Helvetica-Bold').text(`${stage.name}:`, { continued: true });
    doc.font('Helvetica').text(` ${stage.percent}% = ${formatCurrency(stage.amount)}`);
  });

  doc.moveDown();
  doc.font('Helvetica-Bold').text(`Total Fee (excl. GST): ${formatCurrency(consultant.fee)}`);
  doc.text(`GST (10%): ${formatCurrency(consultant.fee * 0.1)}`);
  doc.text(`Total Fee (incl. GST): ${formatCurrency(consultant.fee * 1.1)}`);

  addSection(doc, 'Exclusions');
  doc.fontSize(10).font('Helvetica');
  doc.text('The following are excluded from our fee proposal:');
  doc.text('• Travel and accommodation outside Sydney metropolitan area');
  doc.text('• Printing and reproduction costs (at cost)');
  doc.text('• Statutory authority fees and charges');
  doc.text('• Additional services requested outside the agreed scope');

  // Page 6 - Program & Terms
  doc.addPage();
  addHeader(doc, 'Program & Terms');

  addSection(doc, 'Proposed Program');
  doc.fontSize(10).font('Helvetica');
  doc.text('Based on the project brief, we propose the following indicative program:');
  doc.moveDown(0.5);
  doc.text('• Schematic Design: 4 weeks');
  doc.text('• Design Development: 6 weeks');
  doc.text('• Construction Documentation: 10 weeks');
  doc.text('• Tender Period: 4 weeks');
  doc.text('• Construction Phase: 18 months (concurrent with contractor)');

  addSection(doc, 'Terms & Conditions');
  doc.text('1. Payment terms: 14 days from date of invoice');
  doc.text('2. Invoices will be issued monthly based on percentage completion');
  doc.text('3. This proposal is valid for 60 days from the date of issue');
  doc.text('4. Our standard terms of engagement will apply');
  doc.text('5. Professional Indemnity Insurance: $10,000,000');
  doc.text('6. Public Liability Insurance: $20,000,000');

  addSection(doc, 'Insurance Certificates');
  doc.text('Current certificates of currency for the following insurances are available upon request:');
  doc.text('• Professional Indemnity Insurance');
  doc.text('• Public Liability Insurance');
  doc.text('• Workers Compensation Insurance');

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== CONTRACTOR TENDER SUBMISSIONS ==================

function generateContractorSubmission(contractor: typeof CONTRACTORS[0], outputPath: string) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  // Cover Page
  doc.fontSize(24).font('Helvetica-Bold').text(contractor.name, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(16).font('Helvetica').text('Tender Submission', { align: 'center' });
  doc.moveDown(1);
  doc.fontSize(14).text('Design & Construct Head Contract', { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(12).text(`${PROJECT.name}`, { align: 'center' });
  doc.text(`${PROJECT.address}`, { align: 'center' });
  doc.moveDown(4);
  doc.fontSize(10).text(`Submitted to:`, { align: 'center' });
  doc.text(`${PROJECT.principal.name}`, { align: 'center' });
  doc.moveDown(2);
  doc.text(`Date: ${formatDate(new Date('2015-09-20'))}`, { align: 'center' });
  doc.text(`ABN: ${contractor.abn}`, { align: 'center' });

  // Page 2 - Executive Summary
  doc.addPage();
  addHeader(doc, 'Executive Summary');

  doc.fontSize(10).font('Helvetica');
  doc.text(`${contractor.name} is pleased to submit this tender for the design and construction of ${PROJECT.name}, an 8-storey residential development comprising 33 apartments over 2 basement levels at ${PROJECT.address}.`);
  doc.moveDown();
  doc.text(`Our tender price of ${formatCurrency(contractor.price)} (excl. GST) represents a competitive and comprehensive proposal based on our detailed analysis of the Principal's Project Requirements and our extensive experience in similar developments.`);
  doc.moveDown();

  addSection(doc, 'Key Highlights');
  doc.text(`• Tender Price: ${formatCurrency(contractor.price)} (excl. GST)`);
  doc.text(`• Construction Program: ${contractor.program} months`);
  doc.text(`• Team: Experienced project team with proven track record`);
  doc.text(`• Methodology: Value engineering to optimise design outcomes`);
  doc.text(`• Safety: Comprehensive WHS management system in place`);

  addSection(doc, 'Company Overview');
  doc.text(`${contractor.name} is a leading construction company specializing in residential and mixed-use developments across Sydney. With over 15 years of experience and a portfolio of successfully completed projects exceeding $500 million, we bring proven expertise to every project we undertake.`);

  // Page 3 - Price Breakdown
  doc.addPage();
  addHeader(doc, 'Tender Price Breakdown');

  addProjectInfo(doc);

  addSection(doc, 'Lump Sum Price Summary');

  const breakdown = [
    { item: 'Preliminaries & Site Establishment', amount: Math.round(contractor.price * 0.12) },
    { item: 'Demolition & Excavation', amount: Math.round(contractor.price * 0.08) },
    { item: 'Substructure (Foundations & Basement)', amount: Math.round(contractor.price * 0.15) },
    { item: 'Superstructure (Concrete Frame)', amount: Math.round(contractor.price * 0.20) },
    { item: 'External Facade & Windows', amount: Math.round(contractor.price * 0.10) },
    { item: 'Internal Finishes', amount: Math.round(contractor.price * 0.12) },
    { item: 'Mechanical Services', amount: Math.round(contractor.price * 0.06) },
    { item: 'Hydraulic Services', amount: Math.round(contractor.price * 0.04) },
    { item: 'Electrical Services', amount: Math.round(contractor.price * 0.05) },
    { item: 'Fire Services', amount: Math.round(contractor.price * 0.03) },
    { item: 'External Works & Landscaping', amount: Math.round(contractor.price * 0.05) }
  ];

  doc.fontSize(10);
  let total = 0;
  breakdown.forEach(item => {
    total += item.amount;
    doc.font('Helvetica').text(`${item.item}:`, { continued: true, width: 300 });
    doc.text(` ${formatCurrency(item.amount)}`, { align: 'right' });
  });

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').text(`TOTAL (excl. GST): ${formatCurrency(contractor.price)}`, { align: 'right' });
  doc.text(`GST (10%): ${formatCurrency(contractor.price * 0.1)}`, { align: 'right' });
  doc.text(`TOTAL (incl. GST): ${formatCurrency(contractor.price * 1.1)}`, { align: 'right' });

  // Page 4 - Construction Methodology
  doc.addPage();
  addHeader(doc, 'Construction Methodology');

  addSection(doc, 'Site Establishment & Demolition');
  doc.fontSize(10).font('Helvetica');
  doc.text('Works will commence with site establishment including hoarding, site office, and temporary services. Existing structures will be demolished and removed from site in accordance with SafeWork NSW requirements.');

  addSection(doc, 'Excavation & Shoring');
  doc.text('Bulk excavation for the 2-level basement will be undertaken using a combination of rock breakers and excavators. Shoring will be installed progressively to support adjacent properties. Groundwater management measures will be implemented as required.');

  addSection(doc, 'Structural Works');
  doc.text('The reinforced concrete structure will be constructed using conventional formwork systems. Post-tensioned slabs will be utilized where appropriate to optimize structural efficiency. Concrete pours will be scheduled to minimize disruption to neighbors.');

  addSection(doc, 'Facade & Waterproofing');
  doc.text('External facade works include brick veneer, aluminum windows, and glass balustrades. Comprehensive waterproofing systems will be applied to all wet areas, balconies, and the basement structure.');

  addSection(doc, 'Services Installation');
  doc.text('Mechanical, electrical, hydraulic, and fire services will be coordinated through detailed BIM modeling to avoid clashes. Services will be installed progressively following the structure.');

  addSection(doc, 'Finishes & Completion');
  doc.text('Internal finishes will be completed floor by floor, working from top to bottom. External works and landscaping will be completed in the final stages prior to practical completion.');

  // Page 5 - Program
  doc.addPage();
  addHeader(doc, 'Construction Program');

  addSection(doc, 'Program Summary');
  doc.fontSize(10).font('Helvetica');
  doc.text(`Total Construction Period: ${contractor.program} months`);
  doc.text(`Proposed Commencement: November 2015`);
  doc.text(`Practical Completion: ${contractor.program === 18 ? 'May' : 'June'} 2017`);
  doc.moveDown();

  addSection(doc, 'Key Milestones');
  const milestones = [
    { activity: 'Site Establishment', duration: 2, start: 0 },
    { activity: 'Demolition & Excavation', duration: 3, start: 1 },
    { activity: 'Basement Structure', duration: 4, start: 3 },
    { activity: 'Superstructure (Levels 1-8)', duration: 8, start: 6 },
    { activity: 'Facade & External Works', duration: 4, start: 10 },
    { activity: 'Internal Finishes', duration: 5, start: 12 },
    { activity: 'Services Fit-off', duration: 4, start: 14 },
    { activity: 'External Works & Landscaping', duration: 2, start: 16 },
    { activity: 'Commissioning & Handover', duration: 2, start: contractor.program - 2 }
  ];

  milestones.forEach(m => {
    doc.text(`• ${m.activity}: Month ${m.start + 1} - Month ${m.start + m.duration} (${m.duration} months)`);
  });

  addSection(doc, 'Critical Path');
  doc.text('The critical path runs through:');
  doc.text('1. Excavation and shoring completion');
  doc.text('2. Basement slab pour');
  doc.text('3. Superstructure construction (level-by-level)');
  doc.text('4. Waterproofing and facade completion');
  doc.text('5. Services commissioning');

  // Page 6 - Team & Experience
  doc.addPage();
  addHeader(doc, 'Project Team & Experience');

  addSection(doc, 'Project Team');
  doc.fontSize(10).font('Helvetica-Bold').text('Project Director');
  doc.font('Helvetica').text('25 years experience, responsible for overall project delivery');
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Construction Manager');
  doc.font('Helvetica').text('18 years experience in residential construction');
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Site Manager');
  doc.font('Helvetica').text('12 years experience, on-site management and coordination');
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('Project Engineer');
  doc.font('Helvetica').text('8 years experience, technical coordination and quality');
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text('WHS Manager');
  doc.font('Helvetica').text('15 years experience, dedicated safety management');

  addSection(doc, 'Relevant Experience');
  const experience = [
    { name: 'Marina Tower', location: 'Wentworth Point', value: '$28M', units: 65 },
    { name: 'Greenwood Residences', location: 'Epping', value: '$19M', units: 42 },
    { name: 'Central Park Apartments', location: 'Zetland', value: '$24M', units: 55 }
  ];

  experience.forEach(proj => {
    doc.font('Helvetica-Bold').text(proj.name);
    doc.font('Helvetica').text(`Location: ${proj.location} | Value: ${proj.value} | Units: ${proj.units}`);
    doc.moveDown(0.5);
  });

  // Page 7 - WHS & Subcontractors
  doc.addPage();
  addHeader(doc, 'WHS Management & Subcontractors');

  addSection(doc, 'WHS Management Approach');
  doc.fontSize(10).font('Helvetica');
  doc.text(`${contractor.name} maintains an accredited WHS management system certified to AS/NZS 4801. Our approach includes:`);
  doc.moveDown(0.5);
  doc.text('• Dedicated WHS Manager on site full-time');
  doc.text('• Daily toolbox talks and weekly safety meetings');
  doc.text('• Site-specific WHS Management Plan');
  doc.text('• Regular safety audits and inspections');
  doc.text('• Incident reporting and investigation procedures');
  doc.text('• Drug and alcohol testing program');

  addSection(doc, 'Key Subcontractors');
  const subcontractors = [
    { trade: 'Excavation & Shoring', company: 'Deep Foundations Australia' },
    { trade: 'Structural Concrete', company: 'Ganellen Concrete Services' },
    { trade: 'Formwork', company: 'Acrow Formwork & Scaffolding' },
    { trade: 'Waterproofing', company: 'Wolfin Waterproofing' },
    { trade: 'Facade/Windows', company: 'G.James Glass & Aluminium' },
    { trade: 'Mechanical Services', company: 'A.G. Coombs Group' },
    { trade: 'Electrical Services', company: 'Stowe Australia' },
    { trade: 'Hydraulic Services', company: 'Fredon Industries' },
    { trade: 'Fire Services', company: 'Wormald' }
  ];

  subcontractors.forEach(sub => {
    doc.font('Helvetica-Bold').text(`${sub.trade}:`, { continued: true });
    doc.font('Helvetica').text(` ${sub.company}`);
  });

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== INVOICES ==================

function generateInvoice(
  invoiceNumber: string,
  entity: { name: string; abn: string; address: string; contact: string },
  amount: number,
  description: string,
  date: Date,
  outputPath: string
) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  addHeader(doc, 'TAX INVOICE');

  // From
  doc.fontSize(10).font('Helvetica-Bold').text('From:');
  doc.font('Helvetica').text(entity.name);
  doc.text(`ABN: ${entity.abn}`);
  doc.text(entity.address);
  doc.moveDown();

  // To
  doc.font('Helvetica-Bold').text('To:');
  doc.font('Helvetica').text(PROJECT.principal.name);
  doc.text(`ABN: ${PROJECT.principal.abn}`);
  doc.text(PROJECT.principal.address);
  doc.moveDown();

  // Invoice Details
  doc.font('Helvetica-Bold').text(`Invoice Number: ${invoiceNumber}`);
  doc.text(`Invoice Date: ${formatDate(date)}`);
  doc.text(`Due Date: ${formatDate(new Date(date.getTime() + 14 * 24 * 60 * 60 * 1000))}`);
  doc.moveDown();

  // Project Reference
  doc.font('Helvetica-Bold').text('Project Reference:');
  doc.font('Helvetica').text(`${PROJECT.name}`);
  doc.text(`${PROJECT.address}`);
  doc.moveDown();

  // Description
  addSection(doc, 'Description of Services');
  doc.fontSize(10).font('Helvetica').text(description);
  doc.moveDown(2);

  // Amount Table
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  doc.font('Helvetica').text('Subtotal (excl. GST):', { continued: true });
  doc.text(formatCurrency(amount), { align: 'right' });

  doc.text('GST (10%):', { continued: true });
  doc.text(formatCurrency(amount * 0.1), { align: 'right' });

  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.5);

  doc.font('Helvetica-Bold').text('TOTAL (incl. GST):', { continued: true });
  doc.text(formatCurrency(amount * 1.1), { align: 'right' });

  doc.moveDown(2);

  // Payment Details
  addSection(doc, 'Payment Details');
  doc.fontSize(10).font('Helvetica');
  doc.text('Bank: Commonwealth Bank of Australia');
  doc.text(`Account Name: ${entity.name}`);
  doc.text('BSB: 062-000');
  doc.text('Account: 1234 5678');
  doc.text(`Reference: ${invoiceNumber}`);
  doc.moveDown();
  doc.text('Payment Terms: 14 days from invoice date');

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== VARIATIONS ==================

function generateVariation(
  variationNumber: string,
  title: string,
  description: string,
  amount: number,
  status: string,
  programImpact: string,
  date: Date,
  outputPath: string
) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  addHeader(doc, 'VARIATION REQUEST', `Variation No. ${variationNumber}`);

  addProjectInfo(doc);

  // Variation Details
  doc.fontSize(10).font('Helvetica-Bold').text('Variation Title:', { continued: true });
  doc.font('Helvetica').text(` ${title}`);
  doc.font('Helvetica-Bold').text('Date Submitted:', { continued: true });
  doc.font('Helvetica').text(` ${formatDate(date)}`);
  doc.font('Helvetica-Bold').text('Status:', { continued: true });
  doc.font('Helvetica').text(` ${status}`);
  doc.moveDown();

  addSection(doc, 'Scope Description');
  doc.fontSize(10).font('Helvetica').text(description);

  addSection(doc, 'Cost Breakdown');
  const laborCost = Math.round(amount * 0.4);
  const materialCost = Math.round(amount * 0.45);
  const margin = Math.round(amount * 0.15);

  doc.text(`Labour: ${formatCurrency(laborCost)}`);
  doc.text(`Materials: ${formatCurrency(materialCost)}`);
  doc.text(`Margin (15%): ${formatCurrency(margin)}`);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Total Variation Amount: ${formatCurrency(amount)} (excl. GST)`);

  addSection(doc, 'Program Impact Assessment');
  doc.fontSize(10).font('Helvetica').text(programImpact);

  addSection(doc, 'Supporting Documentation');
  doc.text('The following documentation is attached in support of this variation:');
  doc.text('• Site photographs');
  doc.text('• Revised drawings (if applicable)');
  doc.text('• Subcontractor quotations');
  doc.text('• Relevant correspondence');

  addSection(doc, 'Approvals');
  doc.moveDown();
  doc.text('Contractor Representative: _______________________  Date: ____________');
  doc.moveDown();
  doc.text('Superintendent: _______________________  Date: ____________');
  doc.moveDown();
  doc.text('Principal Representative: _______________________  Date: ____________');

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== MEETING MINUTES ==================

function generateMeetingMinutes(
  meetingNumber: string,
  meetingType: string,
  date: Date,
  attendees: { name: string; company: string; role: string }[],
  agenda: string[],
  actions: { action: string; responsible: string; dueDate: string }[],
  outputPath: string
) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  addHeader(doc, `${meetingType} - Meeting Minutes`, `Meeting No. ${meetingNumber}`);

  addProjectInfo(doc);

  doc.fontSize(10).font('Helvetica-Bold').text('Date:', { continued: true });
  doc.font('Helvetica').text(` ${formatDate(date)}`);
  doc.font('Helvetica-Bold').text('Time:', { continued: true });
  doc.font('Helvetica').text(' 10:00 AM - 11:30 AM');
  doc.font('Helvetica-Bold').text('Location:', { continued: true });
  doc.font('Helvetica').text(' Site Office / Video Conference');
  doc.moveDown();

  addSection(doc, 'Attendees');
  attendees.forEach(a => {
    doc.fontSize(10).text(`• ${a.name} (${a.company}) - ${a.role}`);
  });

  addSection(doc, 'Agenda & Discussion');
  agenda.forEach((item, index) => {
    doc.fontSize(10).font('Helvetica-Bold').text(`${index + 1}. ${item}`);
    doc.font('Helvetica').text('Discussion points and outcomes recorded. All parties acknowledged and agreed.');
    doc.moveDown(0.5);
  });

  addSection(doc, 'Action Register');
  doc.fontSize(9);
  actions.forEach((a, index) => {
    doc.font('Helvetica-Bold').text(`Action ${index + 1}:`, { continued: true });
    doc.font('Helvetica').text(` ${a.action}`);
    doc.text(`   Responsible: ${a.responsible} | Due: ${a.dueDate}`);
    doc.moveDown(0.3);
  });

  addSection(doc, 'Next Meeting');
  const nextDate = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);
  doc.fontSize(10).font('Helvetica').text(`Date: ${formatDate(nextDate)}`);
  doc.text('Time: 10:00 AM');
  doc.text('Location: Site Office / Video Conference');

  doc.moveDown(2);
  doc.text('Minutes prepared by: Site Administrator');
  doc.text(`Date issued: ${formatDate(new Date(date.getTime() + 2 * 24 * 60 * 60 * 1000))}`);

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== REPORTS ==================

function generateReport(
  reportTitle: string,
  reportType: string,
  period: string,
  date: Date,
  percentComplete: number,
  budgetStatus: { budget: number; actual: number; forecast: number },
  outputPath: string
) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  addHeader(doc, reportTitle, reportType);

  addProjectInfo(doc);

  doc.fontSize(10).font('Helvetica-Bold').text('Reporting Period:', { continued: true });
  doc.font('Helvetica').text(` ${period}`);
  doc.font('Helvetica-Bold').text('Report Date:', { continued: true });
  doc.font('Helvetica').text(` ${formatDate(date)}`);
  doc.moveDown();

  addSection(doc, 'Executive Summary');
  doc.fontSize(10).font('Helvetica');
  doc.text(`The project is currently tracking ${percentComplete >= 95 ? 'on' : percentComplete >= 85 ? 'slightly behind' : 'behind'} program with ${percentComplete}% of works complete against a target of 100% for this reporting period.`);
  doc.moveDown();
  doc.text(`Overall project health: ${percentComplete >= 95 ? 'GREEN' : percentComplete >= 85 ? 'AMBER' : 'RED'}`);

  addSection(doc, 'Program Status');
  doc.text(`Percentage Complete: ${percentComplete}%`);
  doc.text(`Program Status: ${percentComplete >= 95 ? 'On Track' : percentComplete >= 85 ? 'Minor Delays' : 'Behind Schedule'}`);
  doc.text('Current Activity: Superstructure works Level 5');
  doc.text('Next Milestone: Level 6 slab pour');

  addSection(doc, 'Cost Status');
  doc.text(`Contract Sum: ${formatCurrency(budgetStatus.budget)}`);
  doc.text(`Approved Variations: ${formatCurrency(budgetStatus.actual - budgetStatus.budget)}`);
  doc.text(`Current Contract Value: ${formatCurrency(budgetStatus.actual)}`);
  doc.text(`Forecast Final Cost: ${formatCurrency(budgetStatus.forecast)}`);
  doc.text(`Variance: ${formatCurrency(budgetStatus.forecast - budgetStatus.budget)} (${((budgetStatus.forecast - budgetStatus.budget) / budgetStatus.budget * 100).toFixed(1)}%)`);

  addSection(doc, 'Quality');
  doc.text('• No major non-conformances recorded this period');
  doc.text('• 3 minor defects identified and rectified');
  doc.text('• Hold point inspections completed satisfactorily');

  addSection(doc, 'Safety');
  doc.text('• Lost Time Injuries (LTI): 0');
  doc.text('• Medical Treatment Injuries (MTI): 0');
  doc.text('• First Aid Treatments: 2');
  doc.text('• Near Miss Reports: 4 (all investigated and closed)');
  doc.text('• Safety Observations: 15 positive, 3 negative');

  addSection(doc, 'Key Risks');
  doc.text('1. Weather delays - mitigation through flexible scheduling');
  doc.text('2. Material supply lead times - early procurement initiated');
  doc.text('3. Subcontractor availability - pre-qualification completed');

  addSection(doc, 'Recommendations');
  doc.text('1. Continue monitoring concrete curing times');
  doc.text('2. Accelerate facade procurement to maintain program');
  doc.text('3. Schedule coordination meeting with services subcontractors');

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== NOTES ==================

function generateNote(
  noteType: string,
  noteNumber: string,
  subject: string,
  content: string,
  date: Date,
  outputPath: string
) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  addHeader(doc, noteType, `No. ${noteNumber}`);

  addProjectInfo(doc);

  doc.fontSize(10).font('Helvetica-Bold').text('Date:', { continued: true });
  doc.font('Helvetica').text(` ${formatDate(date)}`);
  doc.font('Helvetica-Bold').text('Subject:', { continued: true });
  doc.font('Helvetica').text(` ${subject}`);
  doc.moveDown();

  addSection(doc, 'Details');
  doc.fontSize(10).font('Helvetica').text(content);

  doc.moveDown(2);
  addSection(doc, 'Acknowledgement');
  doc.text('Please acknowledge receipt and confirm understanding of the above.');
  doc.moveDown(2);
  doc.text('Issued by: _______________________  Date: ____________');
  doc.moveDown();
  doc.text('Received by: _______________________  Date: ____________');

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== TRR ==================

function generateTRR(outputPath: string) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  addHeader(doc, 'TENDER RECOMMENDATION REPORT', 'Head Contractor Selection');

  addProjectInfo(doc);

  addSection(doc, 'Executive Summary');
  doc.fontSize(10).font('Helvetica');
  doc.text(`Following a competitive tender process for the Design & Construct Head Contract for ${PROJECT.name}, three (3) tenders were received and evaluated. Based on a weighted assessment of price and non-price criteria, this report recommends the appointment of Project Built Pty Ltd as the preferred tenderer.`);

  addSection(doc, 'Evaluation Methodology');
  doc.text('Tenders were evaluated against the following weighted criteria:');
  doc.text('• Price (50%)');
  doc.text('• Relevant Experience (15%)');
  doc.text('• Proposed Program (10%)');
  doc.text('• Project Team (10%)');
  doc.text('• Methodology (10%)');
  doc.text('• WHS Approach (5%)');

  addSection(doc, 'Tender Price Comparison');
  doc.font('Helvetica-Bold').text('Tenderer', { continued: true, width: 200 });
  doc.text('Tender Price (excl GST)', { continued: true, width: 150 });
  doc.text('Program', { align: 'right' });
  doc.font('Helvetica');
  CONTRACTORS.forEach(c => {
    doc.text(c.name, { continued: true, width: 200 });
    doc.text(formatCurrency(c.price), { continued: true, width: 150 });
    doc.text(`${c.program} months`, { align: 'right' });
  });

  doc.addPage();
  addSection(doc, 'Non-Price Evaluation Summary');

  const criteria = [
    { name: 'Relevant Experience', weights: [9, 8, 8] },
    { name: 'Proposed Program', weights: [9, 7, 8] },
    { name: 'Project Team', weights: [8, 8, 9] },
    { name: 'Methodology', weights: [9, 8, 8] },
    { name: 'WHS Approach', weights: [8, 8, 8] }
  ];

  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Criteria', { continued: true, width: 150 });
  doc.text('Project Built', { continued: true, width: 80 });
  doc.text('Growthbuilt', { continued: true, width: 80 });
  doc.text('Deicorp', { width: 80 });
  doc.font('Helvetica');

  criteria.forEach(c => {
    doc.text(c.name, { continued: true, width: 150 });
    doc.text(`${c.weights[0]}/10`, { continued: true, width: 80 });
    doc.text(`${c.weights[1]}/10`, { continued: true, width: 80 });
    doc.text(`${c.weights[2]}/10`, { width: 80 });
  });

  addSection(doc, 'Risk Assessment');
  doc.text('Project Built Pty Ltd presents the lowest overall risk profile:');
  doc.text('• Strong financial position with adequate bonding capacity');
  doc.text('• Experienced team with relevant project history');
  doc.text('• Comprehensive methodology addressing key risks');
  doc.text('• Competitive pricing with no obvious exclusions');

  addSection(doc, 'Recommendation');
  doc.font('Helvetica-Bold');
  doc.text('Based on the evaluation of price and non-price criteria, it is recommended that Project Built Pty Ltd be appointed as the Design & Construct Head Contractor for the Mosaic Apartments project at a contract sum of $14,250,000 (excl. GST).');

  doc.moveDown(2);
  doc.font('Helvetica');
  doc.text('Prepared by: _______________________');
  doc.text('Date: ' + formatDate(new Date('2015-09-25')));
  doc.moveDown();
  doc.text('Approved by: _______________________');
  doc.text('Date: ____________');

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== RFT ==================

function generateRFT(outputPath: string) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  addHeader(doc, 'REQUEST FOR TENDER', 'Design & Construct Head Contract');

  doc.fontSize(12).font('Helvetica-Bold').text(PROJECT.name, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(PROJECT.address, { align: 'center' });
  doc.moveDown(2);

  addSection(doc, 'Invitation to Tender');
  doc.fontSize(10).font('Helvetica');
  doc.text(`${PROJECT.principal.name} (the Principal) invites your organisation to submit a tender for the Design & Construct Head Contract for the construction of ${PROJECT.name}.`);

  addSection(doc, 'Project Description');
  doc.text(`The project comprises the design and construction of an 8-storey residential building containing 33 apartments over 2 levels of basement car parking. The development is located at ${PROJECT.address}.`);
  doc.moveDown();
  doc.text('Key project features include:');
  doc.text('• 33 residential apartments (mix of 1, 2 and 3 bedroom)');
  doc.text('• 2 levels of basement parking (approximately 50 spaces)');
  doc.text('• Ground floor retail/commercial space');
  doc.text('• Rooftop communal facilities');
  doc.text('• Landscaped podium and ground level entries');

  addSection(doc, 'Tender Submission Requirements');
  doc.text('Tenderers must submit the following:');
  doc.text('1. Completed Tender Form');
  doc.text('2. Lump Sum Price with detailed breakdown');
  doc.text('3. Construction Program (Gantt chart format)');
  doc.text('4. Construction Methodology');
  doc.text('5. Project Team details and CVs');
  doc.text('6. Relevant project experience (minimum 3 projects)');
  doc.text('7. WHS Management Plan');
  doc.text('8. Evidence of insurances and financial capacity');
  doc.text('9. List of proposed subcontractors');

  addSection(doc, 'Evaluation Criteria');
  doc.text('Tenders will be evaluated against:');
  doc.text('• Price (50%)');
  doc.text('• Relevant Experience (15%)');
  doc.text('• Proposed Program (10%)');
  doc.text('• Project Team (10%)');
  doc.text('• Methodology (10%)');
  doc.text('• WHS Approach (5%)');

  doc.addPage();
  addSection(doc, 'Key Dates');
  doc.text('• RFT Issue Date: 1 September 2015');
  doc.text('• Site Visit: 8 September 2015 at 10:00 AM');
  doc.text('• Queries Close: 12 September 2015');
  doc.text('• Tender Close: 20 September 2015 at 2:00 PM');
  doc.text('• Tender Evaluation: 21-25 September 2015');
  doc.text('• Award Notification: 28 September 2015');

  addSection(doc, 'Contact Details');
  doc.text('All queries regarding this tender should be directed to:');
  doc.moveDown(0.5);
  doc.text(`${PROJECT.superintendent.contact}`);
  doc.text(PROJECT.superintendent.name);
  doc.text(`Email: ${PROJECT.superintendent.email}`);
  doc.text(`Phone: ${PROJECT.superintendent.phone}`);

  addSection(doc, 'Tender Lodgement');
  doc.text('Tenders must be submitted electronically to:');
  doc.text(`${PROJECT.superintendent.email}`);
  doc.moveDown();
  doc.text('Subject line: "Tender Submission - Mosaic Apartments - [Company Name]"');
  doc.moveDown();
  doc.text('Late submissions will not be accepted.');

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== COST PLAN ==================

function generateCostPlan(outputPath: string) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  addHeader(doc, 'ELEMENTAL COST PLAN', 'Revision A - October 2015');

  addProjectInfo(doc);

  addSection(doc, 'Project Data');
  doc.fontSize(10).font('Helvetica');
  doc.text('Gross Floor Area (GFA): 4,500 m²');
  doc.text('Net Saleable Area (NSA): 3,200 m²');
  doc.text('Number of Apartments: 33');
  doc.text('Car Parking Spaces: 50');
  doc.text('Basement Levels: 2');
  doc.text('Above Ground Levels: 8');
  doc.moveDown();

  addSection(doc, 'Cost Summary by Element');

  const elements = [
    { code: '1', name: 'Substructure', amount: 1850000, rate: 411 },
    { code: '2', name: 'Columns', amount: 425000, rate: 94 },
    { code: '3', name: 'Upper Floors', amount: 1275000, rate: 283 },
    { code: '4', name: 'Staircases', amount: 185000, rate: 41 },
    { code: '5', name: 'Roof', amount: 320000, rate: 71 },
    { code: '6', name: 'External Walls', amount: 1450000, rate: 322 },
    { code: '7', name: 'Windows', amount: 680000, rate: 151 },
    { code: '8', name: 'Internal Walls', amount: 485000, rate: 108 },
    { code: '9', name: 'Internal Doors', amount: 165000, rate: 37 },
    { code: '10', name: 'Wall Finishes', amount: 295000, rate: 66 },
    { code: '11', name: 'Floor Finishes', amount: 385000, rate: 86 },
    { code: '12', name: 'Ceiling Finishes', amount: 245000, rate: 54 },
    { code: '13', name: 'Fittings & Equipment', amount: 425000, rate: 94 },
    { code: '14', name: 'Sanitary Fixtures', amount: 185000, rate: 41 },
    { code: '15', name: 'Mechanical Services', amount: 850000, rate: 189 },
    { code: '16', name: 'Hydraulic Services', amount: 520000, rate: 116 },
    { code: '17', name: 'Fire Services', amount: 380000, rate: 84 },
    { code: '18', name: 'Electrical Services', amount: 685000, rate: 152 },
    { code: '19', name: 'Lifts', amount: 420000, rate: 93 },
    { code: '20', name: 'External Works', amount: 485000, rate: 108 },
    { code: '21', name: 'Preliminaries', amount: 1540000, rate: 342 }
  ];

  doc.font('Helvetica-Bold');
  doc.text('Element', { continued: true, width: 200 });
  doc.text('Amount', { continued: true, width: 100 });
  doc.text('$/m² GFA', { width: 80 });
  doc.font('Helvetica');

  let subtotal = 0;
  elements.forEach(e => {
    subtotal += e.amount;
    doc.text(`${e.code}. ${e.name}`, { continued: true, width: 200 });
    doc.text(formatCurrency(e.amount), { continued: true, width: 100 });
    doc.text(`$${e.rate}`, { width: 80 });
  });

  doc.moveDown();
  doc.moveTo(50, doc.y).lineTo(400, doc.y).stroke();
  doc.moveDown(0.3);

  doc.font('Helvetica-Bold');
  doc.text('SUBTOTAL', { continued: true, width: 200 });
  doc.text(formatCurrency(subtotal), { continued: true, width: 100 });
  doc.text(`$${Math.round(subtotal/4500)}`, { width: 80 });

  doc.addPage();
  addSection(doc, 'Contingencies & Escalation');

  const designContingency = Math.round(subtotal * 0.05);
  const constructionContingency = Math.round(subtotal * 0.05);
  const escalation = Math.round(subtotal * 0.03);
  const total = subtotal + designContingency + constructionContingency + escalation;

  doc.font('Helvetica');
  doc.text(`Design Contingency (5%): ${formatCurrency(designContingency)}`);
  doc.text(`Construction Contingency (5%): ${formatCurrency(constructionContingency)}`);
  doc.text(`Escalation (3%): ${formatCurrency(escalation)}`);
  doc.moveDown();
  doc.font('Helvetica-Bold');
  doc.text(`TOTAL CONSTRUCTION COST: ${formatCurrency(total)}`);
  doc.text(`Rate per m² GFA: $${Math.round(total/4500)}`);
  doc.text(`Rate per Apartment: ${formatCurrency(Math.round(total/33))}`);

  addSection(doc, 'Exclusions');
  doc.font('Helvetica');
  doc.text('• Land costs');
  doc.text('• Professional fees');
  doc.text('• Authority charges and contributions');
  doc.text('• Legal and finance costs');
  doc.text('• GST');
  doc.text('• Furniture, fixtures and equipment (FF&E)');

  addSection(doc, 'Assumptions');
  doc.text('• Costs based on September 2015 price levels');
  doc.text('• Normal ground conditions assumed');
  doc.text('• Standard residential finishes as per brief');
  doc.text('• Competitive tender market');

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== PROGRAM ==================

function generateProgram(outputPath: string) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  addHeader(doc, 'MASTER PROGRAM', 'Revision B - October 2015');

  addProjectInfo(doc);

  addSection(doc, 'Program Summary');
  doc.fontSize(10).font('Helvetica');
  doc.text('Construction Commencement: November 2015');
  doc.text('Practical Completion: May 2017');
  doc.text('Total Duration: 18 months');
  doc.moveDown();

  addSection(doc, 'Key Milestones');

  const milestones = [
    { milestone: 'Contract Award', date: 'October 2015' },
    { milestone: 'Site Establishment', date: 'November 2015' },
    { milestone: 'Demolition Complete', date: 'December 2015' },
    { milestone: 'Excavation Complete', date: 'February 2016' },
    { milestone: 'Basement Slab Complete', date: 'April 2016' },
    { milestone: 'Ground Floor Slab', date: 'May 2016' },
    { milestone: 'Level 4 Slab (Structure 50%)', date: 'August 2016' },
    { milestone: 'Level 8 Slab (Structure Complete)', date: 'November 2016' },
    { milestone: 'Facade Complete', date: 'January 2017' },
    { milestone: 'Internal Finishes Complete', date: 'March 2017' },
    { milestone: 'Services Commissioning', date: 'April 2017' },
    { milestone: 'Practical Completion', date: 'May 2017' }
  ];

  milestones.forEach(m => {
    doc.font('Helvetica-Bold').text(`${m.milestone}:`, { continued: true, width: 250 });
    doc.font('Helvetica').text(m.date);
  });

  addSection(doc, 'Stage Durations');

  const stages = [
    { stage: 'Pre-Construction', weeks: 4 },
    { stage: 'Site Establishment & Demolition', weeks: 6 },
    { stage: 'Excavation & Shoring', weeks: 10 },
    { stage: 'Basement Structure', weeks: 12 },
    { stage: 'Superstructure', weeks: 28 },
    { stage: 'Facade Works', weeks: 16 },
    { stage: 'Internal Finishes', weeks: 20 },
    { stage: 'Services Installation', weeks: 24 },
    { stage: 'External Works', weeks: 8 },
    { stage: 'Commissioning & Handover', weeks: 6 }
  ];

  doc.font('Helvetica-Bold');
  doc.text('Stage', { continued: true, width: 250 });
  doc.text('Duration (weeks)');
  doc.font('Helvetica');

  stages.forEach(s => {
    doc.text(s.stage, { continued: true, width: 250 });
    doc.text(`${s.weeks} weeks`);
  });

  doc.addPage();
  addSection(doc, 'Critical Path');
  doc.fontSize(10).font('Helvetica');
  doc.text('The critical path for this project runs through the following activities:');
  doc.moveDown(0.5);
  doc.text('1. Excavation completion (dependent on shoring installation)');
  doc.text('2. Basement slab pour (weather dependent)');
  doc.text('3. Structural frame construction (floor-by-floor)');
  doc.text('4. Facade installation (dependent on structure)');
  doc.text('5. Services rough-in (coordinated with finishes)');
  doc.text('6. Commissioning and certification');

  addSection(doc, 'Major Procurement Items');
  doc.text('The following items require early procurement due to long lead times:');
  doc.moveDown(0.5);
  doc.text('• Lifts: 16-20 weeks lead time - order by March 2016');
  doc.text('• Facade system: 12-14 weeks lead time - order by June 2016');
  doc.text('• Switchboards: 10-12 weeks lead time - order by August 2016');
  doc.text('• Kitchen joinery: 8-10 weeks lead time - order by October 2016');

  addSection(doc, 'Weather Allowance');
  doc.text('The program includes the following weather contingency:');
  doc.text('• 2 weeks allowance for wet weather during excavation');
  doc.text('• 4 weeks allowance during structure (external works)');
  doc.text('• Float incorporated in non-critical activities');

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== OBJECTIVES ==================

function generateObjectives(outputPath: string) {
  const doc = createPDF();
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  addHeader(doc, 'PROJECT OBJECTIVES', PROJECT.name);

  addProjectInfo(doc);

  addSection(doc, 'Vision Statement');
  doc.fontSize(10).font('Helvetica');
  doc.text('To deliver a high-quality residential development that maximises value for purchasers while maintaining construction efficiency and design excellence. The Mosaic Apartments will set a new standard for residential living in Bankstown.');

  addSection(doc, 'Key Objectives');

  const objectives = [
    {
      category: 'Design Quality',
      items: [
        'Achieve design excellence through considered architectural response',
        'Maximise natural light and ventilation to all apartments',
        'Create functional and efficient floor plans',
        'Deliver high-quality finishes appropriate to target market'
      ]
    },
    {
      category: 'Time',
      items: [
        'Achieve practical completion within 18 months',
        'Meet all key milestone dates',
        'Coordinate design documentation to avoid delays',
        'Manage procurement to prevent program slippage'
      ]
    },
    {
      category: 'Cost',
      items: [
        'Deliver project within approved budget of $15M',
        'Minimise variations through thorough documentation',
        'Achieve value engineering savings where possible',
        'Maintain cost transparency throughout construction'
      ]
    },
    {
      category: 'Quality',
      items: [
        'Meet all statutory and regulatory requirements',
        'Achieve minimum 4-star BASIX compliance',
        'Zero major defects at practical completion',
        'Deliver comprehensive handover documentation'
      ]
    },
    {
      category: 'Safety',
      items: [
        'Zero lost time injuries during construction',
        'Full compliance with WHS legislation',
        'Proactive hazard identification and control',
        'Safe working environment for all workers and visitors'
      ]
    },
    {
      category: 'Stakeholder Management',
      items: [
        'Maintain positive relationships with neighbours',
        'Minimise disruption during construction',
        'Regular communication with all stakeholders',
        'Responsive approach to community concerns'
      ]
    }
  ];

  objectives.forEach(obj => {
    doc.font('Helvetica-Bold').text(obj.category);
    obj.items.forEach(item => {
      doc.font('Helvetica').text(`• ${item}`);
    });
    doc.moveDown(0.5);
  });

  addSection(doc, 'Success Criteria');
  doc.fontSize(10).font('Helvetica');
  doc.text('The project will be considered successful if:');
  doc.text('• Practical completion achieved on or before May 2017');
  doc.text('• Final cost within 5% of approved budget');
  doc.text('• All apartments achieve planned sales prices');
  doc.text('• No major safety incidents during construction');
  doc.text('• Positive feedback from purchasers on handover');

  doc.end();
  return new Promise<void>((resolve) => stream.on('finish', resolve));
}

// ================== MAIN GENERATION FUNCTION ==================

async function generateAllPDFs() {
  console.log('Starting PDF generation for Mosaic Apartments Bankstown test data...\n');

  // 1. Generate Objectives
  console.log('1. Generating Project Objectives...');
  await generateObjectives(path.join(BASE_PATH, '01-Objectives', 'Project-Objectives-Mosaic.pdf'));
  console.log('   ✓ Project-Objectives-Mosaic.pdf');

  // 2. Generate Consultant Submissions
  console.log('\n2. Generating Consultant Tender Submissions (15 PDFs)...');

  const disciplines = [
    { key: 'architecture', name: 'Architecture', desc: 'Architectural', folder: 'Architecture' },
    { key: 'structural', name: 'Structural', desc: 'Structural Engineering', folder: 'Structural' },
    { key: 'mechanical', name: 'Mechanical', desc: 'Mechanical/Hydraulic Engineering', folder: 'Mechanical-Hydraulic' },
    { key: 'electrical', name: 'Electrical', desc: 'Electrical Engineering', folder: 'Electrical' },
    { key: 'landscape', name: 'Landscape', desc: 'Landscape Architecture', folder: 'Landscape' }
  ];

  for (const disc of disciplines) {
    const consultants = CONSULTANTS[disc.key as keyof typeof CONSULTANTS];
    for (const consultant of consultants) {
      const filename = `${consultant.name.split(' ')[0]}-Fee-Proposal.pdf`;
      await generateConsultantSubmission(
        consultant,
        disc.key,
        disc.desc,
        path.join(BASE_PATH, '02-Consultants', disc.folder, filename)
      );
      console.log(`   ✓ ${disc.folder}/${filename}`);
    }
  }

  // 3. Generate Contractor Submissions
  console.log('\n3. Generating Contractor Tender Submissions (3 PDFs)...');
  for (const contractor of CONTRACTORS) {
    const filename = `${contractor.name.split(' ')[0]}-Tender.pdf`;
    await generateContractorSubmission(contractor, path.join(BASE_PATH, '03-Contractors', filename));
    console.log(`   ✓ ${filename}`);
  }

  // 4. Generate TRR
  console.log('\n4. Generating Tender Recommendation Report...');
  await generateTRR(path.join(BASE_PATH, '04-TRR', 'TRR-HeadContractor-Mosaic.pdf'));
  console.log('   ✓ TRR-HeadContractor-Mosaic.pdf');

  // 5. Generate RFT
  console.log('\n5. Generating Request for Tender...');
  await generateRFT(path.join(BASE_PATH, '05-RFT', 'RFT-HeadContractor-Mosaic.pdf'));
  console.log('   ✓ RFT-HeadContractor-Mosaic.pdf');

  // 6. Generate Invoices
  console.log('\n6. Generating Invoices (5 PDFs)...');

  const invoices = [
    { number: 'INV-001', entity: CONSULTANTS.architecture[0], amount: 72750, desc: 'Schematic Design services for Mosaic Apartments - Stage 1 completion (15% of contract value)', date: new Date('2015-10-15'), filename: 'INV-001-DWA-Schematic.pdf' },
    { number: 'INV-002', entity: CONSULTANTS.structural[0], amount: 46250, desc: 'Structural engineering services - Schematic Design phase complete (25% of contract value)', date: new Date('2015-10-18'), filename: 'INV-002-JJMarino-Schematic.pdf' },
    { number: 'INV-003', entity: CONSULTANTS.mechanical[0], amount: 36250, desc: 'Mechanical/Hydraulic engineering services - Schematic Design phase (25% of contract value)', date: new Date('2015-10-20'), filename: 'INV-003-Insync-Schematic.pdf' },
    { number: 'INV-004', entity: CONSULTANTS.architecture[0], amount: 121250, desc: 'Design Development services for Mosaic Apartments - DD phase complete (25% of contract value)', date: new Date('2015-11-28'), filename: 'INV-004-DWA-DD.pdf' },
    { number: 'PC-001', entity: CONTRACTORS[0], amount: 1425000, desc: 'Progress Claim #1 - Site establishment, demolition, and excavation works complete (10% of contract value)', date: new Date('2015-12-30'), filename: 'INV-005-ProjectBuilt-PC1.pdf' }
  ];

  for (const inv of invoices) {
    await generateInvoice(inv.number, inv.entity, inv.amount, inv.desc, inv.date, path.join(BASE_PATH, '06-Invoices', inv.filename));
    console.log(`   ✓ ${inv.filename}`);
  }

  // 7. Generate Variations
  console.log('\n7. Generating Variations (3 PDFs)...');

  const variations = [
    {
      number: 'V001',
      title: 'Additional Shoring Requirements',
      description: 'Due to the discovery of softer than anticipated soil conditions adjacent to the northern boundary, additional shoring measures are required to ensure stability of the neighboring property. Works include installation of 6 additional soldier piles and associated waling beams. Geotechnical investigation confirms the necessity of these works to prevent potential subsidence.',
      amount: 85000,
      status: 'Approved',
      programImpact: 'Additional 1 week to excavation phase. Critical path not affected as this work can be undertaken concurrently with bulk excavation. Overall program maintained.',
      date: new Date('2015-12-15'),
      filename: 'V001-Additional-Shoring.pdf'
    },
    {
      number: 'V002',
      title: 'Kitchen Appliance Upgrades',
      description: 'At the request of purchasers in Units 15, 22, and 28, upgraded kitchen appliances (Miele package) to replace the specified Fisher & Paykel appliances. Includes upgraded cooktop, oven, rangehood, and integrated dishwasher. Purchasers have agreed to pay the additional cost as a contract variation.',
      amount: 42500,
      status: 'Pending Approval',
      programImpact: 'No impact to construction program. Appliances to be procured and delivered in accordance with original schedule. Purchaser coordination required for final selection.',
      date: new Date('2016-01-20'),
      filename: 'V002-Kitchen-Upgrades.pdf'
    },
    {
      number: 'V003',
      title: 'Fire Engineering Solution Modifications',
      description: 'Following detailed fire engineering analysis, modifications to the fire compartmentation strategy are required to achieve BCA compliance via an Alternative Solution. Works include additional fire-rated walls to the basement car park, upgraded smoke detection system, and revision to the smoke hazard management strategy.',
      amount: 28000,
      status: 'Approved',
      programImpact: 'Works to be incorporated into basement structure phase. 3 days additional duration to basement level 1 works. Float absorbed, no impact to practical completion date.',
      date: new Date('2016-02-08'),
      filename: 'V003-Fire-Engineering.pdf'
    }
  ];

  for (const v of variations) {
    await generateVariation(v.number, v.title, v.description, v.amount, v.status, v.programImpact, v.date, path.join(BASE_PATH, '07-Variations', v.filename));
    console.log(`   ✓ ${v.filename}`);
  }

  // 8. Generate Meeting Minutes
  console.log('\n8. Generating Meeting Minutes (3 PDFs)...');

  const meetings = [
    {
      number: '001',
      type: 'Project Control Group Meeting',
      date: new Date('2015-10-15'),
      attendees: [
        { name: 'Michael Chen', company: 'Fullerton Property', role: 'Principal Representative' },
        { name: 'Sarah Thompson', company: 'Foresight Management', role: 'Superintendent' },
        { name: 'Steven Park', company: 'Project Built', role: 'Project Director' },
        { name: 'James Wilson', company: 'Design Workshop Australia', role: 'Lead Architect' },
        { name: 'Joseph Marino', company: 'JJ Marino & Associates', role: 'Structural Engineer' }
      ],
      agenda: [
        'Project Status Update',
        'Design Progress Review',
        'Construction Methodology',
        'Program Review',
        'Budget Status',
        'Risk Register Review'
      ],
      actions: [
        { action: 'Finalise basement shoring design', responsible: 'JJ Marino', dueDate: '22 Oct 2015' },
        { action: 'Submit DA modification for facade', responsible: 'DWA', dueDate: '30 Oct 2015' },
        { action: 'Provide updated construction program', responsible: 'Project Built', dueDate: '20 Oct 2015' },
        { action: 'Confirm lift selection and order', responsible: 'Superintendent', dueDate: '1 Nov 2015' }
      ],
      filename: 'PCG-Meeting-001.pdf'
    },
    {
      number: '004',
      type: 'Design Coordination Meeting',
      date: new Date('2015-10-22'),
      attendees: [
        { name: 'James Wilson', company: 'Design Workshop Australia', role: 'Lead Architect' },
        { name: 'Joseph Marino', company: 'JJ Marino & Associates', role: 'Structural Engineer' },
        { name: 'Peter Chang', company: 'Insync Services', role: 'Mechanical Engineer' },
        { name: 'Daniel Kim', company: 'Simpson Kotzman', role: 'Electrical Engineer' },
        { name: 'Sophie Taylor', company: 'Taylor Brammer', role: 'Landscape Architect' }
      ],
      agenda: [
        'Services Coordination',
        'Ceiling Heights Review',
        'Facade Design Development',
        'Landscape Integration',
        'RFI Responses'
      ],
      actions: [
        { action: 'Resolve services clash at Level 3 corridor', responsible: 'Insync/Simpson Kotzman', dueDate: '29 Oct 2015' },
        { action: 'Issue revised ceiling heights schedule', responsible: 'DWA', dueDate: '26 Oct 2015' },
        { action: 'Coordinate planter box structural requirements', responsible: 'JJ Marino', dueDate: '30 Oct 2015' }
      ],
      filename: 'Design-Coordination-004.pdf'
    },
    {
      number: '008',
      type: 'Site Progress Meeting',
      date: new Date('2015-10-29'),
      attendees: [
        { name: 'Sarah Thompson', company: 'Foresight Management', role: 'Superintendent' },
        { name: 'Steven Park', company: 'Project Built', role: 'Project Director' },
        { name: 'Tom Richards', company: 'Project Built', role: 'Site Manager' },
        { name: 'Mark Davis', company: 'Deep Foundations', role: 'Shoring Subcontractor' }
      ],
      agenda: [
        'Site Progress Update',
        'Program Status',
        'Quality Issues',
        'Safety Report',
        'Subcontractor Coordination',
        'Upcoming Works'
      ],
      actions: [
        { action: 'Complete northern boundary shoring', responsible: 'Deep Foundations', dueDate: '5 Nov 2015' },
        { action: 'Submit concrete pour schedule', responsible: 'Project Built', dueDate: '2 Nov 2015' },
        { action: 'Install additional site lighting', responsible: 'Project Built', dueDate: '30 Oct 2015' },
        { action: 'Arrange dilapidation survey of adjacent property', responsible: 'Superintendent', dueDate: '3 Nov 2015' }
      ],
      filename: 'Site-Meeting-008.pdf'
    }
  ];

  for (const m of meetings) {
    await generateMeetingMinutes(m.number, m.type, m.date, m.attendees, m.agenda, m.actions, path.join(BASE_PATH, '08-Meetings', m.filename));
    console.log(`   ✓ ${m.filename}`);
  }

  // 9. Generate Reports
  console.log('\n9. Generating Reports (2 PDFs)...');

  await generateReport(
    'Monthly Progress Report - October 2015',
    'Construction Progress Report',
    '1 - 31 October 2015',
    new Date('2015-11-05'),
    15,
    { budget: 14250000, actual: 14335000, forecast: 14450000 },
    path.join(BASE_PATH, '09-Reports', 'Monthly-Progress-Oct2015.pdf')
  );
  console.log('   ✓ Monthly-Progress-Oct2015.pdf');

  await generateReport(
    "Superintendent's Report #3",
    'Quarterly Project Report',
    'Q3 2015 (July - September)',
    new Date('2015-10-10'),
    8,
    { budget: 14250000, actual: 14250000, forecast: 14380000 },
    path.join(BASE_PATH, '09-Reports', 'Superintendent-Report-Q3.pdf')
  );
  console.log('   ✓ Superintendent-Report-Q3.pdf');

  // 10. Generate Notes
  console.log('\n10. Generating Notes (2 PDFs)...');

  await generateNote(
    'Site Instruction',
    'SI-012',
    'Concrete Pour Sequence Modification',
    `Further to discussions at the site meeting on 29 October 2015, this instruction confirms the revised concrete pour sequence for the basement level 1 slab.\n\nThe contractor is instructed to modify the pour sequence as follows:\n\n1. Pour 1: Grid A-D, 1-5 (approximately 400m²)\n2. Pour 2: Grid D-G, 1-5 (approximately 350m²)\n3. Pour 3: Grid A-G, 5-8 (approximately 450m²)\n\nThis sequence allows for:\n- Improved access for concrete trucks via the southern entry\n- Better curing conditions with reduced pour sizes\n- Coordination with shoring removal sequence\n\nThe revised sequence must be reflected in the updated construction program.\n\nNo additional cost or time is associated with this instruction.`,
    new Date('2015-10-30'),
    path.join(BASE_PATH, '10-Notes', 'SI-012-Concrete-Pour.pdf')
  );
  console.log('   ✓ SI-012-Concrete-Pour.pdf');

  await generateNote(
    'RFI Response',
    'RFI-008',
    'Waterproofing Detail at Planter Boxes',
    `In response to RFI-008 dated 20 October 2015 regarding waterproofing details at podium level planter boxes:\n\nThe following waterproofing system is confirmed:\n\n1. Concrete planter structure to be constructed with 40MPa concrete, 50mm cover to reinforcement\n2. Apply Wolfin IB membrane system (2.0mm) to all internal surfaces\n3. Membrane to extend minimum 150mm above finished soil level\n4. Install protection board (6mm) over membrane before drainage layer\n5. Drainage layer: 25mm Atlantis drainage cell with geotextile filter fabric\n6. Minimum 100mm gravel drainage layer at base\n7. Outlet pipes (100mm PVC) at 3m maximum centres\n\nRefer to attached detail SK-WP-008 for clarification.\n\nAll waterproofing works to be inspected and approved by superintendent prior to backfilling.`,
    new Date('2015-10-25'),
    path.join(BASE_PATH, '10-Notes', 'RFI-008-Waterproofing.pdf')
  );
  console.log('   ✓ RFI-008-Waterproofing.pdf');

  // 11. Generate Cost Plan
  console.log('\n11. Generating Cost Plan...');
  await generateCostPlan(path.join(BASE_PATH, '11-Cost-Plan', 'Cost-Plan-Mosaic-Oct2015.pdf'));
  console.log('   ✓ Cost-Plan-Mosaic-Oct2015.pdf');

  // 12. Generate Program
  console.log('\n12. Generating Program...');
  await generateProgram(path.join(BASE_PATH, '12-Program', 'Master-Program-Mosaic.pdf'));
  console.log('   ✓ Master-Program-Mosaic.pdf');

  console.log('\n========================================');
  console.log('PDF GENERATION COMPLETE');
  console.log('========================================');
  console.log('Total PDFs generated: 37');
  console.log(`Location: ${BASE_PATH}`);
  console.log('\nBreakdown:');
  console.log('  - Project Objectives: 1');
  console.log('  - Consultant Submissions: 15');
  console.log('  - Contractor Submissions: 3');
  console.log('  - TRR: 1');
  console.log('  - RFT: 1');
  console.log('  - Invoices: 5');
  console.log('  - Variations: 3');
  console.log('  - Meeting Minutes: 3');
  console.log('  - Reports: 2');
  console.log('  - Notes: 2');
  console.log('  - Cost Plan: 1');
  console.log('  - Program: 1');
}

// Run the generator
generateAllPDFs().catch(console.error);
