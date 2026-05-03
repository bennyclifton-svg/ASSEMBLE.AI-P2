/**
 * @jest-environment node
 *
 * Tests the polish-prompt construction logic — specifically that:
 *   1. // markers in bullet text become per-bullet steering instructions in the prompt
 *   2. The prompt instructs the AI to strip markers from output
 *   3. A bullet that is ONLY a // line is flagged as "no-op / drop"
 */

import { buildPolishPrompt } from '../prompt-builder';

describe('buildPolishPrompt', () => {
  const baseCtx = {
    profileContext: 'Project Context: ...',
    domainContextSection: '',
  };

  it('extracts // instructions per bullet and includes them as steering', () => {
    const prompt = buildPolishPrompt({
      ...baseCtx,
      bullets: [
        { text: 'Premium materials // make this measurable' },
        { text: 'Open-plan living' },
      ],
    });

    expect(prompt).toContain('Premium materials');
    expect(prompt).toContain('STEERING for bullet 1: make this measurable');
    expect(prompt).not.toContain('STEERING for bullet 2');
  });

  it('instructs the AI to strip // markers from polished output', () => {
    const prompt = buildPolishPrompt({
      ...baseCtx,
      bullets: [{ text: 'Foo // bar' }],
    });
    expect(prompt).toMatch(/strip.*\/\/.*marker/i);
  });

  it('silently filters out instruction-only bullets so the AI never sees them', () => {
    const prompt = buildPolishPrompt({
      ...baseCtx,
      bullets: [
        { text: 'Premium materials' },
        { text: '// add a bullet about acoustic separation' },
      ],
    });
    // The expandable bullet remains
    expect(prompt).toContain('Premium materials');
    // The instruction-only line is excluded entirely
    expect(prompt).not.toContain('acoustic separation');
    // Expected count reflects the filtered set, not the raw input
    expect(prompt).toContain('return exactly 1 polished strings');
  });
});
