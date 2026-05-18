import {
    buildPasswordResetEmail,
    buildVerificationEmail,
    sendAccountVerificationEmail,
    sendPasswordResetEmail,
    sendTransactionalEmail,
    validateTransactionalEmailConfig,
    type TransactionalEmailProvider,
} from '../transactional';

function mockProvider(): TransactionalEmailProvider {
    return {
        send: jest.fn(async () => ({ id: 'email-1' })),
    };
}

describe('transactional email wrapper', () => {
    it('allows local delivery to be disabled safely', async () => {
        const result = await sendTransactionalEmail(
            { to: 'person@example.com', subject: 'Test', html: '<p>Test</p>' },
            { env: { NODE_ENV: 'development' } as NodeJS.ProcessEnv }
        );

        expect(result).toEqual({ status: 'skipped', reason: 'disabled' });
    });

    it('validates Resend config for production', () => {
        expect(validateTransactionalEmailConfig({ NODE_ENV: 'production' } as NodeJS.ProcessEnv)).toMatchObject({
            enabled: true,
            valid: false,
            missing: ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'],
        });

        expect(validateTransactionalEmailConfig({
            NODE_ENV: 'production',
            RESEND_API_KEY: 're_key',
            RESEND_FROM_EMAIL: 'Sitewise <support@sitewise.au>',
        } as NodeJS.ProcessEnv)).toMatchObject({
            enabled: true,
            valid: true,
            missing: [],
        });
    });

    it('builds and sends verification email through an injected provider', async () => {
        const provider = mockProvider();
        const result = await sendAccountVerificationEmail({
            to: 'person@example.com',
            name: 'Person Example',
            url: 'https://app.example.com/verify',
        }, provider);

        expect(result).toEqual({ status: 'sent', id: 'email-1' });
        expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
            to: 'person@example.com',
            subject: 'Verify your Sitewise account',
            tags: { type: 'account_verification' },
        }));
    });

    it('builds and sends password reset email through an injected provider', async () => {
        const provider = mockProvider();
        const result = await sendPasswordResetEmail({
            to: 'person@example.com',
            name: 'Person Example',
            url: 'https://app.example.com/reset',
        }, provider);

        expect(result).toEqual({ status: 'sent', id: 'email-1' });
        expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({
            to: 'person@example.com',
            subject: 'Reset your Sitewise password',
            tags: { type: 'password_reset' },
        }));
    });

    it('keeps account email links in text and html bodies', () => {
        expect(buildVerificationEmail({
            to: 'person@example.com',
            url: 'https://app.example.com/verify',
        }).text).toContain('https://app.example.com/verify');

        expect(buildPasswordResetEmail({
            to: 'person@example.com',
            url: 'https://app.example.com/reset',
        }).html).toContain('https://app.example.com/reset');
    });
});
