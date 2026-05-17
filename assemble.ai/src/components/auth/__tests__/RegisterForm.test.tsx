import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RegisterForm } from '../RegisterForm';
import { signUp } from '@/lib/auth-client';

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        refresh: jest.fn(),
    }),
}));

jest.mock('@/lib/auth-client', () => ({
    signUp: {
        email: jest.fn(async () => ({})),
    },
}));

describe('RegisterForm consent', () => {
    const planIntent = {
        planId: 'starter' as const,
        requestedPlanId: 'starter',
        wasDefaulted: false,
        wasInvalid: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('requires terms and privacy consent before signup', async () => {
        render(<RegisterForm planIntent={planIntent} />);

        fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Person Example' } });
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

        expect(await screen.findByText('You must accept the Terms and Privacy Policy to create an account.')).toBeInTheDocument();
        expect(signUp.email).not.toHaveBeenCalled();
    });

    it('records consent timestamps on signup', async () => {
        render(<RegisterForm planIntent={planIntent} />);

        fireEvent.change(screen.getByLabelText('Display Name'), { target: { value: 'Person Example' } });
        fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'person@example.com' } });
        fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
        fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: 'password123' } });
        fireEvent.click(screen.getByLabelText(/I agree to the Terms/));
        fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

        await waitFor(() => {
            expect(signUp.email).toHaveBeenCalledWith(expect.objectContaining({
                email: 'person@example.com',
                termsAcceptedAt: expect.any(String),
                privacyAcceptedAt: expect.any(String),
            }));
        });
    });
});
