import { ReactNode } from 'react';
import { requireSuperAdminPage } from '@/lib/admin/guard';

export default async function AdminSettingsLayout({ children }: { children: ReactNode }) {
    await requireSuperAdminPage();
    return <>{children}</>;
}
