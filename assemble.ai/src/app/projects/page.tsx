'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
}

type ProjectGatewayResult =
  | { kind: 'project'; projectId: string }
  | { kind: 'login' };

let projectGatewayPromise: Promise<ProjectGatewayResult> | null = null;

function getDefaultProjectName() {
  const timestamp = new Date().toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return `New Project - ${timestamp}`;
}

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function openOrCreateProject(): Promise<ProjectGatewayResult> {
  const projectsResponse = await fetch('/api/projects');
  if (!projectsResponse.ok) {
    if (projectsResponse.status === 401) {
      return { kind: 'login' };
    }

    throw new Error('Failed to fetch projects');
  }

  const existingProjects = await readJson<Project[]>(projectsResponse);
  if (Array.isArray(existingProjects) && existingProjects.length > 0) {
    return { kind: 'project', projectId: existingProjects[0].id };
  }

  const createResponse = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: getDefaultProjectName(),
      code: '',
      status: 'active',
    }),
  });
  const createdProject = await readJson<Project & { error?: string; details?: string }>(createResponse);

  if (!createResponse.ok || !createdProject?.id) {
    const message = createdProject?.details || createdProject?.error || 'Failed to create project';
    throw new Error(message);
  }

  return { kind: 'project', projectId: createdProject.id };
}

function getProjectGatewayPromise() {
  if (!projectGatewayPromise) {
    const promise = openOrCreateProject();
    projectGatewayPromise = promise;
    void promise.finally(() => {
      if (projectGatewayPromise === promise) {
        projectGatewayPromise = null;
      }
    });
  }

  return projectGatewayPromise;
}

export default function ProjectsIndexPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void getProjectGatewayPromise()
      .then((result) => {
        if (!active) return;

        if (result.kind === 'login') {
          router.replace('/login?redirect=/projects');
          return;
        }

        router.replace(`/projects/${result.projectId}`);
      })
      .catch((err) => {
        console.error('Error opening project workspace:', err);
        if (active) {
          setError(err instanceof Error ? err.message : 'Failed to open project workspace');
        }
      });

    return () => {
      active = false;
    };
  }, [router]);

  if (error) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className="text-sm text-[var(--color-text-primary)]">Could not open your project workspace.</p>
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-4 rounded border border-[var(--color-border)] px-3 py-2 text-xs uppercase tracking-[0.16em] text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-label="Opening project workspace" />
    </div>
  );
}
