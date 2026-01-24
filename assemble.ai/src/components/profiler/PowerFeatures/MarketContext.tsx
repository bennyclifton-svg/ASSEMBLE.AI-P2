'use client';

import { useMemo } from 'react';
import { BarChart3, TrendingUp, Building2, Clock } from 'lucide-react';
import type { BuildingClass, ProjectType } from '@/types/profiler';

interface MarketContextProps {
  buildingClass: BuildingClass | null;
  projectType: ProjectType | null;
  subclass: string[];
  scaleData: Record<string, number>;
  complexity: Record<string, string>;
}

interface MarketBenchmark {
  metric: string;
  value: string;
  source: string;
  icon: React.ReactNode;
}

// Market benchmarks from Rawlinsons 2025 / AIQS / Industry data
const BENCHMARKS: Record<string, Record<string, MarketBenchmark[]>> = {
  residential: {
    house: [
      { metric: 'Typical GFA', value: '150-350 m\u00b2', source: 'Rawlinsons 2025', icon: <Building2 className="w-3 h-3" /> },
      { metric: 'Cost Range', value: '$2,500-5,500/m\u00b2', source: 'Rawlinsons 2025', icon: <TrendingUp className="w-3 h-3" /> },
      { metric: 'Build Duration', value: '6-12 months', source: 'Industry average', icon: <Clock className="w-3 h-3" /> },
    ],
    apartments: [
      { metric: 'Typical GFA', value: '5,000-50,000 m\u00b2', source: 'Rawlinsons 2025', icon: <Building2 className="w-3 h-3" /> },
      { metric: 'Cost Range', value: '$3,200-5,800/m\u00b2', source: 'Rawlinsons 2025', icon: <TrendingUp className="w-3 h-3" /> },
      { metric: 'Build Duration', value: '18-30 months', source: 'Industry average', icon: <Clock className="w-3 h-3" /> },
    ],
    aged_care_9c: [
      { metric: 'Typical Beds', value: '80-120 beds', source: 'AIQS', icon: <Building2 className="w-3 h-3" /> },
      { metric: 'Cost per Bed', value: '$250k-500k', source: 'AIQS', icon: <TrendingUp className="w-3 h-3" /> },
      { metric: 'GFA per Bed', value: '50-80 m\u00b2', source: 'AIQS', icon: <BarChart3 className="w-3 h-3" /> },
      { metric: 'Build Duration', value: '18-24 months', source: 'Industry average', icon: <Clock className="w-3 h-3" /> },
    ],
    retirement_living_ilu: [
      { metric: 'Typical ILUs', value: '50-200 units', source: 'AIQS', icon: <Building2 className="w-3 h-3" /> },
      { metric: 'Cost per ILU', value: '$200k-400k', source: 'Industry average', icon: <TrendingUp className="w-3 h-3" /> },
      { metric: 'Avg ILU Size', value: '80-120 m\u00b2', source: 'AIQS', icon: <BarChart3 className="w-3 h-3" /> },
    ],
  },
  commercial: {
    office: [
      { metric: 'Typical NLA', value: '5,000-50,000 m\u00b2', source: 'Rawlinsons 2025', icon: <Building2 className="w-3 h-3" /> },
      { metric: 'A-Grade Rate', value: '$3,500-4,500/m\u00b2', source: 'Rawlinsons 2025', icon: <TrendingUp className="w-3 h-3" /> },
      { metric: 'Floor Plate', value: '1,000-2,500 m\u00b2', source: 'Industry typical', icon: <BarChart3 className="w-3 h-3" /> },
    ],
    hotel: [
      { metric: 'Typical Rooms', value: '100-300 keys', source: 'HVS', icon: <Building2 className="w-3 h-3" /> },
      { metric: '4-Star Cost', value: '$250k-350k/key', source: 'Industry average', icon: <TrendingUp className="w-3 h-3" /> },
      { metric: 'Build Duration', value: '24-36 months', source: 'Industry average', icon: <Clock className="w-3 h-3" /> },
    ],
    retail_shopping: [
      { metric: 'Sub-regional GLA', value: '20,000-50,000 m\u00b2', source: 'SCCA', icon: <Building2 className="w-3 h-3" /> },
      { metric: 'Cost Range', value: '$3,000-6,000/m\u00b2', source: 'Rawlinsons 2025', icon: <TrendingUp className="w-3 h-3" /> },
      { metric: 'Car Park Ratio', value: '5-7 spaces/100m\u00b2', source: 'Council typical', icon: <BarChart3 className="w-3 h-3" /> },
    ],
  },
  industrial: {
    warehouse: [
      { metric: 'Typical GFA', value: '5,000-50,000 m\u00b2', source: 'Rawlinsons 2025', icon: <Building2 className="w-3 h-3" /> },
      { metric: 'Cost Range', value: '$800-1,500/m\u00b2', source: 'Rawlinsons 2025', icon: <TrendingUp className="w-3 h-3" /> },
      { metric: 'Clear Height', value: '10-14m', source: 'Industry typical', icon: <BarChart3 className="w-3 h-3" /> },
    ],
    data_centre: [
      { metric: 'Typical IT Load', value: '5-50 MW', source: 'Uptime Institute', icon: <Building2 className="w-3 h-3" /> },
      { metric: 'Tier III Cost', value: '$15k-25k/m\u00b2', source: 'Industry average', icon: <TrendingUp className="w-3 h-3" /> },
      { metric: 'Power Density', value: '6-15 kW/rack', source: 'Industry typical', icon: <BarChart3 className="w-3 h-3" /> },
    ],
  },
  institution: {
    healthcare_hospital: [
      { metric: 'Tertiary GFA', value: '30,000-100,000 m\u00b2', source: 'AIHW', icon: <Building2 className="w-3 h-3" /> },
      { metric: 'Cost Range', value: '$8k-18k/m\u00b2', source: 'Rawlinsons 2025', icon: <TrendingUp className="w-3 h-3" /> },
      { metric: 'GFA per Bed', value: '120-180 m\u00b2', source: 'AIHW', icon: <BarChart3 className="w-3 h-3" /> },
    ],
    education_school: [
      { metric: 'Typical Students', value: '300-1,500', source: 'DET', icon: <Building2 className="w-3 h-3" /> },
      { metric: 'Cost Range', value: '$3,500-6,000/m\u00b2', source: 'Rawlinsons 2025', icon: <TrendingUp className="w-3 h-3" /> },
      { metric: 'GFA per Student', value: '10-15 m\u00b2', source: 'DET guidelines', icon: <BarChart3 className="w-3 h-3" /> },
    ],
  },
};

export function MarketContext({
  buildingClass,
  projectType,
  subclass,
  scaleData,
  complexity,
}: MarketContextProps) {
  const benchmarks = useMemo<MarketBenchmark[]>(() => {
    if (!buildingClass || subclass.length === 0) return [];

    // Try to find specific subclass benchmarks, fallback to class default
    const classBenchmarks = BENCHMARKS[buildingClass] || {};
    const subclassBenchmarks = classBenchmarks[subclass[0]];

    if (subclassBenchmarks) {
      return subclassBenchmarks;
    }

    // Return a generic benchmark if specific not found
    return [
      {
        metric: 'Market Data',
        value: 'Contact QS for specific benchmarks',
        source: 'N/A',
        icon: <BarChart3 className="w-3 h-3" />
      },
    ];
  }, [buildingClass, subclass]);

  if (!buildingClass || subclass.length === 0) return null;

  // Check if we have real benchmarks
  const hasRealData = benchmarks.length > 0 && benchmarks[0].source !== 'N/A';

  if (!hasRealData) return null;

  return (
    <div className="mt-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-[var(--color-accent-teal)]" />
        <span className="text-sm font-medium text-[var(--color-text-primary)]">
          Market Context
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {benchmarks.map((benchmark, index) => (
          <div
            key={index}
            className="p-2 bg-[var(--color-bg-tertiary)] rounded-lg"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[var(--color-accent-teal)]">{benchmark.icon}</span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {benchmark.metric}
              </span>
            </div>
            <div className="text-sm font-medium text-[var(--color-text-primary)]">
              {benchmark.value}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
              {benchmark.source}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
