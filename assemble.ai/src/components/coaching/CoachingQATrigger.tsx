'use client';

import React from 'react';
import { MessageCircleQuestion } from 'lucide-react';

interface CoachingQATriggerProps {
    onClick: () => void;
    className?: string;
}

export function CoachingQATrigger({ onClick, className = '' }: CoachingQATriggerProps) {
    return (
        <button
            onClick={onClick}
            title="Ask about this module"
            className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${className}`}
            style={{ color: 'var(--color-accent-copper)' }}
        >
            <MessageCircleQuestion className="w-4 h-4" />
        </button>
    );
}
