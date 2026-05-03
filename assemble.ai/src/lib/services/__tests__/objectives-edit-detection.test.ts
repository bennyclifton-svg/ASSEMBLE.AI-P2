/**
 * @jest-environment node
 *
 * Pure helper — given a set of objective rows and the most recent generation
 * snapshot for that section, decide whether the section "has manual edits"
 * (which means ↻ on Short should ask for confirmation).
 */

import { hasManualEdits } from '../objectives-edit-detection';

const baseRow = {
  id: 'r1',
  text: 'Premium materials',
};

describe('hasManualEdits', () => {
  it('returns false when every row matches the snapshot exactly and has no HTML marks', () => {
    const result = hasManualEdits({
      rows: [
        { ...baseRow, id: 'r1', text: 'Premium materials' },
        { ...baseRow, id: 'r2', text: 'Open-plan living' },
      ],
      snapshot: ['Premium materials', 'Open-plan living'],
    });
    expect(result).toBe(false);
  });

  it('returns true when a row text differs from the snapshot', () => {
    const result = hasManualEdits({
      rows: [{ ...baseRow, text: 'Premium luxury materials' }],
      snapshot: ['Premium materials'],
    });
    expect(result).toBe(true);
  });

  it('returns true when a row contains HTML marks beyond plain text', () => {
    const result = hasManualEdits({
      rows: [{ ...baseRow, text: 'Premium <strong>materials</strong>' }],
      snapshot: ['Premium materials'],
    });
    expect(result).toBe(true);
  });

  it('returns true when row count differs from snapshot', () => {
    const result = hasManualEdits({
      rows: [{ ...baseRow }, { ...baseRow, id: 'r2', text: 'Extra bullet' }],
      snapshot: ['Premium materials'],
    });
    expect(result).toBe(true);
  });

  it('returns true when there is no snapshot (user-only content)', () => {
    const result = hasManualEdits({
      rows: [{ ...baseRow, text: 'User added bullet' }],
      snapshot: null,
    });
    expect(result).toBe(true);
  });

  it('strips harmless <p> wrappers when comparing text', () => {
    const result = hasManualEdits({
      rows: [{ ...baseRow, text: '<p>Premium materials</p>' }],
      snapshot: ['Premium materials'],
    });
    expect(result).toBe(false);
  });
});
