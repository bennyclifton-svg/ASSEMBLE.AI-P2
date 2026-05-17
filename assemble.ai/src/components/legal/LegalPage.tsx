import Link from 'next/link';

export type LegalPageKind = 'terms' | 'privacy' | 'contact' | 'support';

interface LegalSection {
    heading: string;
    body: string[];
}

interface LegalPageContent {
    title: string;
    eyebrow: string;
    intro: string;
    sections: LegalSection[];
}

export const LEGAL_PAGES: Record<LegalPageKind, LegalPageContent> = {
    terms: {
        eyebrow: 'legal',
        title: 'Terms of Service',
        intro: 'These launch terms describe the commercial and product rules for using Sitewise. Final wording must be reviewed before public launch.',
        sections: [
            {
                heading: 'Service Use',
                body: [
                    'Sitewise provides tender, project, document, and AI workflow tools for building project teams.',
                    'Users are responsible for the accuracy, suitability, and legal review of material they upload, generate, approve, or issue.',
                ],
            },
            {
                heading: 'Trials, Billing, And Cancellation',
                body: [
                    'Paid plans are billed through Polar. Trial accounts can be upgraded from billing settings before the trial ends.',
                    'Users can manage or cancel a subscription from the billing portal. Canceled or expired accounts may become read-only while export remains available.',
                ],
            },
            {
                heading: 'Acceptable Use',
                body: [
                    'Do not upload unlawful, malicious, infringing, or sensitive third-party material unless you have authority to process it.',
                    'Do not attempt to bypass account limits, billing controls, security controls, or tenant isolation.',
                ],
            },
        ],
    },
    privacy: {
        eyebrow: 'privacy',
        title: 'Privacy Policy',
        intro: 'This launch privacy notice explains what Sitewise needs to operate the service. Final wording must be reviewed before public launch.',
        sections: [
            {
                heading: 'Information We Process',
                body: [
                    'We process account details, workspace metadata, uploaded project documents, generated outputs, support requests, billing events, and product telemetry needed to operate the service.',
                    'Billing card details are handled by Polar and are not stored directly by Sitewise.',
                ],
            },
            {
                heading: 'Retention And Deletion',
                body: [
                    'Active account data is retained while the account is in use. Canceled or expired accounts may be kept read-only for a limited export and support window.',
                    'Users can request deletion from account settings or support. We confirm identity, export options, and any retention obligations before deletion.',
                ],
            },
            {
                heading: 'Service Providers',
                body: [
                    'Sitewise may use infrastructure, database, storage, email, billing, AI model, and monitoring providers to deliver the service.',
                    'Provider access is limited to what is needed for hosting, support, security, billing, analytics, and product operation.',
                ],
            },
        ],
    },
    contact: {
        eyebrow: 'contact',
        title: 'Contact Sitewise',
        intro: 'Use this page for commercial, support, billing, cancellation, privacy, or security questions.',
        sections: [
            {
                heading: 'Support',
                body: [
                    'Email support@sitewise.au with your account email, workspace name, and a short description of the request.',
                    'For billing or cancellation requests, you can also open the billing portal from account settings.',
                ],
            },
            {
                heading: 'Privacy And Deletion',
                body: [
                    'For privacy or deletion requests, include the account email and whether you need an export before deletion.',
                    'We will confirm identity and next steps before removing account data.',
                ],
            },
        ],
    },
    support: {
        eyebrow: 'support',
        title: 'Support',
        intro: 'Support paths for account, billing, exports, cancellation, and data requests.',
        sections: [
            {
                heading: 'Account And Billing',
                body: [
                    'Open account settings to view trial, subscription, workspace, export, and data deletion options.',
                    'Open billing settings to manage payment method, invoices, plan changes, or cancellation through the Polar customer portal.',
                ],
            },
            {
                heading: 'Exports And Data Requests',
                body: [
                    'Project exports are available from project workspaces where export is permitted by your current account state.',
                    'Data deletion requests should be sent to support@sitewise.au. We will explain retention windows and confirm completion.',
                ],
            },
        ],
    },
};

export function LegalPage({ kind }: { kind: LegalPageKind }) {
    const content = LEGAL_PAGES[kind];

    return (
        <main className="min-h-screen bg-[#0f1418] pt-24 text-[#E8E4DA]">
            <div className="mx-auto max-w-3xl px-6 py-16">
                <div className="font-mono text-xs uppercase tracking-[0.16em] text-[#9DB6C5]">{content.eyebrow}</div>
                <h1 className="mt-4 text-4xl font-semibold">{content.title}</h1>
                <p className="mt-5 text-lg text-[#B8C2C9]">{content.intro}</p>

                <div className="mt-12 space-y-8">
                    {content.sections.map((section) => (
                        <section key={section.heading} className="border-t border-white/10 pt-8">
                            <h2 className="text-xl font-semibold">{section.heading}</h2>
                            <div className="mt-4 space-y-3 text-[#B8C2C9]">
                                {section.body.map((paragraph) => (
                                    <p key={paragraph}>{paragraph}</p>
                                ))}
                            </div>
                        </section>
                    ))}
                </div>

                <div className="mt-12 flex flex-wrap gap-3 border-t border-white/10 pt-8">
                    <Link href="/terms" className="text-sm text-[#E8E4DA] underline-offset-4 hover:underline">Terms</Link>
                    <Link href="/privacy" className="text-sm text-[#E8E4DA] underline-offset-4 hover:underline">Privacy</Link>
                    <Link href="/contact" className="text-sm text-[#E8E4DA] underline-offset-4 hover:underline">Contact</Link>
                    <Link href="/support" className="text-sm text-[#E8E4DA] underline-offset-4 hover:underline">Support</Link>
                </div>
            </div>
        </main>
    );
}
