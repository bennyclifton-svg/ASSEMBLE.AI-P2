import Link from 'next/link';
import { AlertTriangle, Clock3, CreditCard } from 'lucide-react';
import { getCurrentUserEntitlements } from '@/lib/subscription/entitlements';
import { cn } from '@/lib/utils';

export async function EntitlementBanner() {
    const entitlement = await getCurrentUserEntitlements();

    if (!entitlement?.banner) {
        return null;
    }

    const Icon = entitlement.banner.tone === 'warning' ? AlertTriangle : Clock3;

    if (entitlement.banner.tone !== 'warning') {
        return (
            <div
                className="fixed bottom-24 left-2 z-[70] flex w-[clamp(112px,calc(13vw-16px),218px)] items-center gap-2 rounded border border-cyan-400/20 bg-slate-950/80 px-2.5 py-2 text-cyan-50 shadow-md backdrop-blur"
                role="status"
            >
                <Icon className="h-4 w-4 flex-shrink-0 text-cyan-300" />
                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{entitlement.banner.title}</p>
                    <p className="truncate text-[11px] opacity-75">{entitlement.banner.message}</p>
                </div>
                <Link
                    href={entitlement.billingUrl}
                    aria-label={entitlement.banner.cta}
                    title={entitlement.banner.cta}
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border border-current/20 text-cyan-100 hover:bg-white/10"
                >
                    <CreditCard className="h-3.5 w-3.5" />
                </Link>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'fixed left-1/2 top-3 z-[80] flex w-[min(760px,calc(100vw-24px))] -translate-x-1/2 items-center justify-between gap-3 rounded border px-4 py-2 shadow-lg backdrop-blur',
                entitlement.banner.tone === 'warning'
                    ? 'border-amber-400/40 bg-amber-950/90 text-amber-50'
                    : 'border-cyan-400/30 bg-slate-950/90 text-cyan-50'
            )}
            role="status"
        >
            <div className="flex min-w-0 items-center gap-3">
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div className="min-w-0">
                    <p className="text-sm font-medium">{entitlement.banner.title}</p>
                    <p className="truncate text-xs opacity-85">{entitlement.banner.message}</p>
                </div>
            </div>
            <Link
                href={entitlement.billingUrl}
                className="flex-shrink-0 rounded border border-current/30 px-3 py-1 text-xs font-medium hover:bg-white/10"
            >
                {entitlement.banner.cta}
            </Link>
        </div>
    );
}
