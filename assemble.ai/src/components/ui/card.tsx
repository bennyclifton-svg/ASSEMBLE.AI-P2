import * as React from "react"
import { cn } from "@/lib/utils"

type CardVariant = 'default' | 'translucent' | 'elevated' | 'aurora' | 'aurora-glow' | 'soft' | 'soft-elevated' | 'soft-interactive';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'default', ...props }, ref) => {
        const variantStyles: Record<CardVariant, string> = {
            default: "rounded-lg border bg-card text-card-foreground shadow-sm",
            translucent: "rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-card-foreground backdrop-blur-sm",
            elevated: "rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-card-foreground backdrop-blur-sm overflow-hidden",
            aurora: "rounded-xl card-aurora text-card-foreground overflow-hidden",
            "aurora-glow": "rounded-xl card-aurora-glow text-card-foreground overflow-hidden",
            // Soft UI Evolution variants
            soft: "rounded-xl card-soft text-card-foreground",
            "soft-elevated": "rounded-xl card-soft-elevated text-card-foreground",
            "soft-interactive": "rounded-xl card-soft-interactive text-card-foreground cursor-pointer",
        };

        return (
            <div
                ref={ref}
                className={cn(variantStyles[variant], className)}
                {...props}
            />
        );
    }
);
Card.displayName = "Card"

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("flex flex-col space-y-1.5 p-6", className)}
        {...props}
    />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            "text-2xl font-semibold leading-none tracking-tight",
            className
        )}
        {...props}
    />
))
CardTitle.displayName = "CardTitle"

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
))
CardContent.displayName = "CardContent"

export { Card, CardHeader, CardTitle, CardContent }
