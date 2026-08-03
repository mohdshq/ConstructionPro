import { addBuildingToList, formatBuildingLabel } from '../../lib/projects/buildings';
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

    it('should reject duplicates matching existing code-only buildings (from project create)', () => {
        const existing: Building[] = [
            { id: '1', code: 'Tower 1' },
        ];

        const result = addBuildingToList(existing, 'tower 1', mockIdGenerator());
        expect(result.status).toBe('duplicate');

        const resultUppercase = addBuildingToList(existing, 'TOWER 1', mockIdGenerator());
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

    it('should reject duplicates matching existing name-only buildings', () => {
        const existing: Building[] = [
            { id: '1', name: 'South Wing' } as Building,
        ];

        const result = addBuildingToList(existing, 'south wing', mockIdGenerator());
        expect(result.status).toBe('duplicate');
    });
});

describe('formatBuildingLabel', () => {
    it('should format code-only building correctly', () => {
        expect(formatBuildingLabel({ id: '1', code: 'T1' })).toBe('T1');
    });

    it('should format name-only building correctly', () => {
        expect(formatBuildingLabel({ id: '2', name: 'Tower 2' })).toBe('Tower 2');
    });

    it('should format building with distinct code and name as "code - name"', () => {
        expect(formatBuildingLabel({ id: '3', code: 'T3', name: 'Tower 3' })).toBe('T3 - Tower 3');
    });

    it('should format building with matching code and name without duplicating', () => {
        expect(formatBuildingLabel({ id: '4', code: 'Tower 4', name: 'Tower 4' })).toBe('Tower 4');
    });

    it('should fallback to "Unnamed" when neither code nor name is present', () => {
        expect(formatBuildingLabel({ id: '5' })).toBe('Unnamed');
        expect(formatBuildingLabel({ id: '6', code: '', name: '' })).toBe('Unnamed');
    });
});
