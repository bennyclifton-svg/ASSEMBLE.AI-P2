/**
 * /admin redirects to /admin/users.
 *
 * Navigation between admin sections is via the tab row in the admin layout
 * header — there's no separate landing page. Users is the default tab.
 */

import { redirect } from 'next/navigation';

export default function AdminIndexPage() {
    redirect('/admin/users');
}
