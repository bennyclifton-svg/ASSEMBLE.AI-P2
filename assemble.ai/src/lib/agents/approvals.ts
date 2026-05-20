/**
 * Compatibility exports for older agent tools.
 *
 * Approval proposal ownership lives in src/lib/actions/proposals. Keep this
 * module as a small bridge until the remaining legacy tools are action-backed.
 */

export {
    moneyDiffLabel,
    proposeApproval,
    type ActionProposalContext,
    type ProposalResult,
    type ProposeApprovalArgs,
} from '@/lib/actions/proposals';
export type { ProposedDiff } from '@/lib/actions/types';
