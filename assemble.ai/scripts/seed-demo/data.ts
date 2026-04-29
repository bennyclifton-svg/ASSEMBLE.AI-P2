/**
 * Shared constants for the Lighthouse Residences demo seed.
 * All dates and identifiers are computed from PROJECT_START so the timeline stays consistent.
 *
 * NOTE on stakeholder model:
 * - `name` field holds the SUBGROUP (e.g. "Architecture", "Owner", "TfNSW", "Concrete")
 * - `disciplineOrTrade` mirrors `name` (used by cost plan to render the discipline column)
 * - `contactName` holds the person's name
 * - `organization` holds the firm name
 * The Stakeholder UI renders `name` in the subgroup column.
 */

export const DEMO_PROJECT_NAME = 'Lighthouse Residences';
export const DEMO_PROJECT_CODE = 'LH-2025-001';
export const OWNER_EMAIL = 'bennyclifton@gmail.com';

export const PROJECT_START = new Date('2025-10-14');
export const PCD_TARGET = new Date('2026-10-23');
export const TODAY = new Date('2026-04-27');

export const PROJECT_ADDRESS = '12 Burroway Road, Wentworth Point NSW 2127';
export const PROJECT_LEGAL = 'Lot 102 DP 1234567';
export const PROJECT_LATITUDE = '-33.8298';
export const PROJECT_LONGITUDE = '151.0759';
export const PROJECT_LOT_AREA = 2840;
export const PROJECT_STORIES = 7;
export const PROJECT_BUILDING_CLASS = 'Class 2 (SOU)';
export const PROJECT_ZONING = 'R4 High Density Residential';
export const PROJECT_JURISDICTION = 'City of Parramatta';

export const TOTAL_BUDGET_CENTS = 20_000_000_00;

// Stakeholder roster
// Note: subgroup must match enum values in `src/types/stakeholder.ts`
export interface DemoStakeholder {
  group: 'client' | 'authority' | 'consultant' | 'contractor';
  subgroup: string;          // becomes `name` and `disciplineOrTrade`
  personName: string;        // becomes `contactName`
  organization: string;      // firm/agency
  role: string;              // job title
  contactEmail: string;
  contactPhone?: string;
  notes?: string;
}

export const STAKEHOLDERS: DemoStakeholder[] = [
  // CLIENT (3) — all Owner subgroup
  { group: 'client', subgroup: 'Owner', personName: 'Sarah Mitchell', organization: 'Coastal Living Pty Ltd', role: 'Director', contactEmail: 'sarah.mitchell@coastalliving.com.au', contactPhone: '+61 2 9876 5400' },
  { group: 'client', subgroup: 'Owner', personName: 'James Chen', organization: 'Coastal Living Pty Ltd', role: 'Development Manager', contactEmail: 'james.chen@coastalliving.com.au', contactPhone: '+61 2 9876 5401' },
  { group: 'client', subgroup: 'Owner', personName: "Marcus O'Brien", organization: 'Coastal Living Pty Ltd', role: "Owner's Representative", contactEmail: 'marcus.obrien@coastalliving.com.au', contactPhone: '+61 2 9876 5402' },

  // AUTHORITY (5) — Council, Sydney Water, Ausgrid, TfNSW, FRNSW
  { group: 'authority', subgroup: 'Council', personName: 'Lisa Tran', organization: 'City of Parramatta Council', role: 'Senior Development Assessment Officer', contactEmail: 'l.tran@cityofparramatta.nsw.gov.au', contactPhone: '+61 2 9806 5050' },
  { group: 'authority', subgroup: 'Other', personName: 'Customer Connections', organization: 'Sydney Water', role: 'Section 73 Coordination', contactEmail: 'connections@sydneywater.com.au', contactPhone: '13 20 92' },
  { group: 'authority', subgroup: 'Other', personName: 'Network Connections', organization: 'Ausgrid', role: 'Connection Application Officer', contactEmail: 'connections@ausgrid.com.au', contactPhone: '13 13 65' },
  { group: 'authority', subgroup: 'TfNSW', personName: 'Janelle Foster', organization: 'Transport for NSW', role: 'Roads Coordination Officer', contactEmail: 'j.foster@transport.nsw.gov.au', contactPhone: '+61 2 8202 2200' },
  { group: 'authority', subgroup: 'FRNSW', personName: 'Captain Simon Reilly', organization: 'Fire and Rescue NSW', role: 'Building Plans Officer', contactEmail: 's.reilly@fire.nsw.gov.au', contactPhone: '+61 2 9265 2999' },

  // CONSULTANTS (12) — discipline subgroups
  { group: 'consultant', subgroup: 'Architecture', personName: 'David Liu', organization: 'SJB Architects', role: 'Project Architect', contactEmail: 'david.liu@sjb.com.au', contactPhone: '+61 2 9380 9911' },
  { group: 'consultant', subgroup: 'Structural', personName: 'Karen Patel', organization: 'Northrop Consulting Engineers', role: 'Principal Structural Engineer', contactEmail: 'k.patel@northrop.com.au', contactPhone: '+61 2 9241 4188' },
  { group: 'consultant', subgroup: 'Mechanical', personName: 'Tom Bennett', organization: 'Norman Disney & Young', role: 'Services Lead (Mech/Elec/Hyd)', contactEmail: 't.bennett@ndy.com', contactPhone: '+61 2 9080 6900' },
  { group: 'consultant', subgroup: 'Civil', personName: 'Robert Kowalski', organization: 'Calibre Consulting', role: 'Civil Engineer', contactEmail: 'r.kowalski@calibreconsulting.com.au', contactPhone: '+61 2 9272 4500' },
  { group: 'consultant', subgroup: 'Other', personName: 'Andrew Yin', organization: 'JK Geotechnics', role: 'Geotechnical Engineer', contactEmail: 'a.yin@jkgeotechnics.com.au', contactPhone: '+61 2 9888 5000' },
  { group: 'consultant', subgroup: 'Other', personName: 'Olivia Hartmann', organization: 'Rider Levett Bucknall', role: 'Quantity Surveyor', contactEmail: 'olivia.hartmann@au.rlb.com', contactPhone: '+61 2 9922 2277' },
  { group: 'consultant', subgroup: 'Other', personName: 'Priya Sharma', organization: 'Urbis', role: 'Town Planner', contactEmail: 'psharma@urbis.com.au', contactPhone: '+61 2 8233 9900' },
  { group: 'consultant', subgroup: 'Acoustic', personName: 'Daniel Webb', organization: 'Acoustic Logic', role: 'Acoustic Consultant', contactEmail: 'dwebb@acousticlogic.com.au', contactPhone: '+61 2 8755 8888' },
  { group: 'consultant', subgroup: 'BCA', personName: 'Helen Ng', organization: 'Philip Chun', role: 'BCA / Building Certifier', contactEmail: 'h.ng@philipchun.com', contactPhone: '+61 2 9412 9777' },
  { group: 'consultant', subgroup: 'Fire', personName: 'Matthew Reilly', organization: 'Holmes Fire', role: 'Fire Engineer', contactEmail: 'm.reilly@holmesfire.com', contactPhone: '+61 2 9252 9442' },
  { group: 'consultant', subgroup: 'Landscape', personName: 'Emily Watson', organization: '360 Degrees Landscape Architects', role: 'Landscape Architect', contactEmail: 'emily@360degrees.com.au', contactPhone: '+61 2 9550 5277' },
  { group: 'consultant', subgroup: 'Surveyor', personName: 'John Park', organization: 'Veris', role: 'Surveyor', contactEmail: 'j.park@veris.com.au', contactPhone: '+61 2 9911 5800' },

  // CONTRACTORS (8) — trade subgroups
  { group: 'contractor', subgroup: 'General Contractor', personName: 'Greg Maxwell', organization: 'ADCO Constructions', role: 'Project Director (Head Contractor)', contactEmail: 'g.maxwell@adcoconstruct.com.au', contactPhone: '+61 2 9430 0888', notes: 'Head contractor — AS 4902 lump sum' },
  { group: 'contractor', subgroup: 'Demolition', personName: 'Project Coordinator', organization: 'Liberty Industrial', role: 'Demolition Contractor', contactEmail: 'projects@libertyindustrial.com.au', contactPhone: '+61 2 9519 9999', notes: 'Demolition complete (Nov 2025)' },
  { group: 'contractor', subgroup: 'Concrete', personName: 'Site Manager', organization: 'Concrete Constructions Group', role: 'Concrete Subcontractor', contactEmail: 'projects@concretegroup.com.au', contactPhone: '+61 2 8755 1100' },
  { group: 'contractor', subgroup: 'Structural Steel', personName: 'Operations Manager', organization: 'Active Steel', role: 'Structural Steel Subcontractor', contactEmail: 'ops@activesteel.com.au', contactPhone: '+61 2 9620 1200' },
  { group: 'contractor', subgroup: 'Other', personName: 'Site Coordinator', organization: 'PERI Australia', role: 'Formwork Subcontractor', contactEmail: 'sydney@peri.com.au', contactPhone: '+61 2 9525 5677' },
  { group: 'contractor', subgroup: 'Facade', personName: 'Project Manager', organization: 'Fairview Architectural', role: 'Cladding Subcontractor', contactEmail: 'projects@fairviewarchitectural.com', contactPhone: '+61 2 8722 4444' },
  { group: 'contractor', subgroup: 'Electrical', personName: 'Site Manager', organization: 'Stowe Australia', role: 'Electrical Subcontractor', contactEmail: 'sydney@stowe.com.au', contactPhone: '+61 2 9748 7000' },
  { group: 'contractor', subgroup: 'Hydraulic', personName: 'Project Coordinator', organization: 'Cooke & Dowsett', role: 'Plumbing/Hydraulic Subcontractor', contactEmail: 'sydney@cookedowsett.com.au', contactPhone: '+61 2 9603 8222' },
];

// Procurement: tender competitors (firms shortlisted/tendered for Architect + Structural disciplines).
// These get inserted into the legacy `consultants` table to populate the firm cards.
export interface DemoTenderFirm {
  discipline: 'Architecture' | 'Structural';
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  abn: string;
  awarded: boolean;          // true for the firm that won the tender
  shortlisted: boolean;
  pricePerStage: { sd: number; dd: number; cc: number; ca: number }; // tender pricing in dollars
  qualityRating: 'A' | 'B' | 'C';   // overall non-price rating
  experienceNote: string;    // non-price evaluation comment
}

export const TENDER_FIRMS: DemoTenderFirm[] = [
  // Architecture (3 firms — SJB awarded)
  { discipline: 'Architecture', companyName: 'SJB Architects', contactPerson: 'David Liu', email: 'david.liu@sjb.com.au', phone: '+61 2 9380 9911', address: 'Level 5, 50 Holt Street, Surry Hills NSW 2010', abn: '20 095 537 482', awarded: true, shortlisted: true, pricePerStage: { sd: 60_000, dd: 130_000, cc: 110_000, ca: 120_000 }, qualityRating: 'A', experienceNote: 'Strong residential apartment portfolio, multiple Wentworth Point projects delivered. Experienced project architect available immediately.' },
  { discipline: 'Architecture', companyName: 'PTW Architects', contactPerson: 'Emma Roberts', email: 'eroberts@ptw.com.au', phone: '+61 2 9456 7890', address: 'Level 15, 1 Bligh Street, Sydney NSW 2000', abn: '45 678 901 234', awarded: false, shortlisted: true, pricePerStage: { sd: 75_000, dd: 145_000, cc: 120_000, ca: 130_000 }, qualityRating: 'A', experienceNote: 'High-quality submission, premium residential experience. Higher fee reflects detailed brief response.' },
  { discipline: 'Architecture', companyName: 'Design Workshop Australia', contactPerson: 'James Wilson', email: 'jwilson@dwa.com.au', phone: '+61 2 9345 6789', address: 'Level 8, 56 Pitt Street, Sydney NSW 2000', abn: '34 567 890 123', awarded: false, shortlisted: true, pricePerStage: { sd: 55_000, dd: 115_000, cc: 95_000, ca: 105_000 }, qualityRating: 'B', experienceNote: 'Competitive pricing but limited recent apartment experience. Risk of resourcing constraints flagged in brief response.' },

  // Structural (3 firms — Northrop awarded)
  { discipline: 'Structural', companyName: 'Northrop Consulting Engineers', contactPerson: 'Karen Patel', email: 'k.patel@northrop.com.au', phone: '+61 2 9241 4188', address: 'Level 7, 80 Pacific Highway, North Sydney NSW 2060', abn: '78 901 234 567', awarded: true, shortlisted: true, pricePerStage: { sd: 30_000, dd: 80_000, cc: 40_000, ca: 30_000 }, qualityRating: 'A', experienceNote: 'Local Sydney team, strong post-tensioned slab experience. Delivered 6 similar Class 2 projects in last 5 years.' },
  { discipline: 'Structural', companyName: 'JJ Marino & Associates', contactPerson: 'Joseph Marino', email: 'jmarino@jjmarino.com.au', phone: '+61 2 9678 9012', address: 'Suite 10, 123 King Street, Sydney NSW 2000', abn: '67 890 123 456', awarded: false, shortlisted: true, pricePerStage: { sd: 28_000, dd: 75_000, cc: 36_000, ca: 28_000 }, qualityRating: 'B', experienceNote: 'Lowest fee but limited capacity for CA stage during construction peak. Quality of brief response was acceptable but not standout.' },
  { discipline: 'Structural', companyName: 'BG&E Consulting Engineers', contactPerson: 'Michelle Brown', email: 'mbrown@bge.com.au', phone: '+61 2 9890 1234', address: 'Level 3, 25 Bligh Street, Sydney NSW 2000', abn: '89 012 345 678', awarded: false, shortlisted: true, pricePerStage: { sd: 32_000, dd: 85_000, cc: 42_000, ca: 32_000 }, qualityRating: 'A', experienceNote: 'Premium-tier submission, strong technical detail. Slightly higher fee but justified by depth of response. Second preference if Northrop unavailable.' },
];

// Date helpers
export function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

export function addMonths(d: Date, months: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + months);
  return r;
}
