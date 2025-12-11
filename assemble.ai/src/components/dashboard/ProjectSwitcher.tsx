'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        status: 'active' as 'active' | 'pending' | 'archived'
    });

    const refreshProjects = async () => {
        try {
            const res = await fetch('/api/projects');
            const data = await res.json();
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

    const handleAddProjectClick = () => {
        setIsOpen(false);
        setFormData({ name: '', code: '', status: 'active' });
        setIsModalOpen(true);
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) return;

        setIsLoading(true);

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const newProject = await res.json();
                await refreshProjects();
                onSelectProject(newProject);
                setIsModalOpen(false);
            } else {
                const error = await res.json();
                console.error('Error creating project:', error.error);
            }
        } catch (error) {
            console.error('Error creating project:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center w-8 h-8 hover:bg-[#3e3e42] rounded transition-colors"
                title={selectedProject ? selectedProject.name : 'Select Project'}
            >
                <svg
                    className={cn(
                        'w-4 h-4 text-[#aaaaaa] hover:text-[#cccccc] transition-transform',
                        isOpen && 'rotate-90'
                    )}
                    viewBox="0 0 12 12"
                    fill="currentColor"
                >
                    <polygon points="2,0 12,6 2,12" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-[#252526] border border-[#3e3e42] rounded shadow-lg z-10">
                    {/* Home option */}
                    <button
                        onClick={() => {
                            setIsOpen(false);
                            router.push('/');
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-[#2a2d2e] flex items-center gap-2 border-b border-[#3e3e42]"
                    >
                        <Home className="w-4 h-4 text-[#808080]" />
                        <span className="text-sm text-[#cccccc]">Home</span>
                    </button>
                    {projects.map(project => (
                        <button
                            key={project.id}
                            onClick={() => handleSelectProject(project)}
                            className="w-full px-4 py-2 text-left hover:bg-[#2a2d2e] flex flex-col border-b border-[#3e3e42]"
                        >
                            <span className="font-medium text-[#cccccc] text-sm">{project.name}</span>
                            <span className="text-xs text-[#858585]">{project.code}</span>
                        </button>
                    ))}
                    <button
                        onClick={handleAddProjectClick}
                        className="w-full px-4 py-3 flex items-center gap-2 hover:bg-[#2a2d2e] border-t border-[#3e3e42]"
                    >
                        <Plus className="w-4 h-4 text-[#cccccc]" />
                        <span className="text-sm text-[#cccccc]">Add New Project</span>
                    </button>
                </div>
            )}

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title="Create New Project"
            >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#cccccc] mb-1">
                            Project Name *
                        </label>
                        <Input
                            type="text"
                            placeholder="Enter project name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="bg-[#1e1e1e] border-[#3e3e42] text-[#cccccc] focus:border-[#007acc]"
                            disabled={isLoading}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#cccccc] mb-1">
                            Project Code
                        </label>
                        <Input
                            type="text"
                            placeholder="Enter project code (optional)"
                            value={formData.code}
                            onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                            className="bg-[#1e1e1e] border-[#3e3e42] text-[#cccccc] focus:border-[#007acc]"
                            disabled={isLoading}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-[#cccccc] mb-1">
                            Status
                        </label>
                        <select
                            value={formData.status}
                            onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'pending' | 'archived' }))}
                            className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded text-[#cccccc] focus:border-[#007acc] focus:outline-none"
                            disabled={isLoading}
                        >
                            <option value="active">Active</option>
                            <option value="pending">Pending</option>
                            <option value="archived">Archived</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isLoading}
                            className="border-[#3e3e42] text-[#cccccc] hover:bg-[#2a2d2e]"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isLoading || !formData.name.trim()}
                            className="bg-[#007acc] hover:bg-[#005a9e] text-white"
                        >
                            {isLoading ? 'Creating...' : 'Create Project'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
