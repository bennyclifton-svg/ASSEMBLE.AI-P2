export const TENDER_FIRMS_ADDED_EVENT = 'assemble:tender-firms-added';

export interface TenderFirmsAddedDetail {
    projectId: string;
    firmType: 'consultant' | 'contractor';
    disciplineOrTrade: string;
    firmIds: string[];
}

export function dispatchTenderFirmsAdded(detail: TenderFirmsAddedDetail): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent<TenderFirmsAddedDetail>(TENDER_FIRMS_ADDED_EVENT, { detail }));
}
