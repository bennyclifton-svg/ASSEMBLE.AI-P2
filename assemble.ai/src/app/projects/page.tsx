import { redirect } from 'next/navigation';

/**
 * Projects Index Page
 * Redirects to dashboard where projects are managed.
 */
export default function ProjectsPage() {
  redirect('/dashboard');
}
