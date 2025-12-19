const { jsPDF } = require('jspdf');
const autoTable = require('jspdf-autotable').default;
const fs = require('fs');
const path = require('path');

// Configuration for all service variations
const firms = [
  {
    name: 'Bates Smart',
    discipline: 'Architect',
    abn: '98 765 432 109',
    contactPerson: 'David Morrison',
    contactTitle: 'Project Director',
    contactEmail: 'd.morrison@batessmart.com.au',
    contactPhone: '+61 2 8354 5100',
  },
  {
    name: 'Arup Engineers',
    discipline: 'Structural',
    abn: '18 000 966 165',
    contactPerson: 'Sophie Williams',
    contactTitle: 'Project Leader',
    contactEmail: 's.williams@arup.com',
    contactPhone: '+61 2 9320 9320',
  },
  {
    name: 'Norman Disney & Young',
    discipline: 'Mechanical',
    abn: '29 003 874 468',
    contactPerson: 'James Chen',
    contactTitle: 'Senior Engineer',
    contactEmail: 'j.chen@ndy.com',
    contactPhone: '+61 2 9928 6800',
  },
];

// Project context
const project = {
  name: 'Greenfield Commercial Tower',
  code: 'PRJ-2024-0892',
  client: 'Greenfield Developments Pty Ltd',
  address: '100 George Street, Sydney NSW 2000',
};

// Different variation scenarios for each firm
const variationScenarios = [
  // Variation Set 1 - Design Changes
  [
    {
      varNum: 'VAR-001',
      title: 'Additional Heritage Facade Documentation',
      date: '15/01/2026',
      category: 'Design Change',
      description: 'Additional architectural documentation required for heritage facade integration following NSW Heritage Council feedback. Includes detailed facade retention drawings, heritage impact statement updates, and coordination with heritage consultant.',
      reason: 'NSW Heritage Council review identified additional documentation requirements not included in original scope. Heritage overlay zone requires detailed facade retention strategy and sympathetic design response.',
      scopeItems: [
        { item: 'Heritage facade retention drawings (1:50 scale)', hours: 120, rate: 185 },
        { item: 'Heritage impact statement revision', hours: 40, rate: 195 },
        { item: 'Heritage consultant coordination meetings (8 sessions)', hours: 32, rate: 210 },
        { item: 'Council submission preparation', hours: 24, rate: 185 },
      ],
      timeImpact: '4 weeks extension to Design Development phase',
      originalFee: 2720000,
    },
    {
      varNum: 'VAR-002',
      title: 'Basement Redesign - Groundwater Management',
      date: '28/02/2026',
      category: 'Site Condition',
      description: 'Redesign of basement levels B2 and B3 due to higher than anticipated groundwater levels identified in geotechnical investigation. Requires tanked basement design and revised structural coordination.',
      reason: 'Geotechnical report dated 15/02/2026 identified groundwater at RL -8.5m (previously assumed RL -12.0m). Design requires waterproofing membrane system and sump pump infrastructure.',
      scopeItems: [
        { item: 'Basement redesign documentation', hours: 160, rate: 185 },
        { item: 'Waterproofing specification development', hours: 48, rate: 195 },
        { item: 'Services coordination revision', hours: 64, rate: 175 },
        { item: 'Structural engineer coordination', hours: 40, rate: 210 },
      ],
      timeImpact: '6 weeks extension to Construction Documentation phase',
      originalFee: 2720000,
    },
    {
      varNum: 'VAR-003',
      title: 'Tenant Fitout Guidelines & Base Building Upgrade',
      date: '12/04/2026',
      category: 'Client Request',
      description: 'Development of comprehensive tenant fitout guidelines and upgrade of base building specifications to Premium grade following pre-commitment discussions with anchor tenant.',
      reason: 'Client request following negotiations with major tenant (GlobalTech Pty Ltd) requiring Premium grade specifications and detailed fitout coordination documentation.',
      scopeItems: [
        { item: 'Tenant fitout guidelines document (80 pages)', hours: 200, rate: 175 },
        { item: 'Base building specification upgrade review', hours: 80, rate: 195 },
        { item: 'Typical floor plan variations (3 options)', hours: 96, rate: 185 },
        { item: 'Tenant coordination meetings (12 sessions)', hours: 48, rate: 210 },
      ],
      timeImpact: '3 weeks additional duration, can run parallel to CD phase',
      originalFee: 2720000,
    },
  ],
  // Variation Set 2 - Structural
  [
    {
      varNum: 'VAR-001',
      title: 'Post-Tensioned Slab Design Revision',
      date: '20/01/2026',
      category: 'Design Optimisation',
      description: 'Revision of floor plate structural design from conventional reinforced concrete to post-tensioned system following value engineering workshop. Requires complete redesign of typical floor structure.',
      reason: 'Value engineering workshop identified potential $2.8M construction cost saving through post-tensioned design. Client approved design change instruction dated 18/01/2026.',
      scopeItems: [
        { item: 'Post-tensioned slab design (Levels 1-42)', hours: 280, rate: 195 },
        { item: 'Tendon layout drawings', hours: 120, rate: 175 },
        { item: 'Construction sequence documentation', hours: 64, rate: 185 },
        { item: 'Specialist PT consultant coordination', hours: 48, rate: 210 },
      ],
      timeImpact: '5 weeks extension to Design Development phase',
      originalFee: 1950000,
    },
    {
      varNum: 'VAR-002',
      title: 'Seismic Assessment - Updated AS1170.4',
      date: '05/03/2026',
      category: 'Regulatory Change',
      description: 'Updated seismic analysis and design modifications following release of amended AS1170.4-2026. Requires reassessment of lateral load resisting system and connection details.',
      reason: 'Australian Standards amendment AS1170.4-2026 released 01/03/2026 with transitional provisions requiring compliance for projects not yet in construction phase.',
      scopeItems: [
        { item: 'Seismic analysis model update', hours: 96, rate: 195 },
        { item: 'Core wall design revision', hours: 160, rate: 185 },
        { item: 'Connection detail modifications', hours: 80, rate: 175 },
        { item: 'Peer review coordination', hours: 32, rate: 220 },
      ],
      timeImpact: '4 weeks extension to Construction Documentation phase',
      originalFee: 1950000,
    },
    {
      varNum: 'VAR-003',
      title: 'Rooftop Plant Room Structure Addition',
      date: '22/04/2026',
      category: 'Scope Addition',
      description: 'Design of additional rooftop plant room structure to accommodate expanded mechanical services. Steel framed enclosure with acoustic treatment support structure.',
      reason: 'Mechanical services design development identified requirement for additional cooling capacity. Plant room area increased from 180m² to 340m² per mechanical engineer instruction.',
      scopeItems: [
        { item: 'Plant room structural design', hours: 80, rate: 185 },
        { item: 'Equipment plinth and support design', hours: 48, rate: 175 },
        { item: 'Vibration isolation details', hours: 32, rate: 195 },
        { item: 'Crane lifting analysis', hours: 24, rate: 210 },
      ],
      timeImpact: '2 weeks, can be incorporated within current CD phase',
      originalFee: 1950000,
    },
  ],
  // Variation Set 3 - Mechanical
  [
    {
      varNum: 'VAR-001',
      title: 'Chilled Beam System Design Change',
      date: '18/01/2026',
      category: 'Design Change',
      description: 'Change from VAV air conditioning system to active chilled beam system following sustainability review. Complete redesign of HVAC distribution and central plant.',
      reason: 'Sustainability consultant review identified chilled beam system as optimal solution for 6 Star Green Star target. Client approved design change following life cycle cost analysis.',
      scopeItems: [
        { item: 'Chilled beam system design', hours: 200, rate: 175 },
        { item: 'Central plant redesign', hours: 120, rate: 185 },
        { item: 'Controls strategy revision', hours: 80, rate: 195 },
        { item: 'Energy modelling update', hours: 48, rate: 165 },
      ],
      timeImpact: '6 weeks extension to Design Development phase',
      originalFee: 1650000,
    },
    {
      varNum: 'VAR-002',
      title: 'Smoke Control System Enhancement',
      date: '10/03/2026',
      category: 'Regulatory Compliance',
      description: 'Enhanced smoke control system design following Fire Engineering report recommendations. Additional smoke exhaust capacity and pressurisation system modifications.',
      reason: 'Fire Engineering peer review (dated 05/03/2026) identified enhanced smoke control requirements for atrium spaces exceeding 20m height.',
      scopeItems: [
        { item: 'Smoke exhaust system redesign', hours: 96, rate: 175 },
        { item: 'Stair pressurisation upgrade', hours: 64, rate: 185 },
        { item: 'CFD modelling coordination', hours: 40, rate: 195 },
        { item: 'Fire engineer liaison', hours: 32, rate: 175 },
      ],
      timeImpact: '3 weeks extension to Construction Documentation phase',
      originalFee: 1650000,
    },
    {
      varNum: 'VAR-003',
      title: 'Data Centre Cooling Infrastructure',
      date: '25/04/2026',
      category: 'Client Request',
      description: 'Design of dedicated cooling infrastructure for Level 12 data centre tenancy. Includes precision cooling, redundant systems, and backup power coordination.',
      reason: 'Anchor tenant (GlobalTech Pty Ltd) lease agreement requires Tier III data centre capable space on Level 12 with 500kW IT load capacity.',
      scopeItems: [
        { item: 'Precision cooling system design', hours: 120, rate: 185 },
        { item: 'Redundancy and failover design', hours: 80, rate: 195 },
        { item: 'UPS room ventilation', hours: 40, rate: 175 },
        { item: 'Electrical engineer coordination', hours: 48, rate: 175 },
      ],
      timeImpact: '4 weeks, Level 12 documentation to be prioritised',
      originalFee: 1650000,
    },
  ],
];

function formatCurrency(amount) {
  return '$' + amount.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function generateVariationPDF(firm, scenario, firmIndex) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;

  // Calculate totals
  const variationAmount = scenario.scopeItems.reduce((sum, item) => sum + (item.hours * item.rate), 0);
  const totalHours = scenario.scopeItems.reduce((sum, item) => sum + item.hours, 0);
  const revisedTotal = scenario.originalFee + variationAmount;

  // Helper function for line drawing
  const drawLine = (y) => {
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
  };

  // ===== HEADER =====
  doc.setFillColor(41, 65, 114);
  doc.rect(0, 0, pageWidth, 35, 'F');

  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.setFont(undefined, 'bold');
  doc.text('SERVICES VARIATION REQUEST', pageWidth / 2, 15, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text(`${firm.name} | ${firm.discipline} Services`, pageWidth / 2, 25, { align: 'center' });

  doc.setTextColor(0);

  let y = 45;

  // ===== VARIATION DETAILS BOX =====
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, pageWidth - 2 * margin, 32, 'F');
  doc.setDrawColor(200);
  doc.rect(margin, y, pageWidth - 2 * margin, 32, 'S');

  doc.setFontSize(9);
  doc.setFont(undefined, 'bold');
  doc.text('Variation No:', margin + 5, y + 8);
  doc.text('Date:', margin + 70, y + 8);
  doc.text('Category:', margin + 120, y + 8);

  doc.setFont(undefined, 'normal');
  doc.text(scenario.varNum, margin + 5, y + 15);
  doc.text(scenario.date, margin + 70, y + 15);
  doc.text(scenario.category, margin + 120, y + 15);

  doc.setFont(undefined, 'bold');
  doc.text('Project:', margin + 5, y + 23);
  doc.text('Contract Ref:', margin + 70, y + 23);

  doc.setFont(undefined, 'normal');
  doc.text(project.name, margin + 5, y + 30);
  doc.text(project.code, margin + 70, y + 30);

  y += 42;

  // ===== VARIATION TITLE =====
  doc.setFontSize(12);
  doc.setFont(undefined, 'bold');
  doc.text('Variation Title:', margin, y);
  y += 6;

  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text(scenario.title, margin, y);
  y += 12;

  drawLine(y);
  y += 8;

  // ===== DESCRIPTION =====
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('1. Description of Additional Services', margin, y);
  y += 7;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  const descLines = doc.splitTextToSize(scenario.description, pageWidth - 2 * margin);
  doc.text(descLines, margin, y);
  y += descLines.length * 4.5 + 8;

  // ===== REASON/JUSTIFICATION =====
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('2. Reason / Justification', margin, y);
  y += 7;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  const reasonLines = doc.splitTextToSize(scenario.reason, pageWidth - 2 * margin);
  doc.text(reasonLines, margin, y);
  y += reasonLines.length * 4.5 + 8;

  // ===== FEE BREAKDOWN =====
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('3. Fee Breakdown', margin, y);
  y += 8;

  const feeData = scenario.scopeItems.map(item => [
    item.item,
    item.hours.toString(),
    formatCurrency(item.rate),
    formatCurrency(item.hours * item.rate),
  ]);

  // Add totals row
  feeData.push([
    { content: 'VARIATION TOTAL', styles: { fontStyle: 'bold' } },
    { content: totalHours.toString(), styles: { fontStyle: 'bold' } },
    '',
    { content: formatCurrency(variationAmount), styles: { fontStyle: 'bold' } },
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Scope Item', 'Hours', 'Rate/Hr', 'Amount']],
    body: feeData,
    theme: 'grid',
    headStyles: { fillColor: [41, 65, 114], textColor: 255, fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 35, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ===== FEE SUMMARY BOX =====
  doc.setFillColor(240, 248, 255);
  doc.rect(margin, y, pageWidth - 2 * margin, 28, 'F');
  doc.setDrawColor(41, 65, 114);
  doc.rect(margin, y, pageWidth - 2 * margin, 28, 'S');

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');
  doc.text('Original Contract Sum:', margin + 5, y + 8);
  doc.text(formatCurrency(scenario.originalFee), margin + 95, y + 8, { align: 'right' });

  doc.text('This Variation:', margin + 5, y + 16);
  doc.text(formatCurrency(variationAmount), margin + 95, y + 16, { align: 'right' });

  doc.setFont(undefined, 'bold');
  doc.text('Revised Contract Sum:', margin + 5, y + 24);
  doc.text(formatCurrency(revisedTotal), margin + 95, y + 24, { align: 'right' });

  // GST note
  doc.setFont(undefined, 'italic');
  doc.setFontSize(8);
  doc.text('All amounts exclude GST', margin + 110, y + 16);

  y += 38;

  // ===== TIME IMPACT =====
  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('4. Programme Impact', margin, y);
  y += 7;

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.text(scenario.timeImpact, margin, y);
  y += 15;

  // ===== APPROVAL SECTION =====
  drawLine(y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont(undefined, 'bold');
  doc.text('5. Approval', margin, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont(undefined, 'normal');

  // Submitted by
  doc.text('Submitted by:', margin, y);
  doc.text('Approved by:', margin + 90, y);
  y += 20;

  doc.line(margin, y, margin + 70, y);
  doc.line(margin + 90, y, margin + 160, y);
  y += 5;

  doc.text(firm.contactPerson, margin, y);
  doc.text('____________________', margin + 90, y);
  y += 5;

  doc.text(firm.contactTitle, margin, y);
  doc.text('Client Representative', margin + 90, y);
  y += 5;

  doc.text(firm.name, margin, y);
  doc.text(project.client, margin + 90, y);
  y += 8;

  doc.text(`Date: ${scenario.date}`, margin, y);
  doc.text('Date: ___ / ___ / ______', margin + 90, y);

  // ===== FOOTER =====
  doc.setFontSize(7);
  doc.setTextColor(128);
  doc.text(`${project.code} | ${scenario.varNum} | ${firm.name}`, margin, pageHeight - 10);
  doc.text('CONFIDENTIAL', pageWidth / 2, pageHeight - 10, { align: 'center' });
  doc.text(`ABN: ${firm.abn}`, pageWidth - margin, pageHeight - 10, { align: 'right' });

  return { doc, variationAmount, revisedTotal };
}

// Generate all 9 PDFs
const outputDir = __dirname;

console.log('Generating 9 Services Variation PDFs...\n');

firms.forEach((firm, firmIndex) => {
  const scenarios = variationScenarios[firmIndex];

  scenarios.forEach((scenario, scenarioIndex) => {
    const filename = `Variation-${firm.discipline}-${firm.name.replace(/\s+/g, '-').replace(/&/g, 'and')}-${scenario.varNum}.pdf`;
    const filepath = path.join(outputDir, filename);

    const { doc, variationAmount, revisedTotal } = generateVariationPDF(firm, scenario, firmIndex);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filepath, pdfBuffer);

    console.log(`Created: ${filename}`);
    console.log(`  Title: ${scenario.title}`);
    console.log(`  Category: ${scenario.category}`);
    console.log(`  Variation Amount: ${formatCurrency(variationAmount)}`);
    console.log(`  Revised Total: ${formatCurrency(revisedTotal)}\n`);
  });
});

console.log('All 9 Services Variation PDFs generated successfully!');
