/**
 * @jest-environment jsdom
 */
import { render, screen } from '@testing-library/react';
import { ObjectivesEditor } from '../ObjectivesEditor';

describe('ObjectivesEditor', () => {
  it('renders one <li> per row, each with data-row-id', async () => {
    render(
      <ObjectivesEditor
        rows={[
          { id: 'a', text: 'First bullet' },
          { id: 'b', text: 'Second bullet' },
        ]}
        onChange={() => {}}
        placeholder="Type bullets"
      />,
    );

    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('data-row-id')).toBe('a');
    expect(items[1].getAttribute('data-row-id')).toBe('b');
  });
});
