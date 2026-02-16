import { redirect } from 'next/navigation';

/**
 * Redirects to /projects — project creation is handled via the ProjectSwitcher.
 */
export default function NewProjectPage() {
  redirect('/projects');
}
