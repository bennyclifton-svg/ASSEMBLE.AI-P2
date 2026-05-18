/**
 * @jest-environment node
 */

const mockGetCurrentUser = jest.fn();
const mockOrderBy = jest.fn();
const mockWhere = jest.fn(() => ({ orderBy: mockOrderBy }));
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock('@/lib/auth/get-user', () => ({
    getCurrentUser: () => mockGetCurrentUser(),
}));

jest.mock('@/lib/db/index', () => ({
    ...jest.requireActual('@/lib/db/pg-schema'),
    db: {
        select: (...args: unknown[]) => mockSelect(...args),
    },
}));

import { GET } from '../route';

describe('GET /api/projects', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('lists projects using only stable project-list columns', async () => {
        mockGetCurrentUser.mockResolvedValue({
            user: { id: 'user-1', organizationId: 'org-1' },
            status: 200,
        });
        mockOrderBy.mockResolvedValue([
            {
                id: 'project-1',
                name: 'Existing Project',
                code: '',
                status: 'active',
                organizationId: 'org-1',
                projectType: null,
                createdAt: new Date('2026-05-01T00:00:00.000Z'),
                updatedAt: new Date('2026-05-18T00:00:00.000Z'),
            },
        ]);

        const response = await GET();

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual([
            expect.objectContaining({
                id: 'project-1',
                name: 'Existing Project',
            }),
        ]);

        expect(mockSelect).toHaveBeenCalledWith({
            id: expect.anything(),
            name: expect.anything(),
            code: expect.anything(),
            status: expect.anything(),
            organizationId: expect.anything(),
            projectType: expect.anything(),
            createdAt: expect.anything(),
            updatedAt: expect.anything(),
        });
    });
});
