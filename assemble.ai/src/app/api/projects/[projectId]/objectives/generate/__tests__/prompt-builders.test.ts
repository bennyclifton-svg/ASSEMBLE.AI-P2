/**
 * @jest-environment node
 *
 * Targeted-assertion snapshot tests for the generate prompt builders.
 *
 * The 5-case matrix below is the regression-prevention layer for the original
 * bug class: "I changed the profile and the output didn't change." Each case
 * asserts that specific phrases are present (mustContain) or absent
 * (mustNotContain) in the assembled prompt, before it ever reaches the AI.
 *
 * Test 4 in particular is the regression test for the user-reported bug —
 * changing workScope items must change the prompt.
 */

import { buildInferencePrompt, buildExtractionPrompt } from '../prompt-builders';

describe('buildInferencePrompt — advisory snapshot matrix', () => {
  const baseInput = () => ({
    buildingClass: 'residential',
    subclass: ['apartments'] as string[],
    scaleData: { storeys: 8, units: 60 } as Record<string, number | string>,
    complexity: {} as Record<string, string | string[]>,
    functionalRulesFormatted: '',
    planningRulesFormatted: '',
    domainContextSection: '',
  });

  it('case 1: build project (new + apartments) — uses build labels', () => {
    const prompt = buildInferencePrompt({
      ...baseInput(),
      projectType: 'new',
      workScopeLabels: [],
      functionalRulesFormatted: '- 8-storey construction',
      planningRulesFormatted: '- DA approval required',
    });

    // Build labels present
    expect(prompt).toContain('Project Type: new');
    expect(prompt).toContain('FUNCTIONAL');
    expect(prompt).toContain('QUALITY');

    // Advisory labels absent
    expect(prompt).not.toContain('Scope of Advice');
    expect(prompt).not.toContain('Engagement Conditions');
  });

  it('case 2: advisory + no scope — uses advisory labels and shows draft note', () => {
    const prompt = buildInferencePrompt({
      ...baseInput(),
      projectType: 'advisory',
      workScopeLabels: [],
      // No rules — advisory always skips inference rules
    });

    // Advisory labels present
    expect(prompt).toContain('Project Type: advisory');
    expect(prompt).toContain('SCOPE OF ADVICE');
    expect(prompt).toContain('ENGAGEMENT CONDITIONS');
    expect(prompt).toContain('REVIEW STANDARDS & METHODOLOGY');
    expect(prompt).toContain('DELIVERABLES');

    // Draft note when no documents (the user instruction was to avoid the
    // explicit "no documents attached" framing — the draft mode is signalled
    // via the softer phrasing)
    expect(prompt).toContain('draft');

    // Build-only labels and example phrases absent
    expect(prompt).not.toContain('FUNCTIONAL (functional bucket)');
    expect(prompt).not.toContain('Premium material selection');

    // Inference rules block should explicitly note bypass for advisory
    expect(prompt).toMatch(/intentionally bypassed for advisory/i);
  });

  it('case 3: advisory + scope (cost_plan_review + programme_review) — scope flows into prompt', () => {
    const prompt = buildInferencePrompt({
      ...baseInput(),
      projectType: 'advisory',
      workScopeLabels: ['Cost Plan Review', 'Programme Review'],
    });

    // Scope items reach the AI
    expect(prompt).toContain('Cost Plan Review');
    expect(prompt).toContain('Programme Review');

    // Advisory-specific scope-constraint framing (services, not construction)
    expect(prompt).toContain('Scope of Advice');
    expect(prompt).toMatch(/advisory engagement/i);
    expect(prompt).toMatch(/not as construction work/i);
  });

  it('case 4: REGRESSION — re-running with changed scope changes the prompt', () => {
    // First run with cost_plan_review
    const promptA = buildInferencePrompt({
      ...baseInput(),
      projectType: 'advisory',
      workScopeLabels: ['Cost Plan Review'],
    });

    // Second run with procurement_review only
    const promptB = buildInferencePrompt({
      ...baseInput(),
      projectType: 'advisory',
      workScopeLabels: ['Procurement Review'],
    });

    // The new scope appears, the old scope is gone — this is the bug the user
    // reported. If anyone reintroduces the workScope filter, an empty scope
    // pass-through, or any other propagation break, this test fails.
    expect(promptB).toContain('Procurement Review');
    expect(promptB).not.toContain('Cost Plan Review');

    // And the first run's prompt did contain Cost Plan Review (proving the
    // delta is real and not test setup confusion)
    expect(promptA).toContain('Cost Plan Review');
    expect(promptA).not.toContain('Procurement Review');
  });
});

describe('buildExtractionPrompt — advisory document path', () => {
  it('case 5: advisory + retrieved content — uses advisory section labels and source-hierarchy note', () => {
    const prompt = buildExtractionPrompt({
      projectType: 'advisory',
      buildingClass: 'residential',
      domainContextSection: '',
      retrievedFunctional:
        '[Source 1: Engagement Letter] Independent review of stage 3 cost plan against AIQS benchmarks.',
      retrievedPlanning:
        '[Source 2: Engagement Letter] Monthly status report and PCG attendance.',
    });

    // Retrieved content surfaces in the prompt
    expect(prompt).toContain('Independent review of stage 3 cost plan');
    expect(prompt).toContain('Monthly status report');

    // Advisory section labels are used as the headers for retrieved content
    expect(prompt).toContain('Scope of Advice');
    expect(prompt).toContain('Engagement Conditions');

    // Source-hierarchy note is advisory-specific
    expect(prompt).toMatch(/AUTHORITATIVE/);
    expect(prompt).toMatch(/Source hierarchy.*advisory/i);

    // Build labels absent
    expect(prompt).not.toContain('FUNCTIONAL (functional bucket)');
    expect(prompt).not.toContain('Premium material selection');
  });

  it('build extraction path keeps existing build labels (no regression for build projects)', () => {
    const prompt = buildExtractionPrompt({
      projectType: 'new',
      buildingClass: 'residential',
      domainContextSection: '',
      retrievedFunctional: '[Source 1: Brief] Open-plan living required.',
      retrievedPlanning: '[Source 2: Brief] DA submission required.',
    });

    expect(prompt).toContain('Project Type: new');
    expect(prompt).toContain('Functional');
    expect(prompt).not.toContain('Scope of Advice');
    expect(prompt).not.toMatch(/Source hierarchy.*advisory/i);
  });
});
