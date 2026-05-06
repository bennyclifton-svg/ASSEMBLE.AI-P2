import {
    buildDocumentTextSearchTerms,
    buildDocumentTextSearchVariants,
} from '../document-search';

describe('document text search helpers', () => {
    it('builds a singular variant so "stairs" can match "Stair"', () => {
        expect(buildDocumentTextSearchTerms('stairs')).toEqual(['stairs', 'stair']);
    });

    it('builds combined drawing-number and title variants', () => {
        expect(buildDocumentTextSearchVariants('cc-23 Details - Stair 1 & 3')).toEqual([
            'cc-23 Details - Stair 1 & 3',
            'cc23detailsstair13',
        ]);
    });
});
