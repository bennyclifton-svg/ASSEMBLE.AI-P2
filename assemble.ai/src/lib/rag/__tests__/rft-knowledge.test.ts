import { resolveDomainTagsFromText } from '@/lib/constants/knowledge-domains';
import {
    PROJECT_KNOWLEDGE_SET_NAMES,
    resolveRftKnowledgeTags,
} from '../rft-knowledge';

describe('RFT knowledge retrieval helpers', () => {
    it('recognises both historical project knowledge set names', () => {
        expect(PROJECT_KNOWLEDGE_SET_NAMES).toEqual(['Knowledge', 'Ingest']);
    });

    it('broadens structural RFT tags beyond the single discipline', () => {
        expect(
            resolveRftKnowledgeTags({
                contextName: 'Structural Engineer',
                fieldType: 'brief.service',
                profile: {
                    buildingClass: 'commercial',
                    projectType: 'new',
                },
            })
        ).toEqual(
            expect.arrayContaining([
                'structural',
                'procurement',
                'tendering',
                'contracts',
                'construction',
                'commercial',
                'as-standards',
            ])
        );
    });

    it('maps regulatory consultants to useful multi-domain tags', () => {
        expect(resolveDomainTagsFromText('BCA Consultant')).toEqual([
            'ncc',
            'regulatory',
            'as-standards',
        ]);
        expect(resolveDomainTagsFromText('Town Planner')).toEqual([
            'regulatory',
            'procurement',
        ]);
    });

    it('maps common commercial and site consultants to fallback domains', () => {
        expect(resolveDomainTagsFromText('Quantity Surveyor')).toEqual([
            'cost-management',
            'procurement',
        ]);
        expect(resolveDomainTagsFromText('Geotechnical Engineer')).toEqual([
            'civil',
            'environmental',
        ]);
    });

    it('resolves domain tags from longer real-world stakeholder labels', () => {
        expect(resolveDomainTagsFromText('Lead Structural Engineer')).toEqual(
            expect.arrayContaining(['structural'])
        );
        expect(resolveDomainTagsFromText('BCA / Access Compliance Consultant')).toEqual(
            expect.arrayContaining(['ncc', 'regulatory', 'as-standards'])
        );
        expect(resolveDomainTagsFromText('Civil and Traffic Consultant')).toEqual(
            expect.arrayContaining(['civil', 'regulatory'])
        );
    });
});
