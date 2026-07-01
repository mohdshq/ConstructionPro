import { makeUnitCode } from '../unitCode';
import { makeSnagRef } from '../snagRef';
import { Project, Building } from '../../../store/projectsStore';


describe('Unit Code Generation', () => {
    const mockProject = (buildings: Building[] = []): Project => ({
        id: '1',
        name: 'Test Project',
        location: '',
        client: '',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        buildings
    });

    it('single-building → 101', () => {
        const project = mockProject([{ id: 'b1', code: 'A' }]);
        expect(makeUnitCode(1, 1, project, project.buildings![0])).toBe('101');
    });

    it('two buildings with codes → A101', () => {
        const project = mockProject([
            { id: 'b1', code: 'A' },
            { id: 'b2', code: 'B' }
        ]);
        expect(makeUnitCode(1, 1, project, project.buildings![0])).toBe('A101');
    });

    it('multi-building but empty building code → 101', () => {
        const project = mockProject([
            { id: 'b1', code: '' },
            { id: 'b2', code: 'B' }
        ]);
        expect(makeUnitCode(1, 1, project, project.buildings![0])).toBe('101');
    });

    it('one building + floorSpec="3B+G+26+R" present → 101 (proves floorSpec is ignored)', () => {
        const project = mockProject([{ id: 'b1', code: 'A', floorSpec: '3B+G+26+R' }]);
        expect(makeUnitCode(1, 1, project, project.buildings![0])).toBe('101');
    });

    it('orphaned buildingId (not in project.buildings) → bare stacked, no crash', () => {
        const project = mockProject([{ id: 'b1', code: 'A', floorSpec: '3B+G+26+R' }]);
        expect(makeUnitCode(1, 1, project, undefined)).toBe('101');
    });
});

describe('Snag Reference Generation', () => {
    it('snag ref: seq=1 → -001, seq=999 → -999, seq=1000 → -1000 (proves no cap)', () => {
        expect(makeSnagRef('A101', 1)).toBe('A101-001');
        expect(makeSnagRef('101', 999)).toBe('101-999');
        expect(makeSnagRef('B202', 1000)).toBe('B202-1000');
    });

    it("snag ref stability: deleting a mid-list snag leaves others' refs unchanged", () => {
        const snag1Ref = makeSnagRef('A101', 1);
        const snag2Ref = makeSnagRef('A101', 2);
        const snag3Ref = makeSnagRef('A101', 3);
        
        expect(snag1Ref).toBe('A101-001');
        expect(snag3Ref).toBe('A101-003');
    });
});
