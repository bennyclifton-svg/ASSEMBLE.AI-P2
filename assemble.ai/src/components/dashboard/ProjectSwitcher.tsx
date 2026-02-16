'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Plus, ChevronsRight } from 'lucide-react';
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
    children?: React.ReactNode;
}

export function ProjectSwitcher({ selectedProject, onSelectProject, refreshTrigger, children }: ProjectSwitcherProps) {
    const router = useRouter();
    const [projects, setProjects] = useState<Project[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    // Update dropdown position when opened
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const dropdownWidth = 256; // w-64
            const padding = 8; // viewport edge padding

            // Calculate ideal left position (right-aligned with button)
            let left = rect.right - dropdownWidth;

            // Ensure dropdown doesn't go off the left edge
            if (left < padding) {
                left = padding;
            }

            // Ensure dropdown doesn't go off the right edge
            const maxLeft = window.innerWidth - dropdownWidth - padding;
            if (left > maxLeft) {
                left = maxLeft;
            }

            setDropdownPosition({
                top: rect.bottom + 4,
                left,
            });
        }
    }, [isOpen]);

    // Close dropdown when clicking outside
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                buttonRef.current && !buttonRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const refreshProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();

            // Ensure data is an array before using it
            if (!res.ok || !Array.isArray(data)) {
                const errorMessage = data?.error?.message || data?.error || 'Invalid response';
                console.error('Error fetching projects:', errorMessage);
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

    const dropdown = isOpen && typeof document !== 'undefined' ? createPortal(
        <div
            ref={dropdownRef}
            className="fixed w-64 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded shadow-lg z-[9999]"
            style={{ top: dropdownPosition.top, left: dropdownPosition.left }}
        >
            {projects.map(project => (
                <button
                    key={project.id}
                    onClick={() => handleSelectProject(project)}
                    className={cn(
                        "w-full px-4 py-2 text-left hover:bg-[var(--color-bg-tertiary)] flex flex-col border-b border-[var(--color-border)]",
                        selectedProject?.id === project.id && "bg-[var(--color-bg-tertiary)]"
                    )}
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
        </div>,
        document.body
    ) : null;

    return (
        <div className="relative w-full">
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-1.5 w-full"
            >
                {children}
                <ChevronsRight
                    className={cn(
                        'w-5 h-5 text-[var(--color-text-secondary)] flex-shrink-0',
                        isOpen && 'text-[var(--color-text-primary)]'
                    )}
                />
            </button>
            {dropdown}
        </div>
    );
}
