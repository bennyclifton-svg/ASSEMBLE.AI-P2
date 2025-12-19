import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { faqContent } from './data/landing-data';

export function FAQSection() {
    return (
        <SectionContainer id="faq" pattern="fine" background="bg-[var(--gray-50)]" className="py-24">
            <ScrollReveal>
                <h2 className="serif text-[clamp(36px,4vw,52px)] leading-[1.1] text-[var(--gray-800)] text-center mb-12">
                    {faqContent.headline}
                </h2>
            </ScrollReveal>

            <div className="max-w-[800px] mx-auto space-y-4">
                {faqContent.faqs.map((faq, index) => (
                    <ScrollReveal key={faq.question} delay={index * 100}>
                        <div className="bg-white rounded-xl p-6 border border-[var(--gray-200)] transition-all hover:border-[var(--gray-300)]">
                            <h3 className="text-[17px] font-semibold text-[var(--gray-800)] mb-3">
                                {faq.question}
                            </h3>
                            <p className="text-[var(--gray-600)] text-base">
                                {faq.answer}
                            </p>
                        </div>
                    </ScrollReveal>
                ))}
            </div>
        </SectionContainer>
    );
}
