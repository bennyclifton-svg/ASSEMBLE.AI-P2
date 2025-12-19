import { cn } from '@/lib/utils';

type PatternVariant = 'standard' | 'dark' | 'fine' | 'green' | 'hero';

interface DotGridPatternProps {
    variant?: PatternVariant;
    className?: string;
}

const patterns: Record<PatternVariant, React.CSSProperties> = {
    standard: {
        backgroundImage: 'radial-gradient(circle, var(--gray-400) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
    },
    dark: {
        backgroundImage: 'radial-gradient(circle, var(--gray-700) 1px, transparent 1px)',
        backgroundSize: '24px 24px',
    },
    fine: {
        backgroundImage: 'radial-gradient(circle, var(--gray-300) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
    },
    green: {
        backgroundImage: 'radial-gradient(circle, rgba(0, 194, 122, 0.3) 1px, transparent 1px)',
        backgroundSize: '20px 20px',
    },
    hero: {
        backgroundImage: 'radial-gradient(circle, var(--gray-800) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
        opacity: 0.5,
    },
};

export function DotGridPattern({ variant = 'standard', className }: DotGridPatternProps) {
    return (
        <div
            className={cn('absolute inset-0 pointer-events-none', className)}
            style={patterns[variant]}
        />
    );
}
