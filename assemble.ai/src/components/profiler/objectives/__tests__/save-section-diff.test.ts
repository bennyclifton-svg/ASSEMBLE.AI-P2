/**
 * @jest-environment node
 */
import { computeRowOps } from '../save-section-diff';
import type { ObjectiveRow } from '../ObjectivesWorkspace';

const existing = (id: string, text: string, sortOrder = 0): ObjectiveRow => ({
  id,
  projectId: 'p',
  objectiveType: 'functional',
  source: 'ai_added',
  text,
  textPolished: null,
  status: 'draft',
  sortOrder,
  isDeleted: false,
  createdAt: '',
  updatedAt: '',
});

describe('computeRowOps', () => {
  it('detects no-ops when content matches', () => {
    const ops = computeRowOps({
      currentRows: [existing('a', 'One', 0), existing('b', 'Two', 1)],
      editorItems: [{ id: 'a', html: 'One' }, { id: 'b', html: 'Two' }],
    });
    expect(ops.creates).toHaveLength(0);
    expect(ops.updates).toHaveLength(0);
    expect(ops.deletes).toHaveLength(0);
  });

  it('detects creates for items with no id', () => {
    const ops = computeRowOps({
      currentRows: [existing('a', 'One', 0)],
      editorItems: [{ id: 'a', html: 'One' }, { id: null, html: 'New bullet' }],
    });
    expect(ops.creates).toEqual([{ html: 'New bullet', sortOrder: 1 }]);
  });

  it('detects updates when html differs for matched id', () => {
    const ops = computeRowOps({
      currentRows: [existing('a', 'One', 0)],
      editorItems: [{ id: 'a', html: 'One refined' }],
    });
    expect(ops.updates).toEqual([{ id: 'a', html: 'One refined' }]);
  });

  it('detects deletes for ids missing from editor', () => {
    const ops = computeRowOps({
      currentRows: [existing('a', 'One', 0), existing('b', 'Two', 1)],
      editorItems: [{ id: 'a', html: 'One' }],
    });
    expect(ops.deletes).toEqual(['b']);
  });

  it('handles reorder by writing sortOrder into updates', () => {
    const ops = computeRowOps({
      currentRows: [existing('a', 'One', 0), existing('b', 'Two', 1)],
      editorItems: [{ id: 'b', html: 'Two' }, { id: 'a', html: 'One' }],
    });
    const idsInOrder = ops.updates.map((u) => u.id);
    expect(idsInOrder).toEqual(['b', 'a']);
    expect(ops.updates[0].sortOrder).toBe(0);
    expect(ops.updates[1].sortOrder).toBe(1);
  });
});
