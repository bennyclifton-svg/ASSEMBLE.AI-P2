/**
 * Generate Sample Tender Submissions for Testing
 * Creates 3 PDF tender submissions with price schedules and typical contractor information
 */

const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;
const fs = require('fs');
const path = require('path');

// Ensure output directory exists
const outputDir = path.join(__dirname, '..', 'test-data', 'sample-tenders');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Sample tender data for 3 different contractors
const tenderData = [
  {
    company: {
      name: 'Apex Construction Group Pty Ltd',
      abn: '45 123 456 789',
      address: '123 Industrial Drive, Wetherill Park NSW 2164',
      phone: '(02) 9876 5432',
      email: 'tenders@apexconstruction.com.au',
      website: 'www.apexconstruction.com.au',
      established: '1998',
      employees: '185',
      annualTurnover: '$95 million'
    },
    contact: {
      name: 'Michael Chen',
      position: 'Estimating Manager',
      mobile: '0412 345 678',
      email: 'm.chen@apexconstruction.com.au'
    },
    priceSchedule: {
      preliminaries: 285000,
      demolition: 125000,
      earthworks: 340000,
      concrete: 890000,
      structural_steel: 1250000,
      roofing: 420000,
      facade: 680000,
      internal_walls: 310000,
      ceilings: 185000,
      flooring: 295000,
      joinery: 165000,
      painting: 145000,
      mechanical: 920000,
      electrical: 780000,
      hydraulics: 385000,
      fire_services: 290000,
      landscaping: 175000,
      external_works: 220000,
      contingency: 380000
    },
    programWeeks: 48,
    methodology: 'Apex Construction proposes a staged construction approach, commencing with site establishment and demolition works in Weeks 1-4. The structural works will be fast-tracked using a combination of precast and in-situ concrete, with steel erection running concurrently. Our experienced project team will implement lean construction principles to minimize waste and maximize efficiency.',
    keyPersonnel: [
      { name: 'David Morrison', role: 'Project Director', experience: '28 years', qualifications: 'B.Eng (Civil), MBA' },
      { name: 'Sarah Thompson', role: 'Project Manager', experience: '15 years', qualifications: 'B.Const.Mgmt, PMP' },
      { name: 'James Wilson', role: 'Site Manager', experience: '22 years', qualifications: 'Cert IV Building, WHS' },
      { name: 'Linda Nguyen', role: 'Quality Manager', experience: '12 years', qualifications: 'B.Eng, ISO 9001 Lead Auditor' }
    ],
    experience: [
      { project: 'Westfield Expansion - Parramatta', value: '$45M', year: '2023', client: 'Scentre Group' },
      { project: 'Macquarie University Science Building', value: '$38M', year: '2022', client: 'Macquarie University' },
      { project: 'Sydney Olympic Park Commercial', value: '$52M', year: '2022', client: 'Sydney Olympic Park Authority' }
    ],
    insurance: {
      publicLiability: '$50 million',
      professionalIndemnity: '$20 million',
      workersComp: 'Compliant with NSW legislation'
    },
    safetyRecord: {
      ltifr: '0.8',
      trifr: '3.2',
      certifications: 'ISO 45001, AS/NZS 4801'
    }
  },
  {
    company: {
      name: 'BuildRight Developments',
      abn: '67 234 567 890',
      address: '45 Commerce Street, Alexandria NSW 2015',
      phone: '(02) 8765 4321',
      email: 'contracts@buildright.com.au',
      website: 'www.buildright.com.au',
      established: '2005',
      employees: '120',
      annualTurnover: '$68 million'
    },
    contact: {
      name: 'Jessica Roberts',
      position: 'Commercial Manager',
      mobile: '0423 456 789',
      email: 'j.roberts@buildright.com.au'
    },
    priceSchedule: {
      preliminaries: 310000,
      demolition: 118000,
      earthworks: 365000,
      concrete: 925000,
      structural_steel: 1180000,
      roofing: 445000,
      facade: 720000,
      internal_walls: 285000,
      ceilings: 195000,
      flooring: 280000,
      joinery: 172000,
      painting: 138000,
      mechanical: 885000,
      electrical: 810000,
      hydraulics: 365000,
      fire_services: 275000,
      landscaping: 195000,
      external_works: 235000,
      contingency: 420000
    },
    programWeeks: 52,
    methodology: 'BuildRight Developments will deliver this project using our proven methodology that prioritizes safety and quality. We will employ BIM Level 2 coordination throughout, with weekly clash detection reviews. Our approach includes early engagement of key subcontractors and suppliers to secure competitive pricing and ensure availability.',
    keyPersonnel: [
      { name: 'Robert Hughes', role: 'Project Director', experience: '25 years', qualifications: 'B.Eng (Structural), MAIPM' },
      { name: 'Emma Clarke', role: 'Project Manager', experience: '12 years', qualifications: 'B.Const.Mgmt' },
      { name: 'Mark Stevens', role: 'Site Manager', experience: '18 years', qualifications: 'Diploma Building, WHS' },
      { name: 'Anna Petrova', role: 'Services Coordinator', experience: '10 years', qualifications: 'B.Eng (Mechanical)' }
    ],
    experience: [
      { project: 'North Sydney Office Tower Fit-out', value: '$32M', year: '2023', client: 'Dexus Property' },
      { project: 'Chatswood Retail Precinct', value: '$28M', year: '2023', client: 'GPT Group' },
      { project: 'Campbelltown Hospital Expansion', value: '$41M', year: '2021', client: 'NSW Health Infrastructure' }
    ],
    insurance: {
      publicLiability: '$50 million',
      professionalIndemnity: '$15 million',
      workersComp: 'Compliant with NSW legislation'
    },
    safetyRecord: {
      ltifr: '1.2',
      trifr: '4.5',
      certifications: 'ISO 45001'
    }
  },
  {
    company: {
      name: 'Precision Builders Australia',
      abn: '89 345 678 901',
      address: '78 Gateway Boulevard, Epping VIC 3076',
      phone: '(03) 9123 4567',
      email: 'estimating@precisionbuilders.com.au',
      website: 'www.precisionbuilders.com.au',
      established: '1992',
      employees: '240',
      annualTurnover: '$125 million'
    },
    contact: {
      name: 'Andrew Mitchell',
      position: 'National Estimating Director',
      mobile: '0434 567 890',
      email: 'a.mitchell@precisionbuilders.com.au'
    },
    priceSchedule: {
      preliminaries: 265000,
      demolition: 132000,
      earthworks: 325000,
      concrete: 875000,
      structural_steel: 1295000,
      roofing: 395000,
      facade: 695000,
      internal_walls: 298000,
      ceilings: 178000,
      flooring: 305000,
      joinery: 158000,
      painting: 152000,
      mechanical: 945000,
      electrical: 755000,
      hydraulics: 398000,
      fire_services: 285000,
      landscaping: 168000,
      external_works: 212000,
      contingency: 350000
    },
    programWeeks: 46,
    methodology: 'Precision Builders brings 30+ years of experience to this project. Our methodology centers on modular construction techniques where applicable, reducing on-site labor and improving quality control. We will utilize our established supply chain relationships to ensure material availability and competitive pricing throughout the project lifecycle.',
    keyPersonnel: [
      { name: 'Christopher Lee', role: 'Project Director', experience: '30 years', qualifications: 'B.Eng (Civil), FIEAust' },
      { name: 'Rachel Wong', role: 'Project Manager', experience: '18 years', qualifications: 'B.Arch, M.Const.Mgmt' },
      { name: 'Thomas Brown', role: 'Site Manager', experience: '24 years', qualifications: 'Cert IV Building, Diploma WHS' },
      { name: 'Michelle Davis', role: 'Commercial Manager', experience: '14 years', qualifications: 'B.QS, MAIQS' }
    ],
    experience: [
      { project: 'Melbourne Central Plaza Upgrade', value: '$58M', year: '2023', client: 'GPT Group' },
      { project: 'Monash University Engineering', value: '$47M', year: '2022', client: 'Monash University' },
      { project: 'Crown Melbourne Expansion', value: '$72M', year: '2021', client: 'Crown Resorts' }
    ],
    insurance: {
      publicLiability: '$100 million',
      professionalIndemnity: '$30 million',
      workersComp: 'Compliant with VIC legislation'
    },
    safetyRecord: {
      ltifr: '0.5',
      trifr: '2.8',
      certifications: 'ISO 45001, ISO 14001, AS/NZS 4801'
    }
  }
];

function formatCurrency(amount) {
  return '$' + amount.toLocaleString('en-AU');
}

function generateTenderPDF(tender, index) {
  const doc = new jsPDF();
  let yPos = 20;

  const projectName = 'Commercial Office Building - Stage 2';
  const tenderRef = 'TND-2024-0087';
  const closingDate = '15 December 2024';

  // ========== COVER PAGE ==========
  doc.setFillColor(0, 51, 102);
  doc.rect(0, 0, 210, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('TENDER SUBMISSION', 105, 35, { align: 'center' });

  doc.setTextColor(0, 0, 0);
  yPos = 80;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(projectName, 105, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Tender Reference: ${tenderRef}`, 105, yPos, { align: 'center' });
  yPos += 30;

  // Company Logo placeholder
  doc.setFillColor(240, 240, 240);
  doc.rect(55, yPos, 100, 40, 'F');
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(tender.company.name, 105, yPos + 25, { align: 'center' });
  yPos += 60;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`ABN: ${tender.company.abn}`, 105, yPos, { align: 'center' });
  yPos += 8;
  doc.text(tender.company.address, 105, yPos, { align: 'center' });
  yPos += 8;
  doc.text(`Phone: ${tender.company.phone}`, 105, yPos, { align: 'center' });
  yPos += 8;
  doc.text(`Email: ${tender.company.email}`, 105, yPos, { align: 'center' });

  yPos = 220;
  doc.setFillColor(0, 51, 102);
  doc.rect(0, yPos, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text(`Submitted: ${new Date().toLocaleDateString('en-AU')}`, 105, yPos + 12, { align: 'center' });
  doc.text(`Tender Closing: ${closingDate}`, 105, yPos + 20, { align: 'center' });

  // ========== TABLE OF CONTENTS ==========
  doc.addPage();
  doc.setTextColor(0, 0, 0);
  yPos = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('TABLE OF CONTENTS', 20, yPos);
  yPos += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const tocItems = [
    '1. Executive Summary',
    '2. Company Profile',
    '3. Price Schedule',
    '4. Construction Methodology',
    '5. Project Program',
    '6. Key Personnel',
    '7. Relevant Experience',
    '8. Health & Safety',
    '9. Insurance & Compliance',
    '10. Declarations'
  ];

  tocItems.forEach((item, i) => {
    doc.text(item, 25, yPos);
    doc.text(`${i + 3}`, 180, yPos);
    yPos += 8;
  });

  // ========== EXECUTIVE SUMMARY ==========
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('1. EXECUTIVE SUMMARY', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const totalPrice = Object.values(tender.priceSchedule).reduce((a, b) => a + b, 0);

  const execSummary = [
    `${tender.company.name} is pleased to submit this tender for the ${projectName}.`,
    '',
    `Our lump sum price for the works is ${formatCurrency(totalPrice)} (excluding GST).`,
    '',
    `We propose to complete the works within ${tender.programWeeks} weeks from site possession.`,
    '',
    `With ${tender.company.established.replace('19', 'over 25').replace('20', 'nearly 20')} years of experience `,
    `in commercial construction and an annual turnover of ${tender.company.annualTurnover}, `,
    `${tender.company.name} has the capability and resources to deliver this project successfully.`,
    '',
    'Key advantages of our submission include:',
    '• Competitive pricing through established subcontractor relationships',
    '• Experienced project team with proven track record',
    '• Strong safety culture with industry-leading safety statistics',
    '• Commitment to quality and timely delivery'
  ];

  execSummary.forEach(line => {
    if (line === '') {
      yPos += 4;
    } else {
      const lines = doc.splitTextToSize(line, 170);
      lines.forEach(l => {
        doc.text(l, 20, yPos);
        yPos += 6;
      });
    }
  });

  // ========== COMPANY PROFILE ==========
  yPos += 10;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('2. COMPANY PROFILE', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const companyDetails = [
    ['Company Name:', tender.company.name],
    ['ABN:', tender.company.abn],
    ['Address:', tender.company.address],
    ['Phone:', tender.company.phone],
    ['Email:', tender.company.email],
    ['Website:', tender.company.website],
    ['Year Established:', tender.company.established],
    ['Number of Employees:', tender.company.employees],
    ['Annual Turnover:', tender.company.annualTurnover]
  ];

  companyDetails.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 25, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 75, yPos);
    yPos += 7;
  });

  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Tender Contact:', 25, yPos);
  yPos += 7;
  doc.setFont('helvetica', 'normal');
  doc.text(`${tender.contact.name}, ${tender.contact.position}`, 25, yPos);
  yPos += 6;
  doc.text(`Mobile: ${tender.contact.mobile}`, 25, yPos);
  yPos += 6;
  doc.text(`Email: ${tender.contact.email}`, 25, yPos);

  // ========== PRICE SCHEDULE ==========
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('3. PRICE SCHEDULE', 20, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text('All prices are in Australian Dollars and exclude GST', 20, yPos);
  yPos += 10;

  const priceItems = [
    ['Item', 'Description', 'Amount ($)'],
    ['1', 'Preliminaries & Site Establishment', formatCurrency(tender.priceSchedule.preliminaries)],
    ['2', 'Demolition Works', formatCurrency(tender.priceSchedule.demolition)],
    ['3', 'Earthworks & Excavation', formatCurrency(tender.priceSchedule.earthworks)],
    ['4', 'Concrete Works', formatCurrency(tender.priceSchedule.concrete)],
    ['5', 'Structural Steel', formatCurrency(tender.priceSchedule.structural_steel)],
    ['6', 'Roofing', formatCurrency(tender.priceSchedule.roofing)],
    ['7', 'Facade & External Cladding', formatCurrency(tender.priceSchedule.facade)],
    ['8', 'Internal Walls & Partitions', formatCurrency(tender.priceSchedule.internal_walls)],
    ['9', 'Ceilings', formatCurrency(tender.priceSchedule.ceilings)],
    ['10', 'Flooring & Floor Finishes', formatCurrency(tender.priceSchedule.flooring)],
    ['11', 'Joinery & Fitments', formatCurrency(tender.priceSchedule.joinery)],
    ['12', 'Painting & Decorating', formatCurrency(tender.priceSchedule.painting)],
    ['13', 'Mechanical Services (HVAC)', formatCurrency(tender.priceSchedule.mechanical)],
    ['14', 'Electrical Services', formatCurrency(tender.priceSchedule.electrical)],
    ['15', 'Hydraulic Services', formatCurrency(tender.priceSchedule.hydraulics)],
    ['16', 'Fire Services', formatCurrency(tender.priceSchedule.fire_services)],
    ['17', 'Landscaping', formatCurrency(tender.priceSchedule.landscaping)],
    ['18', 'External Works & Carparking', formatCurrency(tender.priceSchedule.external_works)],
    ['19', 'Contingency Allowance', formatCurrency(tender.priceSchedule.contingency)]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [priceItems[0]],
    body: priceItems.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: 'bold' },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' },
      1: { cellWidth: 120 },
      2: { cellWidth: 40, halign: 'right' }
    },
    styles: { fontSize: 9 }
  });

  yPos = doc.lastAutoTable.finalY + 5;

  // Subtotal
  const subtotal = Object.values(tender.priceSchedule).reduce((a, b) => a + b, 0);
  autoTable(doc, {
    startY: yPos,
    body: [
      ['', 'SUBTOTAL (Excl. GST)', formatCurrency(subtotal)],
      ['', 'GST (10%)', formatCurrency(subtotal * 0.1)],
      ['', 'TOTAL (Incl. GST)', formatCurrency(subtotal * 1.1)]
    ],
    theme: 'plain',
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 120, fontStyle: 'bold' },
      2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' }
    },
    styles: { fontSize: 10 }
  });

  // ========== METHODOLOGY ==========
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('4. CONSTRUCTION METHODOLOGY', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  const methodLines = doc.splitTextToSize(tender.methodology, 170);
  methodLines.forEach(line => {
    doc.text(line, 20, yPos);
    yPos += 6;
  });

  yPos += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Key Construction Phases:', 20, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  const phases = [
    `Phase 1 (Weeks 1-4): Site establishment, demolition, hoarding`,
    `Phase 2 (Weeks 5-12): Earthworks, foundations, substructure`,
    `Phase 3 (Weeks 13-28): Structural frame, roofing, facade`,
    `Phase 4 (Weeks 29-40): Services rough-in, internal fit-out`,
    `Phase 5 (Weeks 41-${tender.programWeeks}): Finishes, commissioning, handover`
  ];

  phases.forEach(phase => {
    doc.text('• ' + phase, 25, yPos);
    yPos += 7;
  });

  // ========== PROJECT PROGRAM ==========
  yPos += 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('5. PROJECT PROGRAM', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Project Duration: ${tender.programWeeks} weeks`, 20, yPos);
  yPos += 8;

  // Simple Gantt-style table
  const programData = [
    ['Activity', 'Duration', 'Start Week', 'End Week'],
    ['Site Establishment', '4 weeks', 'Week 1', 'Week 4'],
    ['Demolition & Earthworks', '8 weeks', 'Week 3', 'Week 10'],
    ['Foundations', '6 weeks', 'Week 8', 'Week 13'],
    ['Structural Frame', '12 weeks', 'Week 12', 'Week 23'],
    ['Roofing', '4 weeks', 'Week 22', 'Week 25'],
    ['Facade', '10 weeks', 'Week 20', 'Week 29'],
    ['Services Rough-in', '12 weeks', 'Week 24', 'Week 35'],
    ['Internal Fit-out', '14 weeks', 'Week 28', 'Week 41'],
    ['Finishes', '8 weeks', 'Week 38', `Week ${tender.programWeeks - 2}`],
    ['Commissioning', '4 weeks', `Week ${tender.programWeeks - 4}`, `Week ${tender.programWeeks}`]
  ];

  autoTable(doc, {
    startY: yPos,
    head: [programData[0]],
    body: programData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [0, 51, 102], textColor: 255 },
    styles: { fontSize: 9 }
  });

  // ========== KEY PERSONNEL ==========
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('6. KEY PERSONNEL', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('The following key personnel are proposed for this project:', 20, yPos);
  yPos += 10;

  const personnelData = [
    ['Name', 'Role', 'Experience', 'Qualifications'],
    ...tender.keyPersonnel.map(p => [p.name, p.role, p.experience, p.qualifications])
  ];

  autoTable(doc, {
    startY: yPos,
    head: [personnelData[0]],
    body: personnelData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [0, 51, 102], textColor: 255 },
    styles: { fontSize: 9 }
  });

  // ========== RELEVANT EXPERIENCE ==========
  yPos = doc.lastAutoTable.finalY + 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('7. RELEVANT EXPERIENCE', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Recent comparable projects completed by our company:', 20, yPos);
  yPos += 10;

  const experienceData = [
    ['Project Name', 'Value', 'Year', 'Client'],
    ...tender.experience.map(e => [e.project, e.value, e.year, e.client])
  ];

  autoTable(doc, {
    startY: yPos,
    head: [experienceData[0]],
    body: experienceData.slice(1),
    theme: 'grid',
    headStyles: { fillColor: [0, 51, 102], textColor: 255 },
    styles: { fontSize: 9 }
  });

  // ========== HEALTH & SAFETY ==========
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('8. HEALTH & SAFETY', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const safetyText = [
    `${tender.company.name} is committed to maintaining the highest standards of`,
    'workplace health and safety. Our safety management system is certified to',
    `${tender.safetyRecord.certifications}.`,
    '',
    'Safety Performance Statistics (12 months rolling):',
    `• Lost Time Injury Frequency Rate (LTIFR): ${tender.safetyRecord.ltifr}`,
    `• Total Recordable Injury Frequency Rate (TRIFR): ${tender.safetyRecord.trifr}`,
    '',
    'Our safety approach includes:',
    '• Daily pre-start meetings and toolbox talks',
    '• Site-specific Safety Management Plan',
    '• Regular safety audits and inspections',
    '• Comprehensive induction for all personnel',
    '• Proactive hazard identification and risk assessment'
  ];

  safetyText.forEach(line => {
    if (line === '') {
      yPos += 4;
    } else {
      doc.text(line, 20, yPos);
      yPos += 7;
    }
  });

  // ========== INSURANCE & COMPLIANCE ==========
  yPos += 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('9. INSURANCE & COMPLIANCE', 20, yPos);
  yPos += 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const insuranceText = [
    'Insurance Coverage:',
    `• Public Liability: ${tender.insurance.publicLiability}`,
    `• Professional Indemnity: ${tender.insurance.professionalIndemnity}`,
    `• Workers Compensation: ${tender.insurance.workersComp}`,
    '',
    'Certificates of Currency are available upon request.',
    '',
    'Licenses & Accreditations:',
    '• NSW Building Contractor License',
    '• Federal Safety Accreditation',
    `• ${tender.safetyRecord.certifications}`
  ];

  insuranceText.forEach(line => {
    if (line === '') {
      yPos += 4;
    } else {
      doc.text(line, 20, yPos);
      yPos += 7;
    }
  });

  // ========== DECLARATIONS ==========
  doc.addPage();
  yPos = 20;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('10. DECLARATIONS', 20, yPos);
  yPos += 15;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  const declarations = [
    'We, the undersigned, hereby declare that:',
    '',
    '1. This tender is submitted in accordance with the tender documents and conditions.',
    '',
    '2. All information provided in this submission is true and accurate to the best of',
    '   our knowledge.',
    '',
    '3. We have examined the tender documents, site, and all other relevant information',
    '   and have allowed for all work required.',
    '',
    '4. This tender shall remain valid for a period of 90 days from the closing date.',
    '',
    '5. We confirm we have no conflicts of interest in relation to this tender.',
    '',
    '6. We acknowledge receipt of all addenda issued (if any).',
    '',
    '',
    'Signed for and on behalf of ' + tender.company.name + ':',
    '',
    '',
    '________________________________',
    'Signature',
    '',
    `Name: ${tender.contact.name}`,
    `Position: ${tender.contact.position}`,
    `Date: ${new Date().toLocaleDateString('en-AU')}`
  ];

  declarations.forEach(line => {
    if (line === '') {
      yPos += 4;
    } else {
      doc.text(line, 20, yPos);
      yPos += 7;
    }
  });

  // Save the PDF
  const filename = `Tender_${index + 1}_${tender.company.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  const filepath = path.join(outputDir, filename);

  const pdfOutput = doc.output('arraybuffer');
  fs.writeFileSync(filepath, Buffer.from(pdfOutput));

  console.log(`Generated: ${filename}`);
  console.log(`  Company: ${tender.company.name}`);
  console.log(`  Total Price: ${formatCurrency(totalPrice)} (excl. GST)`);
  console.log(`  Program: ${tender.programWeeks} weeks`);
  console.log('');

  return { filename, filepath, totalPrice };
}

// Generate all tenders
console.log('Generating Sample Tender Submissions...');
console.log('=====================================\n');

const results = tenderData.map((tender, index) => generateTenderPDF(tender, index));

console.log('=====================================');
console.log('Summary:');
results.forEach((r, i) => {
  console.log(`  Tender ${i + 1}: ${formatCurrency(r.totalPrice)}`);
});
console.log(`\nFiles saved to: ${outputDir}`);
