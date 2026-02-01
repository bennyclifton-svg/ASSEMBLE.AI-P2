/**
 * Render Loop Guard Hook
 *
 * Detects when a component enters a render loop state (excessive re-renders in a short time)
 * and provides a mechanism to automatically break out of the loop by entering a cooldown period.
 *
 * During cooldown, components can skip expensive operations (fetching, effects) to stabilize.
 */

import { useRef, useEffect, useCallback, useState } from 'react';

interface RenderLoopGuardOptions {
    /** Maximum renders allowed per second before triggering cooldown (default: 15) */
    maxRendersPerSecond?: number;
    /** How long to stay in cooldown before allowing normal operation (default: 2000ms) */
    cooldownMs?: number;
    /** Component name for logging (optional) */
    componentName?: string;
    /** Whether to log warnings to console (default: true in development) */
    enableLogging?: boolean;
}

interface RenderLoopGuardResult {
    /** True if the component is currently in cooldown mode due to detected loop */
    isInCooldown: boolean;
    /** Number of renders in the last second */
    renderCount: number;
    /** Manually trigger cooldown (useful for testing or programmatic control) */
    triggerCooldown: () => void;
    /** Manually exit cooldown (use with caution) */
    exitCooldown: () => void;
}

/**
 * Hook to detect and prevent render loops in React components.
 *
 * When a component renders more than `maxRendersPerSecond` times within a 1-second window,
 * the hook enters "cooldown" mode. Components can use `isInCooldown` to skip expensive
 * operations and stabilize.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *     const { isInCooldown, renderCount } = useRenderLoopGuard({
 *         componentName: 'MyComponent',
 *         maxRendersPerSecond: 10,
 *     });
 *
 *     useEffect(() => {
 *         // Skip fetching during cooldown to break the loop
 *         if (isInCooldown) return;
 *         fetchData();
 *     }, [dependency, isInCooldown]);
 *
 *     return <div>...</div>;
 * }
 * ```
 */
export function useRenderLoopGuard(options?: RenderLoopGuardOptions): RenderLoopGuardResult {
    const {
        maxRendersPerSecond = 15,
        cooldownMs = 2000,
        componentName = 'Component',
        enableLogging = process.env.NODE_ENV === 'development',
    } = options || {};

    // Track timestamps of recent renders
    const renderTimestamps = useRef<number[]>([]);

    // Use state for cooldown so changes trigger re-renders with stable values
    const [isInCooldown, setIsInCooldown] = useState(false);

    // Track cooldown timeout
    const cooldownTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track if we've already logged for this cooldown period
    const hasLoggedCooldown = useRef(false);

    // Register this render
    useEffect(() => {
        const now = Date.now();
        renderTimestamps.current.push(now);

        // Keep only timestamps from the last second
        const oneSecondAgo = now - 1000;
        renderTimestamps.current = renderTimestamps.current.filter(t => t > oneSecondAgo);

        // Check if we're in a loop
        const currentRenderCount = renderTimestamps.current.length;

        if (currentRenderCount > maxRendersPerSecond && !isInCooldown) {
            // Enter cooldown
            if (enableLogging && !hasLoggedCooldown.current) {
                console.warn(
                    `[RenderLoopGuard] ${componentName}: Render loop detected! ` +
                    `${currentRenderCount} renders in 1 second (threshold: ${maxRendersPerSecond}). ` +
                    `Entering ${cooldownMs}ms cooldown to stabilize.`
                );
                hasLoggedCooldown.current = true;
            }

            setIsInCooldown(true);

            // Schedule exit from cooldown
            if (cooldownTimeout.current) {
                clearTimeout(cooldownTimeout.current);
            }

            cooldownTimeout.current = setTimeout(() => {
                if (enableLogging) {
                    console.info(`[RenderLoopGuard] ${componentName}: Exiting cooldown, resuming normal operation.`);
                }
                setIsInCooldown(false);
                renderTimestamps.current = [];
                hasLoggedCooldown.current = false;
            }, cooldownMs);
        }
    });

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (cooldownTimeout.current) {
                clearTimeout(cooldownTimeout.current);
            }
        };
    }, []);

    const triggerCooldown = useCallback(() => {
        setIsInCooldown(true);

        if (cooldownTimeout.current) {
            clearTimeout(cooldownTimeout.current);
        }

        cooldownTimeout.current = setTimeout(() => {
            setIsInCooldown(false);
            renderTimestamps.current = [];
            hasLoggedCooldown.current = false;
        }, cooldownMs);
    }, [cooldownMs]);

    const exitCooldown = useCallback(() => {
        if (cooldownTimeout.current) {
            clearTimeout(cooldownTimeout.current);
        }
        setIsInCooldown(false);
        renderTimestamps.current = [];
        hasLoggedCooldown.current = false;
    }, []);

    return {
        isInCooldown,
        renderCount: renderTimestamps.current.length,
        triggerCooldown,
        exitCooldown,
    };
}

/**
 * Utility hook to create a stable array reference that only changes when array contents change.
 * Useful for preventing unnecessary re-renders when array identity changes but values don't.
 *
 * @example
 * ```tsx
 * // Instead of: const ids = documents.map(d => d.id);
 * // Use: const ids = useStableArray(documents.map(d => d.id));
 * ```
 */
export function useStableArray<T>(array: T[]): T[] {
    const previousRef = useRef<T[]>(array);

    // Compare arrays by content
    const arraysEqual =
        array.length === previousRef.current.length &&
        array.every((item, index) => item === previousRef.current[index]);

    if (!arraysEqual) {
        previousRef.current = array;
    }

    return previousRef.current;
}
