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
            className="sitewise-button"
        >
            Manage Subscription
            <ExternalLink className="h-4 w-4" />
        </button>
    );
}
