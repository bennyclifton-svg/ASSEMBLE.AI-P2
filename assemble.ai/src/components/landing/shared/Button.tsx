'use client';

import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

type ButtonVariant = 'primary-green' | 'light-green' | 'black' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    hasArrow?: boolean;
    size?: 'default' | 'large';
    href?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
    'primary-green': 'bg-[var(--primary)] text-black hover:bg-[var(--primary-dark)]',
    'light-green': 'bg-[var(--primary-light)] text-black hover:bg-[#9EEAB5]',
    'black': 'bg-black text-white hover:bg-[var(--gray-800)]',
    'ghost': 'bg-transparent text-white border border-[var(--gray-700)] hover:bg-[var(--gray-900)] hover:border-[var(--gray-500)]',
};

const arrowBgStyles: Record<ButtonVariant, string> = {
    'primary-green': 'bg-[var(--primary-dark)]',
    'light-green': 'bg-black',
    'black': 'bg-[var(--gray-800)]',
    'ghost': 'bg-[var(--gray-700)]',
};

export function Button({
    variant = 'primary-green',
    hasArrow = true,
    size = 'default',
    href,
    className,
    children,
    ...props
}: ButtonProps) {
    const buttonClasses = cn(
        'group inline-flex items-center gap-2 font-semibold rounded-full transition-all duration-200',
        size === 'default' ? 'px-5 py-2.5 text-sm' : 'px-6 py-3 text-[15px]',
        variantStyles[variant],
        className
    );

    const content = (
        <>
            {children}
            {hasArrow && (
                <span className={cn(
                    'flex items-center justify-center w-5 h-5 rounded-full transition-transform duration-200 group-hover:translate-x-0.5',
                    arrowBgStyles[variant]
                )}>
                    <ArrowRight className="w-3 h-3" />
                </span>
            )}
        </>
    );

    if (href) {
        return (
            <Link href={href} className={buttonClasses}>
                {content}
            </Link>
        );
    }

    return (
        <button className={buttonClasses} {...props}>
            {content}
        </button>
    );
}
