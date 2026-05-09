import type { ObjectiveType } from '@/lib/db/objectives-schema';
import type { ObjectiveRow } from './ObjectivesWorkspace';

interface ObjectivesReadOnlyListProps {
  data: Record<ObjectiveType, ObjectiveRow[]>;
}

const SECTION_ORDER: ObjectiveType[] = ['planning', 'functional', 'quality', 'compliance'];

const SECTION_LABELS: Record<ObjectiveType, string> = {
  planning: 'Planning',
  functional: 'Functional',
  quality: 'Quality',
  compliance: 'Compliance',
};

export function ObjectivesReadOnlyList({ data }: ObjectivesReadOnlyListProps) {
  // Compute global start indices
  const startIndices: Record<ObjectiveType, number> = {
    planning: 1,
    functional: 1,
    quality: 1,
    compliance: 1,
  };
  let counter = 1;
  for (const type of SECTION_ORDER) {
    startIndices[type] = counter;
    counter += data[type].length;
  }

  return (
    <div className="flex flex-col gap-4 px-4" style={{ fontFamily: 'var(--sw-font-body)' }}>
      {SECTION_ORDER.map((type) => {
        const rows = data[type];
        if (!rows || rows.length === 0) return null;

        return (
          <div key={type}>
            {/* Section header */}
            <div className="mb-1.5">
              <span
                className="text-sm font-bold"
                style={{ color: 'var(--sw-ink)' }}
              >
                {SECTION_LABELS[type]}
              </span>
            </div>

            {/* Rows */}
            <div className="flex flex-col gap-1">
              {rows.map((row, index) => {
                const displayText =
                  row.status === 'polished' && row.textPolished
                    ? row.textPolished
                    : row.text;

                return (
                  <div key={row.id} className="flex items-start gap-2">
                    {/* Global index badge */}
                    <span
                      className="w-6 flex-shrink-0 text-right text-xs font-mono"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {startIndices[type] + index}
                    </span>
                    {/* Text */}
                    <span
                      className="text-sm leading-normal"
                      style={{ color: 'var(--sw-ink)' }}
                    >
                      {displayText}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
