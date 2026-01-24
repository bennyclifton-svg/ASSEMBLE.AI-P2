'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
    id: string;
    name: string;
    code: string;
    status: string;
}

interface ProjectSwitcherProps {
    selectedProject: Project | null;
    onSelectProject: (project: Project | null) => void;
    refreshTrigger?: number;
}

export function ProjectSwitcher({ selectedProject, onSelectProject, refreshTrigger }: ProjectSwitcherProps) {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const refreshProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();

            // Ensure data is an array before using it
            if (!res.ok || !Array.isArray(data)) {
                console.error('Error fetching projects:', data?.error || 'Invalid response');
                return;
            }

            setProjects(data);
            // Update selected project with latest data if it exists
            if (selectedProject) {
                const updated = data.find((p: Project) => p.id === selectedProject.id);
                if (updated && updated.name !== selectedProject.name) {
                    onSelectProject(updated);
                }
            } else if (data.length > 0) {
                onSelectProject(data[0]);
            }
        } catch (error) {
            console.error('Error refreshing projects:', error);
        }
    };

    useEffect(() => {
        refreshProjects();
    }, []);

    // Refresh when trigger changes
    useEffect(() => {
        if (refreshTrigger !== undefined && refreshTrigger > 0) {
            refreshProjects();
        }
    }, [refreshTrigger]);

    const handleSelectProject = (project: Project) => {
        onSelectProject(project);
        setIsOpen(false);
    };

    const handleAddProjectClick = async () => {
        setIsOpen(false);
        setIsLoading(true);

        try {
            // Create project with auto-generated name
            const timestamp = new Date().toLocaleDateString('en-AU', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
            const defaultName = `New Project - ${timestamp}`;

            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: defaultName,
                    code: '',
                    status: 'active'
                })
            });

            if (res.ok) {
                const newProject = await res.json();
                await refreshProjects();
                // Navigate directly to the project dashboard
                router.push(`/projects/${newProject.id}`);
            } else {
                const error = await res.json();
                console.error('Error creating project:', error);
                const errorMsg = error.details ? `${error.error}: ${error.details}` : error.error;
                alert(`Failed to create project: ${errorMsg || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error creating project:', error);
            alert(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-8 h-8 hover:bg-[var(--color-bg-tertiary)] rounded transition-colors"
                title={selectedProject ? selectedProject.name : 'Select Project'}
            >
                <svg
                    className={cn(
                        'w-4 h-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-transform',
                        isOpen && 'rotate-90'
                    )}
                    viewBox="0 0 12 12"
                    fill="currentColor"
                >
                    <polygon points="2,0 12,6 2,12" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded shadow-lg z-10">
                    {/* Home option */}
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            router.push('/');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-[var(--color-bg-tertiary)] flex items-center gap-2 border-b border-[var(--color-border)]"
                    >
                        <Home className="w-4 h-4 text-[var(--color-text-muted)]" />
                        <span className="text-sm text-[var(--color-text-primary)]">Home</span>
                    </button>
                    {projects.map(project => (
                        <button
                            key={project.id}
                            onClick={() => handleSelectProject(project)}
                            className="w-full px-4 py-2 text-left hover:bg-[var(--color-bg-tertiary)] flex flex-col border-b border-[var(--color-border)]"
                        >
                            <span className="font-medium text-[var(--color-text-primary)] text-sm">{project.name}</span>
                            <span className="text-xs text-[var(--color-text-muted)]">{project.code}</span>
                        </button>
                    ))}
                    <button
                        onClick={handleAddProjectClick}
                        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-[var(--color-bg-tertiary)] border-t border-[var(--color-border)]"
                    >
                        <Plus className="w-4 h-4 text-[var(--color-text-primary)]" />
                        <span className="text-sm text-[var(--color-text-primary)]">Add New Project</span>
                    </button>
                </div>
            )}

        </div>
    );
}
