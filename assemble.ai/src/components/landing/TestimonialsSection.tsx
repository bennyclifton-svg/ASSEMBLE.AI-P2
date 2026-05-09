import { ScrollReveal } from './shared/ScrollReveal';
import { testimonialsContent } from './data/landing-data';

const TESTIMONIAL_ACCENTS = ['var(--sw-rose)', 'var(--sw-peach)', 'var(--sw-cyan)'];

export function TestimonialsSection() {
    return (
        <section
            id="testimonials"
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
                            // {testimonialsContent.label}
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
                            {testimonialsContent.headline}
                        </h2>
                    </div>
                </ScrollReveal>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {testimonialsContent.testimonials.map((testimonial, index) => {
                        const accent = TESTIMONIAL_ACCENTS[index % TESTIMONIAL_ACCENTS.length];
                        return (
                            <ScrollReveal key={testimonial.author} delay={index * 100}>
                                <div
                                    className="h-full flex flex-col p-8"
                                    style={{
                                        background: 'var(--sw-paper-2)',
                                        border: '1px solid var(--sw-rule)',
                                        borderTop: `3px solid ${accent}`,
                                    }}
                                >
                                    <span
                                        className="leading-none mb-3"
                                        style={{
                                            fontFamily: 'var(--sw-font-sans)',
                                            fontSize: 56,
                                            fontWeight: 800,
                                            color: accent,
                                            opacity: 0.55,
                                        }}
                                        aria-hidden="true"
                                    >
                                        &ldquo;
                                    </span>
                                    <p
                                        className="flex-grow mb-8"
                                        style={{
                                            fontFamily: 'var(--sw-font-body)',
                                            fontSize: 15,
                                            lineHeight: 1.6,
                                            color: 'var(--sw-ink)',
                                        }}
                                    >
                                        {testimonial.quote}
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="flex items-center justify-center"
                                            style={{
                                                width: 44,
                                                height: 44,
                                                background: 'var(--sw-ink)',
                                                color: accent,
                                                fontFamily: 'var(--sw-font-mono)',
                                                fontSize: 13,
                                                fontWeight: 700,
                                                letterSpacing: '0.05em',
                                            }}
                                        >
                                            {testimonial.initials}
                                        </div>
                                        <div>
                                            <p
                                                style={{
                                                    fontFamily: 'var(--sw-font-sans)',
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: 'var(--sw-ink)',
                                                }}
                                            >
                                                {testimonial.author}
                                            </p>
                                            <p
                                                style={{
                                                    fontFamily: 'var(--sw-font-mono)',
                                                    fontSize: 11,
                                                    color: 'var(--sw-muted)',
                                                    letterSpacing: '0.02em',
                                                }}
                                            >
                                                {testimonial.title} · {testimonial.company}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </ScrollReveal>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
