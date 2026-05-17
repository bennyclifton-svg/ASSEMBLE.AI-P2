'use client';

import { useEffect, useState } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { AiMemoryPanel } from '@/components/ai-memory';

interface Project {
    id: string;
    name: string;
    code?: string;
}

export default function AiMemorySettingsPage() {
    const [projects, setProjects] = useState<Project[] | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function loadProjects() {
            try {
                const res = await fetch('/api/projects');
                if (!res.ok) throw new Error(`Failed to load projects (${res.status})`);
                const data: Project[] = await res.json();
                if (cancelled) return;
                setProjects(data);
                if (data.length > 0) setSelectedId(data[0].id);
            } catch (err) {
                if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error');
            }
        }
        loadProjects();
        return () => {
            cancelled = true;
        };
    }, []);

    const selectedProject = projects?.find((p) => p.id === selectedId) ?? null;

    if (error) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-semibold text-[var(--sw-ink)] mb-2">AI Memory</h1>
                <div className="text-[var(--color-error)]">{error}</div>
            </div>
        );
    }

    if (projects === null) {
        return (
            <div className="p-8 flex items-center gap-2 text-[var(--sw-muted)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading projects…</span>
            </div>
        );
    }

    if (projects.length === 0) {
        return (
            <div className="p-8">
                <h1 className="text-2xl font-semibold text-[var(--sw-ink)] mb-2 flex items-center gap-2">
                    <Brain className="h-6 w-6" />
                    AI Memory
                </h1>
                <p className="text-[var(--sw-muted)] mt-4">
                    AI Memory is project-scoped. Create a project from the dashboard to start
                    capturing AI preferences and context.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <header className="px-8 pt-8 pb-4 border-b border-[var(--sw-rule)]">
                <h1 className="text-2xl font-semibold text-[var(--sw-ink)] flex items-center gap-2">
                    <Brain className="h-6 w-6" />
                    AI Memory
                </h1>
                <p className="text-sm text-[var(--sw-muted)] mt-1">
                    Reviewable preferences and context. Select a project to view or edit its memory.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                    {projects.map((project) => {
                        const isActive = project.id === selectedId;
                        return (
                            <button
                                key={project.id}
                                type="button"
                                onClick={() => setSelectedId(project.id)}
                                className="px-3 py-1.5 text-sm transition-colors"
                                style={{
                                    border: '1px solid var(--sw-rule)',
                                    background: isActive ? 'var(--sw-rose-tint)' : 'transparent',
                                    borderColor: isActive
                                        ? 'color-mix(in oklab, var(--sw-rose) 45%, var(--sw-rule))'
                                        : 'var(--sw-rule)',
                                    color: 'var(--sw-ink)',
                                    fontWeight: isActive ? 600 : 500,
                                    cursor: 'pointer',
                                }}
                            >
                                {project.name}
                                {project.code && (
                                    <span className="ml-2 text-[var(--sw-muted)] font-mono text-xs">
                                        {project.code}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </header>
            <div className="flex-1 min-h-0 overflow-hidden">
                {selectedProject && (
                    <AiMemoryPanel
                        projectId={selectedProject.id}
                        projectName={selectedProject.name}
                    />
                )}
            </div>
        </div>
    );
}
