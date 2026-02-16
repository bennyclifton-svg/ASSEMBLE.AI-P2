/**
 * Stakeholder Generation Service
 * Feature: 020-stakeholder
 *
 * Generates stakeholders based on project profile data from the Profiler module
 */

import { fetchProfileExportData } from './planning-context';
import {
  CORE_DISCIPLINES,
  SUBCLASS_CORE_OVERRIDES,
  CLASS_DISCIPLINES,
  COMPLEXITY_DISCIPLINES,
  SUBCLASS_DISCIPLINES,
  SCALE_THRESHOLDS,
  CORE_TRADES,
  CLASS_TRADES,
  WORK_SCOPE_TRADES,
  DEFAULT_CLIENT_STAKEHOLDERS,
  AUTHORITIES_BY_STATE,
  NSW_AUTHORITIES,
  disciplineToStakeholderRequest,
  tradeToStakeholderRequest,
  clientToStakeholderRequest,
  authorityToStakeholderRequest,
  type DisciplineDef,
  type TradeDef,
  type AuthorityDef,
} from '../data/default-stakeholders';
import profileTemplates from '@/lib/data/profile-templates.json';
import type { ProjectType, WorkScopeItem, WorkScopeCategory } from '@/types/profiler';
import {
  getStakeholders,
  bulkCreateStakeholders,
  deleteStakeholdersByGroup,
} from './stakeholder-service';
import type {
  StakeholderGroup,
  CreateStakeholderRequest,
  GeneratedStakeholder,
  GenerateStakeholdersRequest,
  GenerateStakeholdersResponse,
  StakeholderWithStatus,
} from '@/types/stakeholder';

// ============================================
// Profile Context Interface
// ============================================

interface ProfileContext {
  buildingClass: string;
  projectType: string;
  subclass: string[];
  complexity: Record<string, string | string[]>;
  complexityScore: number;
  scaleData?: Record<string, number>; // For scale-based discipline generation
  state?: string; // For authority selection
  workScope?: string[]; // For work scope-based generation
}

// ============================================
// Helper Functions
// ============================================

/**
 * Find a work scope item by value from profile-templates.json
 */
function findWorkScopeItem(scopeValue: string, projectType: string | null): WorkScopeItem | null {
  if (!projectType) return null;
  const workScopeOptions = (profileTemplates as any).workScopeOptions;
  const typeConfig = workScopeOptions?.[projectType];
  if (!typeConfig) return null;

  for (const category of Object.values(typeConfig) as WorkScopeCategory[]) {
    const item = category.items.find((i: WorkScopeItem) => i.value === scopeValue);
    if (item) return item;
  }
  return null;
}

/**
 * Check if a discipline matches the profile conditions
 */
function matchesDisciplineConditions(
  def: DisciplineDef,
  profile: ProfileContext
): boolean {
  if (!def.conditions) return true;

  // Check building class
  if (def.conditions.buildingClass) {
    if (!def.conditions.buildingClass.includes(profile.buildingClass)) {
      return false;
    }
  }

  // Check project type
  if (def.conditions.projectType) {
    if (!def.conditions.projectType.includes(profile.projectType)) {
      return false;
    }
  }

  // Check subclass
  if (def.conditions.subclass) {
    const hasMatch = def.conditions.subclass.some(s => profile.subclass.includes(s));
    if (!hasMatch) return false;
  }

  // Check complexity
  if (def.conditions.complexity) {
    const complexityValues = Object.values(profile.complexity);
    const hasMatch = def.conditions.complexity.some(c => complexityValues.includes(c));
    if (!hasMatch) return false;
  }

  return true;
}

/**
 * Check if an authority matches the profile conditions
 */
function matchesAuthorityConditions(
  def: AuthorityDef,
  profile: ProfileContext
): boolean {
  const { conditions } = def;

  // Required authorities are always included
  if (conditions.required) return true;

  // Check building class
  if (conditions.buildingClass) {
    if (!conditions.buildingClass.includes(profile.buildingClass)) {
      return false;
    }
  }

  // Check subclass
  if (conditions.subclass) {
    const hasMatch = conditions.subclass.some(s => profile.subclass.includes(s));
    if (!hasMatch) return false;
  }

  // Check complexity
  if (conditions.complexity) {
    const complexityValues = Object.values(profile.complexity);
    const hasMatch = conditions.complexity.some(c => complexityValues.includes(c));
    if (!hasMatch) return false;
  }

  return true;
}

// ============================================
// Generation Functions
// ============================================

/**
 * Generate consultant stakeholders based on profile
 */
function generateConsultants(profile: ProfileContext): GeneratedStakeholder[] {
  const result: GeneratedStakeholder[] = [];
  const addedDisciplines = new Set<string>();

  // Check if any subclass has a core discipline override (e.g. house)
  console.log('[generateConsultants] Profile subclass:', JSON.stringify(profile.subclass), 'buildingClass:', profile.buildingClass);
  const subclassOverride = profile.subclass.find(sc => SUBCLASS_CORE_OVERRIDES[sc]);
  console.log('[generateConsultants] Subclass override match:', subclassOverride || 'NONE (using default cores)');
  const coreDisciplines = subclassOverride
    ? SUBCLASS_CORE_OVERRIDES[subclassOverride]
    : CORE_DISCIPLINES;

  // Add core/override disciplines
  for (const def of coreDisciplines) {
    result.push({
      stakeholderGroup: 'consultant',
      name: def.name,
      disciplineOrTrade: def.disciplineOrTrade,
      reason: def.reason,
    });
    addedDisciplines.add(def.disciplineOrTrade);
  }

  // Add class-specific disciplines
  for (const def of CLASS_DISCIPLINES) {
    if (matchesDisciplineConditions(def, profile) && !addedDisciplines.has(def.disciplineOrTrade)) {
      result.push({
        stakeholderGroup: 'consultant',
        name: def.name,
        disciplineOrTrade: def.disciplineOrTrade,
        reason: def.reason,
      });
      addedDisciplines.add(def.disciplineOrTrade);
    }
  }

  // Add complexity-triggered disciplines
  for (const def of COMPLEXITY_DISCIPLINES) {
    if (matchesDisciplineConditions(def, profile) && !addedDisciplines.has(def.disciplineOrTrade)) {
      result.push({
        stakeholderGroup: 'consultant',
        name: def.name,
        disciplineOrTrade: def.disciplineOrTrade,
        reason: def.reason,
      });
      addedDisciplines.add(def.disciplineOrTrade);
    }
  }

  // Add subclass-specific disciplines
  for (const def of SUBCLASS_DISCIPLINES) {
    if (matchesDisciplineConditions(def, profile) && !addedDisciplines.has(def.disciplineOrTrade)) {
      result.push({
        stakeholderGroup: 'consultant',
        name: def.name,
        disciplineOrTrade: def.disciplineOrTrade,
        reason: def.reason,
      });
      addedDisciplines.add(def.disciplineOrTrade);
    }
  }

  // Add scale-triggered disciplines
  if (profile.scaleData) {
    for (const threshold of SCALE_THRESHOLDS) {
      const value = profile.scaleData[threshold.key];
      if (value !== undefined && value >= threshold.threshold) {
        const def = threshold.discipline;
        if (!addedDisciplines.has(def.disciplineOrTrade)) {
          result.push({
            stakeholderGroup: 'consultant',
            name: def.name,
            disciplineOrTrade: def.disciplineOrTrade,
            reason: def.reason,
          });
          addedDisciplines.add(def.disciplineOrTrade);
        }
      }
    }
  }

  // Add work scope-triggered disciplines (from profile-templates.json)
  if (profile.workScope && profile.workScope.length > 0) {
    for (const scopeValue of profile.workScope) {
      const scopeItem = findWorkScopeItem(scopeValue, profile.projectType);
      if (scopeItem?.consultants) {
        for (const consultant of scopeItem.consultants) {
          // Use the consultant name as both name and disciplineOrTrade
          // Map common consultant names to discipline codes
          const disciplineCode = mapConsultantToDiscipline(consultant);
          if (!addedDisciplines.has(disciplineCode)) {
            result.push({
              stakeholderGroup: 'consultant',
              name: consultant,
              disciplineOrTrade: disciplineCode,
              reason: `Required for ${scopeItem.label}`,
            });
            addedDisciplines.add(disciplineCode);
          }
        }
      }
    }
  }

  // Sort alphabetically by disciplineOrTrade
  return result.sort((a, b) =>
    (a.disciplineOrTrade || '').localeCompare(b.disciplineOrTrade || '')
  );
}

/**
 * Map consultant names from profile-templates.json to discipline codes
 * Most names now pass through directly since profile-templates uses clean names
 */
function mapConsultantToDiscipline(consultantName: string): string {
  const mappings: Record<string, string> = {
    // Names that need mapping to different discipline codes
    'Architect': 'Architecture',
    'Fire Engineer': 'Fire',  // Fire Engineer kept as-is per user request
    // Specialist names that may still appear with full names
    'Occupational Hygienist': 'Occupational Hygiene',
    'Contamination Specialist': 'Contamination',
    'Concrete Technologist': 'Concrete Technology',
    'Corrosion Specialist': 'Corrosion',
    'PFAS Specialist': 'PFAS',
    'Hydrogeologist': 'Hydrogeology',
    'Expert Witness': 'Expert Witness',
    'Project Manager': 'Project Manager',
    'Construction Manager': 'Construction Manager',
    'Building Manager': 'Building Manager',
  };
  return mappings[consultantName] || consultantName;
}

/**
 * Generate contractor stakeholders based on profile
 * Priority: Work Scope trades > Class trades (for scoped projects)
 *           Class trades only (for new builds and advisory)
 */
function generateContractors(profile: ProfileContext): GeneratedStakeholder[] {
  const result: GeneratedStakeholder[] = [];
  const addedTrades = new Set<string>();

  // Always add core trades (Main Contractor)
  for (const def of CORE_TRADES) {
    result.push({
      stakeholderGroup: 'contractor',
      name: def.name,
      disciplineOrTrade: def.disciplineOrTrade,
      reason: 'Core trade',
    });
    addedTrades.add(def.disciplineOrTrade);
  }

  // Check if this is a work-scope-driven project type
  const scopedProjectTypes = ['remediation', 'refurb', 'extend'];
  const hasWorkScope = profile.workScope && profile.workScope.length > 0;
  const isScopedProject = scopedProjectTypes.includes(profile.projectType);

  if (isScopedProject && hasWorkScope) {
    // Priority: Add trades from work scope items
    for (const scopeItem of profile.workScope!) {
      const scopeTrades = WORK_SCOPE_TRADES[scopeItem];
      if (scopeTrades) {
        for (const def of scopeTrades) {
          if (!addedTrades.has(def.disciplineOrTrade)) {
            result.push({
              stakeholderGroup: 'contractor',
              name: def.name,
              disciplineOrTrade: def.disciplineOrTrade,
              reason: `Required for ${scopeItem.replace(/_/g, ' ')}`,
            });
            addedTrades.add(def.disciplineOrTrade);
          }
        }
      }
    }
  } else {
    // Fall back to class-based trades for new_build, advisory, or empty work scope
    const classTrades = CLASS_TRADES[profile.buildingClass] || CLASS_TRADES['commercial'] || [];
    for (const def of classTrades) {
      if (!addedTrades.has(def.disciplineOrTrade)) {
        result.push({
          stakeholderGroup: 'contractor',
          name: def.name,
          disciplineOrTrade: def.disciplineOrTrade,
          reason: `${profile.buildingClass} project typical`,
        });
        addedTrades.add(def.disciplineOrTrade);
      }
    }
  }

  // Sort alphabetically by disciplineOrTrade
  return result.sort((a, b) =>
    (a.disciplineOrTrade || '').localeCompare(b.disciplineOrTrade || '')
  );
}

/**
 * Generate client stakeholders
 */
function generateClients(): GeneratedStakeholder[] {
  return DEFAULT_CLIENT_STAKEHOLDERS
    .map(def => ({
      stakeholderGroup: 'client' as StakeholderGroup,
      name: def.name,
      role: def.role,
      reason: def.description,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Generate authority stakeholders based on profile and jurisdiction
 */
function generateAuthorities(profile: ProfileContext): GeneratedStakeholder[] {
  // Default to NSW if no state specified
  const state = profile.state || 'NSW';
  const authorities = AUTHORITIES_BY_STATE[state] || NSW_AUTHORITIES;

  return authorities
    .filter(def => matchesAuthorityConditions(def, profile))
    .map(def => ({
      stakeholderGroup: 'authority' as StakeholderGroup,
      name: def.name,
      role: def.role,
      reason: def.submissionType,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ============================================
// Main Generation Function
// ============================================

/**
 * Generate stakeholders for a project based on its profile
 */
export async function generateStakeholders(
  projectId: string,
  request: GenerateStakeholdersRequest = {}
): Promise<GenerateStakeholdersResponse> {
  // Fetch profile data from Profiler module
  const profileData = await fetchProfileExportData(projectId);
  console.log('[generateStakeholders] Profile data found:', !!profileData, profileData ? { buildingClass: profileData.buildingClass, subclass: profileData.subclass, projectType: profileData.projectType } : 'NONE - using defaults');

  // Default profile if no profiler data exists
  const profile: ProfileContext = profileData
    ? {
        buildingClass: profileData.buildingClass,
        projectType: profileData.projectType,
        subclass: profileData.subclass,
        complexity: profileData.complexity,
        complexityScore: profileData.complexityScore,
        scaleData: profileData.scaleData,
        workScope: profileData.workScope,
      }
    : {
        buildingClass: 'commercial',
        projectType: 'new_build',
        subclass: [],
        complexity: {},
        complexityScore: 5,
        scaleData: {},
        workScope: [],
      };

  // Determine which groups to generate
  const groupsToGenerate: StakeholderGroup[] = request.groups || ['client', 'authority', 'consultant', 'contractor'];

  // Generate stakeholders for each group
  const generated: GeneratedStakeholder[] = [];

  if (groupsToGenerate.includes('client')) {
    generated.push(...generateClients());
  }

  if (groupsToGenerate.includes('authority') && request.includeAuthorities !== false) {
    generated.push(...generateAuthorities(profile));
  }

  if (groupsToGenerate.includes('consultant')) {
    generated.push(...generateConsultants(profile));
  }

  if (groupsToGenerate.includes('contractor') && request.includeContractors !== false) {
    generated.push(...generateContractors(profile));
  }

  // Get existing stakeholder count
  const existing = await getStakeholders(projectId);

  return {
    generated,
    profileContext: {
      buildingClass: profile.buildingClass,
      projectType: profile.projectType,
      subclass: profile.subclass,
      complexityScore: profile.complexityScore,
    },
    existingCount: existing.counts.total,
    mode: request.mode || 'merge',
  };
}

/**
 * Check if a generated stakeholder already exists in the list
 */
function stakeholderExists(
  generated: GeneratedStakeholder,
  existing: StakeholderWithStatus[]
): boolean {
  const sameGroup = existing.filter(ex => ex.stakeholderGroup === generated.stakeholderGroup);

  return sameGroup.some(ex => {
    // Match by name (case-insensitive)
    const nameMatch = ex.name.toLowerCase() === generated.name.toLowerCase();

    // For consultants/contractors, also check disciplineOrTrade
    if (generated.disciplineOrTrade && ex.disciplineOrTrade) {
      const tradeMatch = ex.disciplineOrTrade.toLowerCase() === generated.disciplineOrTrade.toLowerCase();
      return nameMatch || tradeMatch;
    }

    return nameMatch;
  });
}

/**
 * Apply generated stakeholders to a project
 * When existingStakeholders is provided, performs smart deduplication (only adds new ones)
 */
export async function applyGeneratedStakeholders(
  projectId: string,
  generated: GeneratedStakeholder[],
  mode: 'merge' | 'replace' = 'merge',
  requestedGroups?: StakeholderGroup[],
  existingStakeholders?: StakeholderWithStatus[]
): Promise<{ created: number; deleted: number; skipped: number }> {
  let deleted = 0;
  let skipped = 0;

  console.log('[applyGeneratedStakeholders] Mode:', mode, 'RequestedGroups:', requestedGroups);

  // In replace mode, delete existing stakeholders for the requested groups
  // Use requestedGroups if provided, otherwise derive from generated array
  if (mode === 'replace') {
    const groupsToDelete = requestedGroups || [
      ...new Set(generated.map(s => s.stakeholderGroup))
    ];
    console.log('[applyGeneratedStakeholders] Deleting groups:', groupsToDelete);
    for (const group of groupsToDelete) {
      const deletedCount = await deleteStakeholdersByGroup(projectId, group);
      console.log('[applyGeneratedStakeholders] Deleted', deletedCount, 'from group:', group);
      deleted += deletedCount;
    }
  } else {
    console.log('[applyGeneratedStakeholders] Skipping delete - mode is not replace');
  }

  // Smart deduplication: filter out stakeholders that already exist
  let stakeholdersToCreate = generated;
  if (existingStakeholders && existingStakeholders.length > 0) {
    console.log('[applyGeneratedStakeholders] Smart merge - checking against', existingStakeholders.length, 'existing stakeholders');
    stakeholdersToCreate = generated.filter(gen => {
      if (stakeholderExists(gen, existingStakeholders)) {
        skipped++;
        console.log('[applyGeneratedStakeholders] Skipping duplicate:', gen.name);
        return false;
      }
      return true;
    });
    console.log('[applyGeneratedStakeholders] After dedup:', stakeholdersToCreate.length, 'to create,', skipped, 'skipped');
  }

  // Convert generated stakeholders to create requests
  const createRequests: CreateStakeholderRequest[] = stakeholdersToCreate.map(g => ({
    stakeholderGroup: g.stakeholderGroup,
    name: g.name,
    role: g.role,
    disciplineOrTrade: g.disciplineOrTrade,
    isEnabled: true,
    isAiGenerated: true,
    notes: `Generated: ${g.reason}`,
  }));

  // Create the stakeholders
  const created = await bulkCreateStakeholders(projectId, createRequests);

  return {
    created: created.length,
    deleted,
    skipped,
  };
}

/**
 * Preview stakeholders that would be generated without applying them
 */
export async function previewGeneratedStakeholders(
  projectId: string,
  request: GenerateStakeholdersRequest = {}
): Promise<GenerateStakeholdersResponse> {
  return generateStakeholders(projectId, request);
}
