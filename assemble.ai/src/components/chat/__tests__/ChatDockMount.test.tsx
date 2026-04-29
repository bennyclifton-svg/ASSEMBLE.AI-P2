/**
 * ChatDockMount — confirms the dock only appears on per-project routes.
 *
 * The dock is scoped to a single project, so it must NOT render on
 * /admin/*, /dashboard, /projects (list), /projects/new, or unauthed pages.
 */

import { render } from '@testing-library/react';

const mockUsePathname = jest.fn();
jest.mock('next/navigation', () => ({
    usePathname: () => mockUsePathname(),
}));

// Stub the actual ChatDock so this test focuses on the routing decision.
// (Otherwise it would try to mount EventSource etc.)
jest.mock('../ChatDock', () => ({
    ChatDock: ({ projectId }: { projectId: string }) => (
        <div data-testid="chat-dock-stub">project={projectId}</div>
    ),
}));

import { ChatDockMount } from '../ChatDockMount';

describe('ChatDockMount route detection', () => {
    it('renders the dock on /projects/[projectId]', () => {
        mockUsePathname.mockReturnValue('/projects/abc-123');
        const { queryByTestId } = render(<ChatDockMount />);
        const node = queryByTestId('chat-dock-stub');
        expect(node).not.toBeNull();
        expect(node?.textContent).toContain('project=abc-123');
    });

    it('renders on a project sub-route (/projects/[id]/cost-plan)', () => {
        mockUsePathname.mockReturnValue('/projects/abc-123/cost-plan');
        const { queryByTestId } = render(<ChatDockMount />);
        expect(queryByTestId('chat-dock-stub')).not.toBeNull();
    });

    it('does NOT render on /projects (the list page)', () => {
        mockUsePathname.mockReturnValue('/projects');
        const { queryByTestId } = render(<ChatDockMount />);
        expect(queryByTestId('chat-dock-stub')).toBeNull();
    });

    it('does NOT render on /projects/new', () => {
        mockUsePathname.mockReturnValue('/projects/new');
        const { queryByTestId } = render(<ChatDockMount />);
        expect(queryByTestId('chat-dock-stub')).toBeNull();
    });

    it('does NOT render on /admin/users', () => {
        mockUsePathname.mockReturnValue('/admin/users');
        const { queryByTestId } = render(<ChatDockMount />);
        expect(queryByTestId('chat-dock-stub')).toBeNull();
    });

    it('does NOT render on /dashboard', () => {
        mockUsePathname.mockReturnValue('/dashboard');
        const { queryByTestId } = render(<ChatDockMount />);
        expect(queryByTestId('chat-dock-stub')).toBeNull();
    });

    it('does NOT render on /', () => {
        mockUsePathname.mockReturnValue('/');
        const { queryByTestId } = render(<ChatDockMount />);
        expect(queryByTestId('chat-dock-stub')).toBeNull();
    });

    it('does NOT render when pathname is null', () => {
        mockUsePathname.mockReturnValue(null);
        const { queryByTestId } = render(<ChatDockMount />);
        expect(queryByTestId('chat-dock-stub')).toBeNull();
    });
});
