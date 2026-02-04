/**
 * ProcurementUIContext
 * Persists expanded/collapsed state and active tabs for procurement report sections
 * across tab navigation to preserve user's editing context.
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Section types that can be expanded
type SectionType = 'rft' | 'trr' | 'addendum' | 'evaluationPrice' | 'evaluationNonPrice' | 'notes' | 'meetings' | 'reports';

// State for each section type
interface RFTState {
    isExpanded: boolean;
    activeRftId: string | null;
}

interface TRRState {
    isExpanded: boolean;
    activeTrrId: string | null;
}

interface AddendumState {
    isExpanded: boolean;
    activeAddendumId: string | null;
}

interface EvaluationPriceState {
    isExpanded: boolean;
    activeEvaluationPriceId: string | null;
}

interface EvaluationNonPriceState {
    isExpanded: boolean;
}

// Notes, Meetings, Reports state (keyed by projectId)
interface NotesState {
    isExpanded: boolean;
    isMenuExpanded: boolean;
    activeNoteId: string | null;
}

interface MeetingsState {
    isExpanded: boolean;
    isMenuExpanded: boolean;
    activeMeetingId: string | null;
}

interface ReportsState {
    isExpanded: boolean;
    isMenuExpanded: boolean;
    activeReportId: string | null;
}

// Combined state for Notes/Meetings/Reports (keyed by projectId)
interface ProjectUIState {
    notes: NotesState;
    meetings: MeetingsState;
    reports: ReportsState;
}

// Default state for a new project
const defaultProjectUIState: ProjectUIState = {
    notes: { isExpanded: false, isMenuExpanded: false, activeNoteId: null },
    meetings: { isExpanded: false, isMenuExpanded: false, activeMeetingId: null },
    reports: { isExpanded: false, isMenuExpanded: false, activeReportId: null },
};

// Combined state for a stakeholder
interface StakeholderUIState {
    rft: RFTState;
    trr: TRRState;
    addendum: AddendumState;
    evaluationPrice: EvaluationPriceState;
    evaluationNonPrice: EvaluationNonPriceState;
}

// Default state for a new stakeholder
const defaultStakeholderState: StakeholderUIState = {
    rft: { isExpanded: false, activeRftId: null },
    trr: { isExpanded: false, activeTrrId: null },
    addendum: { isExpanded: false, activeAddendumId: null },
    evaluationPrice: { isExpanded: false, activeEvaluationPriceId: null },
    evaluationNonPrice: { isExpanded: false },
};

// Context value type
interface ProcurementUIContextValue {
    // RFT section
    getRFTState: (stakeholderId: string) => RFTState;
    setRFTExpanded: (stakeholderId: string, expanded: boolean) => void;
    setRFTActiveId: (stakeholderId: string, id: string | null) => void;

    // TRR section
    getTRRState: (stakeholderId: string) => TRRState;
    setTRRExpanded: (stakeholderId: string, expanded: boolean) => void;
    setTRRActiveId: (stakeholderId: string, id: string | null) => void;

    // Addendum section
    getAddendumState: (stakeholderId: string) => AddendumState;
    setAddendumExpanded: (stakeholderId: string, expanded: boolean) => void;
    setAddendumActiveId: (stakeholderId: string, id: string | null) => void;

    // Evaluation Price section (multi-instance with tabs)
    getEvaluationPriceState: (stakeholderId: string) => EvaluationPriceState;
    setEvaluationPriceExpanded: (stakeholderId: string, expanded: boolean) => void;
    setEvaluationPriceActiveId: (stakeholderId: string, id: string | null) => void;

    // Evaluation Non-Price section (single instance)
    getEvaluationNonPriceState: (stakeholderId: string) => EvaluationNonPriceState;
    setEvaluationNonPriceExpanded: (stakeholderId: string, expanded: boolean) => void;

    // Notes section (keyed by projectId)
    getNotesState: (projectId: string) => NotesState;
    setNotesExpanded: (projectId: string, expanded: boolean) => void;
    setNotesMenuExpanded: (projectId: string, expanded: boolean) => void;
    setNotesActiveId: (projectId: string, id: string | null) => void;

    // Meetings section (keyed by projectId)
    getMeetingsState: (projectId: string) => MeetingsState;
    setMeetingsExpanded: (projectId: string, expanded: boolean) => void;
    setMeetingsMenuExpanded: (projectId: string, expanded: boolean) => void;
    setMeetingsActiveId: (projectId: string, id: string | null) => void;

    // Reports section (keyed by projectId)
    getReportsState: (projectId: string) => ReportsState;
    setReportsExpanded: (projectId: string, expanded: boolean) => void;
    setReportsMenuExpanded: (projectId: string, expanded: boolean) => void;
    setReportsActiveId: (projectId: string, id: string | null) => void;
}

const ProcurementUIContext = createContext<ProcurementUIContextValue | null>(null);

export function ProcurementUIProvider({ children }: { children: ReactNode }) {
    // Map of stakeholder ID to their UI state
    const [stateMap, setStateMap] = useState<Record<string, StakeholderUIState>>({});

    // Map of project ID to Notes/Meetings/Reports UI state
    const [projectStateMap, setProjectStateMap] = useState<Record<string, ProjectUIState>>({});

    // Helper to get state for a stakeholder, returning defaults if not set
    const getStakeholderState = useCallback((stakeholderId: string): StakeholderUIState => {
        return stateMap[stakeholderId] || defaultStakeholderState;
    }, [stateMap]);

    // Helper to update state for a stakeholder
    const updateStakeholderState = useCallback((
        stakeholderId: string,
        updater: (prev: StakeholderUIState) => StakeholderUIState
    ) => {
        setStateMap(prev => ({
            ...prev,
            [stakeholderId]: updater(prev[stakeholderId] || defaultStakeholderState),
        }));
    }, []);

    // RFT section methods
    const getRFTState = useCallback((stakeholderId: string): RFTState => {
        return getStakeholderState(stakeholderId).rft;
    }, [getStakeholderState]);

    const setRFTExpanded = useCallback((stakeholderId: string, expanded: boolean) => {
        updateStakeholderState(stakeholderId, prev => ({
            ...prev,
            rft: { ...prev.rft, isExpanded: expanded },
        }));
    }, [updateStakeholderState]);

    const setRFTActiveId = useCallback((stakeholderId: string, id: string | null) => {
        updateStakeholderState(stakeholderId, prev => ({
            ...prev,
            rft: { ...prev.rft, activeRftId: id },
        }));
    }, [updateStakeholderState]);

    // TRR section methods
    const getTRRState = useCallback((stakeholderId: string): TRRState => {
        return getStakeholderState(stakeholderId).trr;
    }, [getStakeholderState]);

    const setTRRExpanded = useCallback((stakeholderId: string, expanded: boolean) => {
        updateStakeholderState(stakeholderId, prev => ({
            ...prev,
            trr: { ...prev.trr, isExpanded: expanded },
        }));
    }, [updateStakeholderState]);

    const setTRRActiveId = useCallback((stakeholderId: string, id: string | null) => {
        updateStakeholderState(stakeholderId, prev => ({
            ...prev,
            trr: { ...prev.trr, activeTrrId: id },
        }));
    }, [updateStakeholderState]);

    // Addendum section methods
    const getAddendumState = useCallback((stakeholderId: string): AddendumState => {
        return getStakeholderState(stakeholderId).addendum;
    }, [getStakeholderState]);

    const setAddendumExpanded = useCallback((stakeholderId: string, expanded: boolean) => {
        updateStakeholderState(stakeholderId, prev => ({
            ...prev,
            addendum: { ...prev.addendum, isExpanded: expanded },
        }));
    }, [updateStakeholderState]);

    const setAddendumActiveId = useCallback((stakeholderId: string, id: string | null) => {
        updateStakeholderState(stakeholderId, prev => ({
            ...prev,
            addendum: { ...prev.addendum, activeAddendumId: id },
        }));
    }, [updateStakeholderState]);

    // Evaluation Price section methods (multi-instance with tabs)
    const getEvaluationPriceState = useCallback((stakeholderId: string): EvaluationPriceState => {
        return getStakeholderState(stakeholderId).evaluationPrice;
    }, [getStakeholderState]);

    const setEvaluationPriceExpanded = useCallback((stakeholderId: string, expanded: boolean) => {
        updateStakeholderState(stakeholderId, prev => ({
            ...prev,
            evaluationPrice: { ...prev.evaluationPrice, isExpanded: expanded },
        }));
    }, [updateStakeholderState]);

    const setEvaluationPriceActiveId = useCallback((stakeholderId: string, id: string | null) => {
        updateStakeholderState(stakeholderId, prev => ({
            ...prev,
            evaluationPrice: { ...prev.evaluationPrice, activeEvaluationPriceId: id },
        }));
    }, [updateStakeholderState]);

    // Evaluation Non-Price section methods (single instance)
    const getEvaluationNonPriceState = useCallback((stakeholderId: string): EvaluationNonPriceState => {
        return getStakeholderState(stakeholderId).evaluationNonPrice;
    }, [getStakeholderState]);

    const setEvaluationNonPriceExpanded = useCallback((stakeholderId: string, expanded: boolean) => {
        updateStakeholderState(stakeholderId, prev => ({
            ...prev,
            evaluationNonPrice: { ...prev.evaluationNonPrice, isExpanded: expanded },
        }));
    }, [updateStakeholderState]);

    // Helper to get project state, returning defaults if not set
    const getProjectState = useCallback((projectId: string): ProjectUIState => {
        return projectStateMap[projectId] || defaultProjectUIState;
    }, [projectStateMap]);

    // Helper to update project state
    const updateProjectState = useCallback((
        projectId: string,
        updater: (prev: ProjectUIState) => ProjectUIState
    ) => {
        setProjectStateMap(prev => ({
            ...prev,
            [projectId]: updater(prev[projectId] || defaultProjectUIState),
        }));
    }, []);

    // Notes section methods
    const getNotesState = useCallback((projectId: string): NotesState => {
        return getProjectState(projectId).notes;
    }, [getProjectState]);

    const setNotesExpanded = useCallback((projectId: string, expanded: boolean) => {
        updateProjectState(projectId, prev => ({
            ...prev,
            notes: { ...prev.notes, isExpanded: expanded },
        }));
    }, [updateProjectState]);

    const setNotesMenuExpanded = useCallback((projectId: string, expanded: boolean) => {
        updateProjectState(projectId, prev => ({
            ...prev,
            notes: { ...prev.notes, isMenuExpanded: expanded },
        }));
    }, [updateProjectState]);

    const setNotesActiveId = useCallback((projectId: string, id: string | null) => {
        updateProjectState(projectId, prev => ({
            ...prev,
            notes: { ...prev.notes, activeNoteId: id },
        }));
    }, [updateProjectState]);

    // Meetings section methods
    const getMeetingsState = useCallback((projectId: string): MeetingsState => {
        return getProjectState(projectId).meetings;
    }, [getProjectState]);

    const setMeetingsExpanded = useCallback((projectId: string, expanded: boolean) => {
        updateProjectState(projectId, prev => ({
            ...prev,
            meetings: { ...prev.meetings, isExpanded: expanded },
        }));
    }, [updateProjectState]);

    const setMeetingsMenuExpanded = useCallback((projectId: string, expanded: boolean) => {
        updateProjectState(projectId, prev => ({
            ...prev,
            meetings: { ...prev.meetings, isMenuExpanded: expanded },
        }));
    }, [updateProjectState]);

    const setMeetingsActiveId = useCallback((projectId: string, id: string | null) => {
        updateProjectState(projectId, prev => ({
            ...prev,
            meetings: { ...prev.meetings, activeMeetingId: id },
        }));
    }, [updateProjectState]);

    // Reports section methods
    const getReportsState = useCallback((projectId: string): ReportsState => {
        return getProjectState(projectId).reports;
    }, [getProjectState]);

    const setReportsExpanded = useCallback((projectId: string, expanded: boolean) => {
        updateProjectState(projectId, prev => ({
            ...prev,
            reports: { ...prev.reports, isExpanded: expanded },
        }));
    }, [updateProjectState]);

    const setReportsMenuExpanded = useCallback((projectId: string, expanded: boolean) => {
        updateProjectState(projectId, prev => ({
            ...prev,
            reports: { ...prev.reports, isMenuExpanded: expanded },
        }));
    }, [updateProjectState]);

    const setReportsActiveId = useCallback((projectId: string, id: string | null) => {
        updateProjectState(projectId, prev => ({
            ...prev,
            reports: { ...prev.reports, activeReportId: id },
        }));
    }, [updateProjectState]);

    const value: ProcurementUIContextValue = {
        getRFTState,
        setRFTExpanded,
        setRFTActiveId,
        getTRRState,
        setTRRExpanded,
        setTRRActiveId,
        getAddendumState,
        setAddendumExpanded,
        setAddendumActiveId,
        getEvaluationPriceState,
        setEvaluationPriceExpanded,
        setEvaluationPriceActiveId,
        getEvaluationNonPriceState,
        setEvaluationNonPriceExpanded,
        // Notes, Meetings, Reports
        getNotesState,
        setNotesExpanded,
        setNotesMenuExpanded,
        setNotesActiveId,
        getMeetingsState,
        setMeetingsExpanded,
        setMeetingsMenuExpanded,
        setMeetingsActiveId,
        getReportsState,
        setReportsExpanded,
        setReportsMenuExpanded,
        setReportsActiveId,
    };

    return (
        <ProcurementUIContext.Provider value={value}>
            {children}
        </ProcurementUIContext.Provider>
    );
}

export function useProcurementUI() {
    const context = useContext(ProcurementUIContext);
    if (!context) {
        throw new Error('useProcurementUI must be used within a ProcurementUIProvider');
    }
    return context;
}

// Convenience hooks for each section type
export function useRFTSectionUI(stakeholderId: string | undefined) {
    const ctx = useProcurementUI();
    const id = stakeholderId || '';
    const state = ctx.getRFTState(id);

    return {
        isExpanded: state.isExpanded,
        activeRftId: state.activeRftId,
        setExpanded: (expanded: boolean) => ctx.setRFTExpanded(id, expanded),
        setActiveRftId: (rftId: string | null) => ctx.setRFTActiveId(id, rftId),
    };
}

export function useTRRSectionUI(stakeholderId: string | undefined) {
    const ctx = useProcurementUI();
    const id = stakeholderId || '';
    const state = ctx.getTRRState(id);

    return {
        isExpanded: state.isExpanded,
        activeTrrId: state.activeTrrId,
        setExpanded: (expanded: boolean) => ctx.setTRRExpanded(id, expanded),
        setActiveTrrId: (trrId: string | null) => ctx.setTRRActiveId(id, trrId),
    };
}

export function useAddendumSectionUI(stakeholderId: string | undefined) {
    const ctx = useProcurementUI();
    const id = stakeholderId || '';
    const state = ctx.getAddendumState(id);

    return {
        isExpanded: state.isExpanded,
        activeAddendumId: state.activeAddendumId,
        setExpanded: (expanded: boolean) => ctx.setAddendumExpanded(id, expanded),
        setActiveAddendumId: (addendumId: string | null) => ctx.setAddendumActiveId(id, addendumId),
    };
}

export function useEvaluationPriceSectionUI(stakeholderId: string | undefined) {
    const ctx = useProcurementUI();
    const id = stakeholderId || '';
    const state = ctx.getEvaluationPriceState(id);

    return {
        isExpanded: state.isExpanded,
        activeEvaluationPriceId: state.activeEvaluationPriceId,
        setExpanded: (expanded: boolean) => ctx.setEvaluationPriceExpanded(id, expanded),
        setActiveEvaluationPriceId: (evalPriceId: string | null) => ctx.setEvaluationPriceActiveId(id, evalPriceId),
    };
}

export function useEvaluationNonPriceSectionUI(stakeholderId: string | undefined) {
    const ctx = useProcurementUI();
    const id = stakeholderId || '';
    const state = ctx.getEvaluationNonPriceState(id);

    return {
        isExpanded: state.isExpanded,
        setExpanded: (expanded: boolean) => ctx.setEvaluationNonPriceExpanded(id, expanded),
    };
}

/**
 * @deprecated Use useEvaluationPriceSectionUI or useEvaluationNonPriceSectionUI instead.
 * This hook is maintained for backward compatibility with the legacy EvaluationSection component.
 */
export function useEvaluationSectionUI(stakeholderId: string | undefined) {
    const ctx = useProcurementUI();
    const id = stakeholderId || '';
    const priceState = ctx.getEvaluationPriceState(id);
    const nonPriceState = ctx.getEvaluationNonPriceState(id);

    // Track which tab is active using a simple state-like approach
    // Default to 'price' tab, stored as part of the price state expansion
    const [activeTab, setActiveTabState] = useState<'price' | 'non-price'>('price');

    // Combined expanded state - expand if either section was expanded
    const isExpanded = priceState.isExpanded || nonPriceState.isExpanded;

    return {
        isExpanded,
        activeTab,
        setExpanded: (expanded: boolean) => {
            ctx.setEvaluationPriceExpanded(id, expanded);
            ctx.setEvaluationNonPriceExpanded(id, expanded);
        },
        setActiveTab: (tab: 'price' | 'non-price') => {
            setActiveTabState(tab);
        },
    };
}

// Convenience hooks for Notes, Meetings, Reports sections
export function useNotesSectionUI(projectId: string | undefined) {
    const ctx = useProcurementUI();
    const id = projectId || '';
    const state = ctx.getNotesState(id);

    return {
        isExpanded: state.isExpanded,
        isMenuExpanded: state.isMenuExpanded,
        activeNoteId: state.activeNoteId,
        setExpanded: (expanded: boolean) => ctx.setNotesExpanded(id, expanded),
        setMenuExpanded: (expanded: boolean) => ctx.setNotesMenuExpanded(id, expanded),
        setActiveNoteId: (noteId: string | null) => ctx.setNotesActiveId(id, noteId),
    };
}

export function useMeetingsSectionUI(projectId: string | undefined) {
    const ctx = useProcurementUI();
    const id = projectId || '';
    const state = ctx.getMeetingsState(id);

    return {
        isExpanded: state.isExpanded,
        isMenuExpanded: state.isMenuExpanded,
        activeMeetingId: state.activeMeetingId,
        setExpanded: (expanded: boolean) => ctx.setMeetingsExpanded(id, expanded),
        setMenuExpanded: (expanded: boolean) => ctx.setMeetingsMenuExpanded(id, expanded),
        setActiveMeetingId: (meetingId: string | null) => ctx.setMeetingsActiveId(id, meetingId),
    };
}

export function useReportsSectionUI(projectId: string | undefined) {
    const ctx = useProcurementUI();
    const id = projectId || '';
    const state = ctx.getReportsState(id);

    return {
        isExpanded: state.isExpanded,
        isMenuExpanded: state.isMenuExpanded,
        activeReportId: state.activeReportId,
        setExpanded: (expanded: boolean) => ctx.setReportsExpanded(id, expanded),
        setMenuExpanded: (expanded: boolean) => ctx.setReportsMenuExpanded(id, expanded),
        setActiveReportId: (reportId: string | null) => ctx.setReportsActiveId(id, reportId),
    };
}
