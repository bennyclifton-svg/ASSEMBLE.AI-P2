import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomerPortalButton } from '../CustomerPortalButton';
import { customer } from '@/lib/auth-client';

jest.mock('@/lib/auth-client', () => ({
    customer: {
        portal: jest.fn(async () => undefined),
    },
}));

describe('CustomerPortalButton', () => {
    it('opens the billing portal action', async () => {
        render(<CustomerPortalButton />);

        fireEvent.click(screen.getByRole('button', { name: /manage subscription/i }));

        await waitFor(() => {
            expect(customer.portal).toHaveBeenCalledTimes(1);
        });
    });
});
