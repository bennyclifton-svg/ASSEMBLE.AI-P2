import { render, screen } from '@testing-library/react';
import { LegalPage } from '../LegalPage';

describe('LegalPage', () => {
    it('renders terms with cancellation wording', () => {
        render(<LegalPage kind="terms" />);

        expect(screen.getByRole('heading', { name: 'Terms of Service' })).toBeInTheDocument();
        expect(screen.getByText(/Users can manage or cancel a subscription/)).toBeInTheDocument();
    });

    it('renders privacy with data retention wording', () => {
        render(<LegalPage kind="privacy" />);

        expect(screen.getByRole('heading', { name: 'Privacy Policy' })).toBeInTheDocument();
        expect(screen.getByText(/retention obligations before deletion/)).toBeInTheDocument();
    });
});
