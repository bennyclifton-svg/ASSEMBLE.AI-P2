/**
 * TRREditableSection Component
 * Wrapper for editable text sections (Executive Summary, Clarifications, Recommendation)
 * Feature 012 - TRR Report
 */

'use client';

import { Textarea } from '@/components/ui/textarea';

interface TRREditableSectionProps {
    title: string;
    value: string;
    onChange: (value: string) => void;
    onBlur: () => void;
    placeholder?: string;
}

export function TRREditableSection({
    title,
    value,
    onChange,
    onBlur,
    placeholder = 'Enter text...',
}: TRREditableSectionProps) {
    return (
        <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[#cccccc] uppercase tracking-wide">
                {title}
            </h3>
            <div className="border border-[#3e3e42] rounded overflow-hidden">
                <Textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onBlur={onBlur}
                    placeholder={placeholder}
                    className="w-full border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-[#1a1a1a] text-[#cccccc] resize-y min-h-[120px] p-4 border-l-2 border-l-[#4fc1ff]/30 hover:border-l-[#4fc1ff] hover:bg-[#1e1e1e] transition-colors cursor-text"
                    style={{ fieldSizing: 'content' } as React.CSSProperties}
                />
            </div>
        </div>
    );
}
