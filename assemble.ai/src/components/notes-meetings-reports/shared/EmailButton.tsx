/**
 * Email Button Component
 * Feature 021 - Notes, Meetings & Reports - Phase 7 (User Story 5)
 *
 * Button that sends meeting to distribution list via email.
 * Opens mailto: link or shows email preview.
 */

'use client';

import React, { useState } from 'react';
import { Mail, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmailButtonProps {
    onEmail: () => Promise<{ mailtoUrl: string; recipientCount: number } | void>;
    isLoading?: boolean;
    disabled?: boolean;
    size?: 'sm' | 'md';
    className?: string;
    tooltip?: string;
}

export function EmailButton({
    onEmail,
    isLoading = false,
    disabled = false,
    size = 'md',
    className,
    tooltip = 'Email to distribution list',
}: EmailButtonProps) {
    const [isSending, setIsSending] = useState(false);

    const sizeClasses = {
        sm: 'h-6 w-6',
        md: 'h-8 w-8',
    };

    const iconSizeClasses = {
        sm: 'h-3.5 w-3.5',
        md: 'h-4 w-4',
    };

    const handleClick = async () => {
        setIsSending(true);
        try {
            const result = await onEmail();

            // If the callback returns a mailto URL, open it
            if (result?.mailtoUrl) {
                window.open(result.mailtoUrl, '_blank');
            }
        } finally {
            setIsSending(false);
        }
    };

    const isProcessing = isLoading || isSending;

    return (
        <Button
            variant="ghost"
            size="icon"
            className={cn(sizeClasses[size], className)}
            onClick={handleClick}
            disabled={disabled || isProcessing}
            title={tooltip}
        >
            {isProcessing ? (
                <Loader2
                    className={cn(
                        iconSizeClasses[size],
                        'animate-spin text-[var(--color-accent-primary)]'
                    )}
                />
            ) : (
                <Mail
                    className={cn(
                        iconSizeClasses[size],
                        'text-[var(--color-text-muted)]'
                    )}
                />
            )}
        </Button>
    );
}

export default EmailButton;
