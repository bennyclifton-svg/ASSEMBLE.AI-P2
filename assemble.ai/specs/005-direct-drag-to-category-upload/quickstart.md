# Quickstart: Direct Drag-to-Category Upload

**Audience**: Developers implementing the direct drag-to-category upload feature
**Estimated Implementation Time**: 3-5 days
**Prerequisites**: Familiarity with React 19, Next.js 16, TypeScript, Drizzle ORM

---

## Overview

This guide walks you through implementing the direct drag-to-category upload feature in a systematic way. Follow the steps in order to ensure all dependencies are properly handled.

**Implementation Order**:
1. Create `CategoryTile` component (individual tile with drop zone)
2. Create `use-active-categories` hook (category filtering logic)
3. Modify `CategoryUploadTiles` component (tile layout and expansion)
4. Create `/api/categories/active` endpoint (fetch active categories)
5. Modify `/api/documents` endpoint (accept categoryId/subcategoryId)
6. Modify `DocumentRepository` component (wire up bulk categorization)
7. Add tests

---

## Step 1: Create CategoryTile Component

**File**: `src/components/documents/CategoryTile.tsx`

This component represents a single draggable upload zone for a category or subcategory.

```typescript
'use client';

import { useDropzone } from 'react-dropzone';
import { FileIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryTileProps {
  category: {
    id: string;
    name: string;
    icon?: React.ComponentType<{ className?: string }>;
  };
  subcategory?: {
    id: string;
    name: string;
  };
  isExpandable?: boolean;
  isExpanded?: boolean;
  isActive?: boolean;
  isUploading?: boolean;
  onDrop?: (files: File[], categoryId: string, subcategoryId?: string) => void;
  onClick?: () => void;
}

export function CategoryTile({
  category,
  subcategory,
  isExpandable = false,
  isExpanded = false,
  isActive = true,
  isUploading = false,
  onDrop,
  onClick,
}: CategoryTileProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (onDrop && !isExpandable && isActive) {
        onDrop(acceptedFiles, category.id, subcategory?.id);
      }
    },
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 20 * 1024 * 1024, // 20MB
    multiple: true,
    disabled: !isActive || isUploading || isExpandable,
    noClick: true, // Prevent file picker on click
  });

  const handleClick = () => {
    if (isExpandable && onClick) {
      onClick();
    }
  };

  const Icon = category.icon || FileIcon;

  return (
    <div
      {...getRootProps()}
      onClick={handleClick}
      className={cn(
        'relative flex flex-col items-center justify-center',
        'rounded-lg border-2 border-dashed p-4',
        'transition-all duration-150 ease-in-out',
        'min-h-[100px] cursor-pointer',
        // Base state
        isActive
          ? 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
          : 'border-gray-800 bg-gray-900/30 opacity-50 cursor-not-allowed',
        // Drag active state
        isDragActive && isActive && !isExpandable && 'ring-2 ring-blue-500 border-blue-500 scale-105',
        // Uploading state
        isUploading && 'opacity-75 cursor-wait',
        // Expandable category indicator
        isExpandable && 'hover:bg-gray-800/70',
        // Subcategory styling (smaller, lighter)
        subcategory && 'min-h-[80px] bg-gray-800/30 border-gray-700'
      )}
    >
      <input {...getInputProps()} />

      {/* Icon */}
      <Icon className={cn(
        'h-6 w-6 mb-2',
        isActive ? 'text-gray-400' : 'text-gray-600'
      )} />

      {/* Label */}
      <span className={cn(
        'text-sm font-medium text-center',
        isActive ? 'text-gray-300' : 'text-gray-600',
        subcategory && 'text-xs'
      )}>
        {subcategory ? subcategory.name : category.name}
      </span>

      {/* Expandable indicator */}
      {isExpandable && (
        <ChevronRight
          className={cn(
            'absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 transition-transform',
            isExpanded && 'rotate-90'
          )}
        />
      )}

      {/* Uploading spinner */}
      {isUploading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" />
        </div>
      )}
    </div>
  );
}
```

**Key Points**:
- Uses `react-dropzone` for file handling
- Disabled state for expandable categories (Consultants/Contractors parent tiles)
- Visual feedback via Tailwind classes
- Supports both category and subcategory tiles

---

## Step 2: Create use-active-categories Hook

**File**: `src/lib/hooks/use-active-categories.ts`

This hook filters categories based on active disciplines and trades from the Planning Card.

```typescript
'use client';

import { useMemo } from 'react';
import { useConsultantDisciplines } from './use-consultant-disciplines';
import { useContractorTrades } from './use-contractor-trades';
import { CATEGORIES } from '@/lib/constants/categories';

export interface ActiveCategory {
  id: string;
  name: string;
  isExpandable: boolean;
  subcategories?: Array<{
    id: string;
    name: string;
    categoryId: string;
  }>;
}

export function useActiveCategories(projectId: string): {
  categories: ActiveCategory[];
  isLoading: boolean;
  error: Error | null;
} {
  const {
    data: disciplines,
    isLoading: disciplinesLoading,
    error: disciplinesError,
  } = useConsultantDisciplines(projectId);

  const {
    data: trades,
    isLoading: tradesLoading,
    error: tradesError,
  } = useContractorTrades(projectId);

  const categories = useMemo(() => {
    if (!disciplines || !trades) return [];

    return CATEGORIES.filter((cat) => {
      // Always show non-expandable categories
      if (!['consultants', 'contractors'].includes(cat.id)) {
        return true;
      }

      // Show Consultants if disciplines exist
      if (cat.id === 'consultants') {
        return disciplines.length > 0;
      }

      // Show Contractors if trades exist
      if (cat.id === 'contractors') {
        return trades.length > 0;
      }

      return false;
    }).map((cat) => ({
      id: cat.id,
      name: cat.name,
      isExpandable: ['consultants', 'contractors'].includes(cat.id),
      subcategories:
        cat.id === 'consultants'
          ? disciplines.map((d) => ({ id: d.id, name: d.name, categoryId: cat.id }))
          : cat.id === 'contractors'
          ? trades.map((t) => ({ id: t.id, name: t.name, categoryId: cat.id }))
          : undefined,
    }));
  }, [disciplines, trades]);

  return {
    categories,
    isLoading: disciplinesLoading || tradesLoading,
    error: disciplinesError || tradesError,
  };
}
```

**Dependencies**:
- `useConsultantDisciplines`: Already exists
- `useContractorTrades`: Already exists
- `CATEGORIES`: Constant array in `src/lib/constants/categories.ts`

---

## Step 3: Modify CategoryUploadTiles Component

**File**: `src/components/documents/CategoryUploadTiles.tsx`

Update this component to use the new `CategoryTile` and handle expansion state.

```typescript
'use client';

import { useState } from 'react';
import { CategoryTile } from './CategoryTile';
import { useActiveCategories } from '@/lib/hooks/use-active-categories';

interface CategoryUploadTilesProps {
  projectId: string;
  onFilesSelected: (files: File[], categoryId: string, subcategoryId?: string) => void;
  selectedDocumentIds: Set<string>;
}

export function CategoryUploadTiles({
  projectId,
  onFilesSelected,
  selectedDocumentIds,
}: CategoryUploadTilesProps) {
  const { categories, isLoading } = useActiveCategories(projectId);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleTileClick = (categoryId: string, subcategoryId?: string) => {
    // If documents are selected, treat as bulk categorization
    if (selectedDocumentIds.size > 0) {
      onFilesSelected([], categoryId, subcategoryId); // Empty files = bulk categorize
    }
  };

  if (isLoading) {
    return <div className="text-sm text-gray-400">Loading categories...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Row 1: Top-level categories */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {categories.map((category) => (
          <CategoryTile
            key={category.id}
            category={category}
            isExpandable={category.isExpandable}
            isExpanded={expandedCategories.has(category.id)}
            isActive={true}
            onDrop={category.isExpandable ? undefined : onFilesSelected}
            onClick={
              category.isExpandable
                ? () => toggleExpand(category.id)
                : () => handleTileClick(category.id)
            }
          />
        ))}
      </div>

      {/* Row 2+: Subcategories (for expanded categories) */}
      {categories.map((category) => {
        if (!category.isExpandable || !expandedCategories.has(category.id)) {
          return null;
        }

        return (
          <div
            key={`sub-${category.id}`}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7 gap-3 pl-4"
          >
            {category.subcategories?.map((subcategory) => (
              <CategoryTile
                key={subcategory.id}
                category={category}
                subcategory={subcategory}
                isActive={true}
                onDrop={onFilesSelected}
                onClick={() => handleTileClick(category.id, subcategory.id)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
```

**Key Changes**:
- Added `expandedCategories` state for toggle behavior
- Wired up bulk categorization (empty files array triggers it)
- Responsive grid layout (2-6 columns based on viewport)

---

## Step 4: Create /api/categories/active Endpoint

**File**: `src/app/api/categories/active/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { consultantDisciplines, contractorTrades, categories, subcategories } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'projectId is required' },
        { status: 400 }
      );
    }

    // Fetch active disciplines
    const activeDisciplines = await db
      .select({
        id: consultantDisciplines.disciplineId,
        name: subcategories.name,
      })
      .from(consultantDisciplines)
      .innerJoin(subcategories, eq(subcategories.id, consultantDisciplines.disciplineId))
      .where(
        and(
          eq(consultantDisciplines.projectId, projectId),
          eq(consultantDisciplines.isActive, true)
        )
      );

    // Fetch active trades
    const activeTrades = await db
      .select({
        id: contractorTrades.tradeId,
        name: subcategories.name,
      })
      .from(contractorTrades)
      .innerJoin(subcategories, eq(subcategories.id, contractorTrades.tradeId))
      .where(
        and(
          eq(contractorTrades.projectId, projectId),
          eq(contractorTrades.isActive, true)
        )
      );

    // Fetch all categories
    const allCategories = await db.select().from(categories);

    // Filter and map categories
    const activeCategories = allCategories
      .filter((cat) => {
        if (!['consultants', 'contractors'].includes(cat.id)) {
          return true; // Always include non-expandable categories
        }
        if (cat.id === 'consultants') return activeDisciplines.length > 0;
        if (cat.id === 'contractors') return activeTrades.length > 0;
        return false;
      })
      .map((cat) => ({
        id: cat.id,
        name: cat.name,
        isExpandable: ['consultants', 'contractors'].includes(cat.id),
        isSystem: cat.isSystem,
        subcategories:
          cat.id === 'consultants'
            ? activeDisciplines.map((d) => ({ ...d, categoryId: cat.id }))
            : cat.id === 'contractors'
            ? activeTrades.map((t) => ({ ...t, categoryId: cat.id }))
            : undefined,
      }));

    return NextResponse.json({ categories: activeCategories });
  } catch (error) {
    console.error('Error fetching active categories:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
```

---

## Step 5: Modify /api/documents Endpoint

**File**: `src/app/api/documents/route.ts`

Add support for `categoryId` and `subcategoryId` in the upload request.

```typescript
// Add to existing POST handler

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;
    const categoryId = formData.get('categoryId') as string | null;
    const subcategoryId = formData.get('subcategoryId') as string | null;

    // Existing validation...
    if (!file || !projectId) {
      return NextResponse.json(
        { error: 'Missing required field', message: 'file and projectId are required' },
        { status: 400 }
      );
    }

    // Validate category exists if provided
    if (categoryId) {
      const categoryExists = await db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.id, categoryId))
        .limit(1);

      if (categoryExists.length === 0) {
        return NextResponse.json(
          { error: 'Category not found', message: `No category found with ID '${categoryId}'` },
          { status: 404 }
        );
      }
    }

    // Validate subcategory exists and belongs to category if provided
    if (subcategoryId) {
      if (!categoryId) {
        return NextResponse.json(
          { error: 'Invalid request', message: 'subcategoryId requires categoryId to be set' },
          { status: 400 }
        );
      }

      const subcategoryExists = await db
        .select({ id: subcategories.id })
        .from(subcategories)
        .where(
          and(
            eq(subcategories.id, subcategoryId),
            eq(subcategories.categoryId, categoryId)
          )
        )
        .limit(1);

      if (subcategoryExists.length === 0) {
        return NextResponse.json(
          { error: 'Subcategory not found', message: `Invalid subcategory for category '${categoryId}'` },
          { status: 404 }
        );
      }
    }

    // ... existing file upload logic (save to storage, create file_asset) ...

    // When creating/updating document, include categoryId and subcategoryId
    const documentData = {
      id: documentId,
      projectId,
      categoryId: categoryId || null,
      subcategoryId: subcategoryId || null,
      latestVersionId: versionId,
      updatedAt: new Date().toISOString(),
    };

    // ... rest of existing logic ...

    return NextResponse.json({
      documentId,
      versionNumber,
      fileAssetId,
      category: categoryId,
      subcategory: subcategoryId,
      message: `Document uploaded as version ${versionNumber}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: 'Failed to upload document' },
      { status: 500 }
    );
  }
}
```

---

## Step 6: Modify DocumentRepository Component

**File**: `src/components/documents/DocumentRepository.tsx`

Update to pass `selectedDocumentIds` to `CategoryUploadTiles`.

```typescript
// In DocumentRepository component:

return (
  <div className="space-y-6">
    {/* Main upload zone (existing) */}
    <UploadZone onFilesSelected={handleFilesSelected} uploading={uploading} />

    {/* Category upload tiles (modified) */}
    <CategoryUploadTiles
      projectId={projectId}
      onFilesSelected={handleFilesSelected}
      selectedDocumentIds={selectedDocumentIds}  // Pass selection state
    />

    {/* Document list (existing) */}
    <CategorizedList
      projectId={projectId}
      refreshTrigger={refreshTrigger}
      selectedDocumentIds={selectedDocumentIds}
      onSelectionChange={setSelectedDocumentIds}
    />
  </div>
);
```

---

## Step 7: Add Tests

### Unit Test Example

**File**: `tests/components/documents/CategoryTile.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoryTile } from '@/components/documents/CategoryTile';

describe('CategoryTile', () => {
  it('renders category name', () => {
    render(
      <CategoryTile
        category={{ id: 'planning', name: 'Planning' }}
        isActive={true}
      />
    );

    expect(screen.getByText('Planning')).toBeInTheDocument();
  });

  it('shows disabled state when isActive is false', () => {
    const { container } = render(
      <CategoryTile
        category={{ id: 'planning', name: 'Planning' }}
        isActive={false}
      />
    );

    expect(container.firstChild).toHaveClass('opacity-50');
  });

  it('calls onDrop when files are dropped', () => {
    const mockOnDrop = jest.fn();
    render(
      <CategoryTile
        category={{ id: 'planning', name: 'Planning' }}
        isActive={true}
        onDrop={mockOnDrop}
      />
    );

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    const dropzone = screen.getByText('Planning').parentElement!;

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    expect(mockOnDrop).toHaveBeenCalledWith([file], 'planning', undefined);
  });
});
```

---

## Development Checklist

### Phase 1: Core Components
- [ ] Create `CategoryTile.tsx` component
- [ ] Create `use-active-categories.ts` hook
- [ ] Modify `CategoryUploadTiles.tsx` to use new tile component
- [ ] Test tile rendering and expansion locally

### Phase 2: API Integration
- [ ] Create `/api/categories/active` endpoint
- [ ] Modify `/api/documents` to accept category/subcategory
- [ ] Test API endpoints with curl/Postman

### Phase 3: UI Wiring
- [ ] Update `DocumentRepository` to pass selection state
- [ ] Test drag-and-drop upload to category tiles
- [ ] Test bulk re-categorization (select + click)
- [ ] Verify toast notifications appear

### Phase 4: Testing
- [ ] Write unit tests for `CategoryTile`
- [ ] Write unit tests for `use-active-categories`
- [ ] Write integration test for drag-to-category flow
- [ ] Manual testing with 50+ files

### Phase 5: Polish
- [ ] Verify responsive layout (mobile, tablet, desktop)
- [ ] Test in Chrome, Firefox, Safari, Edge
- [ ] Verify accessibility (keyboard navigation)
- [ ] Performance test with 100+ documents

---

## Common Issues & Solutions

### Issue: Tiles not appearing
**Solution**: Check that `useActiveCategories` is returning data. Verify Planning Card has active disciplines/trades.

### Issue: Drag-and-drop not working
**Solution**: Ensure `react-dropzone` is installed and `disabled` prop is `false`. Check browser console for errors.

### Issue: Bulk categorization not working
**Solution**: Verify `selectedDocumentIds` is passed to `CategoryUploadTiles`. Check API endpoint response.

### Issue: Subcategories not showing
**Solution**: Verify `expandedCategories` state is being updated. Check that subcategories exist in database.

---

## Next Steps

After completing this implementation:
1. **Run manual tests** with real files (see research.md Testing Strategy)
2. **Create tasks.md** using `/speckit.tasks` command
3. **Run tests** and fix any failures
4. **Create pull request** with all changes

**Estimated Time Breakdown**:
- Day 1: Steps 1-2 (Components + Hook)
- Day 2: Steps 3-4 (UI + API)
- Day 3: Steps 5-6 (Integration)
- Day 4: Step 7 (Testing)
- Day 5: Polish + PR

---

## Resources

- [react-dropzone Documentation](https://react-dropzone.js.org/)
- [Next.js App Router API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Drizzle ORM Queries](https://orm.drizzle.team/docs/select)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

**Questions?** Refer to:
- [research.md](./research.md) for technical decisions
- [data-model.md](./data-model.md) for entity details
- [contracts/api-spec.openapi.yaml](./contracts/api-spec.openapi.yaml) for API reference
