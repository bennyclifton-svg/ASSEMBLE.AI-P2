'use client';

/**
 * New Project Page
 * Form to create a new project with full initialization
 * (disciplines, trades, stages, cost lines, etc.)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function NewProjectPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Project name is required');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    code: code.trim() || undefined,
                }),
            });

            if (!res.ok) {
                if (res.status === 401) {
                    router.push('/login');
                    return;
                }
                const data = await res.json();
                throw new Error(data.error || 'Failed to create project');
            }

            const project = await res.json();

            // Redirect to the new project
            router.push(`/projects/${project.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create project');
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Back link */}
                <Link
                    href="/dashboard"
                    className="inline-flex items-center text-gray-400 hover:text-white mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Link>

                {/* Form card */}
                <div className="bg-[#1e1e1e] rounded-lg border border-[#333] p-8">
                    <h1 className="text-2xl font-bold text-white mb-2">
                        Create New Project
                    </h1>
                    <p className="text-gray-400 mb-6">
                        Enter your project details to get started. Your project will be initialized with default disciplines, trades, and cost structure.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Project Name */}
                        <div>
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium text-gray-300 mb-1"
                            >
                                Project Name *
                            </label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Office Tower Development"
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                disabled={isSubmitting}
                                autoFocus
                            />
                        </div>

                        {/* Project Code */}
                        <div>
                            <label
                                htmlFor="code"
                                className="block text-sm font-medium text-gray-300 mb-1"
                            >
                                Project Code (optional)
                            </label>
                            <input
                                id="code"
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                placeholder="e.g., PRJ-2024-001"
                                className="w-full px-4 py-2 bg-[#2a2a2a] border border-[#444] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                                disabled={isSubmitting}
                            />
                        </div>

                        {/* Error message */}
                        {error && (
                            <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-400 text-sm">
                                {error}
                            </div>
                        )}

                        {/* Submit button */}
                        <button
                            type="submit"
                            disabled={isSubmitting || !name.trim()}
                            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating Project...
                                </>
                            ) : (
                                'Create Project'
                            )}
                        </button>
                    </form>

                    {/* Info text */}
                    <p className="mt-6 text-xs text-gray-500 text-center">
                        This will create a project with 37 consultant disciplines, 21 contractor trades, 5 project stages, and default cost structure.
                    </p>
                </div>
            </div>
        </div>
    );
}
