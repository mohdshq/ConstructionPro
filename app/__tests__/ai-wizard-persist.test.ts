import { 
    persistCapturedSnags, 
    normalizeFloorToInt, 
    normalizeSeverity,
    patchSnagSuccess,
    patchSnagFailure,
    CapturedSnag 
} from '../../lib/ai/persistSnags';

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

    describe('patchSnagSuccess', () => {
        it('updates the right snag when others exist', () => {
            const snags: CapturedSnag[] = [
                {
                    id: 'snag-1',
                    description: 'Pending analysis',
                    issue: 'Pending analysis',
                    severity: 'Moderate',
                    aiStatus: 'pending',
                    photos: ['photo-1'],
                    _ctx: { buildingId: 'B1' },
                },
                {
                    id: 'snag-2',
                    description: 'Pending analysis',
                    issue: 'Pending analysis',
                    severity: 'Moderate',
                    aiStatus: 'pending',
                    photos: ['photo-2'],
                    _ctx: { buildingId: 'B2' },
                },
            ];

            const patched = patchSnagSuccess(snags, 'snag-2', {
                issue: 'Cracked window sill',
                severity: 'High',
                trade: 'Glazing',
                room: 'Living Room',
                system: 'Windows',
            });

            // snag-1 must remain untouched
            expect(patched[0]).toEqual(snags[0]);

            // snag-2 must be updated
            expect(patched[1]).toEqual({
                id: 'snag-2',
                description: 'Cracked window sill',
                issue: 'Cracked window sill',
                severity: 'High',
                trade: 'Glazing',
                room: 'Living Room',
                aiStatus: 'done',
                aiError: undefined,
                photos: ['photo-2'],
                _ctx: { buildingId: 'B2' },
            });
        });

        it('is a safe no-op for a missing id', () => {
            const snags: CapturedSnag[] = [
                {
                    id: 'snag-1',
                    description: 'Pending analysis',
                    severity: 'Moderate',
                    aiStatus: 'pending',
                },
            ];

            const result = patchSnagSuccess(snags, 'non-existent-id', {
                issue: 'Some issue',
            });

            expect(result).toEqual(snags);
        });
    });

    describe('patchSnagFailure', () => {
        it('sets failed status and error message while preserving placeholder description', () => {
            const snags: CapturedSnag[] = [
                {
                    id: 'snag-1',
                    description: 'Pending analysis',
                    issue: 'Pending analysis',
                    severity: 'Moderate',
                    aiStatus: 'pending',
                    photos: ['photo-1'],
                },
            ];

            const patched = patchSnagFailure(snags, 'snag-1', 'AI service timeout after 45s');

            expect(patched[0].aiStatus).toBe('failed');
            expect(patched[0].aiError).toBe('AI service timeout after 45s');
            expect(patched[0].description).toBe('Pending analysis');
            expect(patched[0].issue).toBe('Pending analysis');
        });

        it('is a safe no-op for a missing id', () => {
            const snags: CapturedSnag[] = [
                {
                    id: 'snag-1',
                    description: 'Pending analysis',
                    aiStatus: 'pending',
                },
            ];

            const result = patchSnagFailure(snags, 'non-existent-id', 'Some error');

            expect(result).toEqual(snags);
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

        it('persists a snag created with aiStatus: pending as pending with placeholder description', async () => {
            const addSnagMock = jest.fn().mockResolvedValueOnce(1);

            const pendingSnags = [
                {
                    id: 'snag-pending-1',
                    description: 'Pending analysis',
                    issue: 'Pending analysis',
                    severity: 'Moderate',
                    aiStatus: 'pending' as const,
                    photos: ['photo-ctx', 'photo-detail'],
                    _ctx: {
                        buildingId: 'b-101',
                        floor: 3,
                        flat: 302,
                        areaType: 'unit',
                    },
                },
            ];

            const count = await persistCapturedSnags(pendingSnags, 'proj-abc', addSnagMock);

            expect(count).toBe(1);
            expect(addSnagMock).toHaveBeenCalledWith(expect.objectContaining({
                projectId: 'proj-abc',
                buildingId: 'b-101',
                floor: 3,
                flat: 302,
                areaType: 'unit',
                description: 'Pending analysis',
                aiStatus: 'pending',
                photos: ['photo-ctx', 'photo-detail'],
            }));
        });
    });
});
