import { planBriefRegeneration } from '../brief-regeneration-plan';

describe('planBriefRegeneration', () => {
  it('generates every section when the brief has no objectives yet', () => {
    expect(planBriefRegeneration({})).toEqual({
      hasExistingObjectives: false,
      sectionsToGenerate: ['planning', 'functional', 'quality', 'compliance'],
      sectionsToPolish: [],
    });
  });

  it('polishes existing sections and only generates empty sections', () => {
    expect(planBriefRegeneration({
      planning: [{ id: 'p1', text: 'Coordinate council inspections' }],
      functional: [{ id: 'f1', text: 'Provide amenities facilities' }],
      quality: [],
      compliance: [{ id: 'c1', text: 'Meet BAL-29 requirements' }],
    })).toEqual({
      hasExistingObjectives: true,
      sectionsToGenerate: ['quality'],
      sectionsToPolish: ['planning', 'functional', 'compliance'],
    });
  });
});
