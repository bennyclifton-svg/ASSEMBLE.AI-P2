'use client';

import { Suspense } from 'react';
import { BillingPanel } from '@/components/billing/BillingPanel';

function BillingContent() {
    return <BillingPanel />;
}

export default function BillingSettingsPage() {
    return (
        <Suspense
            fallback={
                <div className="h-screen flex items-center justify-center bg-[var(--sw-paper)]">
                    <div className="animate-pulse font-mono text-[var(--sw-muted)]">Loading...</div>
                </div>
            }
        >
            <BillingContent />
        </Suspense>
    );
}
