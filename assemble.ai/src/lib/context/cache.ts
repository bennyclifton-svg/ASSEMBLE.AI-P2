// src/lib/context/cache.ts
// In-memory TTL cache for module fetch results

import type { ModuleResult, ModuleName } from './types';

interface CacheEntry {
  result: ModuleResult;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 30_000; // 30 seconds

class ModuleCache {
  private store = new Map<string, CacheEntry>();
  private ttlMs: number;

  constructor(ttlMs: number = DEFAULT_TTL_MS) {
    this.ttlMs = ttlMs;
  }

  private key(projectId: string, moduleName: ModuleName): string {
    return `${projectId}:${moduleName}`;
  }

  get(projectId: string, moduleName: ModuleName): ModuleResult | null {
    const entry = this.store.get(this.key(projectId, moduleName));
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(this.key(projectId, moduleName));
      return null;
    }

    return entry.result;
  }

  set(projectId: string, moduleName: ModuleName, result: ModuleResult): void {
    this.store.set(this.key(projectId, moduleName), {
      result,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /** Invalidate all cached entries for a project. */
  invalidateProject(projectId: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(`${projectId}:`)) {
        this.store.delete(key);
      }
    }
  }

  /** Invalidate a specific module for a project. */
  invalidateModule(projectId: string, moduleName: ModuleName): void {
    this.store.delete(this.key(projectId, moduleName));
  }

  /** Clear all cached entries. */
  clear(): void {
    this.store.clear();
  }

  stats(): { size: number; oldestEntryAge: number | null } {
    let oldestAge: number | null = null;
    for (const entry of this.store.values()) {
      const age = Date.now() - (entry.expiresAt - this.ttlMs);
      if (oldestAge === null || age > oldestAge) oldestAge = age;
    }
    return { size: this.store.size, oldestEntryAge: oldestAge };
  }
}

/** Singleton cache instance shared across all orchestrator calls. */
export const moduleCache = new ModuleCache();
