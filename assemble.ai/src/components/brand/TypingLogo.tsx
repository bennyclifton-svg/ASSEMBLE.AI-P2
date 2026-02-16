'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TypingLogoProps {
    className?: string;
}

const WORDS = ['Foundry', 'Forge', 'Flow'];
const TYPING_SPEED = 150;
const DELETING_SPEED = 75;
const PAUSE_DURATION = 3000;

export function TypingLogo({ className }: TypingLogoProps) {
    const [text, setText] = useState('Foundry');
    const [isDeleting, setIsDeleting] = useState(false);
    const [wordIndex, setWordIndex] = useState(0);
    const [delta, setDelta] = useState(PAUSE_DURATION);

    useEffect(() => {
        const ticker = setInterval(() => {
            tick();
        }, delta);

        return () => clearInterval(ticker);
    }, [text, delta, isDeleting, wordIndex]);

    const tick = () => {
        const i = wordIndex % WORDS.length;
        const fullWord = WORDS[i];

        // Determine the next text state
        const updatedText = isDeleting
            ? fullWord.substring(0, text.length - 1)
            : fullWord.substring(0, text.length + 1);

        setText(updatedText);

        // Default speed logic
        let newDelta = isDeleting ? DELETING_SPEED : TYPING_SPEED;

        // Randomize typing speed slightly for realism
        if (!isDeleting) {
            newDelta = TYPING_SPEED + Math.random() * 50;
        }

        // Logic for state transitions
        if (!isDeleting && updatedText === fullWord) {
            // Finished typing the word
            // Triple the rest time for 'Foundry'
            newDelta = fullWord === 'Foundry' ? PAUSE_DURATION * 3 : PAUSE_DURATION;
            setIsDeleting(true);
        } else if (isDeleting && updatedText === '') {
            // Finished deleting the word
            setIsDeleting(false);
            setWordIndex(wordIndex + 1);
            newDelta = 500; // Pause before typing next word
        }

        setDelta(newDelta);
    };

    return (
        <span className={cn("font-bold italic relative inline-block", className)}>
            {/* Hidden placeholder for layout stability (longest word + cursor) */}
            <span className="opacity-0" aria-hidden="true">Foundry|</span>

            {/* Animated text layer */}
            <span className="absolute left-0 top-0 whitespace-nowrap">
                {text}
                <span className="animate-pulse ml-0.5">|</span>
            </span>
        </span>
    );
}
