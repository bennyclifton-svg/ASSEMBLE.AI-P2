# Project Details Middle Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move project detail fields (Address, Lot Area, Zoning, Legal Address, Jurisdiction) from the left nav to the middle panel, keeping only Project Name in the left nav with expand/collapse arrows.

**Architecture:** The left nav's DetailsSection will be stripped down to show only Project Name + expand arrows. A new ProjectDetailsPanel component will render in the middle panel (via ProcurementCard's tab system) when the "project-details" tab is active. The drag-drop PDF extraction logic moves to the new panel.

**Tech Stack:** React, TypeScript, lucide-react icons, existing API endpoints (`/api/planning/extract`, `/api/planning/{projectId}/details`)

---

## Task 1: Add `isActive` and `onToggle` props to DetailsSection

**Files:**
- Modify: `src/components/dashboard/planning/DetailsSection.tsx:395-401`

**Step 1: Update the interface to add new props**

In `DetailsSection.tsx`, update the `DetailsSectionProps` interface:

```typescript
interface DetailsSectionProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
    onProjectNameChange?: () => void;
    isActive?: boolean;
    onToggle?: () => void;
}
```

**Step 2: Update the function signature to destructure new props**

```typescript
export function DetailsSection({ projectId, data, onUpdate, onProjectNameChange, isActive = false, onToggle }: DetailsSectionProps) {
```

**Step 3: Commit**

```bash
git add src/components/dashboard/planning/DetailsSection.tsx
git commit -m "feat: add isActive and onToggle props to DetailsSection"
```

---

## Task 2: Strip DetailsSection to show only Project Name with expand arrows

**Files:**
- Modify: `src/components/dashboard/planning/DetailsSection.tsx`

**Step 1: Add Maximize2 and Minimize2 imports**

Update the import line (line 5):

```typescript
import { Upload, Maximize2, Minimize2 } from 'lucide-react';
```

**Step 2: Replace the entire return JSX**

Replace lines 625-707 with the following minimal component:

```typescript
    return (
        <div className={`nav-panel-section py-3 pl-2 pr-3 ${isActive ? 'nav-panel-active' : ''}`}>
            {/* Project Name Header with expand arrows */}
            <button
                onClick={onToggle}
                className="nav-panel-header w-full mb-2"
            >
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                    Project Name
                </span>
                {isActive ? (
                    <Minimize2 className="nav-panel-chevron w-3.5 h-3.5 text-[var(--color-accent-copper)]" />
                ) : (
                    <Maximize2 className="nav-panel-chevron w-3.5 h-3.5 text-[var(--color-text-muted)] transition-colors" />
                )}
            </button>

            {/* Project Name Value - read-only display */}
            <div className="text-lg font-bold text-[var(--color-text-primary)] pl-1.5 pr-2 truncate">
                {data?.projectName || 'Untitled Project'}
            </div>
        </div>
    );
```

**Step 3: Remove unused code**

Remove the following that are no longer needed in DetailsSection:
- `isDragging` and `isExtracting` state (lines 404-405)
- `updateField` function (lines 407-441)
- `updateMultipleFields` function (lines 443-470)
- `handleExtraction` function (lines 472-526)
- `handleDragOver`, `handleDragLeave`, `handleDrop`, `handlePaste` handlers (lines 528-623)
- `InlineEditField` component (lines 16-109) - keep for now, will be used in new panel
- `MetricCard` component (lines 122-218) - can be removed
- `DetailRow` component (lines 230-393) - keep for now, will be used in new panel

Actually, keep `InlineEditField` and `DetailRow` in DetailsSection.tsx for now - we'll extract them to the new panel in Task 3.

**Step 4: Commit**

```bash
git add src/components/dashboard/planning/DetailsSection.tsx
git commit -m "feat: strip DetailsSection to show only Project Name with expand arrows"
```

---

## Task 3: Create ProjectDetailsPanel component

**Files:**
- Create: `src/components/dashboard/planning/ProjectDetailsPanel.tsx`

**Step 1: Create the new file with full implementation**

```typescript
'use client';

import { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { useToast } from '@/lib/hooks/use-toast';
import { Upload } from 'lucide-react';

// Props for InlineEditField component
interface InlineEditFieldProps {
    value: string;
    onSave: (newValue: string) => Promise<void>;
    placeholder?: string;
    className?: string;
}

// Inline editable text field
function InlineEditField({ value, onSave, placeholder, className }: InlineEditFieldProps) {
    const [editValue, setEditValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);
    const [savedValue, setSavedValue] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isFocused && !isSaving) {
            setEditValue(value || '');
            setSavedValue(value || '');
        }
    }, [value, isFocused, isSaving]);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const handleSave = async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        if (editValue === savedValue) return;

        setIsSaving(true);
        const previousValue = savedValue;
        setSavedValue(editValue);

        try {
            await onSave(editValue);
        } catch (error) {
            console.error('Save failed:', error);
            setSavedValue(previousValue);
            setEditValue(previousValue);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => handleSave(), 150);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            inputRef.current?.blur();
        } else if (e.key === 'Escape') {
            setEditValue(savedValue);
            inputRef.current?.blur();
        }
    };

    return (
        <div className="relative">
            <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={isSaving}
                className={`
                    w-full bg-transparent outline-none border-none
                    focus:outline-none focus:ring-0
                    placeholder:text-[var(--color-text-muted)] disabled:opacity-50
                    transition-all
                    ${className}
                `}
            />
            {isSaving && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none">
                    <div className="w-3 h-3 border-2 border-[var(--color-accent-copper)] border-t-transparent rounded-full animate-spin"></div>
                </div>
            )}
        </div>
    );
}

// Props for DetailRow component
interface DetailRowProps {
    label: string;
    value: string;
    onSave: (newValue: string) => Promise<void>;
    placeholder?: string;
    isLast?: boolean;
}

// Two-column row with label and editable field
function DetailRow({ label, value, onSave, placeholder, isLast = false }: DetailRowProps) {
    const [editValue, setEditValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [savedValue, setSavedValue] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const autoResize = () => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const scrollTop = window.scrollY;
        textarea.style.height = 'auto';
        const newHeight = Math.max(textarea.scrollHeight, 24);
        textarea.style.height = `${newHeight}px`;
        window.scrollTo(0, scrollTop);
    };

    useEffect(() => {
        if (!isFocused && !isSaving && !showSuccess) {
            setEditValue(value || '');
            setSavedValue(value || '');
        }
    }, [value]);

    useLayoutEffect(() => {
        autoResize();
    }, [editValue]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const resizeObserver = new ResizeObserver(() => {
            autoResize();
        });

        resizeObserver.observe(textarea);
        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    const handleSave = async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = null;
        }

        if (editValue === savedValue) return;

        setIsSaving(true);
        const previousValue = savedValue;
        setSavedValue(editValue);

        try {
            await onSave(editValue);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch (error) {
            console.error('Save failed:', error);
            setSavedValue(previousValue);
            setEditValue(previousValue);
        } finally {
            setIsSaving(false);
        }
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => handleSave(), 150);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            textareaRef.current?.blur();
        } else if (e.key === 'Escape') {
            setEditValue(savedValue);
            textareaRef.current?.blur();
        }
    };

    return (
        <div
            className={`
                flex transition-all duration-150 relative
                ${!isLast ? 'border-b border-[var(--color-border)]' : ''}
            `}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="w-[120px] shrink-0 px-3 py-2 flex items-center relative">
                <span className="text-sm font-medium text-[var(--color-text-muted)]">{label}</span>
                <div
                    className={`
                        absolute right-0 top-0 bottom-0 w-[2px]
                        transition-opacity duration-150
                        ${isHovered && !isFocused ? 'opacity-100 bg-[var(--color-accent-copper)]' : 'opacity-0 bg-transparent'}
                    `}
                />
            </div>

            <div className="flex-1 relative px-3">
                <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className={`
                        w-full px-2 py-2 text-sm
                        bg-transparent
                        transition-all duration-150
                        outline-none border-0 ring-0 shadow-none
                        focus:outline-none focus:ring-0 focus:border-0 focus:shadow-none
                        disabled:opacity-50
                        resize-none overflow-hidden
                        placeholder:text-[var(--color-text-muted)]
                        text-[var(--color-text-primary)]
                    `}
                    placeholder={placeholder}
                    disabled={isSaving}
                    rows={1}
                />

                {isSaving && (
                    <div className="absolute right-4 top-2.5 pointer-events-none">
                        <div className="w-3 h-3 border-2 border-[var(--color-accent-copper)] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                )}
                {showSuccess && !isSaving && (
                    <span className="absolute right-4 top-2.5 text-[var(--color-accent-copper)] text-sm pointer-events-none">✓</span>
                )}
            </div>
        </div>
    );
}

interface ProjectDetailsPanelProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
    onProjectNameChange?: () => void;
}

export function ProjectDetailsPanel({ projectId, data, onUpdate, onProjectNameChange }: ProjectDetailsPanelProps) {
    const { toast } = useToast();
    const [isDragging, setIsDragging] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    const updateField = async (field: string, value: string) => {
        const payload = {
            projectName: data?.projectName || '',
            address: data?.address || '',
            legalAddress: data?.legalAddress || '',
            zoning: data?.zoning || '',
            jurisdiction: data?.jurisdiction || '',
            lotArea: data?.lotArea || '',
            [field]: value,
        };

        const res = await fetch(`/api/planning/${projectId}/details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Save failed: ${errorText}`);
        }

        onUpdate();

        if (field === 'projectName' && onProjectNameChange) {
            onProjectNameChange();
        }
    };

    const updateMultipleFields = async (extractedData: any) => {
        const payload = {
            projectName: extractedData.projectName || data?.projectName || '',
            address: extractedData.address || data?.address || '',
            legalAddress: extractedData.legalAddress || data?.legalAddress || '',
            zoning: extractedData.zoning || data?.zoning || '',
            jurisdiction: extractedData.jurisdiction || data?.jurisdiction || '',
            lotArea: extractedData.lotArea?.toString() || data?.lotArea?.toString() || '',
        };

        const res = await fetch(`/api/planning/${projectId}/details`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            throw new Error('Failed to update fields');
        }

        onUpdate();

        if (extractedData.projectName && onProjectNameChange) {
            onProjectNameChange();
        }
    };

    const handleExtraction = async (input: File | string) => {
        setIsExtracting(true);
        try {
            let response: Response;

            if (input instanceof File) {
                const formData = new FormData();
                formData.append('file', input);

                response = await fetch('/api/planning/extract', {
                    method: 'POST',
                    body: formData,
                });
            } else {
                response = await fetch('/api/planning/extract', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: input }),
                });
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || 'Failed to extract data');
            }

            const result = await response.json();
            const { data: extractedData, confidence } = result;

            await updateMultipleFields(extractedData);

            if (confidence < 70) {
                toast({
                    title: 'Low Confidence Extraction',
                    description: `Extracted with ${confidence}% confidence. Please review the data.`,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Data Extracted',
                    description: `Successfully extracted project details (${confidence}% confidence)`,
                });
            }
        } catch (error) {
            toast({
                title: 'Extraction Failed',
                description: error instanceof Error ? error.message : 'Failed to extract data',
                variant: 'destructive',
            });
        } finally {
            setIsExtracting(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const relatedTarget = e.relatedTarget as Element | null;
        if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
            setIsDragging(false);
        }
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const textContent = e.dataTransfer.getData('text/plain');
        if (textContent && textContent.length > 20) {
            await handleExtraction(textContent);
            return;
        }

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) {
            toast({
                title: 'No Content',
                description: 'No file or text content found',
                variant: 'destructive',
            });
            return;
        }

        const file = files[0];
        const validTypes = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'text/plain',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
        const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.txt', '.docx'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

        if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
            toast({
                title: 'Invalid File Type',
                description: 'Please upload a PDF, Word document, image (JPG/PNG), or text file',
                variant: 'destructive',
            });
            return;
        }

        await handleExtraction(file);
    };

    const handlePaste = async (e: React.ClipboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        e.preventDefault();

        let content = e.clipboardData.getData('text/html');

        if (!content) {
            content = e.clipboardData.getData('text/plain');
        } else {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = content;
            content = tempDiv.textContent || tempDiv.innerText || '';
        }

        if (!content || content.length < 20) {
            toast({
                title: 'No Content',
                description: 'Paste some text content to extract project details',
                variant: 'destructive',
            });
            return;
        }

        await handleExtraction(content);
    };

    return (
        <div
            className="h-full flex flex-col relative"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onPaste={handlePaste}
            tabIndex={0}
        >
            {/* Extraction Progress Overlay */}
            {isExtracting && (
                <div className="absolute inset-0 z-50 bg-[var(--color-bg-primary)]/80 rounded-xl flex items-center justify-center">
                    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg p-6 flex flex-col items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-accent-copper)]"></div>
                        <p className="text-[var(--color-text-primary)] font-semibold">Extracting project details...</p>
                        <p className="text-xs text-[var(--color-text-muted)]">This may take a few moments</p>
                    </div>
                </div>
            )}

            {/* Drag & Drop Overlay */}
            {isDragging && !isExtracting && (
                <div className="absolute inset-0 z-50 bg-[var(--color-accent-copper)]/20 border-2 border-dashed border-[var(--color-accent-copper)] rounded-xl flex items-center justify-center">
                    <div className="bg-[var(--color-bg-primary)] border border-[var(--color-accent-copper)] rounded-lg p-6 flex flex-col items-center gap-3">
                        <Upload className="w-10 h-10 text-[var(--color-accent-copper)]" />
                        <p className="text-[var(--color-text-primary)] font-semibold">Drop to extract project details</p>
                        <p className="text-xs text-[var(--color-text-muted)]">PDF, Word, Image, or Text</p>
                    </div>
                </div>
            )}

            {/* Header with title and upload icon */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Project Details</h2>
                <Upload className="w-4 h-4 text-[var(--color-text-muted)]" />
            </div>

            {/* Form content */}
            <div className="flex-1 overflow-y-auto py-4">
                <div className="max-w-2xl mx-auto px-4">
                    {/* Project Name */}
                    <div className="mb-6 pb-4 border-b border-[var(--color-border)]">
                        <div className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Project Name</div>
                        <InlineEditField
                            value={data?.projectName || ''}
                            onSave={(v) => updateField('projectName', v)}
                            placeholder="Untitled Project"
                            className="text-xl font-bold text-[var(--color-text-primary)]"
                        />
                    </div>

                    {/* Detail rows */}
                    <div className="border border-[var(--color-border)] rounded-lg overflow-hidden">
                        <DetailRow
                            label="Address"
                            value={data?.address || ''}
                            onSave={(v) => updateField('address', v)}
                            placeholder="Enter address"
                        />
                        <DetailRow
                            label="Lot Area"
                            value={data?.lotArea?.toString() || ''}
                            onSave={(v) => updateField('lotArea', v)}
                            placeholder="0 m²"
                        />
                        <DetailRow
                            label="Zoning"
                            value={data?.zoning || ''}
                            onSave={(v) => updateField('zoning', v)}
                            placeholder="Enter zoning"
                        />
                        <DetailRow
                            label="Legal Address"
                            value={data?.legalAddress || ''}
                            onSave={(v) => updateField('legalAddress', v)}
                            placeholder="Enter legal address"
                        />
                        <DetailRow
                            label="Jurisdiction"
                            value={data?.jurisdiction || ''}
                            onSave={(v) => updateField('jurisdiction', v)}
                            placeholder="Enter jurisdiction"
                            isLast
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
```

**Step 2: Commit**

```bash
git add src/components/dashboard/planning/ProjectDetailsPanel.tsx
git commit -m "feat: create ProjectDetailsPanel component with drag-drop extraction"
```

---

## Task 4: Wire up PlanningCard to pass new props to DetailsSection

**Files:**
- Modify: `src/components/dashboard/PlanningCard.tsx`

**Step 1: Add onShowProjectDetails prop to interface**

Update the interface (lines 9-20):

```typescript
interface PlanningCardProps {
    projectId: string;
    selectedDocumentIds?: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
    onProjectNameChange?: () => void;
    onProfileChange?: (buildingClass: string | null, projectType: string | null) => void;
    onStakeholderNavigate?: () => void;
    onShowProfiler?: () => void;
    onShowObjectives?: () => void;
    onShowProjectDetails?: () => void;
    activeMainTab?: string;
    refreshKey?: number;
}
```

**Step 2: Destructure the new prop**

Update line 22-33 to include:

```typescript
export function PlanningCard({
    projectId,
    selectedDocumentIds = [],
    onSetSelectedDocumentIds,
    onProjectNameChange,
    onProfileChange,
    onStakeholderNavigate,
    onShowProfiler,
    onShowObjectives,
    onShowProjectDetails,
    activeMainTab,
    refreshKey,
}: PlanningCardProps) {
```

**Step 3: Pass props to DetailsSection**

Update lines 67-73:

```typescript
                <DetailsSection
                    key={projectId}
                    projectId={projectId}
                    data={data?.details}
                    onUpdate={fetchPlanningData}
                    onProjectNameChange={onProjectNameChange}
                    isActive={activeMainTab === 'project-details'}
                    onToggle={onShowProjectDetails}
                />
```

**Step 4: Commit**

```bash
git add src/components/dashboard/PlanningCard.tsx
git commit -m "feat: wire up PlanningCard to pass isActive and onToggle to DetailsSection"
```

---

## Task 5: Add Project Details tab to ProcurementCard

**Files:**
- Modify: `src/components/dashboard/ProcurementCard.tsx`

**Step 1: Import ProjectDetailsPanel**

Add to imports (around line 14):

```typescript
import { ProjectDetailsPanel } from '@/components/dashboard/planning/ProjectDetailsPanel';
```

**Step 2: Add detailsData prop and state**

Add new props to interface (lines 19-31):

```typescript
interface ProcurementCardProps {
    projectId: string;
    selectedDocumentIds: string[];
    onSetSelectedDocumentIds?: (ids: string[]) => void;
    buildingClass?: BuildingClass | null;
    projectType?: ProjectType | null;
    region?: Region;
    onRegionChange?: (region: Region) => void;
    onProfileComplete?: () => void;
    onProfileLoad?: (buildingClass: BuildingClass, projectType: ProjectType) => void;
    activeMainTab?: string;
    onMainTabChange?: (tab: string) => void;
    detailsData?: any;
    onDetailsUpdate?: () => void;
    onProjectNameChange?: () => void;
}
```

**Step 3: Destructure new props**

Update the function signature (lines 73-85):

```typescript
export function ProcurementCard({
    projectId,
    selectedDocumentIds,
    onSetSelectedDocumentIds,
    buildingClass,
    projectType,
    region = 'AU',
    onRegionChange,
    onProfileComplete,
    onProfileLoad,
    activeMainTab: externalActiveMainTab,
    onMainTabChange,
    detailsData,
    onDetailsUpdate,
    onProjectNameChange,
}: ProcurementCardProps) {
```

**Step 4: Add TabsContent for project-details**

Add after the objectives TabsContent (after line 330):

```typescript
                {/* Project Details Tab Content */}
                <TabsContent value="project-details" className="flex-1 mt-0 min-h-0 overflow-hidden">
                    <ProjectDetailsPanel
                        projectId={projectId}
                        data={detailsData}
                        onUpdate={onDetailsUpdate || (() => {})}
                        onProjectNameChange={onProjectNameChange}
                    />
                </TabsContent>
```

**Step 5: Commit**

```bash
git add src/components/dashboard/ProcurementCard.tsx
git commit -m "feat: add Project Details tab to ProcurementCard middle panel"
```

---

## Task 6: Wire up the page to connect everything

**Files:**
- Modify: `src/app/projects/[projectId]/page.tsx`

**Step 1: Add handler for showing project details**

Add after handleShowObjectives (around line 80):

```typescript
    // Handler for project details navigation - switches center panel to Project Details tab
    const handleShowProjectDetails = useCallback(() => {
        setCenterActiveTab('project-details');
    }, []);
```

**Step 2: Add planning data state for details**

Add after the existing state declarations (around line 36):

```typescript
    // Planning data state for details panel
    const [planningData, setPlanningData] = useState<any>(null);

    // Fetch planning data
    const fetchPlanningData = useCallback(async () => {
        try {
            const response = await fetch(`/api/planning/${projectId}`);
            const data = await response.json();
            setPlanningData(data);
        } catch (error) {
            console.error('Error fetching planning data:', error);
        }
    }, [projectId]);
```

**Step 3: Add useEffect to fetch planning data**

Add after existing useEffects:

```typescript
    // Fetch planning data on mount and when refreshTrigger changes
    useEffect(() => {
        if (projectId) {
            fetchPlanningData();
        }
    }, [projectId, refreshTrigger, fetchPlanningData]);
```

**Step 4: Pass new prop to PlanningCard**

Update PlanningCard (lines 155-166):

```typescript
            <PlanningCard
              projectId={project.id}
              selectedDocumentIds={Array.from(selectedDocumentIds)}
              onSetSelectedDocumentIds={handleSetSelectedDocumentIds}
              onProjectNameChange={handleProjectNameChange}
              onProfileChange={handleProfileChange}
              onStakeholderNavigate={handleStakeholderNavigate}
              onShowProfiler={handleShowProfiler}
              onShowObjectives={handleShowObjectives}
              onShowProjectDetails={handleShowProjectDetails}
              activeMainTab={centerActiveTab}
              refreshKey={refreshTrigger}
            />
```

**Step 5: Pass details data to ProcurementCard**

Update ProcurementCard (lines 168-181):

```typescript
            <ProcurementCard
              projectId={project.id}
              selectedDocumentIds={Array.from(selectedDocumentIds)}
              onSetSelectedDocumentIds={handleSetSelectedDocumentIds}
              buildingClass={profileBuildingClass}
              projectType={profileProjectType}
              region={profileRegion}
              onRegionChange={setProfileRegion}
              onProfileComplete={handleProfileComplete}
              onProfileLoad={handleProfileLoad}
              activeMainTab={centerActiveTab}
              onMainTabChange={setCenterActiveTab}
              detailsData={planningData?.details}
              onDetailsUpdate={fetchPlanningData}
              onProjectNameChange={handleProjectNameChange}
            />
```

**Step 6: Commit**

```bash
git add src/app/projects/[projectId]/page.tsx
git commit -m "feat: wire up page to connect DetailsSection with ProjectDetailsPanel"
```

---

## Task 7: Clean up DetailsSection - remove unused code

**Files:**
- Modify: `src/components/dashboard/planning/DetailsSection.tsx`

**Step 1: Remove InlineEditField, MetricCard, and DetailRow components**

Delete lines 7-393 (all the helper components that are now in ProjectDetailsPanel).

**Step 2: Remove unused imports**

Update imports to only what's needed:

```typescript
'use client';

import { Maximize2, Minimize2 } from 'lucide-react';
```

**Step 3: Remove unused state and handlers**

The component should now be minimal:

```typescript
'use client';

import { Maximize2, Minimize2 } from 'lucide-react';

interface DetailsSectionProps {
    projectId: string;
    data: any;
    onUpdate: () => void;
    onProjectNameChange?: () => void;
    isActive?: boolean;
    onToggle?: () => void;
}

export function DetailsSection({ projectId, data, onUpdate, onProjectNameChange, isActive = false, onToggle }: DetailsSectionProps) {
    return (
        <div className={`nav-panel-section py-3 pl-2 pr-3 ${isActive ? 'nav-panel-active' : ''}`}>
            <button
                onClick={onToggle}
                className="nav-panel-header w-full mb-2"
            >
                <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                    Project Name
                </span>
                {isActive ? (
                    <Minimize2 className="nav-panel-chevron w-3.5 h-3.5 text-[var(--color-accent-copper)]" />
                ) : (
                    <Maximize2 className="nav-panel-chevron w-3.5 h-3.5 text-[var(--color-text-muted)] transition-colors" />
                )}
            </button>

            <div className="text-lg font-bold text-[var(--color-text-primary)] pl-1.5 pr-2 truncate">
                {data?.projectName || 'Untitled Project'}
            </div>
        </div>
    );
}
```

**Step 4: Commit**

```bash
git add src/components/dashboard/planning/DetailsSection.tsx
git commit -m "refactor: clean up DetailsSection, remove unused code"
```

---

## Task 8: Test the implementation

**Step 1: Start the development server**

```bash
cd assemble.ai && npm run dev
```

**Step 2: Manual testing checklist**

1. Navigate to a project page
2. Verify left nav shows only "PROJECT NAME" section with expand arrows
3. Click the expand arrows - verify middle panel shows Project Details tab
4. Verify all fields are editable (Project Name, Address, Lot Area, Zoning, Legal Address, Jurisdiction)
5. Edit a field and verify auto-save works (spinner, then checkmark)
6. Drag a PDF file over the panel - verify the drop overlay appears
7. Drop a PDF - verify extraction works and fields populate
8. Click another section (e.g., Project Profile) - verify middle panel switches
9. Verify the expand arrows show Minimize2 when active, Maximize2 when not

**Step 3: Commit final verification**

```bash
git add -A
git commit -m "test: verify Project Details middle panel implementation"
```

---

## Summary

This plan implements the Project Details middle panel refactor in 8 tasks:

1. Add props to DetailsSection
2. Strip DetailsSection to minimal view
3. Create ProjectDetailsPanel component
4. Wire up PlanningCard
5. Add tab to ProcurementCard
6. Wire up the page
7. Clean up unused code
8. Test the implementation

Each task is atomic and can be committed independently.
