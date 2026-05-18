# Profiler Expansion Quickstart

## What's Being Added

| Category | Current | Expanded |
|----------|---------|----------|
| Building Classes | 6 | 8 (+Agricultural, +Defense/Secure) |
| Subclasses | 47 | 110+ |
| Work Scope Project Types | 3 | 5 (+NEW, +ADVISORY) |
| Complexity Dimensions | ~30 | ~50 |
| Risk Flags | 5 | 15+ |
| Region Support | AU only | AU, NZ, UK, US |

---

## Quick Start: Adding a New Subclass

### Step 1: Update profile-templates.json

```json
// src/lib/data/profile-templates.json
{
  "buildingClasses": {
    "commercial": {
      "subclasses": [
        // ... existing subclasses
        { "value": "life_sciences", "label": "Life Sciences/Biotech Labs" }  // ADD
      ]
    }
  }
}
```

### Step 2: Add Scale Fields

```json
{
  "buildingClasses": {
    "commercial": {
      "scaleFields": {
        "life_sciences": [
          { "key": "lab_nla_sqm", "label": "Lab NLA (m²)", "placeholder": "500-10000" },
          { "key": "pc_level", "label": "PC Level", "type": "integer", "min": 1, "max": 4 },
          { "key": "gfa_sqm", "label": "Total GFA (m²)", "placeholder": "1000-50000" }
        ]
      }
    }
  }
}
```

### Step 3: Add Complexity Options (if subclass-specific)

```json
{
  "buildingClasses": {
    "commercial": {
      "complexityOptions": {
        "life_sciences": {
          "containment_level": [
            { "value": "pc1", "label": "PC1 (Low Risk)" },
            { "value": "pc2", "label": "PC2 (Moderate)" },
            { "value": "pc3", "label": "PC3 (High Risk) (+40%)" },
            { "value": "pc4", "label": "PC4 (Maximum) (+80%)" }
          ]
        }
      }
    }
  }
}
```

### Step 4: Update Consultant Mappings

```typescript
// src/components/profiler/ConsultantPreview.tsx
const SUBCLASS_CONSULTANTS: Record<string, string[]> = {
  // ... existing mappings
  life_sciences: ['Lab Planner', 'PC Consultant', 'Fire Engineer', 'HVAC Specialist']
};
```

---

## Quick Start: Adding a New Building Class

### Step 1: Update profile-templates.json

```json
{
  "buildingClasses": {
    "agricultural": {
      "label": "Agricultural / Rural",
      "icon": "tractor",
      "subclasses": [
        { "value": "winery_brewery", "label": "Winery / Brewery / Distillery" }
      ],
      "scaleFields": {
        "default": [...],
        "winery_brewery": [...]
      },
      "complexityOptions": {
        "default": {...}
      }
    }
  }
}
```

### Step 2: Update TypeScript Types

```typescript
// src/types/profiler.ts
export const BUILDING_CLASSES = [
  // ... existing
  'agricultural'  // ADD
] as const;
```

### Step 3: Update Database Schema

```typescript
// src/lib/db/pg-schema.ts
export const buildingClassEnum = pgEnum('building_class', [
  // ... existing
  'agricultural'  // ADD
]);
```

### Step 4: Run Migration

```sql
ALTER TYPE building_class ADD VALUE 'agricultural';
```

### Step 5: Add Icon

```typescript
// src/components/profiler/ProfileSection.tsx
const BUILDING_CLASS_ICONS: Record<string, LucideIcon> = {
  // ... existing
  agricultural: Tractor
};
```

---

## Quick Start: Adding Work Scope Items

### For NEW Project Type

```json
{
  "workScopeOptions": {
    "new": {
      "enabling_works": {
        "label": "Enabling Works",
        "items": [
          {
            "value": "demolition",
            "label": "Demolition",
            "consultants": ["Demolition Consultant", "Hazmat Consultant"]
          }
        ]
      }
    }
  }
}
```

### For ADVISORY Project Type

```json
{
  "workScopeOptions": {
    "advisory": {
      "due_diligence": {
        "label": "Due Diligence",
        "items": [
          {
            "value": "technical_dd",
            "label": "Technical Due Diligence",
            "consultants": ["Building Consultant", "Structural Engineer"]
          }
        ]
      }
    }
  }
}
```

---

## Quick Start: Adding Risk Flags

### Step 1: Add Risk Definition

```json
{
  "workScopeOptions": {
    "riskDefinitions": {
      "biosafety_3_plus": {
        "severity": "critical",
        "title": "BSL-3+ Laboratory",
        "description": "High containment laboratories require specialized design, certification, and security protocols."
      }
    }
  }
}
```

### Step 2: Add Trigger Logic

```typescript
// src/components/profiler/RiskFlags.tsx
function getRiskFlags(profile: ProjectProfile): string[] {
  const flags: string[] = [];

  // Existing triggers...

  // NEW trigger
  if (profile.complexity.biosafety_level === 'bsl_3' ||
      profile.complexity.biosafety_level === 'bsl_4') {
    flags.push('biosafety_3_plus');
  }

  return flags;
}
```

---

## Quick Start: Adding Region Support

### Step 1: Add Region Config

```json
{
  "regionConfig": {
    "UK": {
      "label": "United Kingdom",
      "buildingCodeSystem": "Building Regulations",
      "approvalPathways": ["Building Notice", "Full Plans", "Prior Approval"],
      "costBenchmarkSource": "BCIS/RICS",
      "currency": "GBP",
      "measurementSystem": "metric"
    }
  }
}
```

### Step 2: Add Building Code Mappings

```json
{
  "buildingCodeMappings": {
    "residential": {
      "UK": {
        "house": "Dwelling",
        "apartments": "Flat"
      }
    }
  }
}
```

### Step 3: Add Approval Pathways

```json
{
  "approvalPathways": {
    "UK": [
      { "value": "permitted_dev", "label": "Permitted Development (8 weeks)" },
      { "value": "full_plans", "label": "Full Plans Application (8-13 weeks)" }
    ]
  }
}
```

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/data/profile-templates.json` | All building classes, subclasses, scale fields, complexity options |
| `src/types/profiler.ts` | TypeScript types and constants |
| `src/lib/db/pg-schema.ts` | PostgreSQL schema with Drizzle |
| `src/lib/db/schema.ts` | SQLite schema (if applicable) |
| `src/components/profiler/ConsultantPreview.tsx` | Consultant discipline mappings |
| `src/components/profiler/RiskFlags.tsx` | Risk flag trigger logic |
| `src/components/profiler/ComplexityScore.tsx` | Complexity score calculation |
| `src/components/profiler/ProfileSection.tsx` | Building class icons |
| `src/components/profiler/ContextChips.tsx` | Region-aware labels |

---

## Testing Checklist

- [ ] New subclass appears in dropdown
- [ ] Scale fields render for new subclass
- [ ] Complexity options appear for new subclass
- [ ] ConsultantPreview shows relevant disciplines
- [ ] Risk flags trigger on appropriate selections
- [ ] Profile saves and loads correctly
- [ ] Region selector works (if applicable)
- [ ] Building code labels reflect selected region
