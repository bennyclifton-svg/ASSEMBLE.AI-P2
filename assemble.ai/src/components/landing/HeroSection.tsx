'use client';

import { useState, useRef, useEffect } from 'react';
import { SectionContainer } from './shared/SectionContainer';
import { Button } from './shared/Button';
import { heroContent } from './data/landing-data';

function HeroMockup() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (videoRef.current) {
            // Keep the requested 2x speed
            videoRef.current.playbackRate = 2.0;
        }
    }, [isPlaying]);

    const handlePlay = () => {
        if (videoRef.current) {
            videoRef.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <div className="relative w-full rounded-2xl shadow-2xl overflow-hidden group">
            <video
                ref={videoRef}
                className="w-full h-auto block"
                loop
                muted
                playsInline
                poster="/images/Landing-01.png"
                controls={isPlaying}
            >
                <source src="/images/profiler-01.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>

            {!isPlaying && (
                <div
                    className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20 cursor-pointer"
                    onClick={handlePlay}
                >
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition-transform duration-300">
                        <svg
                            className="w-8 h-8 text-[var(--gray-900)] ml-1"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            )}
        </div>
    );
}

export function HeroSection() {
    return (
        <SectionContainer pattern="hero" patternOffset={0} background="bg-black" className="pt-[120px] pb-[80px]">
            {/* Gradient fade at bottom of hero pattern */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[60px] items-center">
                {/* Content */}
                <div>
                    <h1 className="font-[var(--font-spectral)] serif text-[clamp(40px,5.5vw,72px)] sm:text-[clamp(48px,5.5vw,72px)] leading-[1.15] tracking-[-2px] mb-6">
                        {heroContent.headline.map((line, index) => (
                            <div key={index} className="whitespace-nowrap">
                                <span className="text-[var(--gray-500)]">{line.gray}</span>{' '}
                                <span className="text-white italic">{line.white}</span>
                            </div>
                        ))}
                    </h1>

                    <p className="text-[17px] text-[var(--gray-400)] max-w-[480px] mb-8 leading-relaxed">
                        {heroContent.subtitle}
                    </p>

                </div>

                {/* Hero Mockup - hidden on tablet/mobile */}
                <div className="hidden lg:block">
                    <HeroMockup />
                </div>
            </div>
        </SectionContainer>
    );
}
