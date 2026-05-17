import { redirect } from 'next/navigation';

interface BillingRedirectProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function BillingRedirectPage({ searchParams }: BillingRedirectProps) {
    const qs = serializeSearchParams(await searchParams);
    redirect(qs ? `/settings/billing?${qs}` : '/settings/billing');
}

function serializeSearchParams(params: Record<string, string | string[] | undefined>): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
            for (const v of value) query.append(key, v);
        } else if (value !== undefined) {
            query.set(key, value);
        }
    }
    return query.toString();
}
