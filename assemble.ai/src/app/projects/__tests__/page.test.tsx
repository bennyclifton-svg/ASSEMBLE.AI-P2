import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import ProjectsIndexPage from '../page';

const mockReplace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

describe('ProjectsIndexPage', () => {
  const mockFetch = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
  });

  it('opens an existing project without showing the retired empty-state shell', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [{ id: 'project-1', name: 'Existing Project', code: '', status: 'active' }],
    });

    render(<ProjectsIndexPage />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/projects/project-1');
    });
    expect(screen.queryByText(/Create a new project using the project switcher/i)).not.toBeInTheDocument();
  });

  it('creates the first project and opens the real project workspace', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-project-1', name: 'New Project - 18 May 2026', code: '', status: 'active' }),
      });

    render(<ProjectsIndexPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/projects',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"name":"New Project - '),
        })
      );
      expect(mockReplace).toHaveBeenCalledWith('/projects/new-project-1');
    });
    expect(screen.queryByText(/Create a new project using the project switcher/i)).not.toBeInTheDocument();
  });

  it('does not create duplicate first projects if React remounts the route', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-project-1', name: 'New Project - 18 May 2026', code: '', status: 'active' }),
      });

    render(
      <StrictMode>
        <ProjectsIndexPage />
      </StrictMode>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/projects/new-project-1');
    });

    const createCalls = mockFetch.mock.calls.filter(([, init]) => {
      return typeof init === 'object' && init !== null && 'method' in init && init.method === 'POST';
    });
    expect(createCalls).toHaveLength(1);
  });
});
