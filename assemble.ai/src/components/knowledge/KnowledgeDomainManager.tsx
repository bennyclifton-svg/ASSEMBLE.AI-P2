'use client';

import React, { useState, useMemo } from 'react';
import {
    BookOpen,
    Plus,
    Loader2,
    ChevronDown,
    ChevronUp,
    Filter,
    X,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useKnowledgeDomains } from '@/lib/hooks/use-knowledge-domains';
import {
    DOMAIN_TYPES,
    DOMAIN_TYPE_LABELS,
    ALL_DOMAIN_TAGS,
    TAG_CATEGORIES,
    isKnownTag,
    normalizeTag,
} from '@/lib/constants/knowledge-domains';
import type { KnowledgeDomainDTO } from '@/app/api/knowledge-domains/route';
import type { DomainType, DomainTag } from '@/lib/constants/knowledge-domains';
import { DomainCard } from './DomainCard';

export function KnowledgeDomainManager() {
    const { domains, isLoading, error, createDomain, toggleDomain, deleteDomain } =
        useKnowledgeDomains();

    const [isExpanded, setIsExpanded] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [togglingId, setTogglingId] = useState<string | null>(null);
    const [filterType, setFilterType] = useState<string>('all');
    const [filterTag, setFilterTag] = useState<string>('all');

    // Create form state
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newType, setNewType] = useState<string>('custom');
    const [newTags, setNewTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);

    // Split into prebuilt and custom
    const prebuiltDomains = useMemo(
        () => domains.filter((d) => d.isGlobal === true),
        [domains]
    );
    const customDomains = useMemo(
        () => domains.filter((d) => d.isGlobal !== true),
        [domains]
    );

    // Filtered domains
    const filteredPrebuilt = useMemo(() => {
        return prebuiltDomains.filter((d) => {
            if (filterType !== 'all' && d.domainType !== filterType) return false;
            if (filterTag !== 'all' && !(d.domainTags ?? []).includes(filterTag)) return false;
            return true;
        });
    }, [prebuiltDomains, filterType, filterTag]);

    const filteredCustom = useMemo(() => {
        return customDomains.filter((d) => {
            if (filterType !== 'all' && d.domainType !== filterType) return false;
            if (filterTag !== 'all' && !(d.domainTags ?? []).includes(filterTag)) return false;
            return true;
        });
    }, [customDomains, filterType, filterTag]);

    // Tag suggestions for autocomplete
    const tagSuggestions = useMemo(() => {
        if (!tagInput.trim()) return [];
        const normalized = normalizeTag(tagInput);
        return ALL_DOMAIN_TAGS.filter(
            (t) => t.includes(normalized) && !newTags.includes(t)
        ).slice(0, 8);
    }, [tagInput, newTags]);

    // Active domain count
    const activeDomainCount = domains.filter(
        (d) => d.source?.isActive !== false
    ).length;

    async function handleToggle(id: string, isActive: boolean) {
        setTogglingId(id);
        await toggleDomain(id, isActive);
        setTogglingId(null);
    }

    async function handleDelete(id: string) {
        if (!confirm('Are you sure you want to delete this custom domain?')) return;
        await deleteDomain(id);
    }

    async function handleCreate() {
        if (!newName.trim()) return;
        setIsCreating(true);
        await createDomain({
            name: newName.trim(),
            description: newDescription.trim() || undefined,
            domainType: newType,
            domainTags: newTags,
            organizationId: 'default', // Will be resolved by the API
        });
        setIsCreating(false);
        setIsCreateOpen(false);
        resetCreateForm();
    }

    function resetCreateForm() {
        setNewName('');
        setNewDescription('');
        setNewType('custom');
        setNewTags([]);
        setTagInput('');
    }

    function addTag(tag: string) {
        const normalized = normalizeTag(tag);
        if (normalized && !newTags.includes(normalized)) {
            setNewTags((prev) => [...prev, normalized]);
        }
        setTagInput('');
        setShowTagSuggestions(false);
    }

    function removeTag(tag: string) {
        setNewTags((prev) => prev.filter((t) => t !== tag));
    }

    const hasActiveFilters = filterType !== 'all' || filterTag !== 'all';

    return (
        <div className="border border-[var(--color-border)] rounded">
            {/* Section header */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 hover:bg-[var(--color-bg-hover)] transition-colors"
            >
                <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[var(--color-text-muted)]" />
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        Knowledge Domains
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                        ({activeDomainCount} active)
                    </span>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[var(--color-text-muted)]" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
                )}
            </button>

            {isExpanded && (
                <div className="border-t border-[var(--color-border)] p-4 space-y-4">
                    {/* Loading */}
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-[var(--color-text-muted)]" />
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="px-3 py-2 bg-[var(--color-error)]/20 rounded text-sm text-[var(--color-error)]">
                            {error}
                        </div>
                    )}

                    {!isLoading && !error && (
                        <>
                            {/* Filters + Create button */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <Filter className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />

                                {/* Type filter */}
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="bg-[var(--color-bg-hover)] border border-[var(--color-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                                >
                                    <option value="all">All Types</option>
                                    {DOMAIN_TYPES.map((t) => (
                                        <option key={t} value={t}>
                                            {DOMAIN_TYPE_LABELS[t]}
                                        </option>
                                    ))}
                                </select>

                                {/* Tag filter */}
                                <select
                                    value={filterTag}
                                    onChange={(e) => setFilterTag(e.target.value)}
                                    className="bg-[var(--color-bg-hover)] border border-[var(--color-border)] rounded px-2 py-1 text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                                >
                                    <option value="all">All Tags</option>
                                    {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
                                        <optgroup key={category} label={category}>
                                            {tags.map((tag) => (
                                                <option key={tag} value={tag}>
                                                    {tag}
                                                </option>
                                            ))}
                                        </optgroup>
                                    ))}
                                </select>

                                {hasActiveFilters && (
                                    <button
                                        onClick={() => { setFilterType('all'); setFilterTag('all'); }}
                                        className="text-[10px] text-[var(--sw-cyan)] hover:text-[var(--color-text-primary)] transition-colors"
                                    >
                                        Clear filters
                                    </button>
                                )}

                                <div className="flex-1" />

                                <Button
                                    onClick={() => setIsCreateOpen(true)}
                                    size="sm"
                                    className="h-7 px-3 text-xs bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-hover)] text-white"
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Custom Domain
                                </Button>
                            </div>

                            {/* Prebuilt domains grid */}
                            <div>
                                <h5 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                                    Prebuilt Domains ({filteredPrebuilt.length})
                                </h5>
                                {filteredPrebuilt.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                        {filteredPrebuilt.map((domain) => (
                                            <DomainCard
                                                key={domain.id}
                                                domain={domain}
                                                onToggle={handleToggle}
                                                isToggling={togglingId === domain.id}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-[var(--color-text-muted)] py-2">
                                        No prebuilt domains match the current filters.
                                    </p>
                                )}
                            </div>

                            {/* Custom domains section */}
                            <div>
                                <h5 className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider mb-2">
                                    Custom Domains ({filteredCustom.length})
                                </h5>
                                {filteredCustom.length > 0 ? (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                        {filteredCustom.map((domain) => (
                                            <DomainCard
                                                key={domain.id}
                                                domain={domain}
                                                onToggle={handleToggle}
                                                onDelete={handleDelete}
                                                isToggling={togglingId === domain.id}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-[var(--color-text-muted)] py-2">
                                        No custom domains yet. Click &quot;Custom Domain&quot; to create one.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Create Custom Domain Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="bg-[var(--color-bg-secondary)] border-[var(--color-border)] text-[var(--color-text-primary)] max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-[var(--color-text-primary)]">Create Custom Domain</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-[var(--color-text-muted)]">Name</Label>
                            <Input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="e.g., Heritage Construction Guide"
                                className="bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[#555] text-sm"
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-[var(--color-text-muted)]">Description</Label>
                            <Input
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                placeholder="Brief description of this domain's purpose"
                                className="bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[#555] text-sm"
                            />
                        </div>

                        {/* Type */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-[var(--color-text-muted)]">Domain Type</Label>
                            <select
                                value={newType}
                                onChange={(e) => setNewType(e.target.value)}
                                className="w-full bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-md px-3 py-2 text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-accent-primary)]"
                            >
                                {DOMAIN_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                        {DOMAIN_TYPE_LABELS[t]}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Tags */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-[var(--color-text-muted)]">Tags</Label>
                            {/* Selected tags */}
                            {newTags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-1">
                                    {newTags.map((tag) => (
                                        <span
                                            key={tag}
                                            className={`
                                                inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px]
                                                ${isKnownTag(tag)
                                                    ? 'bg-[var(--color-accent-primary)]/15 text-[var(--sw-cyan)]'
                                                    : 'bg-[var(--color-border)] text-[var(--color-text-muted)]'
                                                }
                                            `}
                                        >
                                            {tag}
                                            <button
                                                onClick={() => removeTag(tag)}
                                                className="hover:text-[var(--color-text-primary)]"
                                            >
                                                <X className="w-2.5 h-2.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            {/* Tag input with autocomplete */}
                            <div className="relative">
                                <Input
                                    value={tagInput}
                                    onChange={(e) => {
                                        setTagInput(e.target.value);
                                        setShowTagSuggestions(true);
                                    }}
                                    onFocus={() => setShowTagSuggestions(true)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && tagInput.trim()) {
                                            e.preventDefault();
                                            addTag(tagInput);
                                        }
                                    }}
                                    placeholder="Type to search tags..."
                                    className="bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-primary)] placeholder:text-[#555] text-sm"
                                />
                                {showTagSuggestions && tagSuggestions.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md shadow-lg max-h-32 overflow-auto">
                                        {tagSuggestions.map((tag) => (
                                            <button
                                                key={tag}
                                                onClick={() => addTag(tag)}
                                                className="w-full text-left px-3 py-1.5 text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-bg-hover)] transition-colors"
                                            >
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setIsCreateOpen(false); resetCreateForm(); }}
                            className="text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleCreate}
                            disabled={!newName.trim() || isCreating}
                            className="bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary-hover)] text-white"
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                    Creating...
                                </>
                            ) : (
                                'Create Domain'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
