/**
 * Grant Super-Admin
 *
 * Flips the is_super_admin flag on a user account.
 * No UI for this — granting super-admin is a deliberate manual action.
 *
 * Usage:
 *   tsx scripts/grant-super-admin.ts <email>
 *   tsx scripts/grant-super-admin.ts bennyclifton@gmail.com
 *
 * Revoke:
 *   tsx scripts/grant-super-admin.ts <email> --revoke
 */

import 'dotenv/config';
import { Pool } from 'pg';

async function main() {
    const args = process.argv.slice(2);
    const email = args.find((a) => !a.startsWith('--'));
    const revoke = args.includes('--revoke');

    if (!email) {
        console.error('Usage: tsx scripts/grant-super-admin.ts <email> [--revoke]');
        process.exit(1);
    }

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
        const lookup = await pool.query<{ id: string; email: string; is_super_admin: boolean }>(
            'SELECT id, email, is_super_admin FROM "user" WHERE email = $1',
            [email]
        );

        if (lookup.rowCount === 0) {
            console.error(`No user found with email: ${email}`);
            process.exit(1);
        }

        const before = lookup.rows[0];
        const newValue = !revoke;

        if (before.is_super_admin === newValue) {
            console.log(`User ${email} is already ${newValue ? 'a super-admin' : 'not a super-admin'}. Nothing to do.`);
            return;
        }

        await pool.query(
            'UPDATE "user" SET is_super_admin = $1, updated_at = NOW() WHERE id = $2',
            [newValue, before.id]
        );

        console.log(`${revoke ? 'Revoked super-admin from' : 'Granted super-admin to'} ${email} (id: ${before.id})`);
    } catch (err) {
        console.error('Failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

main();
