import { useQuery } from '@powersync/react';
import { DrawingFolder } from '@/store/projectsStore';

export function usePowerSyncFolders(projectId?: string): DrawingFolder[] {
  const { data } = useQuery<DrawingFolder>(
    `SELECT id, project_id AS projectId, name, parent_id AS parentId, created_at AS createdAt
     FROM drawing_folders WHERE project_id = ? ORDER BY created_at ASC`,
    [projectId ?? '']
  );
  return data ?? [];
}
