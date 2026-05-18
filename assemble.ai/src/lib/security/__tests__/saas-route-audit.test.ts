import fs from 'fs';
import path from 'path';

describe('SaaS API route audit', () => {
    it('records the required public SaaS API families and exemptions', () => {
        const auditPath = path.join(process.cwd(), 'docs/security/saas-api-route-audit.md');
        const audit = fs.readFileSync(auditPath, 'utf8');

        expect(audit).toContain('## Project Routes');
        expect(audit).toContain('## Upload Routes');
        expect(audit).toContain('## Export And Download Routes');
        expect(audit).toContain('## AI And Workflow Routes');
        expect(audit).toContain('## Billing Routes');
        expect(audit).toContain('## Admin Routes');
        expect(audit).toContain('## Explicit Public Or Non-Project Routes');
        expect(audit).toContain('/api/admin/products');
        expect(audit).toContain('/api/assessment-waitlist');
    });
});
