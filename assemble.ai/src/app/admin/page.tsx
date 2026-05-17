import { redirect } from 'next/navigation';

export default function AdminIndexRedirectPage() {
    redirect('/settings/users');
}
