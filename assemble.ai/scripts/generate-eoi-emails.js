/**
 * EOI Email Generator
 * Generates 9 EOI emails from all tender firms expressing interest in design packages
 */

const { jsPDF } = require('jspdf');
const fs = require('fs');
const path = require('path');

// Output directory
const OUTPUT_DIR = path.join(__dirname, '..', 'test-documents', 'EOI-Emails');

// Project details
const PROJECT = {
  name: 'Greenfield Commercial Tower',
  address: '250 George Street, Sydney NSW 2000',
  client: 'Meridian Property Group Pty Ltd',
  projectNumber: 'PRJ-2024-0892',
};

// All firms with full contact details for EOI emails
const ALL_FIRMS = {
  Architect: [
    {
      name: 'Woods Bagot Architecture',
      abn: '63 008 846 674',
      address: 'Level 5, 60 Miller Street, North Sydney NSW 2060',
      contact: 'James Richardson',
      title: 'Director, Commercial Sector',
      email: 'j.richardson@woodsbagot.com',
      phone: '(02) 9956 7800',
      mobile: '+61 412 345 678',
    },
    {
      name: 'Hassell Studios',
      abn: '12 345 678 901',
      address: 'Level 2, 35 Little Bourke Street, Melbourne VIC 3000',
      contact: 'Rebecca Chen',
      title: 'Principal, Sydney Studio',
      email: 'r.chen@hassellstudio.com',
      phone: '(02) 9101 2200',
      mobile: '+61 423 456 789',
    },
    {
      name: 'Bates Smart',
      abn: '98 765 432 109',
      address: '1 Nicholson Street, Melbourne VIC 3000',
      contact: 'Mark Thompson',
      title: 'Associate Director',
      email: 'm.thompson@batessmart.com',
      phone: '(03) 8664 6200',
      mobile: '+61 434 567 890',
    },
  ],
  Structural: [
    {
      name: 'Arup Engineers',
      abn: '18 000 966 165',
      address: 'Level 10, 201 Kent Street, Sydney NSW 2000',
      contact: 'Dr. Michael Chen',
      title: 'Associate Principal, Structures',
      email: 'm.chen@arup.com',
      phone: '(02) 9320 9320',
      mobile: '+61 445 678 901',
    },
    {
      name: 'Robert Bird Group',
      abn: '34 567 890 123',
      address: 'Level 11, 55 Clarence Street, Sydney NSW 2000',
      contact: 'Andrew Foster',
      title: 'Technical Director',
      email: 'a.foster@robertbird.com',
      phone: '(02) 9006 1400',
      mobile: '+61 456 789 012',
    },
    {
      name: 'TTW Engineers',
      abn: '67 890 123 456',
      address: 'Level 8, 1 Chifley Square, Sydney NSW 2000',
      contact: 'Sarah Williams',
      title: 'Associate Director',
      email: 's.williams@ttw.com.au',
      phone: '(02) 9439 7288',
      mobile: '+61 467 890 123',
    },
  ],
  Mechanical: [
    {
      name: 'Norman Disney & Young',
      abn: '29 003 874 468',
      address: 'Level 3, 77 Pacific Highway, North Sydney NSW 2060',
      contact: 'Emma Thompson',
      title: 'Associate Director, Mechanical',
      email: 'e.thompson@ndy.com',
      phone: '(02) 9922 6966',
      mobile: '+61 478 901 234',
    },
    {
      name: 'Stantec',
      abn: '45 678 901 234',
      address: 'Level 16, 135 King Street, Sydney NSW 2000',
      contact: 'David Liu',
      title: 'Principal, Building Services',
      email: 'd.liu@stantec.com',
      phone: '(02) 9465 5599',
      mobile: '+61 489 012 345',
    },
    {
      name: 'WSP Australia',
      abn: '78 901 234 567',
      address: 'Level 27, 680 George Street, Sydney NSW 2000',
      contact: 'Jennifer Martinez',
      title: 'Technical Director, MEP',
      email: 'j.martinez@wsp.com',
      phone: '(02) 9272 5100',
      mobile: '+61 490 123 456',
    },
  ],
};

// Experience highlights for each firm
const FIRM_EXPERIENCE = {
  'Woods Bagot Architecture': [
    '200 George Street, Sydney - 45 levels, 6 Star Green Star',
    'Quay Quarter Tower - 49 levels, LEED Platinum',
    'Barangaroo South Commercial - Multiple towers',
  ],
  'Hassell Studios': [
    'One Circular Quay - 54 levels, mixed-use',
    'Wesley Place, Melbourne - 26 levels, Premium Grade',
    'Perth City Link - 29 levels, 5.5 Star NABERS',
  ],
  'Bates Smart': [
    '567 Collins Street, Melbourne - 36 levels',
    'Melbourne Quarter - 24 levels, 5 Star Green Star',
    'Daramu House, Barangaroo - Australia\'s first all-electric commercial building',
  ],
  'Arup Engineers': [
    'Sydney Opera House structural assessment',
    'One Barangaroo - 69 levels, complex foundation system',
    'Salesforce Tower Sydney - 52 levels, post-tensioned structure',
  ],
  'Robert Bird Group': [
    'EY Centre, 200 George Street - 35,000 sqm commercial',
    'International Towers, Barangaroo - All three towers',
    'Martin Place Metro Station - Complex over-station development',
  ],
  'TTW Engineers': [
    'Charter Hall Prime Office Fund portfolio',
    '60 Martin Place - Heritage integration',
    'Wynyard Place - 29 levels with heritage retention',
  ],
  'Norman Disney & Young': [
    'Olderfleet, Melbourne - 5.5 Star NABERS',
    '1 Denison Street, North Sydney - 6 Star Green Star',
    'Mirvac Heritage Lanes - Net zero carbon operations',
  ],
  'Stantec': [
    'Brookfield Place Sydney - 4 towers',
    'GPO Exchange Adelaide - Premium Grade A',
    'Wesley Place, Melbourne - Mechanical design lead',
  ],
  'WSP Australia': [
    'Australia Square refurbishment - Heritage tower upgrade',
    'Parramatta Square - Multiple commercial towers',
    '180 Brisbane - Queensland\'s first 6 Star Green Star office',
  ],
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function generateEOIEmail(firm, discipline, index) {
  const doc = new jsPDF();
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 14)); // Random date within last 2 weeks

  let y = 20;

  // Email header styling
  doc.setFillColor(248, 249, 250);
  doc.rect(15, 15, 180, 60, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.rect(15, 15, 180, 60);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('From:', 20, 25);
  doc.text('To:', 20, 34);
  doc.text('CC:', 20, 43);
  doc.text('Date:', 20, 52);
  doc.text('Subject:', 20, 61);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${firm.contact} <${firm.email}>`, 50, 25);
  doc.text('tenders@meridianproperty.com.au', 50, 34);
  doc.text('sarah.mitchell@turnertownsend.com', 50, 43);
  doc.text(date.toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), 50, 52);

  const subject = `EOI - ${discipline} Design Services - ${PROJECT.name}`;
  doc.setFont('helvetica', 'bold');
  doc.text(subject, 50, 61);

  y = 90;

  // Email body
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Dear Tender Coordinator,', 20, y);
  y += 12;

  // Opening paragraph
  const openings = [
    `On behalf of ${firm.name}, I am writing to formally register our interest in being invited to tender for the ${discipline} design services package for the ${PROJECT.name} development.`,
    `${firm.name} is pleased to express our strong interest in providing ${discipline} services for your prestigious ${PROJECT.name} project at ${PROJECT.address}.`,
    `I am writing to confirm ${firm.name}'s keen interest in tendering for the ${discipline} design package for ${PROJECT.name}.`,
  ];

  const opening = openings[index % openings.length];
  const splitOpening = doc.splitTextToSize(opening, 170);
  doc.text(splitOpening, 20, y);
  y += splitOpening.length * 6 + 8;

  // Company introduction
  const introductions = [
    `With over ${20 + index * 5} years of experience delivering complex commercial projects across Australia and internationally, we bring a wealth of expertise in high-rise developments of this scale and complexity. Our Sydney office comprises ${80 + index * 15} dedicated professionals who specialise in Grade A commercial towers.`,
    `Our practice has been at the forefront of ${discipline.toLowerCase()} design for premium commercial developments for over ${25 + index * 3} years. We currently employ ${90 + index * 20} staff across our Australian offices, with a dedicated Sydney team experienced in CBD commercial projects.`,
    `${firm.name} has a distinguished track record of ${discipline.toLowerCase()} excellence spanning more than ${30 + index * 2} years. Our team of ${100 + index * 10} professionals has delivered some of Australia's most iconic commercial buildings.`,
  ];

  const intro = introductions[index % introductions.length];
  const splitIntro = doc.splitTextToSize(intro, 170);
  doc.text(splitIntro, 20, y);
  y += splitIntro.length * 6 + 8;

  // Experience section
  doc.setFont('helvetica', 'bold');
  doc.text('Relevant Project Experience:', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');

  const experience = FIRM_EXPERIENCE[firm.name] || [
    `Major commercial tower - 30+ levels`,
    `Premium Grade A development - Sydney CBD`,
    `Award-winning sustainable building`,
  ];

  experience.forEach(exp => {
    doc.text(`• ${exp}`, 25, y);
    y += 6;
  });
  y += 6;

  // Capability paragraph
  const capabilities = [
    `We are particularly well-positioned for this project given our extensive experience with 5+ Star NABERS rated buildings and our in-house sustainability specialists. Our team has successfully delivered ${5 + index} projects exceeding $100M in construction value within the Sydney CBD over the past five years.`,
    `Our capability is demonstrated through our consistent delivery of high-performance buildings that meet or exceed sustainability targets. We have a proven track record with Green Star certified projects and have recently completed ${3 + index} buildings achieving 5.5 Star NABERS or above.`,
    `We understand the project's ambitious sustainability targets and are confident in our ability to deliver the required 5.5 Star NABERS Energy and 6 Star Green Star outcomes. Our dedicated ESD team has delivered ${4 + index} net-zero ready commercial buildings.`,
  ];

  const capability = capabilities[index % capabilities.length];
  const splitCapability = doc.splitTextToSize(capability, 170);
  doc.text(splitCapability, 20, y);
  y += splitCapability.length * 6 + 8;

  // Add second page
  doc.addPage();
  y = 25;

  // Team and availability
  const teamText = `We confirm our availability and capacity to commence immediately upon engagement. Our proposed project team would be led by experienced practitioners with direct experience on comparable projects, ensuring continuity and expertise throughout all design phases.`;
  const splitTeam = doc.splitTextToSize(teamText, 170);
  doc.text(splitTeam, 20, y);
  y += splitTeam.length * 6 + 8;

  // Key differentiators
  doc.setFont('helvetica', 'bold');
  doc.text('Our Key Differentiators:', 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');

  const differentiators = [
    'Dedicated Sydney-based team with no interstate resourcing required',
    'Advanced BIM capabilities with proven coordination protocols',
    'Strong existing relationships with Sydney contractors and authorities',
    'In-house sustainability and ESD specialists',
    `Successful track record with ${PROJECT.client}`,
  ];

  differentiators.forEach(diff => {
    const splitDiff = doc.splitTextToSize(`• ${diff}`, 165);
    doc.text(splitDiff, 25, y);
    y += splitDiff.length * 5 + 2;
  });
  y += 6;

  // Request for tender documents
  const closingRequest = `We would appreciate the opportunity to receive the full tender documentation when available and to present our credentials to your selection panel. We are also available for a preliminary meeting to discuss the project requirements and our proposed approach in more detail.`;
  const splitClosing = doc.splitTextToSize(closingRequest, 170);
  doc.text(splitClosing, 20, y);
  y += splitClosing.length * 6 + 8;

  // Closing
  doc.text('Please do not hesitate to contact me directly should you require any additional information.', 20, y);
  y += 12;

  doc.text('We look forward to the opportunity to contribute to this landmark development.', 20, y);
  y += 16;

  doc.text('Kind regards,', 20, y);
  y += 20;

  // Signature block
  doc.setFont('helvetica', 'bold');
  doc.text(firm.contact, 20, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.text(firm.title, 20, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text(firm.name, 20, y);
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(firm.address, 20, y);
  y += 5;
  doc.text(`T: ${firm.phone}  |  M: ${firm.mobile}`, 20, y);
  y += 5;
  doc.text(`E: ${firm.email}`, 20, y);
  y += 5;
  doc.text(`ABN: ${firm.abn}`, 20, y);

  // Footer disclaimer
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  const disclaimer = 'CONFIDENTIALITY NOTICE: This email and any attachments are confidential and intended solely for the use of the addressee. If you have received this email in error, please notify the sender immediately and delete the message. Any unauthorised use, disclosure, or distribution is prohibited.';
  const splitDisclaimer = doc.splitTextToSize(disclaimer, 175);
  doc.text(splitDisclaimer, 20, 275);

  return doc;
}

function main() {
  console.log('Generating EOI emails from all 9 firms...\n');

  ensureDir(OUTPUT_DIR);

  const disciplines = ['Architect', 'Structural', 'Mechanical'];
  let totalGenerated = 0;

  disciplines.forEach(discipline => {
    const firms = ALL_FIRMS[discipline];

    firms.forEach((firm, index) => {
      const doc = generateEOIEmail(firm, discipline, index);

      const filename = `EOI-${discipline}-${firm.name.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      const filepath = path.join(OUTPUT_DIR, filename);

      doc.save(filepath);
      console.log(`Created: ${filename}`);
      totalGenerated++;
    });
  });

  console.log(`\n========================================`);
  console.log(`Generated ${totalGenerated} EOI emails`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  console.log(`========================================`);
}

main();
