import { useQuery } from '@powersync/react';
import { Calculation } from '@/store/projectsStore';

export function usePowerSyncCalculations(projectId?: string): Calculation[] {
  const sql = projectId
    ? `SELECT id, project_id AS projectId, user_id AS userId, type, data, created_at AS createdAt FROM calculations WHERE project_id = ? ORDER BY created_at DESC`
    : `SELECT id, project_id AS projectId, user_id AS userId, type, data, created_at AS createdAt FROM calculations ORDER BY created_at DESC`;
  const params = projectId ? [projectId] : [];
  const { data } = useQuery<any>(sql, params);
  return (data ?? []).map((row) => ({
    ...row,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
  }));
}
