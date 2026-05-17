import { AccountSettingsPanel } from '@/components/account/AccountSettingsPanel';
import { getCurrentUser } from '@/lib/auth/get-user';
import { getAccountStateForUser } from '@/lib/account/account-state';
import { redirect } from 'next/navigation';

export default async function AccountSettingsPage() {
    const authResult = await getCurrentUser();
    if (!authResult.user) {
        redirect('/login?redirect=/settings/account');
    }

    const accountState = await getAccountStateForUser(authResult.user.id);
    if (!accountState) {
        redirect('/dashboard');
    }

    return <AccountSettingsPanel initialState={accountState} />;
}
