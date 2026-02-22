import { moduleCache } from '../cache';
import type { ModuleResult } from '../types';

const makeResult = (
  moduleName: string,
  success = true
): ModuleResult => ({
  moduleName: moduleName as ModuleResult['moduleName'],
  success,
  data: { test: true },
  estimatedTokens: 100,
});

beforeEach(() => {
  moduleCache.clear();
});

describe('ModuleCache', () => {
  it('stores and retrieves a module result', () => {
    const result = makeResult('profile');
    moduleCache.set('proj-1', 'profile', result);

    const cached = moduleCache.get('proj-1', 'profile');
    expect(cached).toEqual(result);
  });

  it('returns null for missing entries', () => {
    expect(moduleCache.get('proj-1', 'profile')).toBeNull();
  });

  it('returns null for different project ID', () => {
    moduleCache.set('proj-1', 'profile', makeResult('profile'));
    expect(moduleCache.get('proj-2', 'profile')).toBeNull();
  });

  it('returns null for different module name', () => {
    moduleCache.set('proj-1', 'profile', makeResult('profile'));
    expect(moduleCache.get('proj-1', 'costPlan')).toBeNull();
  });

  it('invalidates all entries for a project', () => {
    moduleCache.set('proj-1', 'profile', makeResult('profile'));
    moduleCache.set('proj-1', 'costPlan', makeResult('costPlan'));
    moduleCache.set('proj-2', 'profile', makeResult('profile'));

    moduleCache.invalidateProject('proj-1');

    expect(moduleCache.get('proj-1', 'profile')).toBeNull();
    expect(moduleCache.get('proj-1', 'costPlan')).toBeNull();
    expect(moduleCache.get('proj-2', 'profile')).not.toBeNull();
  });

  it('invalidates a specific module', () => {
    moduleCache.set('proj-1', 'profile', makeResult('profile'));
    moduleCache.set('proj-1', 'costPlan', makeResult('costPlan'));

    moduleCache.invalidateModule('proj-1', 'profile');

    expect(moduleCache.get('proj-1', 'profile')).toBeNull();
    expect(moduleCache.get('proj-1', 'costPlan')).not.toBeNull();
  });

  it('clears all entries', () => {
    moduleCache.set('proj-1', 'profile', makeResult('profile'));
    moduleCache.set('proj-2', 'risks', makeResult('risks'));

    moduleCache.clear();

    expect(moduleCache.get('proj-1', 'profile')).toBeNull();
    expect(moduleCache.get('proj-2', 'risks')).toBeNull();
  });

  it('reports stats correctly', () => {
    expect(moduleCache.stats().size).toBe(0);

    moduleCache.set('proj-1', 'profile', makeResult('profile'));
    moduleCache.set('proj-1', 'costPlan', makeResult('costPlan'));

    const stats = moduleCache.stats();
    expect(stats.size).toBe(2);
    expect(stats.oldestEntryAge).not.toBeNull();
    expect(stats.oldestEntryAge).toBeGreaterThanOrEqual(0);
  });
});
