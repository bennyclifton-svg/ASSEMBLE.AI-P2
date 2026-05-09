'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { User, LogOut, ChevronDown, Loader2 } from 'lucide-react';
import { ProjectRegister } from './ProjectRegister';
import { SettingsPanel } from './SettingsPanel';
import { KnowledgeLibraryRepository } from '../libraries/KnowledgeLibraryRepository';
import { SitewiseWordmark } from '../brand/SitewiseWordmark';

interface UserData {
  id: string;
  email: string;
  displayName: string;
  organizationId: string | null;
}

const STORAGE_KEY = 'landing-panel-sizes';
const DEFAULT_SIZES = [13, 62, 25];

export function LandingLayout() {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Panel sizes with localStorage persistence
  const [panelSizes, setPanelSizes] = useState<number[]>(DEFAULT_SIZES);

  // Load saved panel sizes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const sizes = JSON.parse(saved);
          if (Array.isArray(sizes) && sizes.length === 3) {
            setPanelSizes(sizes);
          }
        } catch (e) {
          // Ignore invalid saved data
        }
      }
    }
  }, []);

  // Save panel sizes
  const handlePanelResize = useCallback((sizes: number[]) => {
    setPanelSizes(sizes);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
    }
  }, []);

  // Fetch user
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to fetch user');
        }
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        console.error('Failed to fetch user:', err);
        router.push('/login');
      } finally {
        setIsLoadingUser(false);
      }
    }

    fetchUser();
  }, [router]);

  // Handle logout
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    setIsUserMenuOpen(false);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout error:', err);
      setIsLoggingOut(false);
    }
  }, [router]);

  // Handle project selection - navigate to project page
  const handleSelectProject = useCallback(
    (project: { id: string }) => {
      router.push(`/projects/${project.id}`);
    },
    [router]
  );

  if (isLoadingUser) {
    return (
      <div className="h-screen w-full bg-[var(--color-bg-primary)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--color-text-muted)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[var(--color-bg-primary)] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)] flex-shrink-0">
        {/* Wordmark */}
        <SitewiseWordmark size={20} color="var(--color-text-primary)" accent="var(--sw-rose)" className="ml-2" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-[var(--color-border)] flex items-center justify-center">
              <User className="w-4 h-4 text-[var(--color-text-primary)]" />
            </div>
            <span className="text-sm text-[var(--color-text-primary)]">{user?.displayName || 'User'}</span>
            <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
          </button>

          {isUserMenuOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsUserMenuOpen(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded shadow-lg z-20">
                <div className="p-3 border-b border-[var(--color-border)]">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                    {user?.displayName}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-[var(--color-error)] hover:bg-[var(--color-bg-hover)] transition-colors"
                >
                  {isLoggingOut ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LogOut className="w-4 h-4" />
                  )}
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Main Content - 3 Panel Layout */}
      <PanelGroup
        direction="horizontal"
        className="flex-1"
        onLayout={handlePanelResize}
      >
        {/* Left Panel - Project Register */}
        <Panel defaultSize={panelSizes[0]} minSize={10}>
          <ProjectRegister onSelectProject={handleSelectProject} />
        </Panel>

        <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent-primary)] transition-colors cursor-col-resize" />

        {/* Center Panel - Settings */}
        <Panel defaultSize={panelSizes[1]} minSize={30}>
          <SettingsPanel />
        </Panel>

        <PanelResizeHandle className="w-1 bg-[var(--color-border)] hover:bg-[var(--color-accent-primary)] transition-colors cursor-col-resize" />

        {/* Right Panel - Knowledge Libraries */}
        <Panel defaultSize={panelSizes[2]} minSize={20}>
          <KnowledgeLibraryRepository />
        </Panel>
      </PanelGroup>
    </div>
  );
}
