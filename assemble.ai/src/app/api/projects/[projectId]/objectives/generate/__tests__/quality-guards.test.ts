/**
 * @jest-environment node
 */

import { filterUnsupportedNoDocumentObjectives } from '../quality-guards';

describe('filterUnsupportedNoDocumentObjectives', () => {
  it('removes no-document objectives that turn conditional seed guidance into project facts', () => {
    const result = filterUnsupportedNoDocumentObjectives(
      [
        { text: 'Low-rise code compliance' },
        { text: 'Site auditor sign-off needed' },
        { text: 'Heritage overlay considerations' },
        { text: 'Half-floor partial occupation' },
        { text: 'Confirm Class 2 compliance pathway' },
      ],
      {
        projectType: 'new',
        subclass: ['apartments'],
        scaleData: { storeys: 8, units: 33 },
        complexity: {},
        workScopeLabels: [],
        classDescriptors: ['Class 2 apartment building'],
      },
    );

    expect(result.kept.map((item) => item.text)).toEqual(['Confirm Class 2 compliance pathway']);
    expect(result.rejected.map((entry) => entry.item.text)).toEqual([
      'Low-rise code compliance',
      'Site auditor sign-off needed',
      'Heritage overlay considerations',
      'Half-floor partial occupation',
    ]);
  });

  it('keeps otherwise restricted terms when the profile supports them', () => {
    const result = filterUnsupportedNoDocumentObjectives(
      [
        { text: 'Coordinate heritage authority approvals' },
        { text: 'Engage site auditor early' },
        { text: 'Plan staged occupation sequence' },
      ],
      {
        projectType: 'remediation',
        scaleData: { storeys: 2 },
        complexity: {
          heritage: 'local heritage item',
          contaminationLevel: 'significant',
          staging: 'occupied staged works',
        },
        workScopeLabels: ['Heritage Review', 'Remediation Action Plan'],
      },
    );

    expect(result.rejected).toHaveLength(0);
    expect(result.kept).toHaveLength(3);
  });
});
