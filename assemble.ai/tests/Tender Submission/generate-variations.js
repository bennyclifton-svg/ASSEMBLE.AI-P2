const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;
const fs = require('fs');
const path = require('path');

// Configuration for all variations
const firms = [
  {
    name: 'Bates Smart',
    discipline: 'Architect',
    disciplineDesc: 'architect',
    abn: '98 765 432 109',
    baseFee: 2720000,
    feeMultipliers: [0.85, 1.0, 1.15], // Low, mid, high fee variations
  },
  {
    name: 'Arup Engineers',
    discipline: 'Structural',
    disciplineDesc: 'structural',
    abn: '18 000 966 165',
    baseFee: 1950000,
    feeMultipliers: [0.9, 1.05, 1.2],
  },
  {
    name: 'Norman Disney & Young',
    discipline: 'Mechanical',
    disciplineDesc: 'mechanical',
    abn: '29 003 874 468',
    baseFee: 1650000,
    feeMultipliers: [0.88, 1.02, 1.18],
  },
];

const projects = [
  {
    name: 'Riverside Plaza Development',
    code: 'PRJ-2024-1105',
    shortName: 'Riverside',
  },
  {
    name: 'Metro Central Tower',
    code: 'PRJ-2024-1203',
    shortName: 'Metro',
  },
  {
    name: 'Harbour View Complex',
    code: 'PRJ-2025-0042',
    shortName: 'Harbour',
  },
];

// Team variations for each project
const teams = [
  [
    { role: 'Project Director', name: 'Andrew Mitchell', exp: '28 years', alloc: '20%' },
    { role: 'Project Leader', name: 'Rebecca Chen', exp: '15 years', alloc: '45%' },
    { role: 'Senior Designer', name: 'Thomas Wright', exp: '10 years', alloc: '65%' },
    { role: 'Designer', name: 'Sarah Johnson', exp: '5 years', alloc: '85%' },
    { role: 'Graduate', name: 'Daniel Kim', exp: '1 year', alloc: '100%' },
    { role: 'BIM Manager', name: 'Lisa Park', exp: '8 years', alloc: '25%' },
  ],
  [
    { role: 'Project Director', name: 'Jennifer Walsh', exp: '22 years', alloc: '15%' },
    { role: 'Project Leader', name: 'Marcus Thompson', exp: '16 years', alloc: '50%' },
    { role: 'Senior Designer', name: 'Angela Russo', exp: '14 years', alloc: '55%' },
    { role: 'Designer', name: 'Kevin O\'Brien', exp: '7 years', alloc: '75%' },
    { role: 'Graduate', name: 'Priya Sharma', exp: '2 years', alloc: '100%' },
    { role: 'BIM Manager', name: 'Chris Wong', exp: '12 years', alloc: '35%' },
  ],
  [
    { role: 'Project Director', name: 'Robert Harrison', exp: '30 years', alloc: '10%' },
    { role: 'Project Leader', name: 'Michelle Davis', exp: '20 years', alloc: '40%' },
    { role: 'Senior Designer', name: 'Steven Nguyen', exp: '11 years', alloc: '70%' },
    { role: 'Designer', name: 'Emma Collins', exp: '4 years', alloc: '90%' },
    { role: 'Graduate', name: 'Jack Peterson', exp: '1 year', alloc: '100%' },
    { role: 'BIM Manager', name: 'Nicole Taylor', exp: '9 years', alloc: '30%' },
  ],
];

// Experience variations for each project
const experiences = [
  [
    { project: 'Martin Place Tower', location: 'Sydney CBD', scale: '48 levels', value: '$310M', completion: '2020' },
    { project: 'Circular Quay North', location: 'Sydney CBD', scale: '42 levels', value: '$195M', completion: '2021' },
    { project: 'Olympic Park Central', location: 'Sydney Olympic Park', scale: '32 levels', value: '$135M', completion: '2022' },
    { project: 'Macquarie Centre Tower', location: 'North Ryde', scale: '25 levels', value: '$88M', completion: '2023' },
  ],
  [
    { project: 'Queen Street Plaza', location: 'Brisbane CBD', scale: '55 levels', value: '$340M', completion: '2019' },
    { project: 'Collins Street Premium', location: 'Melbourne CBD', scale: '40 levels', value: '$225M', completion: '2020' },
    { project: 'Adelaide Central', location: 'Adelaide CBD', scale: '30 levels', value: '$110M', completion: '2021' },
    { project: 'Perth City Gateway', location: 'Perth CBD', scale: '36 levels', value: '$155M', completion: '2023' },
  ],
  [
    { project: 'Southbank Tower', location: 'Melbourne Southbank', scale: '58 levels', value: '$385M', completion: '2018' },
    { project: 'Darling Harbour West', location: 'Sydney CBD', scale: '44 levels', value: '$245M', completion: '2020' },
    { project: 'Surfers Paradise Elite', location: 'Gold Coast', scale: '65 levels', value: '$290M', completion: '2022' },
    { project: 'Canberra Civic Centre', location: 'Canberra', scale: '22 levels', value: '$95M', completion: '2023' },
  ],
];

const dates = ['10/12/2025', '11/12/2025', '12/12/2025'];

function formatCurrency(amount) {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generatePDF(firm, project, projectIndex) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const feeMultiplier = firm.feeMultipliers[projectIndex];
  const totalFee = Math.round(firm.baseFee * feeMultiplier);
  const team = teams[projectIndex];
  const experience = experiences[projectIndex];
  const date = dates[projectIndex];

  // Fee breakdown percentages (matching original)
  const feeBreakdown = {
    'Schematic Design': 0.15,
    'Design Development': 0.25,
    'Construction Documentation': 0.35,
    'Tender & Procurement': 0.05,
    'Construction Administration': 0.15,
    'Post-Completion': 0.05,
  };

  // Helper function for footer
  const addFooter = (pageNum, totalPages) => {
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`${project.code} - CONFIDENTIAL`, margin, pageHeight - 10);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text(date, pageWidth - margin, pageHeight - 10, { align: 'right' });
    doc.setTextColor(0);
  };

  // ===== PAGE 1: Cover Page =====
  doc.setFontSize(32);
  doc.setFont(undefined, 'bold');
  doc.text('TENDER SUBMISSION', pageWidth / 2, 60, { align: 'center' });

  doc.setFontSize(20);
  doc.text(project.name, pageWidth / 2, 90, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont(undefined, 'normal');
  doc.text(`${firm.discipline} Services`, pageWidth / 2, 105, { align: 'center' });

  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text(firm.name, pageWidth / 2, 140, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(`ABN: ${firm.abn}`, pageWidth / 2, 155, { align: 'center' });
  doc.text(`Submitted: ${date}`, pageWidth / 2, 165, { align: 'center' });

  addFooter(1, 5);

  // ===== PAGE 2: Executive Summary & Company Profile =====
  doc.addPage();
  let y = 25;

  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('EXECUTIVE SUMMARY', margin, y);
  y += 12;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const execSummary = `${firm.name} is pleased to submit this tender for ${firm.discipline} services for the ${project.name} development. Our firm brings extensive experience in commercial high-rise projects and a proven track record of delivering complex projects on time and within budget.

We have assembled a dedicated project team with specific experience in Grade A commercial towers, sustainable design, and projects of similar scale and complexity. Our proposed fee of ${formatCurrency(totalFee)} represents excellent value considering our experience, capability, and commitment to quality outcomes.`;

  const splitExec = doc.splitTextToSize(execSummary, pageWidth - 2 * margin);
  doc.text(splitExec, margin, y);
  y += splitExec.length * 5 + 8;

  doc.setFont(undefined, 'bold');
  doc.text('Key Differentiators:', margin, y);
  y += 6;

  doc.setFont(undefined, 'normal');
  const differentiators = [
    'Dedicated project director with 20+ years commercial tower experience',
    'In-house sustainability specialists targeting 6 Star Green Star',
    'Local Sydney team with no interstate resourcing required',
    'Proven collaboration tools and document management systems',
    'Strong existing relationships with likely contractors',
  ];
  differentiators.forEach(diff => {
    doc.text(`• ${diff}`, margin, y);
    y += 5;
  });

  y += 15;
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('1. COMPANY PROFILE', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const companyProfile = `${firm.name} is a leading ${firm.disciplineDesc} practice with offices across Australia and internationally. Founded over 50 years ago, we have grown to employ over 800 staff across 12 offices worldwide.

Our Sydney office, which will service this project, comprises 120 professionals including 45 registered practitioners. We have completed over $5 billion worth of commercial projects in Sydney CBD over the past decade.`;

  const splitProfile = doc.splitTextToSize(companyProfile, pageWidth - 2 * margin);
  doc.text(splitProfile, margin, y);
  y += splitProfile.length * 5 + 8;

  doc.text('Recent comparable projects include:', margin, y);
  y += 6;
  doc.text('• 200 George Street, Sydney (45 levels, $180M construction)', margin, y);
  y += 5;
  doc.text('• Barangaroo Tower 2 (38 levels, $220M construction)', margin, y);
  y += 5;
  doc.text('• Parramatta Square Building 5 (28 levels, $95M construction)', margin, y);

  addFooter(2, 5);

  // ===== PAGE 3: Fee Proposal =====
  doc.addPage();
  y = 25;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('2. FEE PROPOSAL', margin, y);
  y += 10;

  // Fee table
  const feeData = Object.entries(feeBreakdown).map(([phase, pct]) => [
    phase,
    formatCurrency(Math.round(totalFee * pct)),
  ]);
  feeData.push(['TOTAL LUMP SUM FEE', formatCurrency(totalFee)]);

  autoTable(doc, {
    startY: y,
    head: [['Phase', 'Fee (excl GST)']],
    body: feeData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 100 },
      1: { cellWidth: 50, halign: 'right' },
    },
    didParseCell: function(data) {
      if (data.row.index === feeData.length - 1) {
        data.cell.styles.fillColor = [66, 139, 202];
        data.cell.styles.textColor = 255;
        data.cell.styles.fontStyle = 'bold';
      }
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('2.1 Fee Basis and Assumptions', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Our fee is based on the following assumptions:', margin, y);
  y += 6;

  const assumptions = [
    'Project duration of 36 months from engagement to practical completion',
    'Design to proceed without significant scope changes after SD approval',
    'Client decisions within 10 business days of submissions',
    'Standard consultant agreement with reasonable liability caps',
    'No significant contamination or heritage constraints beyond brief',
  ];
  assumptions.forEach(item => {
    doc.text(`• ${item}`, margin, y);
    y += 5;
  });

  y += 8;
  doc.text('Exclusions from this fee:', margin, y);
  y += 6;

  const exclusions = [
    'Survey and geotechnical investigations',
    'DA fees and authority charges',
    'Physical models (rendered images included)',
    'Specialist sub-consultants not named herein',
    'Dispute resolution and expert witness services',
    'Services beyond 12 months defects liability period',
  ];
  exclusions.forEach(item => {
    doc.text(`• ${item}`, margin, y);
    y += 5;
  });

  addFooter(3, 5);

  // ===== PAGE 4: Project Team & Non-Price Criteria =====
  doc.addPage();
  y = 25;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('3. PROJECT TEAM', margin, y);
  y += 10;

  const teamData = team.map(member => [member.role, member.name, member.exp, member.alloc]);

  autoTable(doc, {
    startY: y,
    head: [['Role', 'Name', 'Experience', 'Allocation']],
    body: teamData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fontSize: 10 },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text('4. NON-PRICE CRITERIA', margin, y);
  y += 10;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('4.1 Methodology', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const methodology = `Our approach to this project emphasises early collaboration and integrated design thinking. We will establish a project-specific BIM Execution Plan that enables real-time coordination with all consultants and early identification of design conflicts.`;
  const splitMethod = doc.splitTextToSize(methodology, pageWidth - 2 * margin);
  doc.text(splitMethod, margin, y);
  y += splitMethod.length * 5 + 6;

  doc.text('Key methodological elements:', margin, y);
  y += 6;

  const methodElements = [
    'Fortnightly design workshops with full consultant team',
    'Monthly client presentations with 3D walkthrough models',
    'Clash detection at each design milestone',
    'Design freeze protocols with formal change management',
    'Value engineering reviews at SD and DD stages',
    'Sustainability scorecard tracking throughout design',
  ];
  methodElements.forEach(item => {
    doc.text(`• ${item}`, margin, y);
    y += 5;
  });

  addFooter(4, 5);

  // ===== PAGE 5: Experience, Sustainability & Risk =====
  doc.addPage();
  y = 25;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('4.2 Relevant Experience', margin, y);
  y += 8;

  const expData = experience.map(exp => [exp.project, exp.location, exp.scale, exp.value, exp.completion]);

  autoTable(doc, {
    startY: y,
    head: [['Project', 'Location', 'Scale', 'Value', 'Completion']],
    body: expData,
    theme: 'grid',
    headStyles: { fillColor: [66, 139, 202], textColor: 255, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 12;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('4.3 Sustainability Approach', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  const sustainability = `Our firm is a leader in sustainable design, having delivered 15 projects with 5+ Star NABERS ratings in the past 5 years. For this project, we propose:`;
  const splitSust = doc.splitTextToSize(sustainability, pageWidth - 2 * margin);
  doc.text(splitSust, margin, y);
  y += splitSust.length * 5 + 4;

  const sustElements = [
    'Dedicated ESD lead embedded in project team',
    'Early-stage energy modelling to inform design decisions',
    'Material selection database with embodied carbon tracking',
    'Circular economy principles for construction waste minimisation',
    'Tenant engagement strategy for operational performance',
    'Post-occupancy evaluation commitment',
  ];
  sustElements.forEach(item => {
    doc.text(`• ${item}`, margin, y);
    y += 5;
  });

  y += 4;
  doc.text('We are confident of achieving the 5.5 Star NABERS Energy and 6 Star Green Star targets specified in the brief.', margin, y, { maxWidth: pageWidth - 2 * margin });
  y += 14;

  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('4.4 Risk Management', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Key risks identified and our mitigation strategies:', margin, y);
  y += 8;

  const risks = [
    { title: 'Heritage facade retention', risk: 'Structural complexity and approval delays', mitigation: 'Early engagement with heritage consultant, precedent research' },
    { title: 'Ambitious sustainability targets', risk: 'Cost premium may exceed budget', mitigation: 'Integrated design approach, value engineering at each stage' },
    { title: 'Complex services coordination', risk: 'Ceiling void constraints', mitigation: 'Weekly BIM coordination, early contractor input' },
    { title: 'Market conditions', risk: 'Material cost escalation', mitigation: 'Early procurement advice, specification flexibility' },
  ];

  risks.forEach((item, idx) => {
    doc.setFont(undefined, 'bold');
    doc.text(`${idx + 1}. ${item.title}`, margin, y);
    y += 5;
    doc.setFont(undefined, 'normal');
    doc.text(`   Risk: ${item.risk}`, margin, y);
    y += 5;
    doc.text(`   Mitigation: ${item.mitigation}`, margin, y);
    y += 7;
  });

  addFooter(5, 5);

  return doc;
}

// Generate all 9 PDFs
const outputDir = __dirname;

console.log('Generating 9 tender submission variations...\n');

firms.forEach((firm, firmIndex) => {
  projects.forEach((project, projectIndex) => {
    const filename = `Tender-${firm.discipline}-${firm.name.replace(/\s+/g, '-').replace(/&/g, 'and')}-${project.shortName}.pdf`;
    const filepath = path.join(outputDir, filename);

    const doc = generatePDF(firm, project, projectIndex);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filepath, pdfBuffer);

    const totalFee = Math.round(firm.baseFee * firm.feeMultipliers[projectIndex]);
    console.log(`Created: ${filename}`);
    console.log(`  Project: ${project.name} (${project.code})`);
    console.log(`  Fee: ${formatCurrency(totalFee)}\n`);
  });
});

console.log('All 9 variations generated successfully!');
