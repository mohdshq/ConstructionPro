import { matchBuildingId, normalizeAreaType, mergeVoiceContext } from '../../lib/ai/snagContext';

describe('snagContext', () => {
    describe('matchBuildingId', () => {
        const buildings = [
            { id: 'b1', code: 'A', name: 'Alpha' },
            { id: 'b2', code: 'B', name: 'Beta Tower' },
            { id: 'b3', code: 'C', name: 'Gamma Building' },
            { id: 'b4', code: 'D', name: 'Building C' }, // tricky naming
        ];

        it('matches exact code', () => {
            expect(matchBuildingId(buildings, 'A')).toBe('b1');
            expect(matchBuildingId(buildings, 'building A')).toBe('b1');
        });

        it('matches exact name', () => {
            expect(matchBuildingId(buildings, 'Beta Tower')).toBe('b2');
            expect(matchBuildingId(buildings, 'gamma building')).toBe('b3');
            expect(matchBuildingId(buildings, 'gamma')).toBe('b3');
        });

        it('resolves spoken "Building C" correctly to code C or name Building C if ambiguous -> returns undefined', () => {
            // "Building C" strips down to "C".
            // b3 code strips to "c", name strips to "gamma".
            // b4 code strips to "d", name strips to "c".
            // Two buildings match "c" (b3 via code, b4 via name)
            expect(matchBuildingId(buildings, 'Building C')).toBeUndefined();
        });

        it('returns undefined when no match', () => {
            expect(matchBuildingId(buildings, 'Tower X')).toBeUndefined();
        });

        it('returns undefined for empty buildings', () => {
            expect(matchBuildingId([], 'Building A')).toBeUndefined();
        });
    });

    describe('normalizeAreaType', () => {
        it('normalizes known aliases', () => {
            expect(normalizeAreaType('facade')).toBe('elevation');
            expect(normalizeAreaType('external wall')).toBe('elevation');
            expect(normalizeAreaType('basement')).toBe('parking');
            expect(normalizeAreaType('corridor')).toBe('common');
            expect(normalizeAreaType('unit')).toBe('unit');
        });

        it('returns undefined for unknown or empty', () => {
            expect(normalizeAreaType('nonsense')).toBeUndefined();
            expect(normalizeAreaType('')).toBeUndefined();
            expect(normalizeAreaType(undefined)).toBeUndefined();
        });
    });

    describe('mergeVoiceContext', () => {
        const b = [{ id: 'b1', code: 'A', name: 'Alpha' }];

        it('merges effectively and preserves previous values when missing', () => {
            const prev = { buildingId: 'prev_b', floor: 1, flat: 10, areaType: 'common' as const };
            const next = { floor: 'ground', areaType: 'basement' };
            const merged = mergeVoiceContext(prev, next, b);
            
            expect(merged.buildingId).toBe('prev_b'); // preserved
            expect(merged.floor).toBe(0); // overwritten by ground
            expect(merged.flat).toBe(10); // preserved
            expect(merged.areaType).toBe('parking'); // overwritten by basement
        });

        it('does NOT clobber an existing manually-chosen buildingId when the spoken building is unmatched', () => {
            const prev = { buildingId: 'manual1' };
            const merged = mergeVoiceContext(prev, { building: 'Tower X' }, b);
            expect(merged.buildingId).toBe('manual1');
            expect(merged.buildingSpoken).toBe('Tower X');
        });

        it('floor "ninth" -> 9', () => {
            const merged = mergeVoiceContext({}, { floor: 'ninth' }, b);
            expect(merged.floor).toBe(9);
        });

        it('a present flat forces areaType unit', () => {
            const merged = mergeVoiceContext({ areaType: 'roof' }, { flat: '202' }, b);
            expect(merged.flat).toBe(202);
            expect(merged.areaType).toBe('unit'); // flat forces unit if areaType not explicitly given in voice result (or even if it is, wait, let's see)
        });
    });
});
