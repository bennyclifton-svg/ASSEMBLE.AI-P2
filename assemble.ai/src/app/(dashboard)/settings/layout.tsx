import { ReactNode } from 'react';
import { SettingsLayout } from '@/components/layout/SettingsLayout';

export default function SettingsRouteLayout({ children }: { children: ReactNode }) {
    return <SettingsLayout>{children}</SettingsLayout>;
}
