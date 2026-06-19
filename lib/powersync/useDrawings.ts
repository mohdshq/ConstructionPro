import { useQuery } from '@powersync/react';
import { Drawing } from '@/store/projectsStore';

export function usePowerSyncDrawings(projectId?: string): Drawing[] {
  const { data } = useQuery<Drawing>(
    `SELECT id, project_id AS projectId, folder_id AS folderId, name, type,
            storage_path AS uri, size, uploaded_at AS uploadedAt, author
     FROM drawings WHERE project_id = ? ORDER BY uploaded_at DESC`,
    [projectId ?? '']
  );
  return data ?? [];
}
