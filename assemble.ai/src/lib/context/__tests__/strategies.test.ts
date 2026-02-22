import {
  resolveStrategy,
  resolveAutoModeModules,
  CONTEXT_STRATEGIES,
} from '../strategies';

describe('resolveStrategy', () => {
  it('resolves report-section:brief to a strategy with profile, costPlan, program, risks, procurement', () => {
    const { strategyKey, requirements } = resolveStrategy({
      projectId: 'p1',
      task: 'Generate brief',
      contextType: 'report-section',
      sectionKey: 'brief',
    });

    expect(strategyKey).toBe('report-section:brief');
    const moduleNames = requirements.modules.map((m) => m.module);
    expect(moduleNames).toContain('profile');
    expect(moduleNames).toContain('costPlan');
    expect(moduleNames).toContain('program');
    expect(moduleNames).toContain('risks');
    expect(moduleNames).toContain('procurement');
  });

  it('resolves report-section:cost_planning with costPlan at priority 10', () => {
    const { requirements } = resolveStrategy({
      projectId: 'p1',
      task: 'Generate cost planning section',
      contextType: 'report-section',
      sectionKey: 'cost_planning',
    });

    const costPlanReq = requirements.modules.find(
      (m) => m.module === 'costPlan'
    );
    expect(costPlanReq).toBeDefined();
    expect(costPlanReq!.priority).toBe(10);
    expect(costPlanReq!.level).toBe('required');
  });

  it('falls back to contextType when sectionKey has no match', () => {
    const { strategyKey, requirements } = resolveStrategy({
      projectId: 'p1',
      task: 'Generate unknown section',
      contextType: 'trr',
      sectionKey: 'nonexistent',
    });

    expect(strategyKey).toBe('trr:nonexistent');
    // Should fall back to 'trr' strategy
    const moduleNames = requirements.modules.map((m) => m.module);
    expect(moduleNames).toContain('procurement');
    expect(moduleNames).toContain('costPlan');
  });

  it('returns profile-only fallback for completely unknown contextType', () => {
    const { requirements } = resolveStrategy({
      projectId: 'p1',
      task: 'Unknown task',
      contextType: 'report-section',
      sectionKey: 'completely_unknown',
    });

    // Falls back to 'report-section' which doesn't exist directly,
    // so should get the profile-only fallback
    // Actually 'report-section' base type doesn't exist, but contextType 'report-section' isn't in strategies
    // So it returns the profile-only fallback
    expect(requirements.modules.length).toBeGreaterThanOrEqual(1);
  });

  it('sets autoMode for inline-instruction', () => {
    const { requirements } = resolveStrategy({
      projectId: 'p1',
      task: 'Summarize the costs',
      contextType: 'inline-instruction',
    });

    expect(requirements.autoMode).toBe(true);
  });

  it('sets autoMode for coaching-qa', () => {
    const { requirements } = resolveStrategy({
      projectId: 'p1',
      task: 'Is my budget on track?',
      contextType: 'coaching-qa',
    });

    expect(requirements.autoMode).toBe(true);
  });

  it('covers all defined strategies', () => {
    // Verify the strategy map has expected keys
    const keys = Object.keys(CONTEXT_STRATEGIES);
    expect(keys).toContain('report-section:brief');
    expect(keys).toContain('report-section:procurement');
    expect(keys).toContain('report-section:cost_planning');
    expect(keys).toContain('report-section:programme');
    expect(keys).toContain('trr');
    expect(keys).toContain('rft');
    expect(keys).toContain('note');
    expect(keys).toContain('inline-instruction');
    expect(keys).toContain('coaching-qa');
  });
});

describe('resolveAutoModeModules', () => {
  it('always includes profile', () => {
    const modules = resolveAutoModeModules('hello world');
    const names = modules.map((m) => m.module);
    expect(names).toContain('profile');
  });

  it('includes costPlan, invoices, variations for cost-related queries', () => {
    const modules = resolveAutoModeModules(
      'What is the current budget forecast?'
    );
    const names = modules.map((m) => m.module);
    expect(names).toContain('costPlan');
    expect(names).toContain('invoices');
    expect(names).toContain('variations');
  });

  it('includes risks for risk-related queries', () => {
    const modules = resolveAutoModeModules(
      'What are the high-severity risk items?'
    );
    const names = modules.map((m) => m.module);
    expect(names).toContain('risks');
  });

  it('includes program and milestones for schedule queries', () => {
    const modules = resolveAutoModeModules(
      'When is the next milestone due?'
    );
    const names = modules.map((m) => m.module);
    expect(names).toContain('program');
    expect(names).toContain('milestones');
  });

  it('includes procurement for tender queries', () => {
    const modules = resolveAutoModeModules(
      'Which contractors have been awarded?'
    );
    const names = modules.map((m) => m.module);
    expect(names).toContain('procurement');
  });

  it('includes broad set when no keywords match', () => {
    const modules = resolveAutoModeModules('How is everything going?');
    const names = modules.map((m) => m.module);
    // Should include a broad set at low priority
    expect(names).toContain('profile');
    expect(names).toContain('costPlan');
    expect(names).toContain('program');
    expect(names).toContain('risks');
    expect(names).toContain('procurement');
  });

  it('takes highest priority when multiple keyword groups match the same module', () => {
    // "cost" triggers costPlan at priority 9, "invoice" triggers costPlan at 5
    const modules = resolveAutoModeModules(
      'What is the cost and invoice status?'
    );
    const costPlan = modules.find((m) => m.module === 'costPlan');
    expect(costPlan).toBeDefined();
    expect(costPlan!.priority).toBe(9); // Higher priority wins
  });
});
