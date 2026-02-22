'use client';

import React from 'react';
import { BookOpen, Trash2, AlertTriangle, Database } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { DOMAIN_TYPE_LABELS, isKnownTag } from '@/lib/constants/knowledge-domains';
import type { KnowledgeDomainDTO } from '@/app/api/knowledge-domains/route';

interface DomainCardProps {
    domain: KnowledgeDomainDTO;
    onToggle: (id: string, isActive: boolean) => void;
    onDelete?: (id: string) => void;
    isToggling?: boolean;
}

function getStatusColor(domain: KnowledgeDomainDTO): { dot: string; label: string } {
    const isActive = domain.source?.isActive !== false;
    if (!isActive) return { dot: 'bg-[#808080]', label: 'Inactive' };
    if (domain.chunkCount === 0) return { dot: 'bg-[#e5a645]', label: 'Empty' };
    return { dot: 'bg-[#4ade80]', label: 'Active' };
}

function isStale(lastVerifiedAt: string | null): boolean {
    if (!lastVerifiedAt) return false;
    const verified = new Date(lastVerifiedAt);
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    return verified < twelveMonthsAgo;
}

export function DomainCard({ domain, onToggle, onDelete, isToggling }: DomainCardProps) {
    const isActive = domain.source?.isActive !== false;
    const status = getStatusColor(domain);
    const stale = isStale(domain.source?.lastVerifiedAt ?? null);
    const typeLabel = domain.domainType
        ? DOMAIN_TYPE_LABELS[domain.domainType as keyof typeof DOMAIN_TYPE_LABELS] ?? domain.domainType
        : 'Unknown';
    const isPrebuilt = domain.isGlobal === true;

    return (
        <div
            className={`
                border border-[#3e3e42] rounded-lg p-4 transition-colors
                ${isActive ? 'bg-[#1e1e1e]' : 'bg-[#1e1e1e]/50 opacity-60'}
            `}
        >
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <BookOpen className="w-4 h-4 text-[#0e639c] flex-shrink-0" />
                    <h4 className="text-sm font-medium text-[#cccccc] truncate">
                        {domain.name}
                    </h4>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Type badge */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-[#0e639c]/20 text-[#569cd6]">
                        {typeLabel}
                    </span>
                    {/* Status dot */}
                    <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                        <span className="text-[10px] text-[#808080]">{status.label}</span>
                    </div>
                </div>
            </div>

            {/* Description */}
            {domain.description && (
                <p className="text-xs text-[#808080] mb-3 line-clamp-2">
                    {domain.description}
                </p>
            )}

            {/* Tags */}
            {domain.domainTags && domain.domainTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                    {domain.domainTags.map((tag) => (
                        <span
                            key={tag}
                            className={`
                                inline-flex items-center px-1.5 py-0.5 rounded text-[10px]
                                ${isKnownTag(tag)
                                    ? 'bg-[#0e639c]/15 text-[#569cd6]'
                                    : 'bg-[#3e3e42] text-[#808080]'
                                }
                            `}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {/* Meta row: chunk count, version, staleness */}
            <div className="flex items-center gap-3 mb-3 text-[10px] text-[#808080]">
                <div className="flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    <span>{domain.chunkCount} chunks</span>
                </div>
                {domain.source?.sourceVersion && (
                    <span>v{domain.source.sourceVersion}</span>
                )}
                {stale && (
                    <div className="flex items-center gap-1 text-[#e5a645]">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Stale</span>
                    </div>
                )}
            </div>

            {/* Actions row: toggle + delete */}
            <div className="flex items-center justify-between pt-2 border-t border-[#3e3e42]">
                <div className="flex items-center gap-2">
                    <Switch
                        checked={isActive}
                        onCheckedChange={(checked) => onToggle(domain.id, checked)}
                        disabled={isToggling}
                        className="scale-75 origin-left"
                    />
                    <span className="text-[11px] text-[#808080]">
                        {isActive ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
                {!isPrebuilt && onDelete && (
                    <button
                        onClick={() => onDelete(domain.id)}
                        className="p-1 rounded hover:bg-[#f48771]/20 text-[#808080] hover:text-[#f48771] transition-colors"
                        title="Delete custom domain"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>
        </div>
    );
}
