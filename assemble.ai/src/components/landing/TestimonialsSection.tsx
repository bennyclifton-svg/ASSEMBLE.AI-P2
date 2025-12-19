import { SectionContainer } from './shared/SectionContainer';
import { ScrollReveal } from './shared/ScrollReveal';
import { testimonialsContent } from './data/landing-data';

export function TestimonialsSection() {
    return (
        <SectionContainer id="testimonials" pattern="standard" background="bg-[var(--gray-50)]" className="py-24">
            <ScrollReveal>
                <div className="text-center mb-12">
                    <p className="text-[var(--gray-500)] text-sm font-medium mb-3">
                        {testimonialsContent.label}
                    </p>
                    <h2 className="serif text-[clamp(36px,4vw,52px)] leading-[1.1] text-[var(--gray-800)]">
                        {testimonialsContent.headline}
                    </h2>
                </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {testimonialsContent.testimonials.map((testimonial, index) => (
                    <ScrollReveal key={testimonial.author} delay={index * 100}>
                        <div className="bg-white rounded-2xl p-10 shadow-sm border border-[var(--gray-100)] h-full flex flex-col">
                            <span className="serif text-[72px] text-[var(--primary-light)] leading-none mb-4">
                                "
                            </span>
                            <p className="text-[var(--gray-600)] text-base italic flex-grow mb-8">
                                {testimonial.quote}
                            </p>
                            <div className="flex items-center gap-4">
                                <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary)] flex items-center justify-center">
                                    <span className="text-white font-semibold text-sm">
                                        {testimonial.initials}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-[var(--gray-800)] font-semibold text-sm">
                                        {testimonial.author}
                                    </p>
                                    <p className="text-[var(--gray-500)] text-sm">
                                        {testimonial.title}, {testimonial.company}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </ScrollReveal>
                ))}
            </div>
        </SectionContainer>
    );
}
