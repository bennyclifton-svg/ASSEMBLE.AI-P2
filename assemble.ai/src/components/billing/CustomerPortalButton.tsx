'use client';

import { customer } from '@/lib/auth-client';
import { ExternalLink } from 'lucide-react';

export function CustomerPortalButton() {
    const handleClick = async () => {
        try {
            // This redirects to Polar's customer portal (opens in same tab)
            // User can use browser back button to return
            await customer.portal();
        } catch (error) {
            console.error('[Billing] Error opening customer portal:', error);
        }
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-bg-tertiary)] px-4 py-2 font-medium text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
        >
            Manage Subscription
            <ExternalLink className="h-4 w-4" />
        </button>
    );
}
