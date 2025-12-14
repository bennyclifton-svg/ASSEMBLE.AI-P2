/**
 * Test Document Generator
 * Generates comprehensive test PDFs for the assemble.ai application
 */

const { jsPDF } = require('jspdf');
const autoTablePlugin = require('jspdf-autotable');
const fs = require('fs');
const path = require('path');

// Helper to use autoTable
function autoTable(doc, options) {
  return autoTablePlugin.default(doc, options);
}

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'test-documents');

// Project details for consistency
const PROJECT = {
  name: 'Greenfield Commercial Tower',
  address: '250 George Street, Sydney NSW 2000',
  client: 'Meridian Property Group Pty Ltd',
  clientABN: '45 123 456 789',
  projectNumber: 'PRJ-2024-0892',
  projectManager: 'Sarah Mitchell',
  value: '$145,000,000',
  gfa: '42,500 sqm',
  levels: '32 levels plus 4 basement levels',
  completion: 'Q4 2026',
};

// Consultant firms
const FIRMS = {
  Architect: {
    name: 'Woods Bagot Architecture',
    abn: '63 008 846 674',
    address: 'Level 5, 60 Miller Street, North Sydney NSW 2060',
    contact: 'James Richardson',
    email: 'j.richardson@woodsbagot.com',
    phone: '(02) 9956 7800',
    hourlyRate: 285,
    invoicePrefix: 'WBA',
  },
  Structural: {
    name: 'Arup Engineers',
    abn: '18 000 966 165',
    address: 'Level 10, 201 Kent Street, Sydney NSW 2000',
    contact: 'Dr. Michael Chen',
    email: 'm.chen@arup.com',
    phone: '(02) 9320 9320',
    hourlyRate: 295,
    invoicePrefix: 'ARP',
  },
  Mechanical: {
    name: 'Norman Disney & Young',
    abn: '29 003 874 468',
    address: 'Level 3, 77 Pacific Highway, North Sydney NSW 2060',
    contact: 'Emma Thompson',
    email: 'e.thompson@ndy.com',
    phone: '(02) 9922 6966',
    hourlyRate: 275,
    invoicePrefix: 'NDY',
  },
};

// Tenderer firms for submissions
const TENDERERS = {
  Architect: [
    { name: 'Woods Bagot Architecture', abn: '63 008 846 674', price: 2850000 },
    { name: 'Hassell Studios', abn: '12 345 678 901', price: 3150000 },
    { name: 'Bates Smart', abn: '98 765 432 109', price: 2720000 },
  ],
  Structural: [
    { name: 'Arup Engineers', abn: '18 000 966 165', price: 1950000 },
    { name: 'Robert Bird Group', abn: '34 567 890 123', price: 2100000 },
    { name: 'TTW Engineers', abn: '67 890 123 456', price: 1875000 },
  ],
  Mechanical: [
    { name: 'Norman Disney & Young', abn: '29 003 874 468', price: 1650000 },
    { name: 'Stantec (formerly Aurecon)', abn: '45 678 901 234', price: 1780000 },
    { name: 'WSP Australia', abn: '78 901 234 567', price: 1590000 },
  ],
};

// EOI companies
const EOI_COMPANIES = [
  { name: 'AECOM Australia', contact: 'David Park', email: 'd.park@aecom.com' },
  { name: 'GHD Pty Ltd', contact: 'Lisa Wang', email: 'l.wang@ghd.com' },
  { name: 'Jacobs Engineering', contact: 'Tom Bradley', email: 't.bradley@jacobs.com' },
];

// Utility functions
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function addHeader(doc, title, subtitle) {
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 20, 30);

  if (subtitle) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 20, 40);
  }

  // Add project reference
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Project: ${PROJECT.name}`, 20, 50);
  doc.text(`Reference: ${PROJECT.projectNumber}`, 20, 56);
  doc.setTextColor(0);

  return 65; // Return Y position after header
}

function addFooter(doc, pageNum, totalPages) {
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Page ${pageNum} of ${totalPages}`, 105, pageHeight - 10, { align: 'center' });
  doc.text(`${PROJECT.projectNumber} - CONFIDENTIAL`, 20, pageHeight - 10);
  doc.text(new Date().toLocaleDateString('en-AU'), 190, pageHeight - 10, { align: 'right' });
  doc.setTextColor(0);
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount);
}

// ============================================
// 1. PROJECT BRIEF
// ============================================
function generateProjectBrief() {
  const doc = new jsPDF();
  let y = addHeader(doc, 'PROJECT BRIEF', PROJECT.name);

  // Executive Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. EXECUTIVE SUMMARY', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const execSummary = `Meridian Property Group proposes the development of a premium Grade A commercial tower at 250 George Street, Sydney. The project encompasses the construction of a 32-level commercial tower with 4 basement levels, delivering approximately 42,500 sqm of net lettable area. The development aims to achieve a 5.5 Star NABERS Energy rating and a 6 Star Green Star Design & As Built certification, positioning it as a market-leading sustainable commercial asset in the Sydney CBD.`;
  const splitExec = doc.splitTextToSize(execSummary, 170);
  doc.text(splitExec, 20, y);
  y += splitExec.length * 5 + 10;

  // Project Details Table
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. PROJECT DETAILS', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Item', 'Details']],
    body: [
      ['Project Name', PROJECT.name],
      ['Site Address', PROJECT.address],
      ['Client', PROJECT.client],
      ['Client ABN', PROJECT.clientABN],
      ['Project Value', PROJECT.value],
      ['Gross Floor Area', PROJECT.gfa],
      ['Building Height', PROJECT.levels],
      ['Target Completion', PROJECT.completion],
      ['Project Manager', PROJECT.projectManager],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
  y = doc.lastAutoTable.finalY + 15;

  // Project Objectives
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. PROJECT OBJECTIVES', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const objectives = [
    '3.1 Deliver a premium Grade A commercial office building that achieves market-leading rental returns',
    '3.2 Achieve 5.5 Star NABERS Energy rating and 6 Star Green Star certification',
    '3.3 Create flexible floor plates suitable for a range of tenant configurations',
    '3.4 Provide state-of-the-art end-of-trip facilities and amenities',
    '3.5 Maximise natural light penetration while minimising solar heat gain',
    '3.6 Complete construction within the approved budget and timeline',
    '3.7 Minimise disruption to adjacent properties during construction',
  ];

  objectives.forEach((obj, i) => {
    const split = doc.splitTextToSize(obj, 170);
    doc.text(split, 20, y);
    y += split.length * 5 + 3;
  });
  y += 7;

  // Scope of Works
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('4. SCOPE OF WORKS', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const scope = `The scope encompasses full design development and construction documentation for all architectural, structural, mechanical, electrical, hydraulic, fire services, and facade elements. Key deliverables include:

• Demolition of existing 3-storey heritage building (facade retention required)
• Excavation of 4 basement levels for parking (320 spaces) and building services
• Construction of concrete core and post-tensioned floor slabs
• Installation of unitised curtain wall facade system
• Fit-out of ground floor lobby and retail tenancies
• Base building services installation to all floors
• Landscaping and public domain works
• End-of-trip facilities including 450 bicycle spaces`;

  const splitScope = doc.splitTextToSize(scope, 170);
  doc.text(splitScope, 20, y);
  y += splitScope.length * 5 + 10;

  // Add second page
  doc.addPage();
  y = 20;

  // Budget Summary
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('5. BUDGET SUMMARY', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Cost Element', 'Budget Allocation']],
    body: [
      ['Land Acquisition', '$35,000,000'],
      ['Demolition & Excavation', '$8,500,000'],
      ['Structure', '$28,000,000'],
      ['Facade', '$18,500,000'],
      ['Services (Mechanical, Electrical, Hydraulic)', '$22,000,000'],
      ['Vertical Transport', '$6,500,000'],
      ['Internal Finishes', '$12,000,000'],
      ['External Works & Landscaping', '$4,500,000'],
      ['Professional Fees', '$8,000,000'],
      ['Contingency (5%)', '$7,250,000'],
      ['TOTAL PROJECT BUDGET', '$145,000,000'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
  y = doc.lastAutoTable.finalY + 15;

  // Key Stakeholders
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('6. KEY STAKEHOLDERS', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Role', 'Organisation', 'Contact']],
    body: [
      ['Client', 'Meridian Property Group', 'Robert Williams (CEO)'],
      ['Project Manager', 'Turner & Townsend', 'Sarah Mitchell'],
      ['Architect', 'TBC via tender', '-'],
      ['Structural Engineer', 'TBC via tender', '-'],
      ['Services Engineer', 'TBC via tender', '-'],
      ['Cost Consultant', 'Rider Levett Bucknall', 'Andrew Thompson'],
      ['Planning Consultant', 'Urbis', 'Jennifer Chen'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
  y = doc.lastAutoTable.finalY + 15;

  // Program
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('7. INDICATIVE PROGRAM', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Phase', 'Duration', 'Target Dates']],
    body: [
      ['Design Development', '4 months', 'Jan 2024 - Apr 2024'],
      ['Documentation', '6 months', 'May 2024 - Oct 2024'],
      ['Tender & Award', '3 months', 'Nov 2024 - Jan 2025'],
      ['Construction', '18 months', 'Feb 2025 - Jul 2026'],
      ['Defects & Handover', '3 months', 'Aug 2026 - Oct 2026'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });

  // Add footers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  const filepath = path.join(OUTPUT_DIR, 'Project-Brief.pdf');
  doc.save(filepath);
  console.log(`Created: ${filepath}`);
}

// ============================================
// 2. PROJECT DESIGN BRIEF
// ============================================
function generateProjectDesignBrief() {
  const doc = new jsPDF();
  let y = addHeader(doc, 'PROJECT DESIGN BRIEF', PROJECT.name);

  // Design Vision
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. DESIGN VISION', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const vision = `The Greenfield Commercial Tower will establish a new benchmark for sustainable commercial architecture in Sydney's CBD. The design philosophy centres on creating a high-performance building envelope that maximises occupant comfort while minimising environmental impact. The tower will feature a distinctive crystalline form that responds to its urban context while optimising solar orientation and natural ventilation opportunities.

The building will seamlessly integrate the retained heritage facade of the existing building, creating a dialogue between Sydney's commercial heritage and its sustainable future. Ground floor activation will enliven the streetscape with retail and hospitality offerings, while upper levels will provide flexible, column-free floor plates suitable for a diverse tenant mix.`;

  const splitVision = doc.splitTextToSize(vision, 170);
  doc.text(splitVision, 20, y);
  y += splitVision.length * 5 + 10;

  // Architectural Requirements
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. ARCHITECTURAL REQUIREMENTS', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const archReqs = `2.1 Floor Plates
• Typical floor NLA: 1,250 sqm minimum
• Floor-to-floor height: 3.85m (offices), 4.5m (ground floor retail)
• Core-to-perimeter depth: Maximum 13.5m for natural light compliance
• Column-free spans: Minimum 12m clear spans required

2.2 Facade
• High-performance double-glazed curtain wall system
• Solar heat gain coefficient (SHGC): Maximum 0.35
• Visible light transmittance: Minimum 65%
• External shading elements to north and west facades

2.3 Lobby and Public Areas
• Double-height lobby with minimum 6m clear ceiling
• Premium finishes: natural stone, timber feature walls
• Integrated artwork programme budget: $500,000
• Wayfinding and signage strategy required`;

  const splitArch = doc.splitTextToSize(archReqs, 170);
  doc.text(splitArch, 20, y);
  y += splitArch.length * 5 + 10;

  // Structural Requirements
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. STRUCTURAL REQUIREMENTS', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const structReqs = `3.1 Foundation System
• Bored pile foundation to bedrock
• Secant pile basement walls with waterproofing membrane
• Design for future adjacent development (up to 40 levels)

3.2 Superstructure
• Reinforced concrete core with post-tensioned floor slabs
• Design live load: 3.0 kPa office, 5.0 kPa plant rooms
• Seismic design to AS 1170.4 Importance Level 3
• Progressive collapse resistance provisions required

3.3 Heritage Integration
• Retained facade to be structurally supported during construction
• New steel frame to support heritage facade permanently
• Movement joints to accommodate differential settlement`;

  const splitStruct = doc.splitTextToSize(structReqs, 170);
  doc.text(splitStruct, 20, y);

  // Second page
  doc.addPage();
  y = 20;

  // Mechanical Requirements
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('4. MECHANICAL SERVICES REQUIREMENTS', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const mechReqs = `4.1 HVAC System
• Variable Air Volume (VAV) system with dedicated outdoor air
• Chilled water plant: 4 x 1,200kW centrifugal chillers (N+1 redundancy)
• Cooling towers: 4 x induced draft units on rooftop plant room
• Air handling units: One per floor, located in central plant rooms
• Design conditions: 24°C ± 1°C, 50% RH ± 5%

4.2 Energy Performance
• 5.5 Star NABERS Energy rating target
• Variable speed drives on all major plant
• Economiser cycle for free cooling below 18°C ambient
• CO2-based demand-controlled ventilation
• Heat recovery from exhaust air streams

4.3 Plant Rooms
• Basement: Chilled water pumps, fire pumps, switchboards
• Rooftop: Cooling towers, exhaust fans, generator
• Floor plant rooms: AHUs, VAV controllers, metering panels

4.4 Controls
• Building Management System (BMS) with open protocol
• Sub-metering of all major energy end-uses
• Integration with access control and lighting systems
• Fault detection and diagnostics capability`;

  const splitMech = doc.splitTextToSize(mechReqs, 170);
  doc.text(splitMech, 20, y);
  y += splitMech.length * 5 + 15;

  // Sustainability Requirements
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('5. SUSTAINABILITY REQUIREMENTS', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Category', 'Target', 'Strategy']],
    body: [
      ['NABERS Energy', '5.5 Stars', 'High-efficiency plant, LED lighting, optimised facade'],
      ['NABERS Water', '4.5 Stars', 'Water-efficient fixtures, rainwater harvesting'],
      ['Green Star', '6 Star', 'Full Green Star Design & As Built certification'],
      ['Embodied Carbon', '20% reduction', 'Low-carbon concrete, recycled steel'],
      ['Operational Carbon', 'Net Zero by 2030', 'On-site solar, green power procurement'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [39, 174, 96] },
  });
  y = doc.lastAutoTable.finalY + 15;

  // End of Trip Facilities
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('6. END OF TRIP FACILITIES', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const eot = `• 450 secure bicycle parking spaces (vertical and horizontal racks)
• 45 showers with premium finishes (ratio 1:10)
• 450 personal lockers with electronic locks
• Towel service and amenities
• Bicycle maintenance station
• Electric bicycle charging points (50 minimum)
• Direct access to street level via dedicated lift`;

  const splitEot = doc.splitTextToSize(eot, 170);
  doc.text(splitEot, 20, y);

  // Third page - Appendices
  doc.addPage();
  y = 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('7. ROOM DATA SHEETS - TYPICAL OFFICE FLOOR', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Space', 'Area (sqm)', 'Ceiling Height', 'Finishes', 'Services']],
    body: [
      ['Open Plan Office', '1,050', '2.7m', 'Carpet tile, painted plasterboard', 'VAV, LED, data/power'],
      ['Meeting Room (Large)', '35', '2.7m', 'Carpet, acoustic panels', 'VAV, AV provisions'],
      ['Meeting Room (Small)', '15', '2.7m', 'Carpet, acoustic panels', 'VAV, AV provisions'],
      ['Kitchenette', '25', '2.7m', 'Vinyl, splashback tiles', 'Exhaust, hot water'],
      ['Amenities', '40', '2.7m', 'Ceramic tiles', 'Exhaust, HWS'],
      ['Plant Room', '35', '3.2m', 'Epoxy', 'Ventilation, drainage'],
      ['Lift Lobby', '30', '2.9m', 'Stone, feature ceiling', 'A/C, feature lighting'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 8 },
  });
  y = doc.lastAutoTable.finalY + 15;

  // Consultant scope matrix
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('8. CONSULTANT SCOPE MATRIX', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Discipline', 'Schematic', 'Design Dev', 'Documentation', 'Construction']],
    body: [
      ['Architect', 'Lead', 'Lead', 'Lead', 'Lead'],
      ['Structural', 'Contribute', 'Lead', 'Lead', 'Review'],
      ['Mechanical', 'Contribute', 'Lead', 'Lead', 'Review'],
      ['Electrical', 'Contribute', 'Lead', 'Lead', 'Review'],
      ['Hydraulic', 'Contribute', 'Lead', 'Lead', 'Review'],
      ['Facade', 'Contribute', 'Lead', 'Lead', 'Review'],
      ['Landscape', 'Contribute', 'Lead', 'Lead', 'Review'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });

  // Add footers
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages);
  }

  const filepath = path.join(OUTPUT_DIR, 'Project-Design-Brief.pdf');
  doc.save(filepath);
  console.log(`Created: ${filepath}`);
}

// ============================================
// 3. SCHEMATIC DESIGN DOCUMENTS
// ============================================
function generateSchematicDesignDocs() {
  const disciplines = {
    Architect: [
      { title: 'Ground Floor Plan', content: generateArchGroundFloor },
      { title: 'Typical Floor Plan', content: generateArchTypicalFloor },
      { title: 'Building Sections', content: generateArchSections },
      { title: 'Facade Studies', content: generateArchFacade },
      { title: 'Material Schedule', content: generateArchMaterials },
    ],
    Structural: [
      { title: 'Foundation Layout', content: generateStructFoundation },
      { title: 'Typical Floor Framing', content: generateStructFraming },
      { title: 'Core Wall Layout', content: generateStructCore },
      { title: 'Basement Retaining Walls', content: generateStructBasement },
      { title: 'Structural Design Criteria', content: generateStructCriteria },
    ],
    Mechanical: [
      { title: 'HVAC Schematic', content: generateMechHVAC },
      { title: 'Plant Room Layout', content: generateMechPlant },
      { title: 'Typical Floor Ductwork', content: generateMechDuct },
      { title: 'Controls Strategy', content: generateMechControls },
      { title: 'Energy Model Summary', content: generateMechEnergy },
    ],
  };

  Object.entries(disciplines).forEach(([discipline, docs]) => {
    const disciplineDir = path.join(OUTPUT_DIR, 'Schematic-Design', discipline);
    ensureDir(disciplineDir);

    docs.forEach((docInfo, index) => {
      const doc = new jsPDF();
      let y = addHeader(doc, `SCHEMATIC DESIGN`, `${discipline} - ${docInfo.title}`);

      // Document info
      doc.setFontSize(10);
      doc.text(`Discipline: ${discipline}`, 20, y);
      doc.text(`Document: SD-${discipline.substring(0,3).toUpperCase()}-${String(index + 1).padStart(3, '0')}`, 120, y);
      y += 6;
      doc.text(`Issue: For Review`, 20, y);
      doc.text(`Date: ${new Date().toLocaleDateString('en-AU')}`, 120, y);
      y += 10;

      // Generate specific content
      docInfo.content(doc, y);

      // Add footers
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i, totalPages);
      }

      const filename = `SD-${discipline.substring(0,3).toUpperCase()}-${String(index + 1).padStart(3, '0')}-${docInfo.title.replace(/\s+/g, '-')}.pdf`;
      const filepath = path.join(disciplineDir, filename);
      doc.save(filepath);
      console.log(`Created: ${filepath}`);
    });
  });
}

// Architect document generators
function generateArchGroundFloor(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. GROUND FLOOR PLANNING PRINCIPLES', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `The ground floor design establishes a permeable and activated street frontage along George Street while maintaining service access from the rear laneway. The double-height lobby creates a dramatic arrival experience with clear sightlines to the lift core.

Key Planning Elements:
• Main entry: 6m wide revolving door with adjacent accessible entry
• Lobby area: 280 sqm with 6.5m ceiling height
• Retail tenancy 1: 185 sqm with street frontage
• Retail tenancy 2: 145 sqm with street frontage
• Back of house: 95 sqm including loading dock access
• Heritage facade integration zone: 12m width preserved

The retained heritage facade elements will be incorporated as a feature wall within the lobby space, with interpretive signage explaining the site's history.`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. AREA SCHEDULE - GROUND FLOOR', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Space', 'GFA (sqm)', 'NLA (sqm)', 'Notes']],
    body: [
      ['Main Lobby', '280', '280', 'Including security desk'],
      ['Retail 1', '195', '185', 'Food & beverage preferred'],
      ['Retail 2', '155', '145', 'Convenience retail'],
      ['Lift Lobbies', '85', '-', 'Fire isolated'],
      ['Back of House', '95', '-', 'Loading, waste, services'],
      ['Amenities', '40', '-', 'Public toilets'],
      ['Plant', '65', '-', 'Switchroom, comms'],
      ['Circulation', '135', '-', 'Corridors, entries'],
      ['TOTAL', '1,050', '610', ''],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. DESIGN NOTES', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const notes = `• Floor finish: Honed granite with brass inlay at entry threshold
• Ceiling: Expressed structure with timber batten feature
• Lighting: Integrated cove lighting with pendant features at entry
• Glazing: Full height shopfront glazing to retail tenancies
• Security: Turnstiles to lift lobby, after-hours card access
• Wayfinding: Integrated building directory and digital signage
• Artwork: Location identified for commissioned sculpture (budget $150,000)`;

  const splitNotes = doc.splitTextToSize(notes, 170);
  doc.text(splitNotes, 20, y);
}

function generateArchTypicalFloor(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. TYPICAL FLOOR PLATE DESIGN', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `The typical floor plate is designed to maximise flexibility for tenant fit-out while achieving optimal daylighting and views. The centralised core minimises structural depth and allows for a variety of tenancy configurations.

Floor Plate Metrics:
• Gross Floor Area: 1,350 sqm
• Net Lettable Area: 1,250 sqm (92.5% efficiency)
• Core Area: 100 sqm
• Floor to Floor Height: 3.85m
• Clear Ceiling Height: 2.70m (minimum)
• Window Head Height: 2.85m
• Core to Perimeter: 10.5m - 13.2m

The floor plate can accommodate single tenancy, dual tenancy (north/south split), or quad tenancy configurations. Each configuration maintains compliant egress paths and amenity access.`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. TENANCY CONFIGURATIONS', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Configuration', 'Min NLA', 'Amenities', 'Fire Stairs']],
    body: [
      ['Single Tenant', '1,250 sqm', 'Shared core', '2 required'],
      ['Dual Tenancy (N/S)', '600 sqm each', 'Shared core', '2 required'],
      ['Quad Tenancy', '290 sqm each', 'Shared core', '2 required'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. BASE BUILDING PROVISIONS', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const provisions = `Base building provisions per floor:
• Power: 80W/sqm tenant load allowance
• Data: 2 x CAT6A outlets per 10 sqm (tenant reticulation)
• HVAC: VAV system with DDC controls, 15 l/s/person OA
• Lighting: 8W/sqm LED allowance (tenant fit-out)
• Fire: Sprinklers at 3.6m grid, smoke detection throughout
• Acoustic: STC 45 minimum to adjoining tenancies
• Raised floor: 150mm access floor zone provided
• Ceiling: Suspended ceiling grid at 2.7m AFC`;

  const splitProv = doc.splitTextToSize(provisions, 170);
  doc.text(splitProv, 20, y);
}

function generateArchSections(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. BUILDING SECTION - NORTH-SOUTH', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `The building section illustrates the vertical organisation of the tower, demonstrating the relationship between basement car parking, ground floor activation, commercial floors, and rooftop plant.

Vertical Organisation:
B4 (-14.0m): Basement parking Level 4 (80 spaces)
B3 (-10.5m): Basement parking Level 3 (80 spaces)
B2 (-7.0m): Basement parking Level 2 (80 spaces)
B1 (-3.5m): Basement parking Level 1 (80 spaces) + loading dock
GF (0.0m): Lobby and retail (4.5m F-F)
L01-L30 (+4.5m to +119.0m): Commercial floors (3.85m F-F)
L31 (+122.85m): Rooftop plant room
Roof (+126.35m): Cooling towers and services

Total Building Height: 126.35m (RL 132.85 AHD)
Excluding plant screening: 130.5m`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. KEY SECTION FEATURES', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const features = `• Double-height lobby with feature ceiling and expressed structure
• Heritage facade retention at ground and first floor levels
• Expressed structural transfer at Level 5 (setback change)
• Sky lobby at Level 20 with tenant amenity space
• Plant rooms located at B1, L15, and L31 to minimise riser lengths
• Facade articulation with horizontal sunshading at 5-level intervals
• Green wall feature to south elevation at ground level
• Rooftop terrace for tenant use at Level 30 (150 sqm)`;

  const splitFeat = doc.splitTextToSize(features, 170);
  doc.text(splitFeat, 20, y);
  y += splitFeat.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. VERTICAL CIRCULATION', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Element', 'Quantity', 'Serves', 'Speed']],
    body: [
      ['High-rise passenger lifts', '4', 'L16-L30', '6.0 m/s'],
      ['Low-rise passenger lifts', '4', 'GF-L15', '4.0 m/s'],
      ['Shuttle lifts', '2', 'GF, L15, L30', '6.0 m/s'],
      ['Goods lift', '1', 'B1-L30', '2.5 m/s'],
      ['Car park lifts', '2', 'B4-GF', '1.6 m/s'],
      ['Fire stairs', '2', 'B4-Roof', 'N/A'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
}

function generateArchFacade(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. FACADE DESIGN CONCEPT', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `The facade design responds to the building's solar orientation while creating a distinctive architectural identity. A unitised curtain wall system provides efficient construction and high-performance thermal properties.

Design Principles:
• North facade: Deep horizontal fins to control summer sun penetration
• South facade: Maximum glazing for diffuse daylight and city views
• East facade: Vertical fins to control morning sun, graduated density
• West facade: Combination horizontal and vertical shading, densest treatment

The facade expression creates a subtle crystalline effect through varied panel orientations, responding to the building's location at a key city intersection.`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. GLAZING PERFORMANCE', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Parameter', 'Requirement', 'Typical Product']],
    body: [
      ['U-Value', '< 1.8 W/m²K', 'Double IGU, Low-E coating'],
      ['SHGC (North)', '< 0.30', 'Solar control coating'],
      ['SHGC (South)', '< 0.40', 'Clear Low-E'],
      ['VLT', '> 65%', 'High clarity glass'],
      ['Acoustic (STC)', '> 35', 'Laminated inner pane'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. FACADE MATERIALS PALETTE', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const materials = `Primary Materials:
• Vision glass: Guardian SunGuard SuperNeutral 68
• Spandrel: Shadow box with coloured interlayer
• Mullions: Powder-coated aluminium (Dulux Precious Silver)
• Sunshading: Extruded aluminium fins (Dulux Lexicon Quarter)
• Heritage facade: Sandstone restoration and conservation

Panel Module:
• Typical panel width: 1,500mm
• Typical panel height: 3,850mm (floor to floor)
• Vision zone: 2,850mm
• Spandrel zone: 1,000mm`;

  const splitMat = doc.splitTextToSize(materials, 170);
  doc.text(splitMat, 20, y);
}

function generateArchMaterials(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. MATERIAL SCHEDULE - BASE BUILDING', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Location', 'Element', 'Material', 'Finish']],
    body: [
      ['Lobby', 'Floor', 'Granite - Giallo Veneziano', 'Honed'],
      ['Lobby', 'Walls', 'Reconstituted stone + timber', 'Natural/oiled'],
      ['Lobby', 'Ceiling', 'Timber battens + plasterboard', 'Clear/painted'],
      ['Lift Lobby', 'Floor', 'Granite - matching lobby', 'Honed'],
      ['Lift Lobby', 'Walls', 'Stone feature + painted PB', 'Honed/painted'],
      ['Amenities', 'Floor', 'Porcelain tile 600x600', 'Matt'],
      ['Amenities', 'Walls', 'Porcelain tile to 2100mm', 'Matt'],
      ['Fire Stairs', 'Floor', 'Concrete', 'Sealed'],
      ['Fire Stairs', 'Walls', 'Painted blockwork', 'Low sheen'],
      ['Basement', 'Floor', 'Concrete', 'Power trowel finish'],
      ['Basement', 'Walls', 'Painted concrete/block', 'Low sheen'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. COLOUR SCHEDULE', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Element', 'Colour', 'Code', 'Finish']],
    body: [
      ['Lobby walls', 'White', 'Dulux Lexicon', 'Low sheen'],
      ['Feature walls', 'Charcoal', 'Dulux Domino', 'Low sheen'],
      ['Ceilings', 'White', 'Dulux Vivid White', 'Flat'],
      ['Fire stairs', 'Light grey', 'Dulux Tranquil Retreat', 'Low sheen'],
      ['Basement walls', 'White', 'Dulux Vivid White', 'Low sheen'],
      ['Metalwork', 'Silver', 'Dulux Precious Silver', 'Powder coat'],
      ['Timber feature', 'Natural', 'American Oak', 'Osmo Polyx Oil'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185] },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. SUSTAINABILITY NOTES', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const notes = `All materials have been selected with consideration for:
• Environmental Product Declarations (EPDs) where available
• Low VOC emissions (Green Star compliant)
• Recycled content minimums (25% for steel, 30% for concrete)
• Responsible sourcing (FSC timber, ethical stone quarrying)
• Durability and lifecycle cost
• Local manufacture preference (within 500km radius)

Material samples and technical data sheets to be submitted for approval prior to procurement.`;

  const splitNotes = doc.splitTextToSize(notes, 170);
  doc.text(splitNotes, 20, y);
}

// Structural document generators
function generateStructFoundation(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. FOUNDATION SYSTEM OVERVIEW', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `The foundation system comprises bored reinforced concrete piles socketed into Hawkesbury Sandstone bedrock. The geotechnical investigation indicates competent rock at depths ranging from 12m to 18m below existing ground level.

Foundation Design Parameters:
• Pile type: Bored cast-in-place reinforced concrete
• Pile diameter: 1200mm (core), 900mm (perimeter)
• Rock socket length: Minimum 2 x diameter into Class II sandstone
• Allowable end bearing: 5.0 MPa on Class II sandstone
• Allowable shaft friction: 450 kPa in rock socket
• Working load (core piles): 15,000 kN
• Working load (perimeter piles): 8,000 kN

A total of 42 piles are proposed, arranged on a grid corresponding to the column layout above.`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. PILE SCHEDULE', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Pile Type', 'Diameter', 'Quantity', 'Working Load', 'Rock Socket']],
    body: [
      ['P1 - Core', '1200mm', '8', '15,000 kN', '3.0m min'],
      ['P2 - Perimeter', '900mm', '28', '8,000 kN', '2.0m min'],
      ['P3 - Heritage Wall', '750mm', '6', '4,000 kN', '1.5m min'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [192, 57, 43] },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. BASEMENT EXCAVATION', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const excavation = `Basement Retaining System:
• North and East: Secant pile wall (750mm piles at 600mm centres)
• South: Shotcrete and rock bolts (competent rock face)
• West: Contiguous pile wall with shotcrete facing

Excavation volumes:
• Total excavation: 52,000 m³
• Rock excavation: 18,000 m³ (estimated)
• Spoil classification: Virgin Excavated Natural Material (VENM)

Groundwater Management:
• Anticipated inflow: 5 L/s during excavation
• Permanent sump pumps: 2 x 10 L/s capacity
• Waterproofing: Crystalline admixture + sheet membrane`;

  const splitExc = doc.splitTextToSize(excavation, 170);
  doc.text(splitExc, 20, y);
}

function generateStructFraming(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. TYPICAL FLOOR FRAMING', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `The typical floor structure utilises post-tensioned concrete flat plate construction, providing efficient spans and minimised structural depth. The system allows for future penetrations and modifications with appropriate engineering assessment.

Structural System:
• Floor type: Post-tensioned flat plate
• Slab thickness: 250mm typical
• Column grid: 9.0m x 9.0m typical
• Column sizes: 800mm dia (lower), reducing to 600mm (upper)
• Core walls: 400mm thick reinforced concrete

Design Parameters:
• Concrete strength: 50 MPa at 28 days (floor slabs)
• Concrete strength: 65 MPa at 28 days (columns L1-L10)
• Post-tensioning: Bonded multi-strand system
• Typical prestress: 2.5 MPa average at mid-span`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. LOADING SCHEDULE', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Level', 'Dead Load', 'Live Load', 'Total Design']],
    body: [
      ['Typical Office', '5.5 kPa', '3.0 kPa', '8.5 kPa'],
      ['Plant Rooms', '5.5 kPa', '7.5 kPa', '13.0 kPa'],
      ['Lobby', '6.0 kPa', '5.0 kPa', '11.0 kPa'],
      ['Roof', '5.0 kPa', '0.25 kPa', '5.25 kPa'],
      ['Car Park', '5.5 kPa', '2.5 kPa', '8.0 kPa'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [192, 57, 43] },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. FLOOR PENETRATIONS', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const penetrations = `Coordinated penetrations in typical floor slab:
• Riser shafts: 4 No. 2.0m x 1.5m
• Lift shafts: 8 No. (within core)
• Stair shafts: 2 No. (within core)
• Small penetrations (<150mm): Locate in approved zones only

Penetration Zones:
• PT band zones: No penetrations permitted
• Column strips: Approval required for penetrations >100mm
• Middle strips: Penetrations up to 200mm permitted

All penetrations to be coordinated and approved by structural engineer prior to construction.`;

  const splitPen = doc.splitTextToSize(penetrations, 170);
  doc.text(splitPen, 20, y);
}

function generateStructCore(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. CORE WALL DESIGN', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `The central reinforced concrete core provides the primary lateral load resistance for the building. The core is designed to resist all wind and seismic forces while accommodating lift shafts, stairs, and services risers.

Core Configuration:
• External dimensions: 12.0m x 8.0m
• Wall thickness: 400mm (typical), 500mm (below L10)
• Concrete strength: 65 MPa (B4-L10), 50 MPa (L11-L30)
• Reinforcement: N28 @ 150 c/c E.F. typical

The core walls are designed as coupled shear walls with link beams at each floor level providing ductile energy dissipation under seismic loading.`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. LATERAL LOAD SUMMARY', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Load Case', 'Base Shear', 'Base Moment', 'Governing']],
    body: [
      ['Wind N-S', '8,500 kN', '425,000 kNm', 'Strength'],
      ['Wind E-W', '7,200 kN', '360,000 kNm', 'Strength'],
      ['Seismic N-S', '6,800 kN', '340,000 kNm', 'Drift'],
      ['Seismic E-W', '5,900 kN', '295,000 kNm', 'Drift'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [192, 57, 43] },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. DRIFT LIMITS', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const drift = `Inter-storey Drift Limits:
• Ultimate limit state (wind): H/500 = 7.7mm per storey
• Serviceability (wind): H/600 = 6.4mm per storey (10 year return)
• Ultimate limit state (seismic): H/400 = 9.6mm per storey
• Calculated maximum drift: 6.1mm (serviceability wind, Level 28)

Overall Building Deflection:
• Total height: 126.35m
• Deflection limit (wind): H/500 = 253mm
• Calculated deflection: 185mm (complies)

Acceleration limit (10 year return): 15 milli-g
Calculated acceleration: 12 milli-g (complies)`;

  const splitDrift = doc.splitTextToSize(drift, 170);
  doc.text(splitDrift, 20, y);
}

function generateStructBasement(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. BASEMENT RETAINING WALL DESIGN', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `The basement extends 14m below ground level comprising 4 levels of car parking. The retaining system varies around the perimeter to suit existing site conditions and adjacent buildings.

Retaining Systems:
North Boundary (George Street):
• Secant pile wall: 750mm diameter piles at 600mm centres
• Temporary anchors during construction (to be de-stressed)
• Permanent propping by basement floor slabs

East Boundary (Laneway):
• Secant pile wall with permanent ground anchors
• 4 rows of anchors at 3.0m vertical spacing
• Anchor capacity: 800 kN per anchor

South Boundary:
• Rock face with shotcrete and pattern rock bolts
• Drainage layer behind shotcrete

West Boundary:
• Contiguous pile wall with shotcrete infill panels`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. WATERPROOFING SYSTEM', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const waterproof = `Primary Waterproofing:
• Crystalline concrete admixture to all basement concrete
• Minimum concrete cover: 50mm to earth face
• Waterstops at all construction joints

Secondary Waterproofing:
• HDPE sheet membrane to external faces
• Protection board over membrane
• Cavity drain system at internal face (selected areas)

Tanking Grade:
• Type B: Habitable basement (AS 3735)
• Internal humidity control via mechanical ventilation

Drainage:
• Perimeter subsoil drain at B4 level
• Collection pit and sump pump system
• Pump capacity: 2 x 10 L/s (duty/standby)`;

  const splitWP = doc.splitTextToSize(waterproof, 170);
  doc.text(splitWP, 20, y);
}

function generateStructCriteria(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. DESIGN CODES AND STANDARDS', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Standard', 'Title', 'Edition']],
    body: [
      ['AS 1170.0', 'Structural design actions - General', '2002 (A5)'],
      ['AS 1170.1', 'Permanent, imposed and other actions', '2002 (A3)'],
      ['AS 1170.2', 'Wind actions', '2021'],
      ['AS 1170.4', 'Earthquake actions', '2007 (A2)'],
      ['AS 3600', 'Concrete structures', '2018 (A2)'],
      ['AS 4100', 'Steel structures', '2020'],
      ['AS 2159', 'Piling - Design and installation', '2009 (A2)'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [192, 57, 43] },
    styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. MATERIAL SPECIFICATIONS', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Material', 'Grade', 'Standard']],
    body: [
      ['Concrete - Piles', 'N50, 20mm aggregate', 'AS 1379'],
      ['Concrete - Footings', 'N50, 20mm aggregate', 'AS 1379'],
      ['Concrete - Columns (B4-L10)', 'N65, 10mm aggregate', 'AS 1379'],
      ['Concrete - Columns (L11-L30)', 'N50, 20mm aggregate', 'AS 1379'],
      ['Concrete - Slabs', 'N50, 10mm aggregate', 'AS 1379'],
      ['Concrete - Walls', 'N50, 20mm aggregate', 'AS 1379'],
      ['Reinforcement', 'D500N', 'AS/NZS 4671'],
      ['PT Strand', '1860 MPa, 12.7mm', 'AS/NZS 4672'],
      ['Structural Steel', '300PLUS', 'AS/NZS 3679.1'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [192, 57, 43] },
    styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. DESIGN PARAMETERS', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const params = `Wind:
• Region: A2 (Sydney)
• Terrain category: TC4 (within CBD)
• Design wind speed (ULS): 45 m/s
• Importance level: 2

Seismic:
• Hazard factor (Z): 0.08
• Site class: Be (shallow rock)
• Ductility: μ = 2.0 (limited ductility)
• Importance level: 3

Fire Resistance:
• Basement: FRL 120/120/120
• Ground - Level 25: FRL 120/120/120
• Level 26 - Roof: FRL 90/90/90`;

  const splitParams = doc.splitTextToSize(params, 170);
  doc.text(splitParams, 20, y);
}

// Mechanical document generators
function generateMechHVAC(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. HVAC SYSTEM OVERVIEW', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `The HVAC system is designed to achieve a 5.5 Star NABERS Energy rating while providing superior thermal comfort for building occupants. The primary system is a Variable Air Volume (VAV) system with chilled water cooling and hot water heating.

System Architecture:
• Primary cooling: Water-cooled centrifugal chillers
• Primary heating: Gas-fired condensing boilers
• Air distribution: Floor-by-floor VAV air handling units
• Ventilation: Dedicated outdoor air system (DOAS)
• Controls: DDC building management system

Design Conditions:
• Summer indoor: 24°C ± 1°C, 50% RH ± 5%
• Winter indoor: 22°C ± 1°C, 40% RH minimum
• Outdoor air: 10 L/s per person (AS 1668.2)`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. CENTRAL PLANT SCHEDULE', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Equipment', 'Quantity', 'Capacity', 'Location']],
    body: [
      ['Centrifugal Chiller', '4', '1,200 kW each', 'Basement L1'],
      ['Cooling Tower', '4', '1,500 kW each', 'Rooftop L31'],
      ['Condensing Boiler', '2', '800 kW each', 'Basement L1'],
      ['CHW Pump (Primary)', '4', '85 L/s @ 180kPa', 'Basement L1'],
      ['CHW Pump (Secondary)', '4', '65 L/s @ 250kPa', 'Basement L1'],
      ['CW Pump', '4', '95 L/s @ 200kPa', 'Basement L1'],
      ['HHW Pump', '3', '15 L/s @ 120kPa', 'Basement L1'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [39, 174, 96] },
    styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. ENERGY EFFICIENCY FEATURES', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const energy = `• Variable speed drives on all pumps and fans
• Waterside economiser for free cooling below 14°C wet bulb
• Airside economiser on all AHUs (100% OA capable)
• CO2-based demand controlled ventilation
• Enthalpy-based economiser control
• High-efficiency EC fans in all AHUs (SFP < 1.2 W/L/s)
• Plate heat exchangers for heat recovery
• Premium efficiency motors (IE4 minimum)`;

  const splitEnergy = doc.splitTextToSize(energy, 170);
  doc.text(splitEnergy, 20, y);
}

function generateMechPlant(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. BASEMENT PLANT ROOM - LEVEL B1', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `The main central plant room is located at Basement Level 1, providing access for equipment replacement and maintenance. The plant room houses all chilled water, heating water, and condenser water equipment.

Plant Room Layout:
• Total area: 650 sqm
• Clear height: 4.5m minimum
• Access: 3.0m wide roller door from loading dock
• Equipment replacement route: Coordinated with structural

Key Equipment:
• 4 x centrifugal chillers (3 duty + 1 standby)
• 2 x condensing boilers (1 duty + 1 standby)
• Chilled water primary and secondary pumps
• Condenser water pumps
• Heating hot water pumps
• Chemical dosing and water treatment
• Expansion tanks and air separators`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. ROOFTOP PLANT - LEVEL 31', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const rooftop = `Rooftop Plant Components:
• 4 x induced draft cooling towers (3 + 1 configuration)
• General exhaust fans (toilet, kitchen, car park)
• Emergency generator exhaust
• Building relief air openings
• Smoke exhaust fans
• Make-up air units

Acoustic Treatment:
• Cooling tower noise limit: 55 dB(A) at 10m
• Acoustic louvres to plant enclosure
• Vibration isolation on all rotating equipment
• Lagging of high-velocity ductwork

Rooftop Services Area: 420 sqm
Screening height: 3.5m (architectural coordination)`;

  const splitRoof = doc.splitTextToSize(rooftop, 170);
  doc.text(splitRoof, 20, y);
  y += splitRoof.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. FLOOR PLANT ROOMS', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const floor = `Each floor includes a dedicated plant room for air handling equipment:
• Area: 35 sqm per floor
• Contains: AHU, VAV controllers, sub-metering
• Access: Corridor access for filter change and maintenance
• Acoustic: STC 45 construction to occupied spaces

Mid-level plant rooms at Levels 15 and 30:
• Riser termination and isolation valves
• Pressure break stations (secondary pumping)
• Additional metering and monitoring equipment`;

  const splitFloor = doc.splitTextToSize(floor, 170);
  doc.text(splitFloor, 20, y);
}

function generateMechDuct(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. AIR HANDLING UNIT SCHEDULE', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['AHU', 'Supply Air', 'Return Air', 'OA', 'Cooling', 'Heating']],
    body: [
      ['AHU-TYP (x30)', '4,500 L/s', '4,200 L/s', '750 L/s', '85 kW', '25 kW'],
      ['AHU-LOBBY', '3,200 L/s', '3,000 L/s', '600 L/s', '65 kW', '20 kW'],
      ['AHU-RETAIL-1', '1,800 L/s', '1,600 L/s', '400 L/s', '45 kW', '15 kW'],
      ['AHU-RETAIL-2', '1,400 L/s', '1,200 L/s', '300 L/s', '35 kW', '12 kW'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [39, 174, 96] },
    styles: { fontSize: 9 },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. DUCTWORK SIZING - TYPICAL FLOOR', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const duct = `Main Supply Duct (from AHU):
• Size: 1200 x 400mm
• Velocity: 8 m/s maximum
• Insulation: 25mm acoustic + thermal
• Material: Galvanised steel, Pittsburgh lock seam

Branch Ducts to VAV Boxes:
• Size: 400 x 250mm typical
• Velocity: 6 m/s maximum
• Flexible connections: 1.5m maximum length

VAV Box Schedule:
• VB-01 to VB-16: 350 L/s capacity each
• Minimum turndown: 30%
• Reheat coils: 8 kW each

Ceiling Diffusers:
• Type: 4-way square plaque
• Size: 600 x 600mm
• Nominal airflow: 280 L/s each
• Spacing: 3.6m grid to match structural`;

  const splitDuct = doc.splitTextToSize(duct, 170);
  doc.text(splitDuct, 20, y);
  y += splitDuct.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. RETURN AIR SYSTEM', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const returnAir = `Return Air Strategy:
• Ceiling plenum return via slot diffusers
• Ducted return from perimeter zones
• Smoke zone dampers at every 1,500 sqm

Exhaust Systems:
• Toilet exhaust: 15 L/s per WC, 25 L/s per urinal
• Kitchen exhaust: 30 L/s per linear metre of cooking
• General exhaust: 2 air changes per hour (plant rooms)`;

  const splitReturn = doc.splitTextToSize(returnAir, 170);
  doc.text(splitReturn, 20, y);
}

function generateMechControls(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. BUILDING MANAGEMENT SYSTEM', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `The Building Management System (BMS) provides centralised monitoring and control of all mechanical services. The system is designed for optimal energy performance and occupant comfort.

BMS Architecture:
• Head-end: Server-based with web interface
• Protocol: BACnet IP (primary), Modbus (field devices)
• Network: Dedicated BMS network, isolated from IT
• Redundancy: Hot standby server, UPS backup

Control Functions:
• Chiller plant optimisation (sequencing, staging)
• Optimum start/stop
• Demand limiting
• Economiser control (airside and waterside)
• Tenant override management
• Fault detection and diagnostics
• Energy monitoring and reporting`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. METERING STRATEGY', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['Meter Type', 'Location', 'Purpose']],
    body: [
      ['Electrical (Main)', 'Main switchboard', 'Bulk supply metering'],
      ['Electrical (Floor)', 'Each floor DB', 'Tenant sub-metering'],
      ['Electrical (Plant)', 'Each major item', 'NABERS compliance'],
      ['Thermal (CHW)', 'Each AHU', 'Tenant apportionment'],
      ['Gas', 'Boiler inlet', 'NABERS compliance'],
      ['Water (Domestic)', 'Main entry', 'NABERS Water rating'],
      ['Water (Cooling)', 'Make-up line', 'Cooling tower efficiency'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [39, 174, 96] },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. TENANT INTERFACE', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const tenant = `Tenant Control Provisions:
• After-hours HVAC request (web portal or phone)
• Temperature setpoint adjustment (±2°C from nominal)
• Lighting override (per zone)
• Blind control interface (future provision)

Tenant Metering:
• Electricity: NMI-compliant meters, monthly billing
• HVAC: Thermal metering with monthly reporting
• After-hours: Logged and billed separately

Building Performance Dashboard:
• Real-time energy consumption display in lobby
• Monthly tenant energy reports
• Annual sustainability reporting`;

  const splitTenant = doc.splitTextToSize(tenant, 170);
  doc.text(splitTenant, 20, y);
}

function generateMechEnergy(doc, y) {
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('1. ENERGY MODEL SUMMARY', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const content = `An energy model has been developed to predict building energy performance and verify compliance with the NABERS Energy target. The model uses typical meteorological year (TMY) weather data for Sydney.

Model Parameters:
• Software: IES Virtual Environment
• Weather data: Sydney Observatory Hill TMY
• Occupancy: 1 person per 10 sqm NLA
• Operating hours: 07:00 - 19:00 weekdays
• Plug loads: 15 W/sqm (tenant equipment)
• Lighting: 8 W/sqm (LED throughout)`;

  const split = doc.splitTextToSize(content, 170);
  doc.text(split, 20, y);
  y += split.length * 5 + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('2. PREDICTED ENERGY CONSUMPTION', 20, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    head: [['End Use', 'Annual (MWh)', 'Intensity (kWh/sqm)', '% Total']],
    body: [
      ['Cooling', '1,850', '43.5', '32%'],
      ['Heating', '420', '9.9', '7%'],
      ['Fans & Pumps', '1,240', '29.2', '21%'],
      ['Lighting (Base)', '680', '16.0', '12%'],
      ['Lifts & Escalators', '520', '12.2', '9%'],
      ['Domestic Hot Water', '180', '4.2', '3%'],
      ['Miscellaneous', '910', '21.4', '16%'],
      ['TOTAL BASE BUILDING', '5,800', '136.4', '100%'],
    ],
    theme: 'grid',
    headStyles: { fillColor: [39, 174, 96] },
  });
  y = doc.lastAutoTable.finalY + 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('3. NABERS PREDICTION', 20, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const nabers = `Predicted NABERS Rating:
• Base building energy intensity: 136.4 kWh/sqm/year
• Greenhouse coefficient: 0.83 kg CO2-e/kWh
• Predicted rating: 5.5 Stars (with 10% contingency to 5.0 Stars)

Key Assumptions:
• 100% green power procurement
• Commissioning and tuning completed
• BMS optimisation active
• Tenant cooperation on after-hours use

Sensitivity Analysis:
• Without green power: 4.5 Stars
• Poor tenant behaviour (+20% after-hours): 5.0 Stars
• Equipment underperformance (+10% energy): 5.0 Stars`;

  const splitNabers = doc.splitTextToSize(nabers, 170);
  doc.text(splitNabers, 20, y);
}

// ============================================
// 4. TENDER SUBMISSIONS
// ============================================
function generateTenderSubmissions() {
  const disciplines = ['Architect', 'Structural', 'Mechanical'];

  disciplines.forEach(discipline => {
    const tenderDir = path.join(OUTPUT_DIR, 'Tender-Submissions', discipline);
    ensureDir(tenderDir);

    TENDERERS[discipline].forEach((tenderer, index) => {
      const doc = new jsPDF();
      let y = 20;

      // Cover page
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('TENDER SUBMISSION', 105, 60, { align: 'center' });

      doc.setFontSize(18);
      doc.text(PROJECT.name, 105, 80, { align: 'center' });

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`${discipline} Services`, 105, 95, { align: 'center' });

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(tenderer.name, 105, 130, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`ABN: ${tenderer.abn}`, 105, 145, { align: 'center' });
      doc.text(`Submitted: ${new Date().toLocaleDateString('en-AU')}`, 105, 155, { align: 'center' });

      // Second page - Executive Summary
      doc.addPage();
      y = 20;

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('EXECUTIVE SUMMARY', 20, y);
      y += 12;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const execSummary = `${tenderer.name} is pleased to submit this tender for ${discipline} services for the ${PROJECT.name} development. Our firm brings extensive experience in commercial high-rise projects and a proven track record of delivering complex projects on time and within budget.

We have assembled a dedicated project team with specific experience in Grade A commercial towers, sustainable design, and projects of similar scale and complexity. Our proposed fee of ${formatCurrency(tenderer.price)} represents excellent value considering our experience, capability, and commitment to quality outcomes.

Key Differentiators:
• Dedicated project director with 20+ years commercial tower experience
• In-house sustainability specialists targeting 6 Star Green Star
• Local Sydney team with no interstate resourcing required
• Proven collaboration tools and document management systems
• Strong existing relationships with likely contractors`;

      const splitExec = doc.splitTextToSize(execSummary, 170);
      doc.text(splitExec, 20, y);
      y += splitExec.length * 5 + 15;

      // Company Profile
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('1. COMPANY PROFILE', 20, y);
      y += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const profile = `${tenderer.name} is a leading ${discipline.toLowerCase()} practice with offices across Australia and internationally. Founded over 50 years ago, we have grown to employ over 800 staff across 12 offices worldwide.

Our Sydney office, which will service this project, comprises 120 professionals including 45 registered practitioners. We have completed over $5 billion worth of commercial projects in Sydney CBD over the past decade.

Recent comparable projects include:
• 200 George Street, Sydney (45 levels, $180M construction)
• Barangaroo Tower 2 (38 levels, $220M construction)
• Parramatta Square Building 5 (28 levels, $95M construction)`;

      const splitProfile = doc.splitTextToSize(profile, 170);
      doc.text(splitProfile, 20, y);
      y += splitProfile.length * 5 + 15;

      // Third page - Fee Proposal
      doc.addPage();
      y = 20;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('2. FEE PROPOSAL', 20, y);
      y += 5;

      const feeBreakdown = [
        ['Schematic Design', Math.round(tenderer.price * 0.15)],
        ['Design Development', Math.round(tenderer.price * 0.25)],
        ['Construction Documentation', Math.round(tenderer.price * 0.35)],
        ['Tender & Procurement', Math.round(tenderer.price * 0.05)],
        ['Construction Administration', Math.round(tenderer.price * 0.15)],
        ['Post-Completion', Math.round(tenderer.price * 0.05)],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Phase', 'Fee (excl GST)']],
        body: feeBreakdown.map(item => [item[0], formatCurrency(item[1])]),
        foot: [['TOTAL LUMP SUM FEE', formatCurrency(tenderer.price)]],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        footStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      });
      y = doc.lastAutoTable.finalY + 15;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('2.1 Fee Basis and Assumptions', 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const assumptions = `Our fee is based on the following assumptions:
• Project duration of 36 months from engagement to practical completion
• Design to proceed without significant scope changes after SD approval
• Client decisions within 10 business days of submissions
• Standard consultant agreement with reasonable liability caps
• No significant contamination or heritage constraints beyond brief

Exclusions from this fee:
• Survey and geotechnical investigations
• DA fees and authority charges
• Physical models (rendered images included)
• Specialist sub-consultants not named herein
• Dispute resolution and expert witness services
• Services beyond 12 months defects liability period`;

      const splitAssump = doc.splitTextToSize(assumptions, 170);
      doc.text(splitAssump, 20, y);
      y += splitAssump.length * 5 + 15;

      // Fourth page - Team and Experience
      doc.addPage();
      y = 20;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('3. PROJECT TEAM', 20, y);
      y += 5;

      const team = [
        ['Project Director', 'David Morrison', '25 years', '15%'],
        ['Project Leader', 'Sophie Williams', '18 years', '40%'],
        ['Senior Designer', 'James Chen', '12 years', '60%'],
        ['Designer', 'Emily Taylor', '6 years', '80%'],
        ['Graduate', 'Michael Singh', '2 years', '100%'],
        ['BIM Manager', 'Rachel Lee', '10 years', '30%'],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Role', 'Name', 'Experience', 'Allocation']],
        body: team,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });
      y = doc.lastAutoTable.finalY + 15;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('4. NON-PRICE CRITERIA', 20, y);
      y += 10;

      // Methodology
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('4.1 Methodology', 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const methodology = `Our approach to this project emphasises early collaboration and integrated design thinking. We will establish a project-specific BIM Execution Plan that enables real-time coordination with all consultants and early identification of design conflicts.

Key methodological elements:
• Fortnightly design workshops with full consultant team
• Monthly client presentations with 3D walkthrough models
• Clash detection at each design milestone
• Design freeze protocols with formal change management
• Value engineering reviews at SD and DD stages
• Sustainability scorecard tracking throughout design`;

      const splitMethod = doc.splitTextToSize(methodology, 170);
      doc.text(splitMethod, 20, y);
      y += splitMethod.length * 5 + 10;

      // Fifth page - More non-price criteria
      doc.addPage();
      y = 20;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('4.2 Relevant Experience', 20, y);
      y += 5;

      const experience = [
        ['Chifley Tower', 'Sydney CBD', '52 levels', '$285M', '2019'],
        ['Liberty Place', 'Sydney CBD', '38 levels', '$165M', '2020'],
        ['Charter Hall HQ', 'Barangaroo', '28 levels', '$120M', '2021'],
        ['Dexus North', 'North Sydney', '35 levels', '$145M', '2022'],
      ];

      autoTable(doc, {
        startY: y,
        head: [['Project', 'Location', 'Scale', 'Value', 'Completion']],
        body: experience,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
      });
      y = doc.lastAutoTable.finalY + 15;

      // Sustainability approach
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('4.3 Sustainability Approach', 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const sustainability = `Our firm is a leader in sustainable design, having delivered 15 projects with 5+ Star NABERS ratings in the past 5 years. For this project, we propose:

• Dedicated ESD lead embedded in project team
• Early-stage energy modelling to inform design decisions
• Material selection database with embodied carbon tracking
• Circular economy principles for construction waste minimisation
• Tenant engagement strategy for operational performance
• Post-occupancy evaluation commitment

We are confident of achieving the 5.5 Star NABERS Energy and 6 Star Green Star targets specified in the brief.`;

      const splitSust = doc.splitTextToSize(sustainability, 170);
      doc.text(splitSust, 20, y);
      y += splitSust.length * 5 + 15;

      // Risk management
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('4.4 Risk Management', 20, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const risk = `Key risks identified and our mitigation strategies:

1. Heritage facade retention
   Risk: Structural complexity and approval delays
   Mitigation: Early engagement with heritage consultant, precedent research

2. Ambitious sustainability targets
   Risk: Cost premium may exceed budget
   Mitigation: Integrated design approach, value engineering at each stage

3. Complex services coordination
   Risk: Ceiling void constraints
   Mitigation: Weekly BIM coordination, early contractor input

4. Market conditions
   Risk: Material cost escalation
   Mitigation: Early procurement advice, specification flexibility`;

      const splitRisk = doc.splitTextToSize(risk, 170);
      doc.text(splitRisk, 20, y);

      // Add footers
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(doc, i, totalPages);
      }

      const filename = `Tender-${discipline}-${tenderer.name.replace(/\s+/g, '-')}.pdf`;
      const filepath = path.join(tenderDir, filename);
      doc.save(filepath);
      console.log(`Created: ${filepath}`);
    });
  });
}

// ============================================
// 5. EOI EMAILS
// ============================================
function generateEOIEmails() {
  const eoiDir = path.join(OUTPUT_DIR, 'EOI-Correspondence');
  ensureDir(eoiDir);

  const disciplines = ['Architect', 'Structural', 'Mechanical'];

  EOI_COMPANIES.forEach((company, index) => {
    const discipline = disciplines[index];
    const doc = new jsPDF();
    let y = 20;

    // Email header styling
    doc.setFillColor(245, 245, 245);
    doc.rect(15, 15, 180, 55, 'F');

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('From:', 20, 25);
    doc.text('To:', 20, 33);
    doc.text('Date:', 20, 41);
    doc.text('Subject:', 20, 49);

    doc.setFont('helvetica', 'normal');
    doc.text(`${company.contact} <${company.email}>`, 45, 25);
    doc.text(`tenders@meridianproperty.com.au`, 45, 33);
    doc.text(new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 45, 41);
    doc.text(`Expression of Interest - ${discipline} Services - ${PROJECT.name}`, 45, 49);

    y = 80;

    // Email body
    doc.setFontSize(11);
    doc.text('Dear Tender Coordinator,', 20, y);
    y += 12;

    const intro = `I am writing on behalf of ${company.name} to formally express our interest in providing ${discipline} services for the ${PROJECT.name} project at ${PROJECT.address}.`;
    const splitIntro = doc.splitTextToSize(intro, 170);
    doc.text(splitIntro, 20, y);
    y += splitIntro.length * 6 + 8;

    const body1 = `${company.name} is a leading ${discipline.toLowerCase()} consultancy with extensive experience in commercial high-rise developments in Sydney CBD. We have successfully delivered numerous projects of similar scale and complexity, and we are confident in our ability to meet and exceed the project requirements.`;
    const splitBody1 = doc.splitTextToSize(body1, 170);
    doc.text(splitBody1, 20, y);
    y += splitBody1.length * 6 + 8;

    doc.text('Our relevant qualifications include:', 20, y);
    y += 8;

    const qualifications = [
      `• Over 30 years of experience in ${discipline.toLowerCase()} design`,
      '• Dedicated team of 50+ professionals in our Sydney office',
      '• Track record of 5+ Star NABERS rated buildings',
      '• Advanced BIM capabilities (Revit, Navisworks)',
      '• Strong relationships with Sydney-based contractors',
    ];

    qualifications.forEach(qual => {
      doc.text(qual, 20, y);
      y += 6;
    });
    y += 8;

    const body2 = `We understand the project aims to achieve 5.5 Star NABERS Energy and 6 Star Green Star certification, and we have specific expertise in delivering high-performance sustainable buildings. Our recent project at 180 George Street achieved a 6 Star Green Star rating and has been operating at 5.5 Star NABERS since completion.`;
    const splitBody2 = doc.splitTextToSize(body2, 170);
    doc.text(splitBody2, 20, y);
    y += splitBody2.length * 6 + 8;

    const body3 = `We would welcome the opportunity to meet with your team to discuss our approach and demonstrate our capabilities. Please find attached our company capability statement and recent project portfolio for your reference.`;
    const splitBody3 = doc.splitTextToSize(body3, 170);
    doc.text(splitBody3, 20, y);
    y += splitBody3.length * 6 + 8;

    doc.text('We confirm our availability and capacity to commence work immediately upon engagement.', 20, y);
    y += 12;

    doc.text('Please do not hesitate to contact me if you require any additional information.', 20, y);
    y += 16;

    doc.text('Kind regards,', 20, y);
    y += 16;

    doc.setFont('helvetica', 'bold');
    doc.text(company.contact, 20, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.text('Director, ${discipline} Services', 20, y);
    y += 6;
    doc.text(company.name, 20, y);
    y += 6;
    doc.text(`E: ${company.email}`, 20, y);
    y += 6;
    doc.text('M: +61 4XX XXX XXX', 20, y);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('This email and any attachments are confidential and intended solely for the addressee.', 20, 280);

    const filename = `EOI-${discipline}-${company.name.replace(/\s+/g, '-')}.pdf`;
    const filepath = path.join(eoiDir, filename);
    doc.save(filepath);
    console.log(`Created: ${filepath}`);
  });
}

// ============================================
// 6. INVOICES
// ============================================
function generateInvoices() {
  const disciplines = ['Architect', 'Structural', 'Mechanical'];

  disciplines.forEach(discipline => {
    const invoiceDir = path.join(OUTPUT_DIR, 'Invoices', discipline);
    ensureDir(invoiceDir);

    const firm = FIRMS[discipline];
    const baseAmount = discipline === 'Architect' ? 2850000 : discipline === 'Structural' ? 1950000 : 1650000;

    // Invoice details for 5 progressive claims
    const invoices = [
      { phase: 'Schematic Design', percent: 15, date: '2024-02-15' },
      { phase: 'Design Development - Stage 1', percent: 12, date: '2024-04-30' },
      { phase: 'Design Development - Stage 2', percent: 13, date: '2024-06-28' },
      { phase: 'Construction Documentation - Stage 1', percent: 20, date: '2024-09-15' },
      { phase: 'Construction Documentation - Stage 2', percent: 15, date: '2024-11-30' },
    ];

    invoices.forEach((inv, index) => {
      const doc = new jsPDF();
      const invoiceNum = `${firm.invoicePrefix}-${PROJECT.projectNumber.split('-')[2]}-${String(index + 1).padStart(3, '0')}`;
      const amount = Math.round(baseAmount * (inv.percent / 100));
      const gst = Math.round(amount * 0.1);

      // Company header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text(firm.name, 20, 25);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(firm.address, 20, 33);
      doc.text(`ABN: ${firm.abn}`, 20, 39);
      doc.text(`Phone: ${firm.phone}`, 20, 45);

      // Invoice title
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      doc.text('TAX INVOICE', 150, 30, { align: 'center' });

      // Invoice details box
      doc.setDrawColor(200);
      doc.rect(120, 40, 70, 30);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Invoice No:', 125, 48);
      doc.text('Date:', 125, 55);
      doc.text('Due Date:', 125, 62);

      doc.setFont('helvetica', 'normal');
      doc.text(invoiceNum, 160, 48);
      doc.text(inv.date, 160, 55);

      const dueDate = new Date(inv.date);
      dueDate.setDate(dueDate.getDate() + 30);
      doc.text(dueDate.toISOString().split('T')[0], 160, 62);

      // Bill to
      let y = 85;
      doc.setFont('helvetica', 'bold');
      doc.text('BILL TO:', 20, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(PROJECT.client, 20, y);
      y += 5;
      doc.text(`ABN: ${PROJECT.clientABN}`, 20, y);
      y += 5;
      doc.text('Level 12, 100 Miller Street', 20, y);
      y += 5;
      doc.text('North Sydney NSW 2060', 20, y);

      // Project reference
      y = 85;
      doc.setFont('helvetica', 'bold');
      doc.text('PROJECT:', 120, y);
      y += 7;
      doc.setFont('helvetica', 'normal');
      doc.text(PROJECT.name, 120, y);
      y += 5;
      doc.text(PROJECT.projectNumber, 120, y);
      y += 5;
      doc.text(PROJECT.address, 120, y);

      // Line items
      y = 130;

      autoTable(doc, {
        startY: y,
        head: [['Description', 'Qty', 'Rate', 'Amount']],
        body: [
          [
            `${discipline} Services\n${inv.phase}\nProgress claim ${index + 1} of 6`,
            '1',
            `${inv.percent}% of contract`,
            formatCurrency(amount)
          ],
        ],
        theme: 'grid',
        headStyles: { fillColor: [51, 51, 51] },
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 20, halign: 'center' },
          2: { cellWidth: 35, halign: 'right' },
          3: { cellWidth: 35, halign: 'right' },
        },
      });

      y = doc.lastAutoTable.finalY + 10;

      // Totals
      autoTable(doc, {
        startY: y,
        body: [
          ['', '', 'Subtotal:', formatCurrency(amount)],
          ['', '', 'GST (10%):', formatCurrency(gst)],
          ['', '', 'TOTAL DUE:', formatCurrency(amount + gst)],
        ],
        theme: 'plain',
        columnStyles: {
          0: { cellWidth: 100 },
          1: { cellWidth: 20 },
          2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
          3: { cellWidth: 35, halign: 'right' },
        },
        styles: { fontSize: 11 },
      });

      y = doc.lastAutoTable.finalY + 20;

      // Contract summary
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CONTRACT SUMMARY', 20, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        body: [
          ['Contract Sum (excl GST):', formatCurrency(baseAmount)],
          ['Previously Claimed:', formatCurrency(Math.round(baseAmount * invoices.slice(0, index).reduce((sum, i) => sum + i.percent, 0) / 100))],
          ['This Claim:', formatCurrency(amount)],
          ['Balance Remaining:', formatCurrency(baseAmount - Math.round(baseAmount * invoices.slice(0, index + 1).reduce((sum, i) => sum + i.percent, 0) / 100))],
        ],
        theme: 'plain',
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 40, halign: 'right' },
        },
        styles: { fontSize: 9 },
        margin: { left: 20 },
      });

      // Payment details
      y = 240;
      doc.setFont('helvetica', 'bold');
      doc.text('PAYMENT DETAILS', 20, y);
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text('Bank: Commonwealth Bank of Australia', 20, y);
      y += 5;
      doc.text('Account Name: ' + firm.name, 20, y);
      y += 5;
      doc.text('BSB: 062-000', 20, y);
      y += 5;
      doc.text('Account: 1234 5678', 20, y);
      y += 5;
      doc.text('Reference: ' + invoiceNum, 20, y);

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text('Payment terms: 30 days from invoice date. Interest of 2% per month applies to overdue amounts.', 105, 285, { align: 'center' });

      const filename = `Invoice-${invoiceNum}.pdf`;
      const filepath = path.join(invoiceDir, filename);
      doc.save(filepath);
      console.log(`Created: ${filepath}`);
    });
  });
}

// ============================================
// MAIN EXECUTION
// ============================================
async function main() {
  console.log('Starting test document generation...\n');

  // Create output directory
  ensureDir(OUTPUT_DIR);

  console.log('=== Generating Project Brief ===');
  generateProjectBrief();

  console.log('\n=== Generating Project Design Brief ===');
  generateProjectDesignBrief();

  console.log('\n=== Generating Schematic Design Documents ===');
  generateSchematicDesignDocs();

  console.log('\n=== Generating Tender Submissions ===');
  generateTenderSubmissions();

  console.log('\n=== Generating EOI Correspondence ===');
  generateEOIEmails();

  console.log('\n=== Generating Invoices ===');
  generateInvoices();

  console.log('\n========================================');
  console.log('Test document generation complete!');
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log('========================================');
}

main().catch(console.error);
