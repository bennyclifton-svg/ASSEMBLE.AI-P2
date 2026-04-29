/**
 * Admin Audit Log
 *
 * Append-only logger for super-admin actions. Writes to admin_audit_log table.
 * Never throws — audit failures are logged but don't block the underlying action,
 * since losing the action because audit DB had a hiccup is worse than losing the log.
 */

import { randomUUID } from 'crypto';
import { db } from '@/lib/db';
import { adminAuditLog } from '@/lib/db/auth-schema';

export interface AuditEntry {
    actorUserId: string;
    action: string;            // e.g. 'user.suspend', 'user.reset_password', 'model.update'
    targetType: string;        // e.g. 'user', 'model_settings'
    targetId?: string | null;
    before?: unknown;
    after?: unknown;
}

export async function recordAdminAction(entry: AuditEntry): Promise<void> {
    try {
        await db.insert(adminAuditLog).values({
            id: randomUUID(),
            actorUserId: entry.actorUserId,
            action: entry.action,
            targetType: entry.targetType,
            targetId: entry.targetId ?? null,
            beforeJson: entry.before ?? null,
            afterJson: entry.after ?? null,
        });
    } catch (err) {
        console.error('[admin-audit] Failed to record action:', entry.action, err);
    }
}
