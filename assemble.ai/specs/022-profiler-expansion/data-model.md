# Profiler Expansion Data Model

## Overview

This document describes the data model changes required for the Profiler Expansion module.

---

## 1. Updated Enums

### 1.1 Building Class Enum

```typescript
// src/types/profiler.ts
export const BUILDING_CLASSES = [
  'residential',
  'commercial',
  'industrial',
  'institution',
  'mixed',
  'infrastructure',
  'agricultural',      // NEW
  'defense_secure'     // NEW
] as const;

export type BuildingClass = typeof BUILDING_CLASSES[number];
```

### 1.2 PostgreSQL Enum Update

```sql
-- Migration: Add new building classes
ALTER TYPE building_class ADD VALUE 'agricultural';
ALTER TYPE building_class ADD VALUE 'defense_secure';
```

### 1.3 Region Enum

```typescript
// src/types/profiler.ts
export const REGIONS = ['AU', 'NZ', 'UK', 'US'] as const;
export type Region = typeof REGIONS[number];
```

```sql
-- PostgreSQL enum
CREATE TYPE region AS ENUM ('AU', 'NZ', 'UK', 'US');
```

---

## 2. Updated Tables

### 2.1 project_profiles Table

```sql
-- Existing table with new column
ALTER TABLE project_profiles ADD COLUMN region TEXT DEFAULT 'AU';
ALTER TABLE project_profiles ADD CONSTRAINT region_check
  CHECK (region IN ('AU', 'NZ', 'UK', 'US'));

-- Full table definition
CREATE TABLE project_profiles (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  building_class TEXT NOT NULL,      -- enum: residential, commercial, industrial, institution, mixed, infrastructure, agricultural, defense_secure
  project_type TEXT NOT NULL,        -- enum: refurb, extend, new, remediation, advisory
  subclass JSONB NOT NULL,           -- array for multi-select: ["residential", "retail"]
  subclass_other TEXT[],             -- array of free text entries if 'other' selected
  scale_data JSONB NOT NULL,         -- { levels: 5, gfa_sqm: 12000, units: 48 }
  complexity JSONB NOT NULL,         -- multi-dimensional: { quality: "premium", site: "heritage" }
  region TEXT DEFAULT 'AU',          -- NEW: region code
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id)
);

-- Indexes
CREATE INDEX idx_profiles_class_type ON project_profiles(building_class, project_type);
CREATE INDEX idx_profiles_subclass ON project_profiles USING GIN(subclass);
CREATE INDEX idx_profiles_region ON project_profiles(region);  -- NEW
```

---

## 3. TypeScript Interfaces

### 3.1 Profile Data Types

```typescript
// src/types/profiler.ts

export interface ProjectProfile {
  id: string;
  projectId: string;
  buildingClass: BuildingClass;
  projectType: ProjectType;
  subclass: string[];           // Array for multi-select (Mixed class)
  subclassOther: string[] | null;
  scaleData: ScaleData;
  complexity: ComplexityData;
  region: Region;               // NEW
  createdAt: Date;
  updatedAt: Date;
}

export interface ScaleData {
  [key: string]: number | string;
  // Examples:
  // gfa_sqm?: number;
  // units?: number;
  // levels?: number;
  // beds?: number;
  // etc.
}

export interface ComplexityData {
  [dimension: string]: string;
  // Examples:
  // quality_tier?: string;
  // site_conditions?: string;
  // approval_pathway?: string;
  // security_classification?: string;  // NEW (defense)
  // remoteness?: string;               // NEW (agricultural)
  // etc.
}
```

### 3.2 Work Scope Types

```typescript
// src/types/profiler.ts

export interface WorkScopeItem {
  value: string;
  label: string;
  consultants: string[];
  riskFlag?: string;
  complexityPoints?: number;
}

export interface WorkScopeCategory {
  label: string;
  items: WorkScopeItem[];
}

export interface WorkScopeDefinition {
  [category: string]: WorkScopeCategory;
}

// Project type work scopes
export interface WorkScopeOptions {
  refurb: WorkScopeDefinition;
  extend: WorkScopeDefinition;
  new: WorkScopeDefinition;        // NEW
  remediation: WorkScopeDefinition;
  advisory: WorkScopeDefinition;   // NEW
}
```

### 3.3 Risk Flag Types

```typescript
// src/types/profiler.ts

export type RiskSeverity = 'info' | 'warning' | 'critical';

export interface RiskFlag {
  severity: RiskSeverity;
  title: string;
  description: string;
}

export interface RiskDefinitions {
  [key: string]: RiskFlag;
  // Existing flags...
  // New flags:
  high_security: RiskFlag;
  remote_site: RiskFlag;
  live_operations: RiskFlag;
  biosafety_3_plus: RiskFlag;
  gmp_manufacturing: RiskFlag;
  heritage_adaptive_reuse: RiskFlag;
  critical_infrastructure: RiskFlag;
  multi_jurisdictional: RiskFlag;
  native_title: RiskFlag;
  flood_overlay: RiskFlag;
}
```

### 3.4 Region Configuration Types

```typescript
// src/types/profiler.ts

export interface RegionConfig {
  label: string;
  buildingCodeSystem: string;
  approvalPathways: string[];
  costBenchmarkSource: string;
  currency: 'AUD' | 'NZD' | 'GBP' | 'USD';
  measurementSystem: 'metric' | 'imperial';
}

export interface RegionConfigurations {
  AU: RegionConfig;
  NZ: RegionConfig;
  UK: RegionConfig;
  US: RegionConfig;
}

export interface BuildingCodeMapping {
  [region: string]: {
    [subclass: string]: string;
  };
}

export interface ApprovalPathway {
  value: string;
  label: string;
}

export interface RegionApprovalPathways {
  AU: ApprovalPathway[];
  NZ: ApprovalPathway[];
  UK: ApprovalPathway[];
  US: ApprovalPathway[];
}

export interface CostBenchmark {
  source: string;
  multiplier?: number;
  [category: string]: any;
}

export interface CostBenchmarks {
  AU: CostBenchmark;
  NZ: CostBenchmark;
  UK: CostBenchmark;
  US: CostBenchmark;
}
```

---

## 4. JSON Template Structure

### 4.1 Building Class Definition

```typescript
interface BuildingClassDefinition {
  label: string;
  icon: string;
  subclasses: Array<{
    value: string;
    label: string;
  }>;
  scaleFields: {
    default: ScaleFieldDefinition[];
    [subclass: string]: ScaleFieldDefinition[];
  };
  complexityOptions: {
    default: ComplexityDimension[] | ComplexityDimensionMap;
    [subclass: string]: ComplexityDimensionMap;
  };
}

interface ScaleFieldDefinition {
  key: string;
  label: string;
  type?: 'integer' | 'decimal' | 'select';
  min?: number;
  max?: number;
  placeholder?: string;
}

interface ComplexityOption {
  value: string;
  label: string;
}

type ComplexityDimension = ComplexityOption[];

interface ComplexityDimensionMap {
  [dimension: string]: ComplexityOption[];
}
```

### 4.2 Full Template Structure

```typescript
interface ProfileTemplates {
  metadata: {
    version: string;
    structure: string;
  };
  buildingClasses: {
    residential: BuildingClassDefinition;
    commercial: BuildingClassDefinition;
    industrial: BuildingClassDefinition;
    institution: BuildingClassDefinition;
    mixed: BuildingClassDefinition;
    infrastructure: BuildingClassDefinition;
    agricultural: BuildingClassDefinition;    // NEW
    defense_secure: BuildingClassDefinition;  // NEW
  };
  projectTypes: Array<{
    value: string;
    label: string;
  }>;
  workScopeOptions: {
    refurb: WorkScopeDefinition;
    extend: WorkScopeDefinition;
    new: WorkScopeDefinition;        // NEW
    remediation: WorkScopeDefinition;
    advisory: WorkScopeDefinition;   // NEW
    riskDefinitions: RiskDefinitions;
  };
  regionConfig: RegionConfigurations;         // NEW
  buildingCodeMappings: {                     // NEW
    [buildingClass: string]: BuildingCodeMapping;
  };
  approvalPathways: RegionApprovalPathways;   // NEW
  costBenchmarks: CostBenchmarks;             // NEW
}
```

---

## 5. Database Migration Script

```sql
-- Migration: 022-profiler-expansion
-- Description: Add agricultural and defense_secure building classes, region support

-- 1. Add new building class values
DO $$
BEGIN
  -- Check if value exists before adding
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'agricultural' AND enumtypid = 'building_class'::regtype) THEN
    ALTER TYPE building_class ADD VALUE 'agricultural';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'defense_secure' AND enumtypid = 'building_class'::regtype) THEN
    ALTER TYPE building_class ADD VALUE 'defense_secure';
  END IF;
END $$;

-- 2. Add region column
ALTER TABLE project_profiles
ADD COLUMN IF NOT EXISTS region TEXT DEFAULT 'AU';

-- 3. Add region constraint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'region_check') THEN
    ALTER TABLE project_profiles
    ADD CONSTRAINT region_check CHECK (region IN ('AU', 'NZ', 'UK', 'US'));
  END IF;
END $$;

-- 4. Create region index
CREATE INDEX IF NOT EXISTS idx_profiles_region ON project_profiles(region);

-- 5. Update existing profiles to AU region (if null)
UPDATE project_profiles SET region = 'AU' WHERE region IS NULL;
```

---

## 6. Drizzle Schema Update

```typescript
// src/lib/db/pg-schema.ts

import { pgTable, text, timestamp, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// Updated building class enum
export const buildingClassEnum = pgEnum('building_class', [
  'residential',
  'commercial',
  'industrial',
  'institution',
  'mixed',
  'infrastructure',
  'agricultural',      // NEW
  'defense_secure'     // NEW
]);

// New region enum
export const regionEnum = pgEnum('region', ['AU', 'NZ', 'UK', 'US']);

// Updated project profiles table
export const projectProfiles = pgTable('project_profiles', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  buildingClass: buildingClassEnum('building_class').notNull(),
  projectType: text('project_type').notNull(),
  subclass: jsonb('subclass').notNull(),
  subclassOther: text('subclass_other').array(),
  scaleData: jsonb('scale_data').notNull(),
  complexity: jsonb('complexity').notNull(),
  region: text('region').default('AU'),  // NEW
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

---

## 7. API Response Shapes

### 7.1 Get Profile Response

```typescript
interface GetProfileResponse {
  success: boolean;
  data: {
    id: string;
    projectId: string;
    buildingClass: string;
    projectType: string;
    subclass: string[];
    subclassOther: string[] | null;
    scaleData: Record<string, number | string>;
    complexity: Record<string, string>;
    region: string;                          // NEW
    regionConfig: RegionConfig;              // NEW - computed
    buildingCodeLabel: string;               // NEW - computed from region
    approvalPathways: ApprovalPathway[];     // NEW - filtered by region
    createdAt: string;
    updatedAt: string;
  };
}
```

### 7.2 Save Profile Request

```typescript
interface SaveProfileRequest {
  buildingClass: string;
  projectType: string;
  subclass: string | string[];  // string for single, array for Mixed class
  subclassOther?: string;
  scale: Record<string, number | string>;
  complexity: Record<string, string>;
  region?: string;              // NEW - defaults to 'AU'
}
```
