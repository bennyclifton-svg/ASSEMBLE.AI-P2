import { programActivities, programMilestones } from '@/lib/db/pg-schema';
import type { ProfileResult } from './profile';
import { isoDate } from './data';

interface ActivitySeed {
  name: string;
  startDate: string;
  endDate: string;
  masterStage: string;
  color?: string;
  parentName?: string;
}

const ACTIVITIES: ActivitySeed[] = [
  // INITIATION (complete)
  { name: 'Project initiation + brief', startDate: '2024-11-01', endDate: '2025-01-15', masterStage: 'initiation', color: '#94a3b8' },

  // SCHEMATIC DESIGN (complete)
  { name: 'Schematic design', startDate: '2025-01-16', endDate: '2025-04-30', masterStage: 'schematic_design', color: '#94a3b8' },
  { name: 'DA submission + assessment', startDate: '2025-03-01', endDate: '2025-08-22', masterStage: 'schematic_design', color: '#94a3b8' },

  // DETAIL DESIGN (complete)
  { name: 'Detail design + documentation', startDate: '2025-05-01', endDate: '2025-07-31', masterStage: 'design_development', color: '#94a3b8' },
  { name: 'CC documentation + lodgement', startDate: '2025-07-15', endDate: '2025-09-30', masterStage: 'design_development', color: '#94a3b8' },

  // PROCUREMENT (complete)
  { name: 'Head contract tender', startDate: '2025-08-01', endDate: '2025-09-15', masterStage: 'procurement', color: '#94a3b8' },
  { name: 'Contract award + mobilisation', startDate: '2025-09-16', endDate: '2025-10-13', masterStage: 'procurement', color: '#94a3b8' },

  // DELIVERY - Substructure (complete)
  { name: 'Site establishment + hoarding', startDate: '2025-10-14', endDate: '2025-10-31', masterStage: 'delivery', color: '#10b981' },
  { name: 'Demolition', startDate: '2025-11-01', endDate: '2025-11-21', masterStage: 'delivery', color: '#10b981' },
  { name: 'Bulk excavation + shoring', startDate: '2025-11-15', endDate: '2025-12-19', masterStage: 'delivery', color: '#10b981' },
  { name: 'Footings + piling', startDate: '2025-12-08', endDate: '2026-01-23', masterStage: 'delivery', color: '#10b981' },
  { name: 'Basement walls + slab', startDate: '2026-01-12', endDate: '2026-02-20', masterStage: 'delivery', color: '#10b981' },
  { name: 'Ground floor slab', startDate: '2026-02-16', endDate: '2026-03-06', masterStage: 'delivery', color: '#10b981' },

  // DELIVERY - Superstructure (in progress)
  { name: 'L1 structure (slab + columns)', startDate: '2026-03-02', endDate: '2026-03-20', masterStage: 'delivery', color: '#10b981' },
  { name: 'L2 structure', startDate: '2026-03-16', endDate: '2026-04-03', masterStage: 'delivery', color: '#10b981' },
  { name: 'L3 structure', startDate: '2026-03-30', endDate: '2026-04-17', masterStage: 'delivery', color: '#10b981' },
  { name: 'L4 structure (in progress)', startDate: '2026-04-13', endDate: '2026-05-01', masterStage: 'delivery', color: '#f59e0b' },
  { name: 'L5 structure', startDate: '2026-04-27', endDate: '2026-05-15', masterStage: 'delivery', color: '#3b82f6' },
  { name: 'L6 structure + roof', startDate: '2026-05-11', endDate: '2026-05-29', masterStage: 'delivery', color: '#3b82f6' },

  // DELIVERY - Envelope (in progress)
  { name: 'Facade installation (cladding + glazing)', startDate: '2026-04-13', endDate: '2026-08-14', masterStage: 'delivery', color: '#f59e0b' },
  { name: 'Roof + waterproofing', startDate: '2026-06-01', endDate: '2026-07-03', masterStage: 'delivery', color: '#3b82f6' },

  // DELIVERY - Services (in progress)
  { name: 'Services rough-in (mech/elec/hyd)', startDate: '2026-03-23', endDate: '2026-07-31', masterStage: 'delivery', color: '#f59e0b' },
  { name: 'Lift installation', startDate: '2026-06-15', endDate: '2026-08-21', masterStage: 'delivery', color: '#3b82f6' },

  // DELIVERY - Fitout (upcoming)
  { name: 'Internal lining (plasterboard)', startDate: '2026-06-08', endDate: '2026-08-07', masterStage: 'delivery', color: '#3b82f6' },
  { name: 'Wet area waterproofing + tiling', startDate: '2026-07-06', endDate: '2026-09-04', masterStage: 'delivery', color: '#3b82f6' },
  { name: 'Joinery + fixtures', startDate: '2026-08-03', endDate: '2026-09-25', masterStage: 'delivery', color: '#3b82f6' },
  { name: 'Final fix services + commissioning', startDate: '2026-09-07', endDate: '2026-10-09', masterStage: 'delivery', color: '#3b82f6' },

  // DELIVERY - Completion (upcoming)
  { name: 'PCA inspections + OC', startDate: '2026-10-12', endDate: '2026-10-23', masterStage: 'delivery', color: '#3b82f6' },
];

interface MilestoneSeed {
  activityName: string;
  name: string;
  date: string;
}

const MILESTONES: MilestoneSeed[] = [
  { activityName: 'DA submission + assessment', name: 'DA Approved', date: '2025-08-22' },
  { activityName: 'CC documentation + lodgement', name: 'CC Issued', date: '2025-09-30' },
  { activityName: 'Site establishment + hoarding', name: 'Site Established', date: '2025-10-31' },
  { activityName: 'Ground floor slab', name: 'Substructure Complete', date: '2026-03-06' },
  { activityName: 'L6 structure + roof', name: 'Topping Out', date: '2026-05-29' },
  { activityName: 'Facade installation (cladding + glazing)', name: 'Facade Complete', date: '2026-08-14' },
  { activityName: 'PCA inspections + OC', name: 'Practical Completion', date: '2026-10-23' },
];

export async function seedProgramme(tx: any, profile: ProfileResult): Promise<void> {
  const activityIdByName = new Map<string, string>();

  const records = ACTIVITIES.map((a, idx) => {
    const id = crypto.randomUUID();
    activityIdByName.set(a.name, id);
    return {
      id,
      projectId: profile.projectId,
      parentId: null,
      name: a.name,
      startDate: a.startDate,
      endDate: a.endDate,
      collapsed: false,
      masterStage: a.masterStage,
      color: a.color ?? null,
      sortOrder: idx,
    };
  });

  await tx.insert(programActivities).values(records);

  const milestoneRecords = MILESTONES.map((m, idx) => {
    const activityId = activityIdByName.get(m.activityName);
    if (!activityId) throw new Error(`Programme: activity not found for milestone: ${m.activityName}`);
    return {
      id: crypto.randomUUID(),
      activityId,
      name: m.name,
      date: m.date,
      sortOrder: idx,
    };
  });

  await tx.insert(programMilestones).values(milestoneRecords);
}
