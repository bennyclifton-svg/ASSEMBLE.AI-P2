/**
 * T056/T063/T064: SmartContextPanel Component
 * Displays retrieved RAG sources with relevance scores (0-100%), progress bars, and toggle controls
 */

'use client';

import { useState } from 'react';
import { FileText, ExternalLink, ChevronDown, ChevronRight, Check, X } from 'lucide-react';

interface Source {
    id: string;
    documentId: string;
    documentName: string;
    chunkIndex: number;
    content: string;
    relevanceScore: number; // 0-100 integer scale
    metadata?: {
        page?: number;
        section?: string;
        category?: string;
    };
}

interface SmartContextPanelProps {
    sources: Source[];
    excludedIds: string[];
    onToggle: (sourceId: string) => void;
}

interface SourceCardProps {
    source: Source;
    isExcluded: boolean;
    onToggle: () => void;
}

function SourceCard({ source, isExcluded, onToggle }: SourceCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Relevance is now 0-100 integer scale
    const score = source.relevanceScore;
    const relevanceColor = score >= 80
        ? 'text-green-600'
        : score >= 60
            ? 'text-yellow-600'
            : 'text-red-600';

    const progressColor = score >= 80
        ? 'bg-green-500'
        : score >= 60
            ? 'bg-yellow-500'
            : 'bg-red-500';

    const relevanceLabel = score >= 80
        ? 'High'
        : score >= 60
            ? 'Medium'
            : 'Low';

    return (
        <div className={`border rounded-lg ${isExcluded ? 'opacity-50 bg-muted/50' : ''}`}>
            <div className="flex items-center justify-between p-3">
                <button
                    className="flex items-center gap-2 flex-1 text-left"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4 shrink-0" />
                    ) : (
                        <ChevronRight className="w-4 h-4 shrink-0" />
                    )}
                    <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm font-medium truncate">
                        {source.documentName}
                    </span>
                    {source.metadata?.page && (
                        <span className="text-xs text-muted-foreground">
                            (p.{source.metadata.page})
                        </span>
                    )}
                </button>

                <div className="flex items-center gap-3">
                    {/* Progress bar for relevance */}
                    <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className={`h-full ${progressColor} transition-all`}
                                style={{ width: `${score}%` }}
                            />
                        </div>
                        <span className={`text-xs font-medium ${relevanceColor} whitespace-nowrap`}>
                            {relevanceLabel} ({score}%)
                        </span>
                    </div>
                    <button
                        className={`p-1 rounded ${isExcluded
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'bg-green-100 text-green-600 hover:bg-green-200'
                            }`}
                        onClick={onToggle}
                        title={isExcluded ? 'Include this source' : 'Exclude this source'}
                    >
                        {isExcluded ? (
                            <X className="w-4 h-4" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="border-t p-3 space-y-2">
                    {source.metadata?.section && (
                        <div className="text-xs text-muted-foreground">
                            Section: {source.metadata.section}
                        </div>
                    )}
                    {source.metadata?.category && (
                        <div className="text-xs text-muted-foreground">
                            Category: {source.metadata.category}
                        </div>
                    )}
                    <div className="text-sm bg-muted/30 p-2 rounded max-h-32 overflow-y-auto">
                        <p className="whitespace-pre-wrap text-xs">{source.content}</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Chunk {source.chunkIndex + 1}</span>
                        <span>•</span>
                        <span>Document ID: {source.documentId.slice(0, 8)}...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

export function SmartContextPanel({
    sources,
    excludedIds,
    onToggle,
}: SmartContextPanelProps) {
    const [sortBy, setSortBy] = useState<'relevance' | 'document'>('relevance');

    const sortedSources = [...sources].sort((a, b) => {
        if (sortBy === 'relevance') {
            return b.relevanceScore - a.relevanceScore;
        }
        return a.documentName.localeCompare(b.documentName);
    });

    const includedCount = sources.length - excludedIds.length;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                    Retrieved Sources ({includedCount}/{sources.length} included)
                </h4>
                <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Sort by:</label>
                    <select
                        className="text-xs border rounded px-2 py-1 bg-input"
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as 'relevance' | 'document')}
                    >
                        <option value="relevance">Relevance</option>
                        <option value="document">Document</option>
                    </select>
                </div>
            </div>

            {sources.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                    No sources retrieved for this section.
                </p>
            ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sortedSources.map(source => (
                        <SourceCard
                            key={source.id}
                            source={source}
                            isExcluded={excludedIds.includes(source.id)}
                            onToggle={() => onToggle(source.id)}
                        />
                    ))}
                </div>
            )}

            {excludedIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    Tip: Excluded sources will not be used when regenerating this section.
                </p>
            )}
        </div>
    );
}
