import { useProjectsStore } from '../../store/projectsStore';
import { Project } from '../../store/projectsStore';

// Mock dependencies
jest.mock('../../store/useAuthStore', () => ({
    useAuthStore: {
        getState: () => ({ user: { id: 'test-user-id' } })
    }
}));

const mockExecute = jest.fn();
const mockWriteTransaction = jest.fn(async (cb) => {
    return cb({ execute: mockExecute });
});

jest.mock('../../lib/powersync/Connector', () => ({
    powersync: {
        execute: (...args: any[]) => mockExecute(...args),
        writeTransaction: (...args: any[]) => mockWriteTransaction(...args),
    }
}));

describe('Building Add Action', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Reset store state
        useProjectsStore.setState({
            projects: [],
            reports: [],
            folders: [],
            drawings: [],
            calculations: [],
            isSyncing: false,
            syncError: null,
            lastSyncAt: null,
        });
    });

    const createInitialProject = (buildings: any[] = []): Project => ({
        id: 'proj-1',
        name: 'Test Project',
        location: 'Test',
        client: 'Client',
        status: 'active',
        buildings,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    });

    it('should reject empty building names', async () => {
        const { addBuilding, addProject } = useProjectsStore.getState();
        await addProject(createInitialProject());
        
        const res1 = await addBuilding('proj-1', '');
        expect(res1.status).toBe('error');
        
        const res2 = await addBuilding('proj-1', '   ');
        expect(res2.status).toBe('error');
    });

    it('should append, not replace, existing buildings', async () => {
        const { addProject, addBuilding } = useProjectsStore.getState();
        
        await addProject(createInitialProject([{ id: 'b-1', code: 'A', name: 'A' }]));
        
        const res = await addBuilding('proj-1', 'B');
        expect(res.status).toBe('added');
        expect(res.building).toBeDefined();
        expect(res.building?.code).toBe('B');
        
        const project = useProjectsStore.getState().projects.find(p => p.id === 'proj-1');
        expect(project?.buildings).toHaveLength(2);
        expect(project?.buildings![0].code).toBe('A');
        expect(project?.buildings![1].code).toBe('B');
    });

    it('should trim whitespace', async () => {
        const { addProject, addBuilding } = useProjectsStore.getState();
        await addProject(createInitialProject());
        
        const res = await addBuilding('proj-1', '  Tower 1  ');
        expect(res.status).toBe('added');
        expect(res.building?.code).toBe('Tower 1');
        expect(res.building?.name).toBe('Tower 1');
    });

    it('should reject case-insensitive duplicates', async () => {
        const { addProject, addBuilding } = useProjectsStore.getState();
        await addProject(createInitialProject([
            { id: 'b-1', code: 'TOWER 1', name: 'TOWER 1' }
        ]));
        
        const res = await addBuilding('proj-1', 'tower 1');
        expect(res.status).toBe('duplicate');
        
        const project = useProjectsStore.getState().projects.find(p => p.id === 'proj-1');
        expect(project?.buildings).toHaveLength(1);
    });
});
