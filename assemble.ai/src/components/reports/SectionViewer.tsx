/**
 * T056: SectionViewer Component
 * Displays generated sections with streaming content and source attribution
 *
 * Note: Feedback UI was removed as sections auto-generate without pausing.
 * Users can edit the full report in the unified editor after generation.
 */

'use client';

import { useState } from 'react';
import type { Report, ReportSection } from '@/lib/hooks/use-report-generation';
import type { StreamState } from '@/lib/hooks/use-report-stream';
import { SmartContextPanel } from './SmartContextPanel';
import { ChevronDown, ChevronRight, Check, RefreshCw, AlertCircle } from 'lucide-react';

interface SectionViewerProps {
    report: Report;
    streamState: StreamState;
}

interface SectionCardProps {
    section: ReportSection;
    isActive: boolean;
    streamingContent?: string;
    sources?: any[];
}

function SectionCard({
    section,
    isActive,
    streamingContent,
    sources,
}: SectionCardProps) {
    const [isExpanded, setIsExpanded] = useState(isActive);
    const [showContextPanel, setShowContextPanel] = useState(false);

    const content = isActive && streamingContent ? streamingContent : section.content;
    const isGenerating = section.status === 'generating' || (isActive && streamingContent);
    const isComplete = section.status === 'complete';

    return (
        <div className={`border rounded-lg ${isActive ? 'border-blue-500 shadow-md' : ''}`}>
            {/* Header */}
            <button
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="font-medium">{section.title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {isGenerating && (
                        <span className="flex items-center gap-1 text-sm text-blue-600">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Generating...
                        </span>
                    )}
                    {isComplete && (
                        <span className="flex items-center gap-1 text-sm text-green-600">
                            <Check className="w-3 h-3" />
                            Complete
                        </span>
                    )}
                    {section.status === 'pending' && (
                        <span className="text-sm text-muted-foreground">Pending</span>
                    )}
                </div>
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="border-t">
                    <div className="p-4">
                        {content ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                {/* Render as HTML if content contains HTML tags, otherwise as text */}
                                {content.includes('<') ? (
                                    <div
                                        className="[&_table]:w-full [&_table]:border-collapse [&_table]:my-2 [&_th]:border [&_th]:border-[#3e3e42] [&_th]:px-3 [&_th]:py-2 [&_th]:bg-[#2d2d30] [&_th]:text-[#858585] [&_th]:font-medium [&_th]:text-left [&_td]:border [&_td]:border-[#3e3e42] [&_td]:px-3 [&_td]:py-2"
                                        dangerouslySetInnerHTML={{ __html: content }}
                                    />
                                ) : (
                                    <div className="whitespace-pre-wrap">{content}</div>
                                )}
                            </div>
                        ) : (
                            <p className="text-muted-foreground italic">
                                Section content will appear here when generated.
                            </p>
                        )}

                        {/* Cursor for streaming */}
                        {isGenerating && (
                            <span className="inline-block w-2 h-4 bg-blue-600 animate-pulse ml-1" />
                        )}
                    </div>

                    {/* Sources button */}
                    {(sources?.length ?? section.sources?.length ?? 0) > 0 && (
                        <div className="px-4 pb-2">
                            <button
                                className="text-sm text-blue-600 hover:underline"
                                onClick={() => setShowContextPanel(!showContextPanel)}
                            >
                                {showContextPanel ? 'Hide' : 'Show'} sources ({sources?.length ?? section.sources?.length})
                            </button>
                        </div>
                    )}

                    {/* Smart Context Panel (read-only, for reference) */}
                    {showContextPanel && (
                        <div className="border-t bg-muted/30 p-4">
                            <SmartContextPanel
                                sources={sources ?? section.sources ?? []}
                                excludedIds={[]}
                                onToggle={() => {}} // No-op since feedback is removed
                            />
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function SectionViewer({
    report,
    streamState,
}: SectionViewerProps) {
    const sections = report.tableOfContents?.sections ?? [];
    const currentIndex = streamState.currentSection ?? report.currentSectionIndex;

    return (
        <div className="space-y-4">
            {sections.map((tocSection, index) => {
                const section = report.sections.find(s => s.sectionIndex === index) ?? {
                    id: tocSection.id,
                    reportId: report.id,
                    sectionIndex: index,
                    title: tocSection.title,
                    content: null,
                    sourceChunkIds: [],
                    sources: [],
                    status: 'pending' as const,
                    generatedAt: null,
                    regenerationCount: 0,
                };

                const isActive = index === currentIndex;

                return (
                    <SectionCard
                        key={tocSection.id}
                        section={section}
                        isActive={isActive}
                        streamingContent={isActive ? streamState.streamingContent : undefined}
                        sources={isActive ? streamState.sources : undefined}
                    />
                );
            })}

            {streamState.error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 text-red-800 rounded-lg">
                    <AlertCircle className="w-5 h-5" />
                    <span>{streamState.error}</span>
                </div>
            )}
        </div>
    );
}
