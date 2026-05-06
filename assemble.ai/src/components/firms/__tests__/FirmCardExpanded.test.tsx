import { render } from '@testing-library/react';
import { FirmCardExpanded, toInputValue } from '../FirmCardExpanded';
import type { FirmData } from '../types';

function firmWithNullBlanks(): FirmData {
  return {
    id: 'firm-1',
    companyName: 'Harbour Mechanical Services',
    contactPerson: null,
    email: 'tenders@harbourmechanical.com.au',
    mobile: null,
    phone: null,
    address: null,
    abn: null,
    notes: null,
    shortlisted: true,
    awarded: false,
    companyId: null,
    discipline: 'Mechanical',
  } as unknown as FirmData;
}

describe('FirmCardExpanded', () => {
  it('converts nullable database text fields into controlled input values', () => {
    expect(toInputValue(null)).toBe('');
    expect(toInputValue(undefined)).toBe('');
    expect(toInputValue('Northline HVAC')).toBe('Northline HVAC');
  });

  it('normalizes null optional fields before rendering controlled inputs', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(
        <FirmCardExpanded
          type="consultant"
          firm={firmWithNullBlanks()}
          onSave={jest.fn()}
          onDelete={jest.fn()}
          onShortlistToggle={jest.fn()}
          onAwardToggle={jest.fn()}
          onFileUpload={jest.fn()}
          isDragOver={false}
          onToggleExpand={jest.fn()}
        />
      );

      expect(consoleError).not.toHaveBeenCalledWith(
        expect.stringContaining('`value` prop on `input` should not be null')
      );
    } finally {
      consoleError.mockRestore();
    }
  });
});
