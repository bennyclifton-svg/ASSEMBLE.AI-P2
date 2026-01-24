/**
 * Panel Error Boundary Component
 * Feature 021 - Notes, Meetings & Reports - Phase 9
 *
 * Error boundary wrapper for panel components to catch and display errors gracefully.
 */

'use client';

import { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
    children: ReactNode;
    panelName?: string;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class PanelErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log the error to console in development
        console.error('Panel Error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        this.props.onReset?.();
    };

    render() {
        if (this.state.hasError) {
            const panelName = this.props.panelName || 'panel';

            return (
                <div className="flex flex-col h-full">
                    {/* Header placeholder */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] capitalize">
                            {panelName}
                        </h2>
                    </div>

                    {/* Error content */}
                    <div className="flex-1 flex flex-col items-center justify-center p-4">
                        <div className="rounded-full bg-red-500/10 p-4 mb-4">
                            <AlertCircle className="h-8 w-8 text-red-500" />
                        </div>
                        <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                            Something went wrong
                        </h3>
                        <p className="text-sm text-[var(--color-text-muted)] mb-4 text-center max-w-xs">
                            An unexpected error occurred while loading the {panelName}.
                        </p>
                        {this.state.error && (
                            <p className="text-xs text-red-400 mb-4 font-mono bg-red-500/10 px-3 py-2 rounded max-w-md truncate">
                                {this.state.error.message}
                            </p>
                        )}
                        <Button
                            variant="outline"
                            onClick={this.handleReset}
                            className="gap-2"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Try Again
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default PanelErrorBoundary;
