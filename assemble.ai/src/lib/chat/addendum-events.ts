export const ADDENDUM_CREATED_EVENT = 'assemble:addendum-created';

export interface AddendumCreatedDetail {
    projectId: string;
    stakeholderId: string;
    addendumId: string;
}

export function dispatchAddendumCreated(detail: AddendumCreatedDetail): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent<AddendumCreatedDetail>(ADDENDUM_CREATED_EVENT, {
            detail,
        })
    );
}
