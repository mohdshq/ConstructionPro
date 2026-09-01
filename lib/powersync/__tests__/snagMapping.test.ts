jest.mock('@powersync/react', () => ({
    useQuery: jest.fn(),
}));

import { mapSnagRow } from '../useSnags';

describe('mapSnagRow', () => {
    it('maps a raw row with ai_status, ai_attempts, ai_error, and ai_updated_at', () => {
        const rawRow = {
            id: 'snag-123',
            project_id: 'proj-456',
            seq: 1,
            building_id: 'b-1',
            floor: 2,
            flat: 204,
            area_type: 'unit',
            severity: 'major',
            trade: 'Carpentry',
            room: 'Kitchen',
            description: 'Misaligned cabinet door',
            photos: JSON.stringify(['data:image/jpeg;base64,abc']),
            status: 'open',
            legacy_code: 'A-2-204-1',
            created_at: '2026-08-03T10:00:00Z',
            ai_status: 'pending',
            ai_error: 'Timeout connecting to AI model',
            ai_attempts: 2,
            ai_updated_at: '2026-08-03T10:05:00Z',
        };

        const result = mapSnagRow(rawRow);

        expect(result).toEqual({
            id: 'snag-123',
            projectId: 'proj-456',
            seq: 1,
            buildingId: 'b-1',
            floor: 2,
            flat: 204,
            areaType: 'unit',
            severity: 'major',
            trade: 'Carpentry',
            room: 'Kitchen',
            description: 'Misaligned cabinet door',
            photos: ['data:image/jpeg;base64,abc'],
            status: 'open',
            legacyCode: 'A-2-204-1',
            createdAt: '2026-08-03T10:00:00Z',
            aiStatus: 'pending',
            aiError: 'Timeout connecting to AI model',
            aiAttempts: 2,
            aiUpdatedAt: '2026-08-03T10:05:00Z',
        });
    });

    it('maps a row with nulls and missing optional fields to undefined without throwing', () => {
        const rawRow = {
            id: 'snag-minimal',
            project_id: null,
            seq: 2,
            building_id: null,
            floor: null,
            flat: null,
            area_type: 'common',
            severity: 'cosmetic',
            trade: null,
            room: null,
            description: 'Scratch on handrail',
            photos: null,
            status: 'open',
            legacy_code: null,
            created_at: '2026-08-03T11:00:00Z',
            ai_status: null,
            ai_error: null,
            ai_attempts: null,
            ai_updated_at: null,
        };

        const result = mapSnagRow(rawRow, 'fallback-proj-id');

        expect(result.id).toBe('snag-minimal');
        expect(result.projectId).toBe('fallback-proj-id');
        expect(result.buildingId).toBeUndefined();
        expect(result.floor).toBeUndefined();
        expect(result.flat).toBeUndefined();
        expect(result.trade).toBeUndefined();
        expect(result.room).toBeUndefined();
        expect(result.legacyCode).toBeUndefined();
        expect(result.photos).toEqual([]);
        expect(result.aiStatus).toBeUndefined();
        expect(result.aiError).toBeUndefined();
        expect(result.aiAttempts).toBeUndefined();
        expect(result.aiUpdatedAt).toBeUndefined();
    });

    it('preserves ai_attempts of 0 as 0 and handles invalid photos JSON gracefully', () => {
        const rawRow = {
            id: 'snag-zero-attempts',
            project_id: 'p1',
            seq: 3,
            area_type: 'unit',
            severity: 'minor',
            description: 'Paint splatter',
            photos: '{invalid-json',
            status: 'open',
            created_at: '2026-08-03T11:00:00Z',
            ai_status: 'done',
            ai_attempts: 0,
        };

        const result = mapSnagRow(rawRow);

        expect(result.aiStatus).toBe('done');
        expect(result.aiAttempts).toBe(0);
        expect(result.photos).toEqual([]);
    });

    it('maps a row with storage path references in photos', () => {
        const rawRow = {
            id: 'snag-storage-paths',
            project_id: 'proj-789',
            seq: 4,
            building_id: 'b-2',
            floor: 1,
            flat: 101,
            area_type: 'unit',
            severity: 'minor',
            trade: 'Plumbing',
            room: 'Bathroom',
            description: 'Slow drain in sink',
            photos: JSON.stringify(['att-context-123.jpg', 'att-detail-456.jpg']),
            status: 'in_progress',
            legacy_code: 'B-1-101-4',
            created_at: '2026-08-27T10:00:00Z',
            ai_status: 'done',
            ai_attempts: 1,
            ai_updated_at: '2026-08-27T10:01:00Z',
        };

        const result = mapSnagRow(rawRow);

        expect(result).toEqual({
            id: 'snag-storage-paths',
            projectId: 'proj-789',
            seq: 4,
            buildingId: 'b-2',
            floor: 1,
            flat: 101,
            areaType: 'unit',
            severity: 'minor',
            trade: 'Plumbing',
            room: 'Bathroom',
            description: 'Slow drain in sink',
            photos: ['att-context-123.jpg', 'att-detail-456.jpg'],
            status: 'in_progress',
            legacyCode: 'B-1-101-4',
            createdAt: '2026-08-27T10:00:00Z',
            aiStatus: 'done',
            aiError: undefined,
            aiAttempts: 1,
            aiUpdatedAt: '2026-08-27T10:01:00Z',
        });
    });
});
