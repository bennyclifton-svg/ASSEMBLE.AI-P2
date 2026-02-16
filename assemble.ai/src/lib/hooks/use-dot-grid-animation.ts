'use client';

import { useRef, useEffect, useCallback } from 'react';

// ---- Types ----

export type PatternVariant = 'standard' | 'dark' | 'fine' | 'green' | 'hero';

export interface VariantConfig {
    spacing: number;
    radius: number;
    color: [number, number, number]; // RGB tuple
    opacity: number;
}

export const VARIANT_CONFIGS: Record<PatternVariant, VariantConfig> = {
    standard: { spacing: 24, radius: 1, color: [163, 163, 163], opacity: 1.0 },   // #A3A3A3
    dark:     { spacing: 24, radius: 1, color: [64, 64, 64],    opacity: 1.0 },   // #404040
    fine:     { spacing: 16, radius: 1, color: [212, 212, 212], opacity: 1.0 },   // #D4D4D4
    green:    { spacing: 20, radius: 1, color: [0, 194, 122],   opacity: 0.3 },   // #00C27A
    hero:     { spacing: 18, radius: 1, color: [38, 38, 38],    opacity: 0.5 },   // #262626
};

// ---- Phase State Machine ----

const enum Phase {
    STEADY = 0,
    SMELT = 1,
    VOID = 2,
    POUR = 3,
    CRYSTALLIZE = 4,
    COOL = 5,
}

interface PhaseConfig {
    duration: number;
    next: Phase;
}

const PHASE_SEQUENCE: Record<number, PhaseConfig> = {
    [Phase.STEADY]:      { duration: 8.0,  next: Phase.SMELT },
    [Phase.SMELT]:       { duration: 4.0,  next: Phase.VOID },
    [Phase.VOID]:        { duration: 1.5,  next: Phase.POUR },
    [Phase.POUR]:        { duration: 3.0,  next: Phase.CRYSTALLIZE },
    [Phase.CRYSTALLIZE]: { duration: 4.0,  next: Phase.COOL },
    [Phase.COOL]:        { duration: 4.5,  next: Phase.STEADY },
};

const TOTAL_CYCLE = 25.0; // sum of all phase durations

// ---- Particle Pool (struct-of-arrays for cache efficiency) ----

interface ParticlePool {
    count: number;
    cols: number;
    rows: number;
    x: Float32Array;
    y: Float32Array;
    row: Uint16Array;
    opacity: Float32Array;
    scale: Float32Array;
    distFromCenter: Float32Array;
    pourRank: Uint16Array;
    gridCenterX: number;
    gridCenterY: number;
}

// ---- Utilities ----

function clamp01(v: number): number {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

function microBounce(t: number): number {
    if (t < 0.8) return (t / 0.8) * 1.15;
    return 1.15 - 0.15 * ((t - 0.8) / 0.2);
}

// ---- Phase Update Functions ----

function updateSteady(pool: ParticlePool) {
    for (let i = 0; i < pool.count; i++) {
        pool.opacity[i] = 1.0;
        pool.scale[i] = 1.0;
    }
}

function updateSmelt(t: number, pool: ParticlePool) {
    const maxRow = pool.rows - 1;
    for (let i = 0; i < pool.count; i++) {
        // Bottom rows dissolve first
        const rowNorm = maxRow > 0 ? pool.row[i] / maxRow : 0; // 0=top, 1=bottom
        const triggerTime = (1.0 - rowNorm) * 0.7;
        const dissolveEnd = triggerTime + 0.3;
        const localT = clamp01((t - triggerTime) / (dissolveEnd - triggerTime));

        pool.opacity[i] = 1.0 - localT;
        pool.scale[i] = 1.0 - localT * 0.5;
    }
}

function updateVoid(pool: ParticlePool) {
    for (let i = 0; i < pool.count; i++) {
        pool.opacity[i] = 0;
        pool.scale[i] = 0;
    }
}

function updatePour(t: number, pool: ParticlePool) {
    const maxParticles = Math.floor(pool.count * 0.5);

    for (let i = 0; i < pool.count; i++) {
        const pourRank = pool.pourRank[i];

        if (pourRank >= maxParticles) {
            pool.opacity[i] = 0;
            pool.scale[i] = 0;
            continue;
        }

        const triggerTime = (pourRank / maxParticles) * 0.8;
        const fadeIn = clamp01((t - triggerTime) / 0.2);

        pool.opacity[i] = fadeIn;
        pool.scale[i] = fadeIn;
    }
}

function updateCrystallize(t: number, pool: ParticlePool) {
    const maxParticles = Math.floor(pool.count * 0.5);

    for (let i = 0; i < pool.count; i++) {
        const pourRank = pool.pourRank[i];

        if (pourRank < maxParticles) {
            pool.opacity[i] = 1.0;
            pool.scale[i] = 1.0;
            continue;
        }

        // Remaining 50%: center-out radial
        const triggerTime = pool.distFromCenter[i] * 0.7;
        const fadeIn = clamp01((t - triggerTime) / 0.3);

        pool.opacity[i] = fadeIn;
        pool.scale[i] = microBounce(fadeIn);
    }
}

function updateCool(pool: ParticlePool) {
    for (let i = 0; i < pool.count; i++) {
        pool.opacity[i] = 1.0;
        pool.scale[i] = 1.0;
    }
}

function updateParticles(phase: Phase, t: number, pool: ParticlePool) {
    switch (phase) {
        case Phase.STEADY:
            updateSteady(pool);
            break;
        case Phase.SMELT:
            updateSmelt(t, pool);
            break;
        case Phase.VOID:
            updateVoid(pool);
            break;
        case Phase.POUR:
            updatePour(t, pool);
            break;
        case Phase.CRYSTALLIZE:
            updateCrystallize(t, pool);
            break;
        case Phase.COOL:
            updateCool(pool);
            break;
    }
}

// ---- Render ----

const AMBER_R = 255, AMBER_G = 180, AMBER_B = 60;

function render(
    ctx: CanvasRenderingContext2D,
    pool: ParticlePool,
    config: VariantConfig,
    phase: Phase,
    phaseT: number,
    dpr: number,
) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Ambient warmth glow during void/pour/crystallize
    if (phase === Phase.VOID || phase === Phase.POUR || phase === Phase.CRYSTALLIZE) {
        const glowIntensity =
            phase === Phase.VOID
                ? Math.sin(phaseT * Math.PI) * 0.04
                : (1.0 - phaseT) * 0.03;

        if (glowIntensity > 0.001) {
            const gradient = ctx.createRadialGradient(
                w / 2, h / 2, 0,
                w / 2, h / 2, Math.max(w, h) * 0.5,
            );
            gradient.addColorStop(0, `rgba(${AMBER_R},${AMBER_G},${AMBER_B},${glowIntensity})`);
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
        }
    }

    // Warmth factor for color blending during pour/crystallize/cool
    let warmth = 0;
    if (phase === Phase.POUR || phase === Phase.CRYSTALLIZE) warmth = 0.15;
    if (phase === Phase.COOL) warmth = 0.15 * (1.0 - phaseT);

    const [baseR, baseG, baseB] = config.color;

    // Batch optimization: during STEADY (all uniform), draw in one path
    if (phase === Phase.STEADY) {
        ctx.fillStyle = `rgba(${baseR},${baseG},${baseB},${config.opacity})`;
        ctx.beginPath();
        const r = config.radius * dpr;
        for (let i = 0; i < pool.count; i++) {
            const x = pool.x[i] * dpr;
            const y = pool.y[i] * dpr;
            ctx.moveTo(x + r, y);
            ctx.arc(x, y, r, 0, Math.PI * 2);
        }
        ctx.fill();
        return;
    }

    // Per-particle rendering for animated phases
    for (let i = 0; i < pool.count; i++) {
        const opacity = pool.opacity[i];
        if (opacity <= 0.005) continue;

        const scale = pool.scale[i];
        const radius = config.radius * scale * dpr;
        if (radius <= 0) continue;

        const x = pool.x[i] * dpr;
        const y = pool.y[i] * dpr;

        let r = baseR, g = baseG, b = baseB;
        let finalAlpha = opacity * config.opacity;

        if (phase === Phase.SMELT) {
            // Amber glow peaks when opacity is around 0.5
            const amberFactor = Math.max(0, 1.0 - Math.abs(opacity - 0.5) * 4);
            if (amberFactor > 0) {
                r = lerp(baseR, AMBER_R, amberFactor);
                g = lerp(baseG, AMBER_G, amberFactor);
                b = lerp(baseB, AMBER_B, amberFactor);
                finalAlpha = Math.max(finalAlpha, amberFactor * 0.6);
            }
        } else if (warmth > 0) {
            r = lerp(baseR, AMBER_R, warmth);
            g = lerp(baseG, AMBER_G, warmth);
            b = lerp(baseB, AMBER_B, warmth);
        }

        ctx.fillStyle = `rgba(${Math.round(r)},${Math.round(g)},${Math.round(b)},${finalAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// ---- Grid Builder ----

function buildGrid(width: number, height: number, config: VariantConfig): ParticlePool {
    const cols = Math.ceil(width / config.spacing) + 1;
    const rows = Math.ceil(height / config.spacing) + 1;
    const count = cols * rows;

    const pool: ParticlePool = {
        count,
        cols,
        rows,
        x: new Float32Array(count),
        y: new Float32Array(count),
        row: new Uint16Array(count),
        opacity: new Float32Array(count),
        scale: new Float32Array(count),
        distFromCenter: new Float32Array(count),
        pourRank: new Uint16Array(count),
        gridCenterX: width / 2,
        gridCenterY: height / 2,
    };

    let idx = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            pool.x[idx] = c * config.spacing;
            pool.y[idx] = r * config.spacing;
            pool.row[idx] = r;
            pool.opacity[idx] = 1;
            pool.scale[idx] = 1;
            idx++;
        }
    }

    // Pre-compute distFromCenter (normalized 0..1)
    let maxDist = 0;
    for (let i = 0; i < count; i++) {
        const dx = pool.x[i] - pool.gridCenterX;
        const dy = pool.y[i] - pool.gridCenterY;
        pool.distFromCenter[i] = Math.sqrt(dx * dx + dy * dy);
        if (pool.distFromCenter[i] > maxDist) maxDist = pool.distFromCenter[i];
    }
    if (maxDist > 0) {
        for (let i = 0; i < count; i++) {
            pool.distFromCenter[i] /= maxDist;
        }
    }

    // Pre-compute pourRank (sorted by distance from top-center)
    const topCenterX = pool.gridCenterX;
    const indices = Array.from({ length: count }, (_, i) => i);
    const distFromTopCenter = new Float32Array(count);
    for (let i = 0; i < count; i++) {
        const dx = pool.x[i] - topCenterX;
        const dy = pool.y[i]; // distance from top (y=0)
        distFromTopCenter[i] = Math.sqrt(dx * dx + dy * dy);
    }
    indices.sort((a, b) => distFromTopCenter[a] - distFromTopCenter[b]);
    for (let rank = 0; rank < count; rank++) {
        pool.pourRank[indices[rank]] = rank;
    }

    return pool;
}

// ---- Resolve phase + elapsed from absolute time with offset ----

function resolvePhase(absoluteTime: number): { phase: Phase; t: number } {
    let remaining = absoluteTime % TOTAL_CYCLE;
    const phases: Phase[] = [
        Phase.STEADY, Phase.SMELT, Phase.VOID,
        Phase.POUR, Phase.CRYSTALLIZE, Phase.COOL,
    ];

    for (const p of phases) {
        const dur = PHASE_SEQUENCE[p].duration;
        if (remaining < dur) {
            return { phase: p, t: remaining / dur };
        }
        remaining -= dur;
    }

    return { phase: Phase.STEADY, t: 0 };
}

// ---- Hook ----

interface UseDotGridAnimationOptions {
    variant: PatternVariant;
    enabled: boolean;
    phaseOffset?: number; // seconds offset into the cycle for staggering
}

export function useDotGridAnimation({ variant, enabled, phaseOffset = 0 }: UseDotGridAnimationOptions) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const poolRef = useRef<ParticlePool | null>(null);
    const animRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const configRef = useRef(VARIANT_CONFIGS[variant]);

    // Keep config ref in sync
    configRef.current = VARIANT_CONFIGS[variant];

    const rebuildGrid = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const parent = canvas.parentElement;
        if (!parent) return;

        const rect = parent.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;

        poolRef.current = buildGrid(rect.width, rect.height, configRef.current);
    }, []);

    // Animation loop
    useEffect(() => {
        if (!enabled) return;

        rebuildGrid();
        startTimeRef.current = 0;

        const loop = (timestamp: number) => {
            if (!startTimeRef.current) startTimeRef.current = timestamp;
            const elapsed = (timestamp - startTimeRef.current) / 1000 + phaseOffset;

            const canvas = canvasRef.current;
            const pool = poolRef.current;
            if (!canvas || !pool) {
                animRef.current = requestAnimationFrame(loop);
                return;
            }

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const { phase, t } = resolvePhase(elapsed);
            updateParticles(phase, t, pool);

            const dpr = window.devicePixelRatio || 1;
            render(ctx, pool, configRef.current, phase, t, dpr);

            animRef.current = requestAnimationFrame(loop);
        };

        animRef.current = requestAnimationFrame(loop);

        return () => {
            cancelAnimationFrame(animRef.current);
            startTimeRef.current = 0;
        };
    }, [enabled, variant, phaseOffset, rebuildGrid]);

    // Resize handler
    useEffect(() => {
        if (!enabled) return;

        const parent = canvasRef.current?.parentElement;
        if (!parent) return;

        const observer = new ResizeObserver(() => {
            rebuildGrid();
        });
        observer.observe(parent);

        return () => observer.disconnect();
    }, [enabled, rebuildGrid]);

    return canvasRef;
}
