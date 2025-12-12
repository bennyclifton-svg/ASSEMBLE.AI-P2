'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Settings, Check, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CONSULTANT_DISCIPLINES, CONTRACTOR_TRADES } from '@/lib/constants/disciplines';

interface DefaultSettings {
  enabledDisciplines?: string[];
  enabledTrades?: string[];
}

export function DefaultSettingsSection() {
  const router = useRouter();
  const [settings, setSettings] = useState<DefaultSettings>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDisciplinesExpanded, setIsDisciplinesExpanded] = useState(false);
  const [isTradesExpanded, setIsTradesExpanded] = useState(false);

  // Fetch current settings
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/users/me/organization');
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch settings');
      }

      const data = await res.json();
      setSettings(data.organization?.defaultSettings || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Toggle discipline
  const toggleDiscipline = useCallback(
    async (name: string) => {
      const current = settings.enabledDisciplines || [];
      const updated = current.includes(name)
        ? current.filter((d) => d !== name)
        : [...current, name];

      setSettings((prev) => ({ ...prev, enabledDisciplines: updated }));

      // Save immediately
      setIsSaving(true);
      try {
        const res = await fetch('/api/users/me/organization', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultSettings: { enabledDisciplines: updated } }),
        });

        if (!res.ok) {
          throw new Error('Failed to save');
        }
      } catch (err) {
        setError('Failed to save changes');
        // Revert
        setSettings((prev) => ({ ...prev, enabledDisciplines: current }));
      } finally {
        setIsSaving(false);
      }
    },
    [settings.enabledDisciplines]
  );

  // Toggle trade
  const toggleTrade = useCallback(
    async (name: string) => {
      const current = settings.enabledTrades || [];
      const updated = current.includes(name)
        ? current.filter((t) => t !== name)
        : [...current, name];

      setSettings((prev) => ({ ...prev, enabledTrades: updated }));

      // Save immediately
      setIsSaving(true);
      try {
        const res = await fetch('/api/users/me/organization', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ defaultSettings: { enabledTrades: updated } }),
        });

        if (!res.ok) {
          throw new Error('Failed to save');
        }
      } catch (err) {
        setError('Failed to save changes');
        // Revert
        setSettings((prev) => ({ ...prev, enabledTrades: current }));
      } finally {
        setIsSaving(false);
      }
    },
    [settings.enabledTrades]
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-[#2a2d2e] rounded w-40" />
          <div className="h-32 bg-[#2a2d2e] rounded" />
        </div>
      </div>
    );
  }

  const enabledDisciplines = settings.enabledDisciplines || [];
  const enabledTrades = settings.enabledTrades || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#cccccc]">Default Settings</h3>
        {isSaving && (
          <div className="flex items-center gap-1 text-xs text-[#808080]">
            <Loader2 className="w-3 h-3 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      <p className="text-sm text-[#808080]">
        Configure default disciplines and trades for new projects.
      </p>

      {error && (
        <div className="px-3 py-2 bg-[#f48771]/20 rounded text-sm text-[#f48771]">
          {error}
        </div>
      )}

      {/* Consultant Disciplines */}
      <div className="border border-[#3e3e42] rounded">
        <button
          onClick={() => setIsDisciplinesExpanded(!isDisciplinesExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-[#2a2d2e] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#808080]" />
            <span className="text-sm font-medium text-[#cccccc]">
              Consultant Disciplines
            </span>
            <span className="text-xs text-[#808080]">
              ({enabledDisciplines.length} selected)
            </span>
          </div>
          {isDisciplinesExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#808080]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#808080]" />
          )}
        </button>

        {isDisciplinesExpanded && (
          <div className="border-t border-[#3e3e42] p-3 max-h-64 overflow-auto">
            <div className="grid grid-cols-2 gap-2">
              {CONSULTANT_DISCIPLINES.map((discipline) => {
                const isEnabled = enabledDisciplines.includes(discipline.name);
                return (
                  <button
                    key={discipline.name}
                    onClick={() => toggleDiscipline(discipline.name)}
                    disabled={isSaving}
                    className={`
                      flex items-center gap-2 p-2 rounded text-left text-sm transition-colors
                      ${
                        isEnabled
                          ? 'bg-[#0e639c]/20 text-[#cccccc]'
                          : 'hover:bg-[#2a2d2e] text-[#808080]'
                      }
                    `}
                  >
                    <div
                      className={`
                        w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                        ${
                          isEnabled
                            ? 'bg-[#0e639c] border-[#0e639c]'
                            : 'border-[#3e3e42]'
                        }
                      `}
                    >
                      {isEnabled && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="truncate">{discipline.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Contractor Trades */}
      <div className="border border-[#3e3e42] rounded">
        <button
          onClick={() => setIsTradesExpanded(!isTradesExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-[#2a2d2e] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-[#808080]" />
            <span className="text-sm font-medium text-[#cccccc]">
              Contractor Trades
            </span>
            <span className="text-xs text-[#808080]">
              ({enabledTrades.length} selected)
            </span>
          </div>
          {isTradesExpanded ? (
            <ChevronUp className="w-4 h-4 text-[#808080]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[#808080]" />
          )}
        </button>

        {isTradesExpanded && (
          <div className="border-t border-[#3e3e42] p-3 max-h-64 overflow-auto">
            <div className="grid grid-cols-2 gap-2">
              {CONTRACTOR_TRADES.map((trade) => {
                const isEnabled = enabledTrades.includes(trade.name);
                return (
                  <button
                    key={trade.name}
                    onClick={() => toggleTrade(trade.name)}
                    disabled={isSaving}
                    className={`
                      flex items-center gap-2 p-2 rounded text-left text-sm transition-colors
                      ${
                        isEnabled
                          ? 'bg-[#0e639c]/20 text-[#cccccc]'
                          : 'hover:bg-[#2a2d2e] text-[#808080]'
                      }
                    `}
                  >
                    <div
                      className={`
                        w-4 h-4 rounded border flex items-center justify-center flex-shrink-0
                        ${
                          isEnabled
                            ? 'bg-[#0e639c] border-[#0e639c]'
                            : 'border-[#3e3e42]'
                        }
                      `}
                    >
                      {isEnabled && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="truncate">{trade.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
