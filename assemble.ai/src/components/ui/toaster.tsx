"use client"

import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from "@/components/ui/toast"
import { useToast } from "@/lib/hooks/use-toast"
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react"

const variantIcons: Record<string, React.ReactNode> = {
    success: <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--color-accent-green)]" />,
    destructive: <XCircle className="h-5 w-5 shrink-0 text-[var(--color-accent-coral)]" />,
    warning: <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--primitive-yellow-dark)]" />,
    info: <Info className="h-5 w-5 shrink-0 text-[var(--color-accent-teal)]" />,
}

export function Toaster() {
    const { toasts } = useToast()

    return (
        <ToastProvider>
            {toasts.map(function ({ id, title, description, action, variant, ...props }: any) {
                const icon = variant ? variantIcons[variant] : null
                return (
                    <Toast key={id} variant={variant} {...props}>
                        <div className="flex items-start gap-3">
                            {icon}
                            <div className="grid gap-1">
                                {title && <ToastTitle>{title}</ToastTitle>}
                                {description && (
                                    <ToastDescription>{description}</ToastDescription>
                                )}
                            </div>
                        </div>
                        {action}
                        <ToastClose />
                    </Toast>
                )
            })}
            <ToastViewport />
        </ToastProvider>
    )
}
