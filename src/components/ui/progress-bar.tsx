import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
    value: number
    max?: number
}

export function ProgressBar({ value, max = 100, className, ...props }: ProgressBarProps) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
        <div
            className={cn(
                "h-2 w-full overflow-hidden rounded-full bg-secondary",
                className
            )}
            {...props}
        >
            <div
                className="h-full bg-primary transition-all duration-500 ease-in-out"
                style={{ width: `${percentage}%` }}
            />
        </div>
    )
}
