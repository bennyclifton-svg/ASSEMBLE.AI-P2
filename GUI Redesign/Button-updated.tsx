'use client';

import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

type ButtonVariant = 
  | 'primary-green' 
  | 'light-green' 
  | 'black' 
  | 'ghost'
  | 'copper'         // Primary action in precision theme
  | 'copper-ghost'   // Secondary action in precision theme
  | 'copper-outline'; // Tertiary action in precision theme

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    hasArrow?: boolean;
    size?: 'default' | 'large' | 'small';
    href?: string;
}

const variantStyles: Record<ButtonVariant, string> = {
    'primary-green': 'bg-[var(--primary)] text-black hover:bg-[var(--primary-dark)]',
    'light-green': 'bg-[var(--primary-light)] text-black hover:bg-[#9EEAB5]',
    'black': 'bg-black text-white hover:bg-[var(--gray-800)]',
    'ghost': 'bg-transparent text-white border border-[var(--gray-700)] hover:bg-[var(--gray-900)] hover:border-[var(--gray-500)]',
    // Copper variants for precision theme
    'copper': 'bg-gradient-to-br from-[#D4A574] to-[#C49464] text-[#1A1D21] hover:brightness-110 font-semibold shadow-sm hover:shadow-md',
    'copper-ghost': 'bg-transparent text-[var(--color-text-primary)] border border-[rgba(107,114,128,0.4)] hover:bg-[rgba(212,165,116,0.08)] hover:border-[rgba(212,165,116,0.4)]',
    'copper-outline': 'bg-transparent text-[#D4A574] border border-[rgba(212,165,116,0.4)] hover:bg-[rgba(212,165,116,0.1)]',
};

const arrowBgStyles: Record<ButtonVariant, string> = {
    'primary-green': 'bg-[var(--primary-dark)]',
    'light-green': 'bg-black',
    'black': 'bg-[var(--gray-800)]',
    'ghost': 'bg-[var(--gray-700)]',
    // Copper variants
    'copper': 'bg-[#1A1D21]/20',
    'copper-ghost': 'bg-[rgba(107,114,128,0.3)]',
    'copper-outline': 'bg-[rgba(212,165,116,0.25)]',
};

const sizeStyles = {
    small: 'px-3 py-1.5 text-xs',
    default: 'px-5 py-2.5 text-sm',
    large: 'px-6 py-3 text-[15px]',
};

const arrowSizeStyles = {
    small: 'w-4 h-4',
    default: 'w-5 h-5',
    large: 'w-6 h-6',
};

const arrowIconSizeStyles = {
    small: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    large: 'w-3.5 h-3.5',
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
        'group inline-flex items-center gap-2 font-semibold rounded-full transition-all duration-200 active:scale-[0.98]',
        sizeStyles[size],
        variantStyles[variant],
        className
    );

    const content = (
        <>
            {children}
            {hasArrow && (
                <span className={cn(
                    'flex items-center justify-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5',
                    arrowSizeStyles[size],
                    arrowBgStyles[variant]
                )}>
                    <ArrowRight className={arrowIconSizeStyles[size]} />
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
