'use client';

import { Globe } from 'lucide-react';
import type { Region } from '@/types/profiler';
import profileTemplates from '@/lib/data/profile-templates.json';

interface RegionBadgeProps {
  region: Region;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  showCode?: boolean;
  className?: string;
}

// Access region config from templates
const regionConfig = (profileTemplates as any).regionConfig as Record<Region, {
  code: Region;
  name: string;
  buildingCodeName: string;
  buildingCodeAbbrev: string;
  currency: string;
  currencySymbol: string;
}>;

// Region flag emoji mappings
const REGION_FLAGS: Record<Region, string> = {
  AU: '\u{1F1E6}\u{1F1FA}', // Australia flag
  NZ: '\u{1F1F3}\u{1F1FF}', // New Zealand flag
  UK: '\u{1F1EC}\u{1F1E7}', // UK flag
  US: '\u{1F1FA}\u{1F1F8}', // US flag
};

// Region colors
const REGION_COLORS: Record<Region, string> = {
  AU: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/25 dark:text-emerald-400',
  NZ: 'bg-sky-500/10 text-sky-600 border-sky-500/25 dark:text-sky-400',
  UK: 'bg-red-500/10 text-red-600 border-red-500/25 dark:text-red-400',
  US: 'bg-blue-500/10 text-blue-600 border-blue-500/25 dark:text-blue-400',
};

const SIZE_CLASSES = {
  sm: 'text-[10px] px-1.5 py-0.5 gap-1',
  md: 'text-xs px-2 py-1 gap-1.5',
  lg: 'text-sm px-3 py-1.5 gap-2',
};

const ICON_SIZES = {
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export function RegionBadge({
  region,
  size = 'md',
  showName = false,
  showCode = true,
  className = '',
}: RegionBadgeProps) {
  const config = regionConfig[region];

  if (!config) return null;

  return (
    <div
      className={`
        inline-flex items-center rounded-full border font-medium
        ${SIZE_CLASSES[size]}
        ${REGION_COLORS[region]}
        ${className}
      `}
      title={`${config.name} (${config.buildingCodeAbbrev})`}
    >
      <span className="leading-none">{REGION_FLAGS[region]}</span>
      {showCode && <span>{region}</span>}
      {showName && <span>{config.name}</span>}
    </div>
  );
}

// Compact version for inline use
export function RegionFlag({ region, className = '' }: { region: Region; className?: string }) {
  const config = regionConfig[region];

  return (
    <span
      className={className}
      title={config?.name || region}
    >
      {REGION_FLAGS[region]}
    </span>
  );
}

// Building code badge showing the regional code name
export function BuildingCodeBadge({
  region,
  className = '',
}: {
  region: Region;
  className?: string;
}) {
  const config = regionConfig[region];

  if (!config) return null;

  return (
    <div
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium
        bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] border border-[var(--color-border)]
        ${className}
      `}
      title={config.buildingCodeName}
    >
      <Globe className="w-2.5 h-2.5" />
      <span>{config.buildingCodeAbbrev}</span>
    </div>
  );
}
