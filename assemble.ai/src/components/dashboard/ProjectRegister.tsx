'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderOpen, Calendar, ChevronRight, Loader2, Pencil, Check, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Project {
  id: string;
  name: string;
  code: string | null;
  status: 'active' | 'pending' | 'archived';
  updatedAt: string;
}

interface ProjectRegisterProps {
  onSelectProject?: (project: Project) => void;
}

export function ProjectRegister({ onSelectProject }: ProjectRegisterProps) {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'active' as 'active' | 'pending' | 'archived',
  });
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch('/api/projects');

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch projects');
      }

      const data = await res.json();
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectClick = (project: Project) => {
    // Don't navigate if we're editing
    if (editingProjectId === project.id) return;

    if (onSelectProject) {
      onSelectProject(project);
    } else {
      router.push(`/projects/${project.id}`);
    }
  };

  const handleStartEdit = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setEditingProjectId(project.id);
    setEditingName(project.name);
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProjectId(null);
    setEditingName('');
  };

  const handleSaveEdit = async (e: React.MouseEvent, projectId: string) => {
    e.stopPropagation();

    if (!editingName.trim()) return;

    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingName.trim() }),
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const error = await res.json();
        throw new Error(error.error || 'Failed to update project');
      }

      await fetchProjects();
      setEditingProjectId(null);
      setEditingName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update project');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, projectId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit(e as unknown as React.MouseEvent, projectId);
    } else if (e.key === 'Escape') {
      setEditingProjectId(null);
      setEditingName('');
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) return;

    setIsCreating(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        const error = await res.json();
        throw new Error(error.error || 'Failed to create project');
      }

      const newProject = await res.json();
      await fetchProjects();
      setIsModalOpen(false);
      setFormData({ name: '', code: '', status: 'active' });

      // Navigate to the new project
      if (onSelectProject) {
        onSelectProject(newProject);
      } else {
        router.push(`/projects/${newProject.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-[#4ec9b0]';
      case 'pending':
        return 'text-[#dcdcaa]';
      case 'archived':
        return 'text-[#808080]';
      default:
        return 'text-[#808080]';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col bg-[#1e1e1e]">
        <div className="p-4 border-b border-[#3e3e42]">
          <h2 className="text-lg font-semibold text-[#cccccc]">Project Register</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-[#808080] animate-spin" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-full flex flex-col bg-[#1e1e1e]">
        <div className="p-4 border-b border-[#3e3e42]">
          <h2 className="text-lg font-semibold text-[#cccccc]">Project Register</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-[#f48771] mb-4">{error}</p>
            <Button
              onClick={fetchProjects}
              className="bg-[#0e639c] hover:bg-[#1177bb] text-white"
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (projects.length === 0) {
    return (
      <div className="h-full flex flex-col bg-[#1e1e1e]">
        <div className="p-4 border-b border-[#3e3e42]">
          <h2 className="text-lg font-semibold text-[#cccccc]">Project Register</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <FolderOpen className="w-16 h-16 text-[#4e4e52] mx-auto mb-4" />
            <h3 className="text-lg font-medium text-[#cccccc] mb-2">No projects yet</h3>
            <p className="text-[#808080] mb-6">Create your first project to get started</p>
            <Button
              onClick={() => setIsModalOpen(true)}
              className="bg-[#0e639c] hover:bg-[#1177bb] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        </div>

        {/* Create Project Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Create New Project"
        >
          <CreateProjectForm
            formData={formData}
            setFormData={setFormData}
            isCreating={isCreating}
            onSubmit={handleCreateProject}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      </div>
    );
  }

  // Projects list
  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Header */}
      <div className="p-4 border-b border-[#3e3e42] flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[#cccccc]">Project Register</h2>
        <Button
          onClick={() => setIsModalOpen(true)}
          variant="ghost"
          size="sm"
          className="text-[#cccccc] hover:bg-[#2a2d2e]"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Project List */}
      <div className="flex-1 overflow-auto">
        {projects.map((project) => (
          <div
            key={project.id}
            onClick={() => handleProjectClick(project)}
            className="w-full p-4 text-left hover:bg-[#2a2d2e] border-b border-[#3e3e42] transition-colors group cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {editingProjectId === project.id ? (
                  // Edit mode
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, project.id)}
                      className="flex-1 px-2 py-1 bg-[#1e1e1e] border border-[#0e639c] rounded text-[#cccccc] text-sm focus:outline-none focus:ring-1 focus:ring-[#0e639c]"
                      autoFocus
                      disabled={isSavingEdit}
                    />
                    <button
                      onClick={(e) => handleSaveEdit(e, project.id)}
                      disabled={isSavingEdit || !editingName.trim()}
                      className="p-1 hover:bg-[#3e3e42] rounded disabled:opacity-50"
                      title="Save"
                    >
                      {isSavingEdit ? (
                        <Loader2 className="w-4 h-4 text-[#0e639c] animate-spin" />
                      ) : (
                        <Check className="w-4 h-4 text-[#4ec9b0]" />
                      )}
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={isSavingEdit}
                      className="p-1 hover:bg-[#3e3e42] rounded disabled:opacity-50"
                      title="Cancel"
                    >
                      <X className="w-4 h-4 text-[#f48771]" />
                    </button>
                  </div>
                ) : (
                  // Display mode
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#cccccc] truncate">
                      {project.name}
                    </span>
                    <span className={`text-xs ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                    <button
                      onClick={(e) => handleStartEdit(e, project)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#3e3e42] rounded transition-opacity"
                      title="Edit project name"
                    >
                      <Pencil className="w-3 h-3 text-[#808080]" />
                    </button>
                  </div>
                )}
                {project.code && (
                  <p className="text-sm text-[#808080] mt-1 truncate">
                    {project.code}
                  </p>
                )}
                <div className="flex items-center gap-1 mt-2 text-xs text-[#6e6e6e]">
                  <Calendar className="w-3 h-3" />
                  <span>Updated {formatDate(project.updatedAt)}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#4e4e52] group-hover:text-[#cccccc] transition-colors flex-shrink-0 ml-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Create Project Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create New Project"
      >
        <CreateProjectForm
          formData={formData}
          setFormData={setFormData}
          isCreating={isCreating}
          onSubmit={handleCreateProject}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}

// Extracted form component to reduce duplication
interface CreateProjectFormProps {
  formData: {
    name: string;
    code: string;
    status: 'active' | 'pending' | 'archived';
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      name: string;
      code: string;
      status: 'active' | 'pending' | 'archived';
    }>
  >;
  isCreating: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

function CreateProjectForm({
  formData,
  setFormData,
  isCreating,
  onSubmit,
  onCancel,
}: CreateProjectFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-[#cccccc] mb-1">
          Project Name *
        </label>
        <Input
          type="text"
          placeholder="Enter project name"
          value={formData.name}
          onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
          className="bg-[#1e1e1e] border-[#3e3e42] text-[#cccccc] focus:border-[#007acc]"
          disabled={isCreating}
          required
          autoFocus
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
          onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
          className="bg-[#1e1e1e] border-[#3e3e42] text-[#cccccc] focus:border-[#007acc]"
          disabled={isCreating}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[#cccccc] mb-1">
          Status
        </label>
        <select
          value={formData.status}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              status: e.target.value as 'active' | 'pending' | 'archived',
            }))
          }
          className="w-full px-3 py-2 bg-[#1e1e1e] border border-[#3e3e42] rounded text-[#cccccc] focus:border-[#007acc] focus:outline-none"
          disabled={isCreating}
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
          onClick={onCancel}
          disabled={isCreating}
          className="border-[#3e3e42] text-[#cccccc] hover:bg-[#2a2d2e]"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isCreating || !formData.name.trim()}
          className="bg-[#0e639c] hover:bg-[#1177bb] text-white"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Project'
          )}
        </Button>
      </div>
    </form>
  );
}
