import { useQuery } from '@powersync/react-native';
import { Activity } from '@/store/projectsStore';

export function usePowerSyncActivities(projectId?: string): Activity[] {
  const { data } = useQuery<any>(
    `SELECT a.id, a.project_id AS projectId, a.user_id AS userId, a.action,
            a.entity_type AS entityType, a.entity_id AS entityId, a.created_at AS createdAt,
            p.full_name AS profile_full_name, p.avatar_url AS profile_avatar_url
     FROM activities a
     LEFT JOIN profiles p ON p.id = a.user_id
     WHERE a.project_id = ?
     ORDER BY a.created_at DESC`,
    [projectId ?? '']
  );
  return (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    createdAt: row.createdAt,
    profile: {
      full_name: row.profile_full_name ?? undefined,
      avatar_url: row.profile_avatar_url ?? undefined,
    },
  }));
}
