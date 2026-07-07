import { useQuery } from '@powersync/react';
import { ProjectSnag } from '../../store/projectsStore';

const SNAG_SELECT = 'id, project_id, seq, building_id, floor, flat, area_type, severity, trade, description, photos, status, legacy_code, created_at';

export function usePowerSyncSnags(projectId?: string): ProjectSnag[] {
    const { data } = useQuery(
        `SELECT ${SNAG_SELECT} FROM snags WHERE project_id = ? ORDER BY seq DESC`,
        [projectId || '']
    );

    if (!projectId || !data) return [];

    return data.map((row: any) => {
        let photos = [];
        try {
            photos = row.photos ? JSON.parse(row.photos) : [];
        } catch (e) {
            photos = [];
        }
        return {
            id: row.id,
            projectId: row.project_id || (projectId || ''),
            seq: row.seq,
            buildingId: row.building_id || undefined,
            floor: row.floor ?? undefined,
            flat: row.flat ?? undefined,
            areaType: row.area_type,
            severity: row.severity,
            trade: row.trade || undefined,
            description: row.description,
            photos,
            status: row.status,
            legacyCode: row.legacy_code || undefined,
            createdAt: row.created_at,
        };
    });
}

export function usePowerSyncSnag(snagId?: string): ProjectSnag | undefined {
    const { data } = useQuery(
        `SELECT ${SNAG_SELECT} FROM snags WHERE id = ? LIMIT 1`,
        [snagId || '']
    );

    if (!snagId || !data || data.length === 0) return undefined;

    const row = data[0];
    let photos = [];
    try {
        photos = row.photos ? JSON.parse(row.photos) : [];
    } catch (e) {
        photos = [];
    }
    return {
        id: row.id,
        projectId: row.project_id || '',
        seq: row.seq,
        buildingId: row.building_id || undefined,
        floor: row.floor ?? undefined,
        flat: row.flat ?? undefined,
        areaType: row.area_type,
        severity: row.severity,
        trade: row.trade || undefined,
        description: row.description,
        photos,
        status: row.status,
        legacyCode: row.legacy_code || undefined,
        createdAt: row.created_at,
    };
}
