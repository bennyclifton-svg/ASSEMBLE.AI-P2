// src/lib/context/modules/profile.ts
// Profile module fetcher - extracts from projectProfiles table

import { db } from '@/lib/db';
import { projectProfiles } from '@/lib/db/pg-schema';
import { eq } from 'drizzle-orm';
import type { ModuleResult } from '../types';

export interface ProfileData {
  buildingClass: string;
  buildingClassDisplay: string;
  projectType: string;
  projectTypeDisplay: string;
  subclass: string[];              // was single string, now array
  subclassOther: string[];         // NEW
  gfaSqm: number | null;
  storeys: number | null;
  scaleData: Record<string, number>;  // NEW: full scale data
  qualityTier: string | null;
  complexityScore: number | null;
  procurementRoute: string | null;
  complexity: Record<string, string | string[]>;  // NEW: full complexity dimensions
  workScope: string[];             // NEW: major gap filled
  region: string;
}

const BUILDING_CLASS_DISPLAY: Record<string, string> = {
  residential: 'Residential',
  commercial: 'Commercial',
  industrial: 'Industrial',
  institution: 'Institutional',
  mixed: 'Mixed-Use',
  infrastructure: 'Infrastructure',
  agricultural: 'Agricultural',
  defense_secure: 'Defense & Secure',
};

const PROJECT_TYPE_DISPLAY: Record<string, string> = {
  refurb: 'Refurbishment',
  extend: 'Extension',
  new: 'New Build',
  remediation: 'Remediation',
  advisory: 'Advisory',
};

export async function fetchProfile(
  projectId: string
): Promise<ModuleResult<ProfileData | null>> {
  try {
    const profile = await db.query.projectProfiles.findFirst({
      where: eq(projectProfiles.projectId, projectId),
    });

    if (!profile) {
      return {
        moduleName: 'profile',
        success: true,
        data: null,
        estimatedTokens: 0,
      };
    }

    // Parse subclass and subclassOther as JSON arrays
    let subclass: string[] = [];
    let subclassOther: string[] = [];
    try {
      subclass = JSON.parse(profile.subclass || '[]');
    } catch {
      /* ignore parse errors */
    }
    try {
      subclassOther = JSON.parse(profile.subclassOther || '[]');
    } catch {
      /* ignore parse errors */
    }

    // Parse scale data JSON for GFA, storeys, and full scale object
    let gfaSqm: number | null = null;
    let storeys: number | null = null;
    let scaleData: Record<string, number> = {};
    try {
      const parsed = JSON.parse(profile.scaleData || '{}');
      scaleData = parsed as Record<string, number>;
      gfaSqm = parsed.gfa_sqm ?? parsed.gfaSqm ?? null;
      storeys = parsed.levels ?? parsed.storeys ?? null;
    } catch {
      /* ignore parse errors */
    }

    // Parse complexity data for quality tier, procurement route, and full complexity object
    let qualityTier: string | null = null;
    let procurementRoute: string | null = null;
    let complexity: Record<string, string | string[]> = {};
    try {
      const complexityData = JSON.parse(profile.complexity || '{}');
      complexity = complexityData as Record<string, string | string[]>;
      qualityTier =
        complexityData.quality ?? complexityData.qualityTier ?? null;
      procurementRoute =
        complexityData.procurement_route ??
        complexityData.procurementRoute ??
        null;
    } catch {
      /* ignore parse errors */
    }

    // Parse workScope as JSON array
    let workScope: string[] = [];
    try {
      workScope = JSON.parse(profile.workScope || '[]');
    } catch {
      /* ignore parse errors */
    }

    const buildingClass = profile.buildingClass ?? '';
    const projectType = profile.projectType ?? '';

    const data: ProfileData = {
      buildingClass,
      buildingClassDisplay:
        BUILDING_CLASS_DISPLAY[buildingClass] ?? buildingClass,
      projectType,
      projectTypeDisplay: PROJECT_TYPE_DISPLAY[projectType] ?? projectType,
      subclass,
      subclassOther,
      gfaSqm,
      storeys,
      scaleData,
      qualityTier,
      complexityScore: profile.complexityScore ?? null,
      procurementRoute,
      complexity,
      workScope,
      region: profile.region ?? 'AU',
    };

    return { moduleName: 'profile', success: true, data, estimatedTokens: 120 };
  } catch (error) {
    return {
      moduleName: 'profile',
      success: false,
      data: null,
      error: `Profile fetch failed: ${error}`,
      estimatedTokens: 0,
    };
  }
}
