// Default Consultant Disciplines (36 total)
export const CONSULTANT_DISCIPLINES = [
  { name: 'Access', order: 1 },
  { name: 'Acoustic', order: 2 },
  { name: 'Arborist', order: 3 },
  { name: 'Architect', order: 4 },
  { name: 'ASP3', order: 5 },
  { name: 'BASIX', order: 6 },
  { name: 'Building Code Advice', order: 7 },
  { name: 'Bushfire', order: 8 },
  { name: 'Building Certifier', order: 9 },
  { name: 'Civil', order: 10 },
  { name: 'Cost Planning', order: 11 },
  { name: 'Ecology', order: 12 },
  { name: 'Electrical', order: 13 },
  { name: 'ESD', order: 14 },
  { name: 'Facade', order: 15 },
  { name: 'Fire Engineering', order: 16 },
  { name: 'Fire Services', order: 17 },
  { name: 'Flood', order: 18 },
  { name: 'Geotech', order: 19 },
  { name: 'Hazmat', order: 20 },
  { name: 'Hydraulic', order: 21 },
  { name: 'Interior Designer', order: 22 },
  { name: 'Landscape', order: 23 },
  { name: 'Mechanical', order: 24 },
  { name: 'NBN', order: 25 },
  { name: 'Passive Fire', order: 26 },
  { name: 'Roof Access', order: 27 },
  { name: 'Site Investigation', order: 28 },
  { name: 'Stormwater', order: 29 },
  { name: 'Structural', order: 30 },
  { name: 'Survey', order: 31 },
  { name: 'Traffic', order: 32 },
  { name: 'Vertical Transport', order: 33 },
  { name: 'Waste Management', order: 34 },
  { name: 'Wastewater', order: 35 },
  { name: 'Waterproofing', order: 36 },
] as const;

// Default Contractor Trades (21 total)
export const CONTRACTOR_TRADES = [
  { name: 'Concrete Finisher', order: 1 },
  { name: 'Steel Fixer', order: 2 },
  { name: 'Scaffolder', order: 3 },
  { name: 'Carpenter', order: 4 },
  { name: 'Bricklayer', order: 5 },
  { name: 'Roofer', order: 6 },
  { name: 'Glazier', order: 7 },
  { name: 'Waterproofer', order: 8 },
  { name: 'Plumber', order: 9 },
  { name: 'Electrician', order: 10 },
  { name: 'HVAC Technician', order: 11 },
  { name: 'Insulation Installer', order: 12 },
  { name: 'Drywaller', order: 13 },
  { name: 'Plasterer', order: 14 },
  { name: 'Tiler', order: 15 },
  { name: 'Flooring Installer', order: 16 },
  { name: 'Painter', order: 17 },
  { name: 'Cabinetmaker', order: 18 },
  { name: 'Mason', order: 19 },
  { name: 'Welder', order: 20 },
  { name: 'Landscaper', order: 21 },
] as const;

// Status types for both consultants and contractors
export const STATUS_TYPES = ['brief', 'tender', 'rec', 'award'] as const;

export type ConsultantDisciplineName = typeof CONSULTANT_DISCIPLINES[number]['name'];
export type ContractorTradeName = typeof CONTRACTOR_TRADES[number]['name'];
export type StatusType = typeof STATUS_TYPES[number];
