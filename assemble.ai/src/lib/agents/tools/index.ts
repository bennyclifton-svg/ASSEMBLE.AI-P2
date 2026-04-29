/**
 * Side-effect import bundle: importing this module registers all Phase 1
 * read-only tools with the catalog. Specialists reference tools by name in
 * their allowedTools whitelist; the runner resolves through getTool().
 */

import './search-rag';
import './list-cost-lines';
import './list-program';
import './update-cost-line';
import './create-cost-line';
import './record-invoice';

export { getTool, specsFor, type AgentToolDefinition } from './catalog';
export { type ToolContext, assertProjectOrg, CrossTenantAccessError } from './_context';
