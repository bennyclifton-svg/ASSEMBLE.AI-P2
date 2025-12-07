/**
 * Cost Plan Loading Skeleton
 * Feature 006 - Cost Planning Module (Task T082)
 *
 * Displays a skeleton loader matching the cost plan sheet layout.
 */

export default function CostPlanLoading() {
  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      {/* Tabs skeleton */}
      <div className="flex items-center bg-[#252526] border-b border-[#3e3e42] px-2 py-2 gap-2">
        <div className="h-8 w-24 bg-[#37373d] rounded animate-pulse" />
        <div className="h-8 w-24 bg-[#37373d] rounded animate-pulse" />
        <div className="h-8 w-24 bg-[#37373d] rounded animate-pulse" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#3e3e42] bg-[#252526]">
        <div className="flex items-center gap-6">
          <div className="h-4 w-32 bg-[#37373d] rounded animate-pulse" />
          <div className="h-4 w-28 bg-[#37373d] rounded animate-pulse" />
        </div>
        <div className="h-8 w-8 bg-[#37373d] rounded animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="flex-1 overflow-hidden p-4">
        {/* Header row */}
        <div className="flex gap-1 mb-1">
          <div className="h-8 w-6 bg-[#B85C5C] rounded-sm animate-pulse" />
          <div className="h-8 w-16 bg-[#B85C5C] rounded-sm animate-pulse" />
          <div className="h-8 w-20 bg-[#B85C5C] rounded-sm animate-pulse" />
          <div className="h-8 flex-1 bg-[#B85C5C] rounded-sm animate-pulse" />
          <div className="h-8 w-[72px] bg-[#B85C5C] rounded-sm animate-pulse" />
          <div className="h-8 w-[72px] bg-[#B85C5C] rounded-sm animate-pulse" />
          <div className="h-8 w-[60px] bg-[#D4A574] rounded-sm animate-pulse" />
          <div className="h-8 w-[60px] bg-[#D4A574] rounded-sm animate-pulse" />
          <div className="h-8 w-[72px] bg-[#B85C5C] rounded-sm animate-pulse" />
          <div className="h-8 w-[72px] bg-[#B85C5C] rounded-sm animate-pulse" />
          <div className="h-8 w-[72px] bg-[#B85C5C] rounded-sm animate-pulse" />
          <div className="h-8 w-[60px] bg-[#B85C5C] rounded-sm animate-pulse" />
          <div className="h-8 w-[72px] bg-[#B85C5C] rounded-sm animate-pulse" />
          <div className="h-8 w-7 bg-[#B85C5C] rounded-sm animate-pulse" />
        </div>

        {/* Section rows - FEES */}
        <SectionSkeleton sectionName="FEES AND CHARGES" rowCount={3} />

        {/* Section rows - CONSULTANTS */}
        <SectionSkeleton sectionName="CONSULTANTS" rowCount={4} />

        {/* Section rows - CONSTRUCTION */}
        <SectionSkeleton sectionName="CONSTRUCTION" rowCount={5} />

        {/* Section rows - CONTINGENCY */}
        <SectionSkeleton sectionName="CONTINGENCY" rowCount={2} />

        {/* Grand total row */}
        <div className="flex gap-1 mt-1">
          <div className="h-7 w-6 bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-16 bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-20 bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 flex-1 bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-[60px] bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-[60px] bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-[60px] bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
          <div className="h-7 w-7 bg-[#2d2d30] rounded-sm animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function SectionSkeleton({ sectionName, rowCount }: { sectionName: string; rowCount: number }) {
  return (
    <>
      {/* Section header */}
      <div className="flex gap-1 mt-2 mb-1">
        <div className="h-7 w-full bg-[#37373d] rounded-sm animate-pulse flex items-center px-2">
          <span className="text-xs text-[#6e6e6e]">{sectionName}</span>
        </div>
      </div>

      {/* Data rows */}
      {Array.from({ length: rowCount }).map((_, i) => (
        <div key={i} className="flex gap-1 mb-0.5">
          <div className="h-6 w-6 bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-16 bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-20 bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 flex-1 bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-[72px] bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-[72px] bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-[60px] bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-[60px] bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-[72px] bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-[72px] bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-[72px] bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-[60px] bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-[72px] bg-[#252526] rounded-sm animate-pulse" />
          <div className="h-6 w-7 bg-[#252526] rounded-sm animate-pulse" />
        </div>
      ))}

      {/* Sub-total row */}
      <div className="flex gap-1">
        <div className="h-6 w-6 bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-16 bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-20 bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 flex-1 bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-[60px] bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-[60px] bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-[60px] bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-[72px] bg-[#2d2d30] rounded-sm animate-pulse" />
        <div className="h-6 w-7 bg-[#2d2d30] rounded-sm animate-pulse" />
      </div>
    </>
  );
}
