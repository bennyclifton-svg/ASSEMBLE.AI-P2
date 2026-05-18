import { redirect } from 'next/navigation';

/**
 * Redirects to /projects, which opens or creates the user's workspace.
 */
export default function NewProjectPage() {
  redirect('/projects');
}
