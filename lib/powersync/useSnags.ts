import { useQuery } from '@powersync/react';
import type { ProjectSnag } from '../../store/projectsStore';

export const SNAG_SELECT = 'id, project_id, seq, building_id, floor, flat, area_type, severity, trade, room, description, photos, status, legacy_code, created_at, ai_status, ai_error, ai_attempts, ai_updated_at';

export function mapSnagRow(row: any, fallbackProjectId?: string): ProjectSnag {
    let photos: string[] = [];
    try {
        photos = row.photos ? JSON.parse(row.photos) : [];
    } catch (e) {
        photos = [];
    }
    return {
        id: row.id,
        projectId: row.project_id || (fallbackProjectId || ''),
        seq: row.seq,
        buildingId: row.building_id || undefined,
        floor: row.floor ?? undefined,
        flat: row.flat ?? undefined,
        areaType: row.area_type,
        severity: row.severity,
        trade: row.trade || undefined,
        room: row.room || undefined,
        description: row.description,
        photos,
        status: row.status,
        legacyCode: row.legacy_code || undefined,
        createdAt: row.created_at,
        aiStatus: row.ai_status || undefined,
        aiError: row.ai_error || undefined,
        aiAttempts: row.ai_attempts ?? undefined,
        aiUpdatedAt: row.ai_updated_at || undefined,
    };
}

export function usePowerSyncSnags(projectId?: string): ProjectSnag[] {
    const { data } = useQuery(
        `SELECT ${SNAG_SELECT} FROM snags WHERE project_id = ? ORDER BY seq DESC`,
        [projectId || '']
    );

    if (!projectId || !data) return [];

    return data.map((row: any) => mapSnagRow(row, projectId));
}

export function usePowerSyncSnag(snagId?: string): ProjectSnag | undefined {
    const { data } = useQuery(
        `SELECT ${SNAG_SELECT} FROM snags WHERE id = ? LIMIT 1`,
        [snagId || '']
    );

    if (!snagId || !data || data.length === 0) return undefined;

    return mapSnagRow(data[0]);
}

