import { addBuildingToList } from '../../lib/projects/buildings';
import type { Building } from '../../store/projectsStore';

describe('addBuildingToList', () => {
    const mockIdGenerator = (id: string = 'mock-id-123') => () => id;

    it('should reject empty and whitespace-only building names', () => {
        const existing: Building[] = [];
        
        const emptyResult = addBuildingToList(existing, '', mockIdGenerator());
        expect(emptyResult.status).toBe('error');

        const whitespaceResult = addBuildingToList(existing, '   \t\n  ', mockIdGenerator());
        expect(whitespaceResult.status).toBe('error');
    });

    it('should trim whitespace from building name', () => {
        const existing: Building[] = [];
        const result = addBuildingToList(existing, '   Tower A   ', mockIdGenerator('gen-1'));

        expect(result.status).toBe('added');
        if (result.status === 'added') {
            expect(result.building).toEqual({
                id: 'gen-1',
                code: 'Tower A',
                name: 'Tower A',
            });
            expect(result.buildings).toEqual([
                {
                    id: 'gen-1',
                    code: 'Tower A',
                    name: 'Tower A',
                },
            ]);
        }
    });

    it('should use injected generateId for the new building id', () => {
        const existing: Building[] = [];
        const customId = 'deterministic-uuid-999';
        const result = addBuildingToList(existing, 'Building B', mockIdGenerator(customId));

        expect(result.status).toBe('added');
        if (result.status === 'added') {
            expect(result.building.id).toBe(customId);
            expect(result.buildings[0].id).toBe(customId);
        }
    });

    it('should append, not replace, existing buildings while preserving order', () => {
        const existing: Building[] = [
            { id: '1', code: 'Tower 1', name: 'Tower 1' },
            { id: '2', code: 'Tower 2', name: 'Tower 2' },
        ];

        const result = addBuildingToList(existing, 'Tower 3', mockIdGenerator('3'));

        expect(result.status).toBe('added');
        if (result.status === 'added') {
            expect(result.buildings).toHaveLength(3);
            expect(result.buildings[0]).toEqual(existing[0]);
            expect(result.buildings[1]).toEqual(existing[1]);
            expect(result.buildings[2]).toEqual({ id: '3', code: 'Tower 3', name: 'Tower 3' });
        }
    });

    it('should reject duplicates matching existing code case-insensitively', () => {
        const existing: Building[] = [
            { id: '1', code: 'Block A', name: 'Residential' },
        ];

        const result = addBuildingToList(existing, 'block a', mockIdGenerator());
        expect(result.status).toBe('duplicate');

        const resultUppercase = addBuildingToList(existing, 'BLOCK A', mockIdGenerator());
        expect(resultUppercase.status).toBe('duplicate');
    });

    it('should reject duplicates matching existing name case-insensitively', () => {
        const existing: Building[] = [
            { id: '1', code: 'BA', name: 'Block Alpha' },
        ];

        const result = addBuildingToList(existing, 'block alpha', mockIdGenerator());
        expect(result.status).toBe('duplicate');

        const resultMixedCase = addBuildingToList(existing, 'bLoCk AlPhA', mockIdGenerator());
        expect(resultMixedCase.status).toBe('duplicate');
    });
});
