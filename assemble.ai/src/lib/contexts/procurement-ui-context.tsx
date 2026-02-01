/**
 * ProcurementUIContext
 * Persists expanded/collapsed state and active tabs for procurement report sections
 * across tab navigation to preserve user's editing context.
 */

'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Section types that can be expanded
type SectionType = 'rft' | 'trr' | 'addendum' | 'evaluation';

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

interface EvaluationState {
    isExpanded: boolean;
    activeTab: 'price' | 'non-price';
}

// Combined state for a stakeholder
interface StakeholderUIState {
    rft: RFTState;
    trr: TRRState;
    addendum: AddendumState;
    evaluation: EvaluationState;
}

// Default state for a new stakeholder
const defaultStakeholderState: StakeholderUIState = {
    rft: { isExpanded: false, activeRftId: null },
    trr: { isExpanded: false, activeTrrId: null },
    addendum: { isExpanded: false, activeAddendumId: null },
    evaluation: { isExpanded: false, activeTab: 'price' },
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

    // Evaluation section
    getEvaluationState: (stakeholderId: string) => EvaluationState;
    setEvaluationExpanded: (stakeholderId: string, expanded: boolean) => void;
    setEvaluationActiveTab: (stakeholderId: string, tab: 'price' | 'non-price') => void;
}

const ProcurementUIContext = createContext<ProcurementUIContextValue | null>(null);

export function ProcurementUIProvider({ children }: { children: ReactNode }) {
    // Map of stakeholder ID to their UI state
    const [stateMap, setStateMap] = useState<Record<string, StakeholderUIState>>({});

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

    // Evaluation section methods
    const getEvaluationState = useCallback((stakeholderId: string): EvaluationState => {
        return getStakeholderState(stakeholderId).evaluation;
    }, [getStakeholderState]);

    const setEvaluationExpanded = useCallback((stakeholderId: string, expanded: boolean) => {
        updateStakeholderState(stakeholderId, prev => ({
            ...prev,
            evaluation: { ...prev.evaluation, isExpanded: expanded },
        }));
    }, [updateStakeholderState]);

    const setEvaluationActiveTab = useCallback((stakeholderId: string, tab: 'price' | 'non-price') => {
        updateStakeholderState(stakeholderId, prev => ({
            ...prev,
            evaluation: { ...prev.evaluation, activeTab: tab },
        }));
    }, [updateStakeholderState]);

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
        getEvaluationState,
        setEvaluationExpanded,
        setEvaluationActiveTab,
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

export function useEvaluationSectionUI(stakeholderId: string | undefined) {
    const ctx = useProcurementUI();
    const id = stakeholderId || '';
    const state = ctx.getEvaluationState(id);

    return {
        isExpanded: state.isExpanded,
        activeTab: state.activeTab,
        setExpanded: (expanded: boolean) => ctx.setEvaluationExpanded(id, expanded),
        setActiveTab: (tab: 'price' | 'non-price') => ctx.setEvaluationActiveTab(id, tab),
    };
}
