import { persistCapturedSnags, normalizeFloorToInt, normalizeSeverity } from '../../lib/ai/persistSnags';

describe('AI Wizard Persistence', () => {
    describe('normalizeFloorToInt', () => {
        it('normalizes numbers', () => {
            expect(normalizeFloorToInt("9")).toBe(9);
            expect(normalizeFloorToInt(9)).toBe(9);
        });
        it('normalizes string prefixes/suffixes', () => {
            expect(normalizeFloorToInt("floor 9")).toBe(9);
            expect(normalizeFloorToInt("ninth floor")).toBe(9);
            expect(normalizeFloorToInt("ground")).toBe(0);
        });
        it('returns undefined for unparseable', () => {
            expect(normalizeFloorToInt("roof")).toBeUndefined();
            expect(normalizeFloorToInt(null)).toBeUndefined();
            expect(normalizeFloorToInt(undefined)).toBeUndefined();
            expect(normalizeFloorToInt("")).toBeUndefined();
        });
    });

    describe('normalizeSeverity', () => {
        it('maps AI responses to severity enum', () => {
            expect(normalizeSeverity("Crit")).toBe('critical');
            expect(normalizeSeverity("High")).toBe('major');
            expect(normalizeSeverity("Moderate")).toBe('major');
            expect(normalizeSeverity("Cosmetic")).toBe('cosmetic');
            expect(normalizeSeverity("Trivial")).toBe('cosmetic');
            expect(normalizeSeverity("Minor")).toBe('minor');
            expect(normalizeSeverity("Unknown")).toBe('minor'); // default
        });
    });

    describe('persistCapturedSnags', () => {
        it('saves sequentially and returns saved count', async () => {
            const addSnagMock = jest.fn()
                .mockResolvedValueOnce(1)
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(undefined);
            
            const snags = [
                { _ctx: { areaType: 'unit', floor: 1, flat: 101, buildingId: 'A' }, severity: 'high', issue: 'Issue 1' },
                { _ctx: { areaType: 'common', floor: 2, flat: 202, buildingId: 'B' }, severity: 'low', issue: 'Issue 2' },
                { _ctx: { areaType: 'unit' }, severity: 'critical', issue: 'Issue 3' },
            ];
            
            const savedCount = await persistCapturedSnags(snags, 'proj-1', addSnagMock);
            
            expect(savedCount).toBe(2);
            expect(addSnagMock).toHaveBeenCalledTimes(3);
            
            // Check snag 1 (unit area carries flat)
            expect(addSnagMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
                projectId: 'proj-1',
                buildingId: 'A',
                floor: 1,
                flat: 101,
                areaType: 'unit',
                severity: 'major',
                description: 'Issue 1'
            }));
            
            // Check snag 2 (non-unit area does NOT carry flat)
            expect(addSnagMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
                projectId: 'proj-1',
                buildingId: 'B',
                floor: 2,
                flat: undefined,
                areaType: 'common',
                severity: 'minor',
                description: 'Issue 2'
            }));
        });
    });
});
