import type { BuildingClass, ProjectType } from '@/types/profiler';

export type RiskLevel = 'low' | 'medium' | 'high';

export type ComplexityValue = string | string[];

export interface ProfileState {
  buildingClass: BuildingClass | null;
  projectType: ProjectType | null;
  subclass: string[];
  subclassOther: string[];
  scaleData: Record<string, number>;
  complexity: Record<string, ComplexityValue>;
  workScope: string[];
  riskLevel: RiskLevel | null;
  riskStampedSnapshot: Record<string, ComplexityValue> | null;
  expandedClassOthers: boolean;
  expandedSubclassOthers: boolean;
}

export const initialProfileState: ProfileState = {
  buildingClass: null,
  projectType: null,
  subclass: [],
  subclassOther: [],
  scaleData: {},
  complexity: {},
  workScope: [],
  riskLevel: null,
  riskStampedSnapshot: null,
  expandedClassOthers: false,
  expandedSubclassOthers: false,
};

export type Action =
  | { t: 'SET_CLASS'; v: BuildingClass | null }
  | { t: 'SET_TYPE'; v: ProjectType | null }
  | { t: 'TOGGLE_SUBCLASS'; v: string; max: 1 | 4 }
  | { t: 'SET_SCALE_FIELD'; key: string; v: number | null }
  | { t: 'TOGGLE_COMPLEXITY'; dim: string; v: string; multi: boolean }
  | { t: 'TOGGLE_SCOPE_ITEM'; v: string }
  | { t: 'SET_WORK_SCOPE'; items: string[] }
  | { t: 'TICK_STANDARD_SCOPE'; items: string[] }
  | { t: 'CLEAR_RISK' }
  | { t: 'STAMP_RISK'; level: RiskLevel; complexityPatch: Record<string, ComplexityValue> }
  | { t: 'STAMP_PRESET'; patch: Partial<ProfileState> }
  | { t: 'HYDRATE_FROM_SERVER'; data: Partial<ProfileState> }
  | { t: 'SET_EXPANDED_CLASS_OTHERS'; v: boolean }
  | { t: 'SET_EXPANDED_SUBCLASS_OTHERS'; v: boolean };

export function profilerReducer(state: ProfileState, action: Action): ProfileState {
  switch (action.t) {
    case 'SET_CLASS': {
      if (action.v === state.buildingClass) return state;
      // class change → reset subclass-derived fields
      return {
        ...state,
        buildingClass: action.v,
        subclass: [],
        subclassOther: [],
        scaleData: {},
        complexity: {},
        riskLevel: null,
        riskStampedSnapshot: null,
        workScope: [],
      };
    }
    case 'SET_TYPE': {
      if (action.v === state.projectType) return state;
      return { ...state, projectType: action.v, workScope: [] };
    }
    case 'TOGGLE_SUBCLASS': {
      const { v, max } = action;
      const has = state.subclass.includes(v);
      let next: string[];
      if (has) {
        next = state.subclass.filter((s) => s !== v);
      } else if (state.subclass.length >= max) {
        // single-select: replace; multi-select (mixed, max=4): drop oldest
        next = max === 1 ? [v] : [...state.subclass.slice(1), v];
      } else {
        next = [...state.subclass, v];
      }
      // subclass change clears scale + complexity (matches existing behaviour)
      return { ...state, subclass: next, scaleData: {}, complexity: {}, riskLevel: null, riskStampedSnapshot: null };
    }
    case 'SET_SCALE_FIELD': {
      if (action.v === null || Number.isNaN(action.v)) {
        const next = { ...state.scaleData };
        delete next[action.key];
        return { ...state, scaleData: next };
      }
      return { ...state, scaleData: { ...state.scaleData, [action.key]: action.v } };
    }
    case 'TOGGLE_COMPLEXITY': {
      const { dim, v, multi } = action;
      const current = state.complexity[dim];
      if (multi) {
        const arr: string[] = Array.isArray(current) ? current : current ? [current as string] : [];
        if (arr.includes(v)) {
          const filtered = arr.filter((x) => x !== v);
          const nextC = { ...state.complexity };
          if (filtered.length === 0) delete nextC[dim];
          else nextC[dim] = filtered;
          return { ...state, complexity: nextC };
        }
        return { ...state, complexity: { ...state.complexity, [dim]: [...arr, v] } };
      }
      if (current === v) {
        const nextC = { ...state.complexity };
        delete nextC[dim];
        return { ...state, complexity: nextC };
      }
      return { ...state, complexity: { ...state.complexity, [dim]: v } };
    }
    case 'TOGGLE_SCOPE_ITEM': {
      const has = state.workScope.includes(action.v);
      return {
        ...state,
        workScope: has ? state.workScope.filter((s) => s !== action.v) : [...state.workScope, action.v],
      };
    }
    case 'SET_WORK_SCOPE':
      return { ...state, workScope: action.items };
    case 'TICK_STANDARD_SCOPE': {
      const set = new Set(state.workScope);
      action.items.forEach((i) => set.add(i));
      return { ...state, workScope: Array.from(set) };
    }
    case 'CLEAR_RISK':
      return { ...state, riskLevel: null, riskStampedSnapshot: null };
    case 'STAMP_RISK': {
      const merged = { ...state.complexity, ...action.complexityPatch };
      return {
        ...state,
        complexity: merged,
        riskLevel: action.level,
        riskStampedSnapshot: merged,
      };
    }
    case 'STAMP_PRESET': {
      const next = { ...state, ...action.patch };
      // re-anchor risk snapshot to the patched complexity if risk level was set
      if (action.patch.riskLevel && action.patch.complexity) {
        next.riskStampedSnapshot = action.patch.complexity;
      }
      return next;
    }
    case 'HYDRATE_FROM_SERVER': {
      return {
        ...state,
        ...action.data,
        // never restore UI-only fields from server
        riskLevel: null,
        riskStampedSnapshot: null,
      };
    }
    case 'SET_EXPANDED_CLASS_OTHERS':
      return { ...state, expandedClassOthers: action.v };
    case 'SET_EXPANDED_SUBCLASS_OTHERS':
      return { ...state, expandedSubclassOthers: action.v };
    default:
      return state;
  }
}

export function isRiskModified(state: ProfileState): boolean {
  if (!state.riskStampedSnapshot) return false;
  return JSON.stringify(state.complexity) !== JSON.stringify(state.riskStampedSnapshot);
}
