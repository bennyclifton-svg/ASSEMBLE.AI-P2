import { ScrollReveal } from './shared/ScrollReveal';
import { faqContent } from './data/landing-data';

export function FAQSection() {
    return (
        <section
            id="faq"
            className="relative overflow-hidden py-24"
            style={{ background: 'var(--sw-paper)', fontFamily: 'var(--sw-font-sans)' }}
        >
            <div className="relative max-w-[1280px] mx-auto px-8">
                <ScrollReveal>
                    <div className="text-center mb-12">
                        <p
                            className="mb-3"
                            style={{
                                fontFamily: 'var(--sw-font-mono)',
                                fontSize: 11,
                                color: 'var(--sw-rose-dk)',
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                                fontWeight: 600,
                            }}
                        >
                            // FAQ
                        </p>
                        <h2
                            style={{
                                fontFamily: 'var(--sw-font-sans)',
                                fontSize: 'clamp(36px, 4vw, 52px)',
                                fontWeight: 700,
                                lineHeight: 1.1,
                                letterSpacing: '-0.025em',
                                color: 'var(--sw-ink)',
                            }}
                        >
                            {faqContent.headline}
                        </h2>
                    </div>
                </ScrollReveal>

                <div className="max-w-[800px] mx-auto space-y-3">
                    {faqContent.faqs.map((faq, index) => (
                        <ScrollReveal key={faq.question} delay={index * 80}>
                            <div
                                className="p-6 transition-colors"
                                style={{
                                    background: 'var(--sw-paper-2)',
                                    border: '1px solid var(--sw-rule)',
                                }}
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <span
                                        className="flex-shrink-0"
                                        style={{
                                            fontFamily: 'var(--sw-font-mono)',
                                            fontSize: 11,
                                            color: 'var(--sw-rose-dk)',
                                            letterSpacing: '0.05em',
                                            paddingTop: 4,
                                            minWidth: 32,
                                        }}
                                        aria-hidden="true"
                                    >
                                        Q.{String(index + 1).padStart(2, '0')}
                                    </span>
                                    <h3
                                        style={{
                                            fontFamily: 'var(--sw-font-sans)',
                                            fontSize: 17,
                                            fontWeight: 600,
                                            letterSpacing: '-0.01em',
                                            color: 'var(--sw-ink)',
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        {faq.question}
                                    </h3>
                                </div>
                                <p
                                    className="pl-[44px]"
                                    style={{
                                        fontFamily: 'var(--sw-font-body)',
                                        fontSize: 15,
                                        lineHeight: 1.6,
                                        color: 'var(--sw-muted)',
                                    }}
                                >
                                    {faq.answer}
                                </p>
                            </div>
                        </ScrollReveal>
                    ))}
                </div>
            </div>
        </section>
    );
}
