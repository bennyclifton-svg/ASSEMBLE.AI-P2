import { redirect } from 'next/navigation';

export default function AdminUsersRedirectPage() {
    redirect('/settings/users');
}
