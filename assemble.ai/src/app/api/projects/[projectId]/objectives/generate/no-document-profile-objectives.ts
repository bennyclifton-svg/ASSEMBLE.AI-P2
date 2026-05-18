import type { ObjectiveSource, ObjectiveType } from '@/lib/db/objectives-schema';
import type { ProjectType } from '@/types/profiler';

export interface NoDocumentProfileContext {
  buildingClass: string;
  projectType: ProjectType;
  subclass: string[];
  scaleData: Record<string, number | string>;
  complexity: Record<string, string | string[]>;
  workScopeLabels: string[];
  classDescriptors: string[];
}

export interface NoDocumentObjectiveItem {
  text: string;
  source: ObjectiveSource;
  sourceDetail?: string;
}

const DEFAULT_MAX_PER_SECTION = 5;

function valueAsString(value: unknown): string {
  if (Array.isArray(value)) return value.map(valueAsString).filter(Boolean).join(', ');
  if (value === null || value === undefined || value === '') return '';
  return String(value).replace(/[_-]+/g, ' ').trim();
}

function scale(profile: NoDocumentProfileContext, keys: string[]): string {
  for (const key of keys) {
    const value = profile.scaleData[key];
    const text = valueAsString(value);
    if (text) return text;
  }
  return '';
}

function complexity(profile: NoDocumentProfileContext, keys: string[]): string {
  for (const key of keys) {
    const value = profile.complexity[key];
    const text = valueAsString(value);
    if (text) return text;
  }
  return '';
}

function hasSubclass(profile: NoDocumentProfileContext, term: string): boolean {
  return profile.subclass.some((item) => item.toLowerCase().includes(term));
}

function hasScope(profile: NoDocumentProfileContext, terms: string[]): boolean {
  const haystack = profile.workScopeLabels.join(' ').toLowerCase();
  return terms.some((term) => haystack.includes(term));
}

function add(
  target: NoDocumentObjectiveItem[],
  text: string | undefined,
  sourceDetail: string,
  source: ObjectiveSource = 'profile_fact',
): void {
  if (!text) return;
  target.push({ text, source, sourceDetail });
}

function sourceDetail(label: string, value: string): string {
  if (!value) return '';
  return `${label}: ${value}`;
}

function classSignal(profile: NoDocumentProfileContext): string {
  return profile.classDescriptors[0] || `${profile.buildingClass} ${profile.subclass.join(', ')}`.trim();
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function dedupe(items: NoDocumentObjectiveItem[]): NoDocumentObjectiveItem[] {
  const seen = new Set<string>();
  const out: NoDocumentObjectiveItem[] = [];
  for (const item of items) {
    const key = normalizeText(item.text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function keepSpecificAiItem(item: NoDocumentObjectiveItem): boolean {
  const text = item.text.toLowerCase();
  if (/\b(standard|selected|appropriate|timely|robust|high[-\s]?quality)\b/.test(text)) return false;
  if (/\b(scope|requirements|standards|approvals|compliance)\b$/.test(text) && item.text.split(/\s+/).length <= 5) {
    return false;
  }
  return true;
}

export function buildNoDocumentProfileObjectiveCandidates(
  profile: NoDocumentProfileContext,
): Partial<Record<ObjectiveType, NoDocumentObjectiveItem[]>> {
  const storeys = scale(profile, ['storeys', 'storeyCount']);
  const units = scale(profile, ['units', 'dwellings', 'apartments']);
  const gfa = scale(profile, ['gfa_sqm', 'gfa']);
  const avgUnit = scale(profile, ['avg_unit_sqm', 'average_unit_size']);
  const parking = scale(profile, ['parking_bays', 'car_spaces']);
  const basementLevels = scale(profile, ['parking_basement_levels', 'basement_levels']);
  const classText = classSignal(profile);
  const apartmentAsset = hasSubclass(profile, 'apartment') ? 'Class 2 apartment building' : `${profile.buildingClass} building`;

  const heritage = complexity(profile, ['heritage']);
  const approvalPathway = complexity(profile, ['approval_pathway', 'approvalPathway']);
  const contamination = complexity(profile, ['contamination_level', 'contaminationLevel']);
  const access = complexity(profile, ['access_constraints', 'accessConstraints']);
  const operation = complexity(profile, ['operational_constraints', 'operationalConstraints']);
  const procurement = complexity(profile, ['procurement_route', 'procurementRoute']);
  const environmental = complexity(profile, ['environmental_sensitivity', 'environmentalSensitivity']);
  const siteConditions = complexity(profile, ['site_conditions', 'siteConditions']);
  const stakeholder = complexity(profile, ['stakeholder_complexity', 'stakeholderComplexity']);
  const qualityTier = complexity(profile, ['quality_tier', 'qualityTier']);

  const planning: NoDocumentObjectiveItem[] = [];
  add(
    planning,
    storeys ? `Verify approval pathway for ${storeys}-storey scheme` : undefined,
    [sourceDetail('storeys', storeys), sourceDetail('approval_pathway', approvalPathway)].filter(Boolean).join('; '),
  );
  add(planning, heritage ? 'Resolve heritage overlay constraints' : undefined, sourceDetail('heritage', heritage));
  add(
    planning,
    contamination || hasScope(profile, ['decontamination'])
      ? 'Secure decontamination and site-clearance approvals'
      : undefined,
    [sourceDetail('contamination_level', contamination), 'work scope: decontamination, site clearance'].filter(Boolean).join('; '),
  );
  add(
    planning,
    hasScope(profile, ['stormwater', 'site drainage', 'internal roads'])
      ? 'Coordinate stormwater, drainage and road approvals'
      : undefined,
    'work scope: stormwater management, site drainage, internal roads',
  );
  add(
    planning,
    access || operation || siteConditions
      ? 'Plan constrained infill access and staging'
      : undefined,
    [sourceDetail('access_constraints', access), sourceDetail('operational_constraints', operation), sourceDetail('site_conditions', siteConditions)]
      .filter(Boolean)
      .join('; '),
  );

  const functional: NoDocumentObjectiveItem[] = [];
  add(
    functional,
    storeys && units ? `Deliver ${storeys}-storey, ${units}-apartment building` : undefined,
    [sourceDetail('storeys', storeys), sourceDetail('units', units), classText].filter(Boolean).join('; '),
  );
  add(
    functional,
    gfa && avgUnit ? `Provide ${gfa} sqm GFA and ${avgUnit} sqm average units` : undefined,
    [sourceDetail('gfa_sqm', gfa), sourceDetail('avg_unit_sqm', avgUnit)].filter(Boolean).join('; '),
  );
  add(
    functional,
    parking ? `Provide ${parking} parking bays${basementLevels ? ` over ${basementLevels} basement levels` : ''}` : undefined,
    [sourceDetail('parking_bays', parking), sourceDetail('parking_basement_levels', basementLevels)].filter(Boolean).join('; '),
  );
  add(
    functional,
    hasScope(profile, ['post tensioning', 'precast', 'substructure', 'superstructure', 'vertical transport'])
      ? 'Integrate structure, precast and vertical transport'
      : undefined,
    'work scope: substructure, superstructure, post-tensioning, precast elements, vertical transport',
  );
  add(
    functional,
    hasScope(profile, ['mechanical', 'electrical', 'hydraulic', 'fire', 'bms'])
      ? 'Integrate HVAC, power, hydraulics, fire and BMS'
      : undefined,
    'work scope: mechanical HVAC, electrical power, hydraulic plumbing, fire services, BMS controls',
  );

  const quality: NoDocumentObjectiveItem[] = [];
  add(
    quality,
    qualityTier ? `Apply ${qualityTier} quality tier across finishes` : undefined,
    sourceDetail('quality_tier', qualityTier),
  );
  add(
    quality,
    hasScope(profile, ['facade', 'curtain wall', 'glazing', 'waterproofing'])
      ? 'Control facade, glazing and waterproofing performance'
      : undefined,
    'work scope: facade system, curtain wall, glazing, waterproofing',
  );
  add(
    quality,
    hasScope(profile, ['post tensioning', 'precast', 'facade'])
      ? 'Manage structural tolerances at facade interfaces'
      : undefined,
    'work scope: post-tensioning, precast elements, facade system',
  );
  add(
    quality,
    hasScope(profile, ['earthworks', 'site drainage', 'stormwater'])
      ? 'Control earthworks, drainage and stormwater workmanship'
      : undefined,
    'work scope: bulk earthworks, detailed earthworks, site drainage, stormwater management',
  );
  add(
    quality,
    hasSubclass(profile, 'apartment') ? 'Set apartment acoustic and waterproofing standards' : undefined,
    `${apartmentAsset}; domain guidance: Class 2 apartment performance`,
    'seed_knowledge',
  );

  const compliance: NoDocumentObjectiveItem[] = [];
  add(
    compliance,
    classText ? 'Confirm Class 2 NCC/BCA compliance' : undefined,
    classText,
  );
  add(
    compliance,
    hasSubclass(profile, 'apartment') ? 'Comply with BASIX and NatHERS requirements' : undefined,
    'residential apartment sustainability compliance',
    'seed_knowledge',
  );
  add(
    compliance,
    hasScope(profile, ['fire', 'vertical transport', 'mechanical', 'electrical', 'hydraulic'])
      ? 'Certify fire, lift and building-services systems'
      : undefined,
    'work scope: fire services, vertical transport, mechanical, electrical, hydraulic',
  );
  add(
    compliance,
    hasScope(profile, ['stormwater', 'site drainage']) || environmental
      ? 'Meet stormwater and environmental site controls'
      : undefined,
    [sourceDetail('environmental_sensitivity', environmental), 'work scope: stormwater management, site drainage'].filter(Boolean).join('; '),
  );
  add(
    compliance,
    heritage || contamination || stakeholder
      ? 'Address heritage, contamination and stakeholder obligations'
      : undefined,
    [sourceDetail('heritage', heritage), sourceDetail('contamination_level', contamination), sourceDetail('stakeholder_complexity', stakeholder)]
      .filter(Boolean)
      .join('; '),
  );

  return {
    planning: dedupe(planning),
    functional: dedupe(functional),
    quality: dedupe(quality),
    compliance: dedupe(compliance),
  };
}

export function strengthenNoDocumentGeneratedObjectives(
  generated: Partial<Record<ObjectiveType, NoDocumentObjectiveItem[]>>,
  profile: NoDocumentProfileContext,
  sections: ObjectiveType[],
  maxPerSection = DEFAULT_MAX_PER_SECTION,
): Partial<Record<ObjectiveType, NoDocumentObjectiveItem[]>> {
  const candidates = buildNoDocumentProfileObjectiveCandidates(profile);
  const strengthened: Partial<Record<ObjectiveType, NoDocumentObjectiveItem[]>> = { ...generated };

  for (const section of sections) {
    const profileItems = candidates[section] ?? [];
    const aiItems = (generated[section] ?? []).filter(keepSpecificAiItem);
    strengthened[section] = dedupe([...profileItems, ...aiItems]).slice(0, maxPerSection);
  }

  return strengthened;
}
