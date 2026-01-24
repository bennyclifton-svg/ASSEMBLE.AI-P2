'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Users, Building2, Shield, HardHat } from 'lucide-react';
import { DiamondIcon } from '@/components/ui/diamond-icon';
import { cn } from '@/lib/utils';
import type {
  StakeholderGroup,
  GeneratedStakeholder,
} from '@/types/stakeholder';

interface GenerateStakeholdersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingCount: number;
  onGenerate: (options: GenerateOptions) => Promise<GenerateResult | null>;
  onPreview: (options: GenerateOptions) => Promise<PreviewResult | null>;
  filterGroup?: StakeholderGroup;
}

interface GenerateOptions {
  mode: 'merge' | 'replace';
  groups: StakeholderGroup[];
  includeAuthorities: boolean;
  includeContractors: boolean;
}

interface GenerateResult {
  created: number;
  deleted: number;
  generated: GeneratedStakeholder[];
}

interface PreviewResult {
  generated: GeneratedStakeholder[];
  profileContext: {
    buildingClass: string;
    projectType: string;
    subclass: string[];
    complexityScore: number;
  };
  existingCount: number;
  mode: 'merge' | 'replace';
}

const GROUP_ICONS: Record<StakeholderGroup, React.ElementType> = {
  client: Users,
  authority: Shield,
  consultant: Building2,
  contractor: HardHat,
};

const GROUP_LABELS: Record<StakeholderGroup, string> = {
  client: 'Clients',
  authority: 'Authorities',
  consultant: 'Consultants',
  contractor: 'Contractors',
};

export function GenerateStakeholdersDialog({
  open,
  onOpenChange,
  existingCount,
  onGenerate,
  onPreview,
  filterGroup,
}: GenerateStakeholdersDialogProps) {
  const [mode, setMode] = useState<'merge' | 'replace'>('merge');
  const [selectedGroups, setSelectedGroups] = useState<StakeholderGroup[]>([
    'client',
    'authority',
    'consultant',
    'contractor',
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMode('merge');
      // If filterGroup is set, only select that group
      setSelectedGroups(filterGroup ? [filterGroup] : ['client', 'authority', 'consultant', 'contractor']);
      setPreview(null);
      setError(null);
    }
  }, [open, filterGroup]);

  // Auto-preview when options change
  useEffect(() => {
    if (open && selectedGroups.length > 0) {
      handlePreview();
    }
  }, [open, selectedGroups, mode]);

  const handlePreview = async () => {
    setIsPreviewing(true);
    setError(null);
    try {
      const result = await onPreview({
        mode,
        groups: selectedGroups,
        includeAuthorities: selectedGroups.includes('authority'),
        includeContractors: selectedGroups.includes('contractor'),
      });
      setPreview(result);
    } catch (err) {
      setError('Failed to preview stakeholders');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await onGenerate({
        mode,
        groups: selectedGroups,
        includeAuthorities: selectedGroups.includes('authority'),
        includeContractors: selectedGroups.includes('contractor'),
      });
      onOpenChange(false);
    } catch (err) {
      setError('Failed to generate stakeholders');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleGroup = (group: StakeholderGroup) => {
    setSelectedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  // Group preview by stakeholder group
  const previewByGroup = preview?.generated.reduce((acc, s) => {
    if (!acc[s.stakeholderGroup]) acc[s.stakeholderGroup] = [];
    acc[s.stakeholderGroup].push(s);
    return acc;
  }, {} as Record<StakeholderGroup, GeneratedStakeholder[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DiamondIcon className="w-5 h-5 text-[var(--color-accent-blue)]" />
            Generate {filterGroup ? GROUP_LABELS[filterGroup] : 'Stakeholders'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Mode Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              Generation Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('merge')}
                className={cn(
                  'flex-1 px-4 py-2 text-sm rounded-lg border transition-colors',
                  mode === 'merge'
                    ? 'border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                )}
              >
                <div className="font-medium">Merge</div>
                <div className="text-xs opacity-70">Add to existing stakeholders</div>
              </button>
              <button
                onClick={() => setMode('replace')}
                className={cn(
                  'flex-1 px-4 py-2 text-sm rounded-lg border transition-colors',
                  mode === 'replace'
                    ? 'border-[var(--color-accent-blue)] bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-muted)]'
                )}
              >
                <div className="font-medium">Replace</div>
                <div className="text-xs opacity-70">Clear and regenerate</div>
              </button>
            </div>
            {mode === 'replace' && existingCount > 0 && (
              <p className="text-xs text-amber-600">
                Warning: This will delete {existingCount} existing stakeholder(s)
              </p>
            )}
          </div>

          {/* Group Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--color-text-primary)]">
              Groups to Generate
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['client', 'authority', 'consultant', 'contractor'] as StakeholderGroup[]).map(
                (group) => {
                  const Icon = GROUP_ICONS[group];
                  const isSelected = selectedGroups.includes(group);
                  const count = previewByGroup?.[group]?.length || 0;

                  return (
                    <button
                      key={group}
                      onClick={() => toggleGroup(group)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left',
                        isSelected
                          ? 'border-[var(--color-accent-green)] bg-[var(--color-accent-green)]/10'
                          : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-5 h-5',
                          isSelected
                            ? 'text-[var(--color-accent-green)]'
                            : 'text-[var(--color-text-muted)]'
                        )}
                      />
                      <div className="flex-1">
                        <div
                          className={cn(
                            'text-sm font-medium',
                            isSelected
                              ? 'text-[var(--color-text-primary)]'
                              : 'text-[var(--color-text-muted)]'
                          )}
                        >
                          {GROUP_LABELS[group]}
                        </div>
                        {isSelected && (
                          <div className="text-xs text-[var(--color-text-muted)]">
                            {isPreviewing ? '...' : `${count} to generate`}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Profile Context */}
          {preview?.profileContext && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">
                Based on Project Profile
              </label>
              <div className="bg-[var(--color-bg-secondary)] rounded-lg p-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[var(--color-text-muted)]">Class:</span>{' '}
                    <span className="text-[var(--color-text-primary)] capitalize">
                      {preview.profileContext.buildingClass || 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Type:</span>{' '}
                    <span className="text-[var(--color-text-primary)] capitalize">
                      {preview.profileContext.projectType?.replace(/_/g, ' ') || 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[var(--color-text-muted)]">Complexity:</span>{' '}
                    <span className="text-[var(--color-text-primary)]">
                      {preview.profileContext.complexityScore}/10
                    </span>
                  </div>
                  {preview.profileContext.subclass.length > 0 && (
                    <div>
                      <span className="text-[var(--color-text-muted)]">Subclass:</span>{' '}
                      <span className="text-[var(--color-text-primary)]">
                        {preview.profileContext.subclass.join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Preview List */}
          {preview && selectedGroups.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-text-primary)]">
                Preview ({preview.generated.length} stakeholders)
              </label>
              <div className="bg-[var(--color-bg-secondary)] rounded-lg max-h-48 overflow-y-auto">
                {selectedGroups.map((group) => {
                  const items = previewByGroup?.[group] || [];
                  if (items.length === 0) return null;

                  const Icon = GROUP_ICONS[group];

                  return (
                    <div key={group} className="border-b border-[var(--color-border)] last:border-b-0">
                      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-bg-tertiary)]">
                        <Icon className="w-4 h-4 text-[var(--color-text-muted)]" />
                        <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase">
                          {GROUP_LABELS[group]} ({items.length})
                        </span>
                      </div>
                      <div className="divide-y divide-[var(--color-border)]">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="px-3 py-1.5 text-sm flex items-center justify-between"
                          >
                            <span className="text-[var(--color-text-primary)]">{item.name}</span>
                            <span className="text-xs text-[var(--color-text-muted)]">
                              {item.reason}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{error}</div>
          )}
        </div>

        <DialogFooter className="border-t border-[var(--color-border)] pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isLoading || selectedGroups.length === 0}
            className="bg-[var(--color-accent-green)] hover:bg-[var(--color-accent-green)]/90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <DiamondIcon className="w-4 h-4 mr-2" />
                Generate {preview?.generated.length || 0} Stakeholders
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
