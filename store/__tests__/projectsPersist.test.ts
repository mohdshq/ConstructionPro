import { partializeProjectsState, migrateProjectsState } from '../projectsStore';

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

describe('projectsStore persistence (B15)', () => {
  it('partializeProjectsState drops projects but keeps other persisted keys', () => {
    const state: any = {
      projects: [{ id: 'p1', photoUri: 'cdbff53b-x/project_cover_1.jpg' }],
      reports: [{ id: 'r1' }],
      folders: [],
      drawings: [],
      calculations: [],
      isSyncing: false,
      syncError: null,
      lastSyncAt: null,
    };

    const result = partializeProjectsState(state);

    expect(result).not.toHaveProperty('projects');
    expect(result.reports).toEqual([{ id: 'r1' }]);
  });

  it('migrateProjectsState removes a stale persisted projects array while keeping other keys', () => {
    const persisted = {
      projects: [{ id: 'p1', photoUri: 'cdbff53b-x/project_cover_1.jpg' }],
      reports: [],
    };

    const result: any = migrateProjectsState(persisted, 0);

    expect(result).not.toHaveProperty('projects');
    expect(result.reports).toEqual([]);
  });

  it('migrateProjectsState does not throw on undefined or null persisted state', () => {
    expect(() => migrateProjectsState(undefined, 0)).not.toThrow();
    expect(() => migrateProjectsState(null, 0)).not.toThrow();
    expect(migrateProjectsState(undefined, 0)).toBeUndefined();
    expect(migrateProjectsState(null, 0)).toBeNull();
  });
});
