# Quickstart: Planning Card

## Overview

The Planning Card is a comprehensive project planning interface with 7 sections, inline editing, AI assistance, and integration with Consultant and Contractor Cards.

## Basic Usage

### 1. Viewing Planning Data

```tsx
import { PlanningCard } from '@/components/dashboard/PlanningCard';

export default function ProjectPage({ projectId }: { projectId: string }) {
  return <PlanningCard projectId={projectId} />;
}
```

### 2. Inline Editing

All fields support click-to-edit with auto-save:

```tsx
import { InlineEditField } from '@/components/dashboard/planning/InlineEditField';

<InlineEditField
  value={projectName}
  onSave={async (newValue) => {
    await updateProjectDetails({ projectName: newValue });
  }}
  placeholder="Enter project name"
/>
```

### 3. AI-Assisted Suggestions

```tsx
import { AIAssistButton } from '@/components/dashboard/planning/AIAssistButton';

<AIAssistButton
  section="objectives"
  projectId={projectId}
  onSuggest={async () => {
    const suggestions = await fetch(`/api/ai/suggest?section=objectives&projectId=${projectId}`);
    return suggestions.json();
  }}
/>
```

### 4. Managing Consultants/Contractors

```tsx
// Toggle a consultant discipline
await fetch('/api/consultants/disciplines', {
  method: 'POST',
  body: JSON.stringify({
    projectId,
    disciplineName: 'Architect',
    isEnabled: true
  })
});

// Update status
await fetch(`/api/consultants/disciplines/${disciplineId}/status`, {
  method: 'PUT',
  body: JSON.stringify({
    statusType: 'brief',
    isActive: true
  })
});
```

### 5. Interactive Timeline

```tsx
import { TimelineGrid } from '@/components/dashboard/planning/TimelineGrid';

<TimelineGrid
  stages={projectStages}
  onStageUpdate={async (stageId, duration) => {
    await updateStage(stageId, { duration });
  }}
/>
```

### 6. PDF Export

```tsx
import { PDFExportButton } from '@/components/ui/pdf-export-button';

<PDFExportButton
  projectId={projectId}
  onExport={async () => {
    const response = await fetch(`/api/export/pdf?projectId=${projectId}`);
    const blob = await response.blob();
    // Download PDF
  }}
/>
```

## Data Fetching

### Get All Planning Data

```tsx
const response = await fetch(`/api/planning/${projectId}`);
const data = await response.json();

// data structure:
{
  details: { projectName, address, ... },
  objectives: { functional, quality, budget, program },
  stages: [...],
  risks: [...],
  stakeholders: [...]
}
```

### Update Specific Section

```tsx
// Update details
await fetch(`/api/planning/${projectId}/details`, {
  method: 'PUT',
  body: JSON.stringify({
    address: '123 Main St',
    zoning: 'Commercial'
  })
});

// Update objectives
await fetch(`/api/planning/${projectId}/objectives`, {
  method: 'PUT',
  body: JSON.stringify({
    functional: 'Create modern office space',
    budget: '$5M'
  })
});
```

## Hooks

### useInlineEdit

```tsx
import { useInlineEdit } from '@/lib/hooks/use-inline-edit';

const { value, isEditing, isSaving, error, startEdit, saveEdit, cancelEdit } = useInlineEdit({
  initialValue: 'Project Name',
  onSave: async (newValue) => {
    await updateField(newValue);
  }
});
```

### usePlanningData

```tsx
import { usePlanningData } from '@/lib/hooks/use-planning-data';

const { data, isLoading, error, refetch } = usePlanningData(projectId);
```

### useUndoHistory

```tsx
import { useUndoHistory } from '@/lib/hooks/use-undo-history';

const { undo, redo, canUndo, canRedo } = useUndoHistory();

// Ctrl+Z to undo
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      undo();
    }
  };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [undo]);
```

## Integration with Consultant/Contractor Cards

When a consultant discipline or contractor trade is toggled on in the Planning Card, a corresponding tab is automatically created in the respective card:

```tsx
// In ConsultantCard.tsx
const { disciplines } = useConsultantDisciplines(projectId);
const enabledDisciplines = disciplines.filter(d => d.isEnabled);

return (
  <Tabs>
    {enabledDisciplines.map(discipline => (
      <TabsContent key={discipline.id} value={discipline.disciplineName}>
        {/* Consultant details for this discipline */}
      </TabsContent>
    ))}
  </Tabs>
);
```

## Validation

All fields use Zod schemas for validation:

```tsx
import { projectDetailsSchema } from '@/lib/validations/planning-schema';

const result = projectDetailsSchema.safeParse({
  projectName: 'My Project',
  address: '123 Main St'
});

if (!result.success) {
  console.error(result.error.errors);
}
```

## Performance Tips

1. **Optimistic Updates**: UI updates immediately while save happens in background
2. **Debounced Saves**: Auto-save is debounced by 500ms to avoid excessive API calls
3. **Cached GIS Data**: Address lookups are cached for 30 days
4. **Lazy Loading**: Sections load data on-demand when expanded
