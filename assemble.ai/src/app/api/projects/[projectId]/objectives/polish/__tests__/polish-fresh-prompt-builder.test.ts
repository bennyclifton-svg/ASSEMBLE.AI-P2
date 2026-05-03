/**
 * @jest-environment node
 *
 * Tests for the "Long-fresh" prompt builder — the single-pass prompt used when
 * ↻ on Long is invoked on an empty section. Produces both terse and polished
 * forms in one AI round-trip.
 */

import { buildPolishFreshPrompt } from '../polish-fresh-prompt-builder';

describe('buildPolishFreshPrompt', () => {
  it('asks for both terse fallback AND polished bullets in a single response', () => {
    const prompt = buildPolishFreshPrompt({
      section: 'functional',
      profileContext: 'Project Context: ...',
      domainContextSection: '',
      inferenceRulesFormatted: '- Open-plan living\n- Storage requirements',
    });
    expect(prompt).toContain('functional');
    expect(prompt).toContain('Open-plan living');
    expect(prompt).toMatch(/short.*and.*polished|both/i);
    expect(prompt).toContain('"short"');
    expect(prompt).toContain('"polished"');
  });

  it('includes Australian standards instruction in polished section', () => {
    const prompt = buildPolishFreshPrompt({
      section: 'compliance',
      profileContext: '',
      domainContextSection: '',
      inferenceRulesFormatted: '- NCC 2022 compliance',
    });
    expect(prompt).toMatch(/NCC|AS standards/);
    expect(prompt).toMatch(/10-15 words/);
  });
});
