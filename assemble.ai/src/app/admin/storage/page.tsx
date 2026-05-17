import { redirect } from 'next/navigation';

export default function AdminStorageRedirectPage() {
    redirect('/settings/storage');
}
