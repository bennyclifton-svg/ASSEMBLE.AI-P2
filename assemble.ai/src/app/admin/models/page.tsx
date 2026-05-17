import { redirect } from 'next/navigation';

export default function AdminModelsRedirectPage() {
    redirect('/settings/models');
}
