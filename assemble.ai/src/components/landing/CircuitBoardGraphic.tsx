'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
    Building2,
    MapPin,
    Target,
    Users,
    Database,
    ChevronsRight,
} from 'lucide-react';
import Image from 'next/image';

// --- CONFIGURATION ---

const CENTER_X = 50; // %
const CENTER_Y = 55; // %

// Layout Zones
const SIDEBAR_W = 22; // Left sidebar width % (increased from 18)
const RIGHTBAR_W = 22; // Right sidebar width %
const TOPBAR_H = 14; // Top bar height %

// UI Data
const LEFT_ITEMS = [
    { id: 'lot', label: 'Lot', icon: MapPin, y: 25 },
    { id: 'bldg', label: 'Building', icon: Building2, y: 40 },
    { id: 'obj', label: 'Objectives', icon: Target, y: 55 },
    { id: 'stake', label: 'Stakeholders', icon: Users, y: 70 },
];

const TOP_ITEMS = [
    { id: 'cost', label: 'Cost Planning', x: 28 },
    { id: 'prog', label: 'Program', x: 40 },
    { id: 'proc', label: 'Procurement', x: 52 },
    { id: 'note', label: 'Notes', x: 64, active: false }, // Removed highlight
    { id: 'meet', label: 'Meet Report', x: 76 }, // Renamed from "Meet & Report"
];

const RIGHT_ITEMS = [
    { id: 'know', label: 'Knowledge', y: 30, icon: Database }, // Only Knowledge remaining
];

export function CircuitBoardGraphic() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const paths = useMemo(() => {
        const p: string[] = [];

        // Define a central convergence area (point) instead of a box
        // To allow lines to pass through each other, we'll route them towards the center
        // but vary the "pass through" slightly or just have them cross.

        // Left Sidebar Connections
        LEFT_ITEMS.forEach((item, index) => {
            const startX = SIDEBAR_W;
            const startY = item.y;

            // Route to center X, but perhaps vary Y slightly or converge to CENTER_Y
            // Let's create a "flow" where they go to the center and maybe beyond or just stop
            // Instruction: "reticulate the circuil lines into the center... allow the lines to pass through one another"
            // Let's have them go towards the center point.

            // Simple path: H -> V -> H
            // H to near center X, V to center Y

            // To make it look "circuit-like" and intersect, let's route them to specific points near the center axis
            const targetX = CENTER_X - (index % 2 === 0 ? 5 : -5); // Stagger slightly around center
            const targetY = CENTER_Y;

            // Path: Start -> H -> V -> H (center)
            // Or Start -> H (mid) -> V (targetY) -> H (center)

            const midX = SIDEBAR_W + 10 + (index * 2);

            // We want smooth circuit lines.
            // Let's aim for the absolute center (50, 55) for all, allowing overlap.

            p.push(`M ${startX} ${startY} H ${midX} V ${CENTER_Y} H ${CENTER_X}`);
        });

        // Top Bar Connections
        TOP_ITEMS.forEach((item, index) => {
            const startX = item.x;
            const startY = TOPBAR_H;

            const midY = TOPBAR_H + 10 + (index * 2);

            // Vertical down, Horizontal to Center X, Vertical to Center Y
            p.push(`M ${startX} ${startY} V ${midY} H ${CENTER_X} V ${CENTER_Y}`);
        });

        // Right Sidebar Connections
        RIGHT_ITEMS.forEach(item => {
            const startX = 100 - RIGHTBAR_W;
            const startY = item.y;

            // H -> V -> H
            const midX = 100 - RIGHTBAR_W - 10;

            p.push(`M ${startX} ${startY} H ${midX} V ${CENTER_Y} H ${CENTER_X}`);
        });

        return p;
    }, []);

    if (!mounted) return null;

    return (
        <div className="relative w-full aspect-[16/10] bg-[#f8fafc] rounded-xl overflow-hidden shadow-2xl border border-slate-200 text-xs font-sans select-none">
            <style>{`
                @keyframes dash-flow {
                    from { stroke-dashoffset: 40; }
                    to { stroke-dashoffset: 0; }
                }
            `}</style>

            {/* Background Watermark - Increased Size */}
            <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
                <div className="w-[80%] h-[80%] text-slate-200 opacity-30">
                    <img src="/logo-foundry.svg" alt="" className="w-full h-full object-contain grayscale opacity-20" />
                </div>
            </div>

            {/* --- UI LAYER --- */}

            {/* Left Sidebar */}
            <div className={`absolute top-0 bottom-0 left-0 w-[${SIDEBAR_W}%] bg-white border-r border-slate-200 flex flex-col z-20`} style={{ width: `${SIDEBAR_W}%` }}>
                <div className="h-[14%] flex items-center px-4 gap-2 border-b border-transparent">
                    <Image src="/logo-foundry.svg" alt="logo" width={24} height={24} className="w-6 h-6" />
                    <span className="font-bold italic text-slate-900 text-sm hidden lg:inline">Foundry</span>
                </div>
                <div className="flex-1 py-6 space-y-4">
                    {LEFT_ITEMS.map(item => (
                        <div key={item.id} className="group flex items-center px-4 gap-3 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border-r-2 border-transparent hover:border-blue-500 transition-all cursor-default relative">
                            {item.icon && <item.icon className="w-4 h-4 flex-shrink-0" />}
                            <span className="font-medium hidden lg:inline">{item.label}</span>
                            {/* Dot on line start */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[50%] w-1.5 h-1.5 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Bar */}
            <div className={`absolute top-0 right-[${RIGHTBAR_W}%] h-[14%] bg-white/50 backdrop-blur-sm border-b border-slate-200 flex items-end justify-between px-6 z-20`} style={{ left: `${SIDEBAR_W}%`, right: `${RIGHTBAR_W}%` }}>
                {TOP_ITEMS.map(item => (
                    <div key={item.id} className={cn(
                        "pb-3 border-b-2 px-2 font-medium cursor-default transition-all text-[10px] md:text-xs",
                        item.active ? "border-[#1776c1] text-[#1776c1]" : "border-transparent text-slate-500 hover:text-slate-700"
                    )}>
                        {item.label}
                    </div>
                ))}
            </div>

            {/* Right Sidebar */}
            <div className={`absolute top-0 bottom-0 right-0 w-[${RIGHTBAR_W}%] bg-white border-l border-slate-200 flex flex-col p-4 z-20`} style={{ width: `${RIGHTBAR_W}%` }}>
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-6 border-b border-slate-100 pb-2">
                    <ChevronsRight className="text-orange-500 w-4 h-4" />
                    <span className="hidden sm:inline">Documents</span>
                    <div className="ml-auto w-6 h-6 bg-[#0f766e] rounded-full text-white flex items-center justify-center text-[10px]">TE</div>
                </div>

                <div className="space-y-4">
                    {/* Just Knowledge Button remaining */}
                    <div className="bg-slate-50 border border-slate-100 rounded p-2 text-center text-slate-500 text-xs flex items-center justify-center gap-2 hover:bg-slate-100 cursor-pointer transition-colors">
                        <Database className="w-4 h-4" /> Knowledge
                    </div>
                </div>

                {/* Empty space below */}
                <div className="flex-1"></div>
            </div>

            {/* --- CIRCUIT LAYER --- */}
            <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Connecting Lines */}
                {paths.map((d, i) => (
                    <g key={i}>
                        <path
                            d={d}
                            stroke="#e2e8f0"
                            strokeWidth="0.6"
                            fill="none"
                        />
                        {/* Animated overlay - SLOWER and THICKER */}
                        <path
                            d={d}
                            stroke="#3b82f6"
                            strokeWidth="0.6"
                            fill="none"
                            strokeDasharray="4 6"
                            style={{
                                animation: 'dash-flow 3s linear infinite' // Slowed down from 1s to 3s
                            }}
                            className="opacity-60"
                        />
                    </g>
                ))}
            </svg>

            {/* Central Glow (Subtle, no box) */}
            <div
                className="absolute transform -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center pointer-events-none"
                style={{ left: `${CENTER_X}%`, top: `${CENTER_Y}%` }}
            >
                <div className="w-8 h-8 bg-blue-500/10 rounded-full animate-pulse blur-xl" />
            </div>

        </div>
    );
}

