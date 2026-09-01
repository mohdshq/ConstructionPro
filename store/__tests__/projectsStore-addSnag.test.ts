import { useProjectsStore } from '../projectsStore';
import { useAuthStore } from '../useAuthStore';
import { powersync } from '@/lib/powersync/system';

jest.mock('@/lib/powersync/system', () => ({
  powersync: {
    getOptional: jest.fn(),
    writeTransaction: jest.fn(async (cb) => {
      const mockTx = { execute: jest.fn() };
      return cb(mockTx);
    }),
    execute: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../lib/supabaseSync', () => ({
  fetchUserProjects: jest.fn(),
  fetchUserReports: jest.fn(),
  fetchUserFolders: jest.fn(),
  fetchUserDrawings: jest.fn(),
  fetchUserCalculations: jest.fn(),
  deleteStorageFile: jest.fn(),
}));

describe('projectsStore - addSnag PowerSync SQLite snag_counter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { id: 'test-user-123', email: 'test@example.com' } as any });
    useProjectsStore.setState({ projects: [] }); // Empty Zustand projects array (fresh install scenario)
  });

  it('reads snag_counter directly from PowerSync SQLite when Zustand projects is empty', async () => {
    (powersync.getOptional as jest.Mock).mockResolvedValueOnce({ snag_counter: 4 });

    const newSeq = await useProjectsStore.getState().addSnag({
      projectId: 'proj-powersync-1',
      description: 'Cracked tile',
      severity: 'minor',
      areaType: 'unit',
      status: 'open',
      photos: [],
    });

    expect(powersync.getOptional).toHaveBeenCalledWith(
      expect.stringContaining('SELECT snag_counter FROM projects WHERE id = ?'),
      ['proj-powersync-1']
    );
    expect(newSeq).toBe(5);
    expect(powersync.writeTransaction).toHaveBeenCalled();
  });

  it('handles snag_counter = null or 0 from PowerSync SQLite resulting in seq = 1', async () => {
    (powersync.getOptional as jest.Mock).mockResolvedValueOnce({ snag_counter: null });

    const newSeq = await useProjectsStore.getState().addSnag({
      projectId: 'proj-powersync-new',
      description: 'First snag',
      severity: 'minor',
      areaType: 'unit',
      status: 'open',
      photos: [],
    });

    expect(newSeq).toBe(1);
  });

  it('falls back to Zustand project if PowerSync query returns null', async () => {
    (powersync.getOptional as jest.Mock).mockResolvedValueOnce(null);

    useProjectsStore.setState({
      projects: [
        {
          id: 'proj-zustand-1',
          name: 'Fallback Project',
          snagCounter: 10,
          location: '',
          client: '',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    const newSeq = await useProjectsStore.getState().addSnag({
      projectId: 'proj-zustand-1',
      description: 'Fallback snag',
      severity: 'major',
      areaType: 'unit',
      status: 'open',
      photos: [],
    });

    expect(newSeq).toBe(11);
  });

  it('returns undefined if project is not found in PowerSync SQLite nor Zustand', async () => {
    (powersync.getOptional as jest.Mock).mockResolvedValueOnce(null);
    useProjectsStore.setState({ projects: [] });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const newSeq = await useProjectsStore.getState().addSnag({
      projectId: 'proj-missing',
      description: 'Missing project snag',
      severity: 'minor',
      areaType: 'unit',
      status: 'open',
      photos: [],
    });

    expect(newSeq).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Project not found for snag');
    consoleErrorSpy.mockRestore();
  });
});
