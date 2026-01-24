# Profiler Module - Requirements Checklist

**Spec Version:** 1.3
**Status:** Pending Review
**Last Updated:** 2026-01-20

---

## Overview

This checklist tracks requirements coverage for the Profiler module specification. Updated to reflect:
- Multiple subclass selection for Mixed class
- Manual objectives entry option with simple text editor
- Research-informed scale/complexity options (NCC/BCA, AIQS, Rawlinsons)
- AI learning from "Other" inputs
- 10x lean code philosophy
- **Seniors Living subclasses: Retirement Living / ILUs and Residential Aged Care (Class 9c)**
- **Multi-dimensional complexity for aged care (dementia design, accommodation models, care levels)**
- **v1.3: Balanced coverage across ALL classes (Commercial, Industrial, Institution, Mixed, Infrastructure)**
- **v1.3: 10x Power Features (Smart Defaults, Context Chips, Complexity Score, Risk Flags)**
- **v1.3: Logic Flow Optimization with progressive disclosure and instant feedback**

---

## 1. UI Layout Requirements

### 1.1 Overall Layout

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| UI-001 | Left Navigation Panel (200-280px width) | §2.1 | ☐ Pending |
| UI-002 | Middle Panel fills remaining width | §2.1 | ☐ Pending |
| UI-003 | Top Header Bar present | §2.1 | ☐ Pending |
| UI-004 | Responsive breakpoint at 768px | §10.2 | ☐ Pending |

### 1.2 Left Navigation

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| NAV-001 | Display 4 sections: Project Details, Profile, Objectives, Stakeholders | §2.2 | ☐ Pending |
| NAV-002 | Clicking section displays content in Middle Panel | §2.2 | ☐ Pending |
| NAV-003 | Visual completion indicator per section | §2.2 | ☐ Pending |
| NAV-004 | Non-linear navigation (any order access) | §2.2 | ☐ Pending |
| NAV-005 | Stakeholders section disabled (Phase 2) | §2.2 | ☐ Pending |

### 1.3 Middle Panel Header Tabs

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| TAB-001 | Display Procurement, Cost Planning, Programme tabs | §2.3 | ☐ Pending |
| TAB-002 | Tabs dimmed/inactive during profiler workflow | §2.3 | ☐ Pending |
| TAB-003 | Tabs become active after workflow completion | §2.3 | ☐ Pending |

---

## 2. Profile Section Requirements

### 2.1 Class/Type Selection

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| PROF-001 | Display 6 Building Classes | §3.1 | ☐ Pending |
| PROF-002 | Display 5 Project Types | §3.1 | ☐ Pending |
| PROF-003 | Require both Class AND Type selection | §3.1 | ☐ Pending |
| PROF-004 | Selection triggers Middle Panel update | §3.1 | ☐ Pending |

### 2.2 Subclass Selection

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| SUB-001 | Subclass options depend on Building Class | §3.2 | ☐ Pending |
| SUB-002 | Always include "Other" option | §3.2 | ☐ Pending |
| SUB-003 | "Other" enables free-text input | §3.2 | ☐ Pending |
| SUB-004 | **Single selection for most classes; MULTIPLE selection for Mixed** | §3.2 | ☐ Pending |
| SUB-005 | Options load from configuration (data-driven) | §3.2 | ☐ Pending |
| SUB-006 | "Other" selections stored for AI learning | §3.2 | ☐ Pending |

### 2.3 Scale Inputs

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| SCALE-001 | Scale fields depend on Building Class + Subclass | §3.2 | ☐ Pending |
| SCALE-002 | At least one scale metric required per subclass | §3.2 | ☐ Pending |
| SCALE-003 | Numeric validation (positive values, realistic bounds) | §3.2 | ☐ Pending |
| SCALE-004 | Placeholders show typical ranges from Rawlinsons 2025 | §3.2 | ☐ Pending |
| SCALE-005 | Fields adapt dynamically based on Class + Subclass | §3.2 | ☐ Pending |

### 2.4 Complexity Selection

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| CMPLX-001 | Complexity is multi-dimensional (Quality, Site, Systems, etc.) | §3.2 | ☐ Pending |
| CMPLX-002 | Multiple dimensions can be selected | §3.2 | ☐ Pending |
| CMPLX-003 | Selection affects cost multipliers and consultant scopes | §3.2 | ☐ Pending |
| CMPLX-004 | Feeds into risk assessment and contingency calculations | §3.2 | ☐ Pending |
| CMPLX-005 | "Other" inputs stored for AI learning | §3.2 | ☐ Pending |
| CMPLX-006 | Commercial Office: 5 dimensions (Grade, Fitout, Sustainability, Tech, End-of-Trip) | §3.2 | ☐ Pending |
| CMPLX-007 | Commercial Retail: 5 dimensions (Centre Type, Anchors, Mix, Experience, Parking) | §3.2 | ☐ Pending |
| CMPLX-008 | Commercial Hotel: 5 dimensions (Star, Brand, F&B, Meeting, Wellness) | §3.2 | ☐ Pending |
| CMPLX-009 | Industrial Warehouse: 5 dimensions (Spec, Height, Fire, Hardstand, Automation) | §3.2 | ☐ Pending |
| CMPLX-010 | Industrial Data Centre: 5 dimensions (Tier, Cooling, Density, Redundancy, Security) | §3.2 | ☐ Pending |
| CMPLX-011 | Industrial Manufacturing: 5 dimensions (Cleanroom, Process, Services, Environment, Handling) | §3.2 | ☐ Pending |
| CMPLX-012 | Institution Education: 5 dimensions (Facility, Tech, Specialist, Security, Sustainability) | §3.2 | ☐ Pending |
| CMPLX-013 | Institution Healthcare: 6 dimensions (Service, Specialization, Clinical, Imaging, Infection, Accreditation) | §3.2 | ☐ Pending |
| CMPLX-014 | Mixed Use: 5 dimensions (Integration, Transfers, Services, Ownership, Staging) | §3.2 | ☐ Pending |
| CMPLX-015 | Infrastructure: 6 dimensions (Environment, Corridor, Delivery, Significance, Stakeholders, Operations) | §3.2 | ☐ Pending |

### 2.5 Seniors Living Subclasses (ILUs & Class 9c)

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| SENIORS-001 | Retirement Living / ILUs subclass available under Residential | §3.2, Appendix B | ☐ Pending |
| SENIORS-002 | Residential Aged Care (Class 9c) subclass available under Residential | §3.2, Appendix B | ☐ Pending |
| SENIORS-003 | ILU scale fields: ILUs count, Serviced Apartments, GFA, Community Facilities, Avg ILU Size | §3.2, §7.1 | ☐ Pending |
| SENIORS-004 | Class 9c scale fields: Beds, Dementia Beds, GFA, GFA/Bed, Households, Beds/Household | §3.2, §7.1 | ☐ Pending |
| SENIORS-005 | ILU complexity dimensions: Village Type, Unit Configuration, Community Facilities, Care Integration, Accessibility | §3.2, §7.1 | ☐ Pending |
| SENIORS-006 | Class 9c complexity dimensions: Care Level, Accommodation Model, Dementia Design, Clinical Facilities, Back-of-House, Staff Accommodation | §3.2, §7.1 | ☐ Pending |
| SENIORS-007 | ILU unit config maps to NCC class (Villa=1a, Townhouse=1a, Apartment=2, Serviced=3) | Appendix B.1 | ☐ Pending |
| SENIORS-008 | Class 9c care level options: Low Care, Mixed, High Care, Specialist Dementia | §3.2 | ☐ Pending |
| SENIORS-009 | Class 9c accommodation model options: Traditional, Household, Small House, Cottage (SDCP) | §3.2 | ☐ Pending |
| SENIORS-010 | Dementia design options: None, Secure Wing, Specialist Unit, SDCP Compliant | §3.2 | ☐ Pending |
| SENIORS-011 | Scale field placeholders show industry-typical ranges (Rawlinsons/AIQS aligned) | §3.2 | ☐ Pending |
| SENIORS-012 | Complexity selections affect cost multipliers (1.0x-1.3x for ILU, $250k-$500k/bed for 9c) | Appendix B | ☐ Pending |
| SENIORS-013 | Integrated developments can use Mixed class with multi-select (ILU + Class 9c) | §3.2, Appendix B.3 | ☐ Pending |

### 2.6 10x Power Features (Smart Logic)

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| POWER-001 | Smart Defaults: Auto-populate scale placeholders on subclass selection | §3.3.1 | ☐ Pending |
| POWER-002 | Smart Defaults: Suggest complexity tier based on scale entered | §3.3.1 | ☐ Pending |
| POWER-003 | Smart Defaults: Auto-suggest consultant disciplines from complexity | §3.3.1 | ☐ Pending |
| POWER-004 | Plausibility Alerts: Non-blocking warnings for unusual combinations | §3.3.2 | ☐ Pending |
| POWER-005 | Plausibility Alerts: Hotel rooms vs star rating validation | §3.3.2 | ☐ Pending |
| POWER-006 | Plausibility Alerts: Aged care beds vs funding viability | §3.3.2 | ☐ Pending |
| POWER-007 | Context Chips: Display NCC class, cost range, approval timeframe | §3.3.3 | ☐ Pending |
| POWER-008 | Context Chips: Render within 100ms of selection | §3.3.3 | ☐ Pending |
| POWER-009 | Complexity Score: Real-time score (1-10) based on selections | §3.3.4 | ☐ Pending |
| POWER-010 | Complexity Score: Show contributing factors breakdown | §3.3.4 | ☐ Pending |
| POWER-011 | Complexity Score: Suggest contingency range | §3.3.4 | ☐ Pending |
| POWER-012 | Market Context: Show benchmark cost ranges (Rawlinsons 2025) | §3.3.5 | ☐ Pending |
| POWER-013 | Market Context: Show typical GFA and programme ranges | §3.3.5 | ☐ Pending |
| POWER-014 | Consultant Preview: Auto-suggest disciplines based on profile | §3.3.6 | ☐ Pending |
| POWER-015 | Risk Flags: Auto-surface high-impact risks from profile combinations | §3.3.7 | ☐ Pending |
| POWER-016 | Risk Flags: BAL-FZ + Class 9c incompatibility warning | §3.3.7 | ☐ Pending |
| POWER-017 | UX: Progressive disclosure (complexity after subclass) | §3.4 | ☐ Pending |
| POWER-018 | UX: Tooltips explain industry terms on hover | §3.4 | ☐ Pending |
| POWER-019 | UX: Keyboard navigation through all fields | §3.4 | ☐ Pending |

---

## 3. Objectives Section Requirements

### 3.1 Display & Entry Mode

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| OBJ-001 | Display two categories: Functional Quality, Planning & Compliance | §4.1, §4.2 | ☐ Pending |
| OBJ-002 | **[Generate] button for AI-generated objectives** | §4.1 | ☐ Pending |
| OBJ-003 | **[Manual] button for direct user entry** | §4.1 | ☐ Pending |
| OBJ-004 | **Simple markdown-enabled text editor** | §4.1 | ☐ Pending |
| OBJ-005 | [Polish] button visible only when content exists | §4.1 | ☐ Pending |
| OBJ-006 | User edits displayed with diff highlighting (accent color) | §4.3 | ☐ Pending |

### 3.2 Manual Entry Mode

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| MANUAL-001 | Lightweight text editor (no heavy dependencies) | §4.3 | ☐ Pending |
| MANUAL-002 | Markdown support (basic formatting) | §4.3 | ☐ Pending |
| MANUAL-003 | Text saved as source: 'manual' | §4.3 | ☐ Pending |

### 3.3 AI Generation Mode

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| GEN-001 | Triggered via [Generate] button (not automatic) | §4.3 | ☐ Pending |
| GEN-002 | Use template substitution with Profile data | §4.3 | ☐ Pending |
| GEN-003 | Generation completes < 3 seconds | §10.2 | ☐ Pending |
| GEN-004 | Text saved as source: 'ai_generated' | §4.3 | ☐ Pending |

### 3.4 Editing & Polish

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| EDIT-001 | Both AI-generated and manual text can be edited inline | §4.3 | ☐ Pending |
| EDIT-002 | Original text preserved for comparison and AI learning | §4.3 | ☐ Pending |
| POLISH-001 | Send Profile context + Current text + Edit history | §4.3 | ☐ Pending |
| POLISH-002 | AI refines objectives incorporating all context | §4.3 | ☐ Pending |
| POLISH-003 | Polished text marked as source: 'ai_polished' | §4.3 | ☐ Pending |
| POLISH-004 | Polish operation completes < 5 seconds | §10.2 | ☐ Pending |

### 3.5 AI Learning

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| LEARN-001 | "Other" subclass entries collected for pattern analysis | §4.3 | ☐ Pending |
| LEARN-002 | Manual objectives analyzed for common themes | §4.3 | ☐ Pending |
| LEARN-003 | Polish edits inform template improvements | §4.3 | ☐ Pending |
| LEARN-004 | Learning is aggregate/anonymous, not project-specific | §4.3 | ☐ Pending |

---

## 4. Data Model Requirements

### 4.1 Profile Storage

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| DB-001 | Create `projectProfiles` table | §5.1 | ☐ Pending |
| DB-002 | Store building_class, project_type | §5.1 | ☐ Pending |
| DB-003 | **Store subclass as JSONB array (multi-select support)** | §5.1 | ☐ Pending |
| DB-004 | Store subclass_other as TEXT[] array | §5.1 | ☐ Pending |
| DB-005 | Store scale_data as JSONB | §5.1 | ☐ Pending |
| DB-006 | **Store complexity as JSONB (multi-dimensional)** | §5.1 | ☐ Pending |
| DB-007 | Unique constraint on project_id | §5.1 | ☐ Pending |
| DB-008 | Cascade delete with project | §5.1 | ☐ Pending |
| DB-009 | Index for AI learning queries (class, type, subclass) | §5.1 | ☐ Pending |

### 4.2 Objectives Storage

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| DB-010 | Create `profilerObjectives` table | §5.2 | ☐ Pending |
| DB-011 | **Store objectives as JSONB with source tracking** | §5.2 | ☐ Pending |
| DB-012 | Store profile_context snapshot | §5.2 | ☐ Pending |
| DB-013 | Track generated_at and polished_at timestamps | §5.2 | ☐ Pending |
| DB-014 | Store editHistory for AI learning | §5.2 | ☐ Pending |

### 4.3 AI Learning Storage

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| DB-015 | Create `profilePatterns` table | §5.3 | ☐ Pending |
| DB-016 | Track pattern_type (subclass_other, objective_theme, polish_edit) | §5.3 | ☐ Pending |
| DB-017 | Upsert on pattern match (occurrence_count) | §5.3 | ☐ Pending |

---

## 5. API Requirements

### 5.1 Profile Endpoints

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| API-001 | POST /api/planning/{projectId}/profile | §6.1 | ☐ Pending |
| API-002 | Profile save < 500ms | §10.2 | ☐ Pending |
| API-003 | Validate required fields | §6.1 | ☐ Pending |
| API-004 | Return profileId on success | §6.1 | ☐ Pending |

### 5.2 Objectives Endpoints

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| API-005 | POST /api/planning/{projectId}/objectives/generate | §6.2 | ☐ Pending |
| API-006 | PATCH /api/planning/{projectId}/objectives (save edits) | §6.3 | ☐ Pending |
| API-007 | POST /api/planning/{projectId}/objectives/polish | §6.4 | ☐ Pending |

---

## 6. Template Requirements

### 6.1 Profile Templates

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| TPL-001 | Create profile-templates.json | §7.1 | ☐ Pending |
| TPL-002 | Define subclasses per Building Class (NCC/BCA aligned) | §7.1 | ☐ Pending |
| TPL-003 | Define scaleFields per Building Class (Rawlinsons aligned) | §7.1 | ☐ Pending |
| TPL-004 | Define complexityDimensions per Building Class | §7.1 | ☐ Pending |

### 6.2 Objectives Templates

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| TPL-005 | Extend objective-templates.json with profiler section | §7.2 | ☐ Pending |
| TPL-006 | Templates for all Class × Type combinations | §7.2 | ☐ Pending |
| TPL-007 | Support variable substitution ({{variable}}) | §7.2 | ☐ Pending |

---

## 7. Component Requirements

### 7.1 New Components (Lean Architecture)

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| CMP-001 | ProfilerLayout.tsx (< 100 lines) | §8.1, §11 | ☐ Pending |
| CMP-002 | LeftNavigation.tsx | §8.1 | ☐ Pending |
| CMP-003 | ProfileSection.tsx | §8.1 | ☐ Pending |
| CMP-004 | ClassTypeSelector.tsx | §8.1 | ☐ Pending |
| CMP-005 | SubclassSelector.tsx (multi-select for Mixed) | §8.1 | ☐ Pending |
| CMP-006 | ScaleInputs.tsx | §8.1 | ☐ Pending |
| CMP-007 | ComplexitySelector.tsx (multi-dimensional) | §8.1 | ☐ Pending |
| CMP-008 | ObjectivesSection.tsx | §8.1 | ☐ Pending |
| CMP-009 | **SimpleMarkdownEditor.tsx (lightweight)** | §8.1 | ☐ Pending |
| CMP-010 | index.ts | §8.1 | ☐ Pending |

### 7.2 Deprecation

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| DEP-001 | Deprecate src/components/project-wizard/ | §8.2 | ☐ Pending |

---

## 8. Code Philosophy Requirements

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| CODE-001 | Each component does ONE thing well | §11 | ☐ Pending |
| CODE-002 | Data-driven UI (templates drive options) | §11 | ☐ Pending |
| CODE-003 | No prop drilling beyond 2 levels | §11 | ☐ Pending |
| CODE-004 | No separate files for single-use types | §11 | ☐ Pending |
| CODE-005 | Total new code < 2000 lines (excl. templates) | §11 | ☐ Pending |
| CODE-006 | 0 new runtime dependencies | §11 | ☐ Pending |
| CODE-007 | Progressive enhancement (manual works without AI) | §11 | ☐ Pending |

---

## 9. Integration Requirements

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| INT-001 | Profile complexity affects cost benchmarks | §9.1 | ☐ Pending |
| INT-002 | Profile class/type affects programme templates | §9.1 | ☐ Pending |
| INT-003 | Profile determines default consultant disciplines | §9.1 | ☐ Pending |
| INT-004 | Profile data included in reports | §9.1 | ☐ Pending |
| INT-005 | Backward compatibility with legacy projectType | §9.2 | ☐ Pending |

---

## 10. Performance Requirements

| ID | Requirement | Spec Ref | Status |
|----|-------------|----------|--------|
| PERF-001 | Page load < 200ms | §10.2 | ☐ Pending |
| PERF-002 | Profile save < 500ms | §10.2 | ☐ Pending |
| PERF-003 | Objectives generation < 3s | §10.2 | ☐ Pending |
| PERF-004 | Polish operation < 5s | §10.2 | ☐ Pending |

---

## 11. Open Questions (To Resolve in speckit.clarify)

| ID | Question | Priority | Status |
|----|----------|----------|--------|
| Q-001 | Should complexity include approval pathway selection? | High | ☐ Open |
| Q-002 | Does Profile auto-populate consultant disciplines? | High | ☐ Open |
| Q-003 | Should existing 018 projects show "Migrate to Profiler" prompt? | Medium | ☐ Open |
| Q-004 | What are realistic min/max bounds for scale metrics? | Medium | ☐ Open |
| Q-005 | How do complexity levels map to cost multipliers? | High | ☐ Open |

---

## Summary

| Category | Total | Pending | Complete |
|----------|-------|---------|----------|
| UI Layout | 7 | 7 | 0 |
| Left Navigation | 5 | 5 | 0 |
| Middle Panel Tabs | 3 | 3 | 0 |
| Profile - Class/Type/Subclass | 6 | 6 | 0 |
| Profile - Scale Inputs | 5 | 5 | 0 |
| Profile - Complexity | **15** | **15** | **0** |
| **Seniors Living (ILUs & 9c)** | **13** | **13** | **0** |
| **10x Power Features** | **19** | **19** | **0** |
| Objectives Section | 20 | 20 | 0 |
| Data Model | 17 | 17 | 0 |
| API | 7 | 7 | 0 |
| Templates | 7 | 7 | 0 |
| Components | 11 | 11 | 0 |
| Code Philosophy | 7 | 7 | 0 |
| Integration | 5 | 5 | 0 |
| Performance | 4 | 4 | 0 |
| **TOTAL** | **151** | **151** | **0** |

---

## Key Changes from v1.0

1. **SUB-004**: Changed from "Single selection required" to "Single for most; MULTIPLE for Mixed"
2. **OBJ-002/003**: Added Generate/Manual toggle for objectives entry
3. **OBJ-004**: Added simple markdown text editor requirement
4. **CMPLX-***: Complexity now multi-dimensional (not single select)
5. **LEARN-***: Added AI learning requirements from user inputs
6. **CODE-***: Added code philosophy requirements (10x lean principles)
7. **Scale/Complexity**: Updated with research-based options (NCC/BCA, AIQS, Rawlinsons)

## Key Changes from v1.1

1. **SENIORS-001 to SENIORS-013**: Added comprehensive seniors living subclass requirements
2. **Retirement Living / ILUs**: New subclass with 5 scale fields and 5 complexity dimensions
3. **Residential Aged Care (Class 9c)**: New subclass with 6 scale fields and 6 complexity dimensions
4. **ILU Unit Configurations**: Villa (Class 1a), Townhouse (Class 1a), Apartment (Class 2), Serviced (Class 3)
5. **Class 9c Accommodation Models**: Traditional, Household (10-16 beds), Small House (6-12 beds), Cottage (SDCP)
6. **Dementia Design**: Added specialist dementia unit options including SDCP compliance
7. **Cost Multipliers**: Documented cost/bed ranges ($250k-$500k for Class 9c) and village type multipliers
8. **Appendix B**: Added comprehensive reference for seniors living classifications (NCC/BCA aligned)

## Key Changes from v1.2 (Current Update)

### Balanced Scale/Complexity Coverage Across All Classes

**Commercial - Now Fully Specified:**
1. **Office**: 5 scale fields (Storeys, NLA, Floor Plate, Tenancies, Grade) + 5 complexity dimensions
2. **Retail Shopping Centre**: 5 scale fields + 5 complexity dimensions (Centre Type, Anchors, Mix, Experience, Parking)
3. **Retail Standalone**: 3 scale fields + complexity inherits from Shopping Centre
4. **Hotel**: 5 scale fields (Rooms, Storeys, Star, F&B Outlets, Conference) + 5 complexity dimensions
5. **Food & Beverage**: 4 scale fields (Seats, GFA, Kitchen, License)

**Industrial - Now Fully Specified:**
1. **Warehouse**: 5 scale fields + 5 complexity dimensions (Spec, Height, Fire, Hardstand, Automation)
2. **Logistics/E-Commerce**: 5 scale fields + complexity inherits from Warehouse
3. **Manufacturing**: 5 scale fields (GFA, Process Area, Cleanroom, Crane) + 5 complexity dimensions
4. **Cold Storage**: 5 scale fields (GFA, Frozen, Chilled, Ambient, Blast Freezer)
5. **Data Centre**: 5 scale fields (MW, GFA, White Space, PUE, Tier) + 5 complexity dimensions

**Institution - Now Fully Specified:**
1. **Education - Early Childhood**: 4 scale fields (Places, GFA, Indoor/child, Outdoor/child)
2. **Education - Primary/Secondary**: 6 scale fields + 5 complexity dimensions
3. **Education - Tertiary**: 5 scale fields + complexity inherits from Primary/Secondary
4. **Healthcare - Hospital**: 6 scale fields + 6 complexity dimensions (Service, Specialization, Clinical, Imaging, Infection, Accreditation)
5. **Healthcare - Medical Centre**: 4 scale fields + complexity inherits from Hospital
6. **Government/Civic**: 4 scale fields
7. **Religious**: 4 scale fields

**Mixed Use - Now Fully Specified:**
1. **All Types**: 4 global scale fields + component-specific fields (Res/Commercial/Retail/Hotel)
2. **5 complexity dimensions**: Integration, Transfers, Services, Ownership, Staging

**Infrastructure - Now Fully Specified:**
1. **Roads/Highways**: 5 scale fields + 6 complexity dimensions
2. **Rail/Metro**: 5 scale fields
3. **Water/Utilities**: 4 scale fields
4. **Energy/Renewables**: 4 scale fields
5. **Marine/Ports**: 5 scale fields

### New Subclasses Added
- Commercial: Serviced Office/Coworking
- Industrial: Dangerous Goods (Class 7a)
- Institution: Healthcare - Clinic/Allied
- Mixed: Build-to-Rent + Retail, Vertical Village (ILU + Aged Care)
- Infrastructure: Airports, Telecommunications

### 10x Power Features Added (POWER-001 to POWER-019)
1. **Smart Defaults**: Auto-populate based on selections (Rawlinsons-informed)
2. **Plausibility Alerts**: Warn on unusual combinations (non-blocking)
3. **Context Chips**: Instant insights (NCC class, cost range, approval time)
4. **Complexity Score**: Real-time 1-10 score with contributing factors
5. **Market Context**: Benchmark data after profile completion
6. **Consultant Preview**: Auto-suggest disciplines based on profile
7. **Risk Flags**: Surface high-impact risks automatically
8. **UX Principles**: Progressive disclosure, tooltips, keyboard navigation

### Coverage Balance Summary (Post-Update)

| Class | Subclasses | Avg Scale Fields | Avg Complexity Dims | Rating |
|-------|-----------|------------------|---------------------|--------|
| Residential | 8 | 5.3 | 5.0 | ⭐⭐⭐⭐⭐ |
| Commercial | 6 | 4.6 | 5.0 | ⭐⭐⭐⭐⭐ |
| Industrial | 6 | 4.8 | 5.0 | ⭐⭐⭐⭐⭐ |
| Institution | 8 | 4.5 | 5.0 | ⭐⭐⭐⭐⭐ |
| Mixed | 7 | 4.0 | 5.0 | ⭐⭐⭐⭐ |
| Infrastructure | 8 | 4.3 | 6.0 | ⭐⭐⭐⭐⭐ |

---

## Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | | | ☐ |
| Tech Lead | | | ☐ |
| UX Designer | | | ☐ |
