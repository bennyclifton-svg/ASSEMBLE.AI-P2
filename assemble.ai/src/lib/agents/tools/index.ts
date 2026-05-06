/**
 * Side-effect import bundle: importing this module registers all Phase 1
 * read-only tools with the catalog. Specialists reference tools by name in
 * their allowedTools whitelist; the runner resolves through getTool().
 */

import './search-rag';
import './search-knowledge-library';
import './list-cost-lines';
import './list-invoices';
import './list-program';
import './list-notes';
import './list-risks';
import './list-variations';
import './list-stakeholders';
import './list-meetings';
import './list-reports';
import './list-project-documents';
import './list-project-objectives';
import './list-addenda';
import './select-project-documents';
import './create-meeting';
import './create-cost-line';
import './record-invoice';
import './create-risk';
import './update-risk';
import './update-variation';
import './update-stakeholder';
import './start-issue-variation-workflow';
import './action-tools';

export { getTool, specsFor, type AgentToolDefinition } from './catalog';
export { type ToolContext, assertProjectOrg, CrossTenantAccessError } from './_context';
