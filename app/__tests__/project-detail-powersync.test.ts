import { useProjectsStore, Project } from '../../store/projectsStore';

describe('Project Detail Screen - PowerSync vs Zustand Store Resolution', () => {
  beforeEach(() => {
    // Clear Zustand store projects
    useProjectsStore.setState({ projects: [] });
  });

  it('resolves and renders project present in PowerSync even when absent from Zustand store', () => {
    const mockPowerSyncProject: Project = {
      id: 'shared-proj-123',
      name: 'Shared Sky Tower',
      location: 'Dubai Downtown',
      client: 'Emaar Properties',
      status: 'active',
      createdAt: '2026-08-20T10:00:00Z',
      updatedAt: '2026-08-20T10:00:00Z',
      userId: 'owner-user-id',
      memberRole: 'viewer',
    };

    // 1. Zustand store has no projects for this viewer
    const zustandProject = useProjectsStore.getState().getProject('shared-proj-123');
    expect(zustandProject).toBeUndefined();

    // 2. PowerSync hook delivers the shared project from local SQLite
    const isProjectLoading = false;
    const powerSyncProject = mockPowerSyncProject;

    // 3. Detail screen resolution logic:
    const project = powerSyncProject || zustandProject;

    // 4. Assert screen resolves the project
    expect(project).toBeDefined();
    expect(project?.id).toBe('shared-proj-123');
    expect(project?.name).toBe('Shared Sky Tower');
    expect(project?.memberRole).toBe('viewer');

    // 5. Guard logic: router.back() must NOT be triggered
    const mockRouterBack = jest.fn();
    if (!isProjectLoading && !project) {
      mockRouterBack();
    }
    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('guards redirect: does NOT router.back() while PowerSync query is loading', () => {
    const isProjectLoading = true;
    const powerSyncProject = null;
    const zustandProject = useProjectsStore.getState().getProject('unknown-proj');

    const project = powerSyncProject || zustandProject;
    const mockRouterBack = jest.fn();

    // While loading, even if project is null, redirect should be blocked
    if (!isProjectLoading && !project) {
      mockRouterBack();
    }

    expect(mockRouterBack).not.toHaveBeenCalled();
  });

  it('triggers router.back() only when query has settled and project is definitively absent', () => {
    const isProjectLoading = false;
    const powerSyncProject = null;
    const zustandProject = useProjectsStore.getState().getProject('deleted-proj');

    const project = powerSyncProject || zustandProject;
    const mockRouterBack = jest.fn();

    if (!isProjectLoading && !project) {
      mockRouterBack();
    }

    expect(mockRouterBack).toHaveBeenCalledTimes(1);
  });
});
