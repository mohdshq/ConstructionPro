import { useQuery } from '@powersync/react-native';
import type { Project } from '@/store/projectsStore';

// Aliases map snake_case SQLite columns to the camelCase Project shape
// the UI already expects. Live query: auto-updates when local SQLite changes.
export function usePowerSyncProjects() {
  return useQuery<Project>(`
    SELECT
      id,
      name,
      location,
      client,
      description,
      contract_value AS contractValue,
      start_date AS startDate,
      end_date AS endDate,
      project_manager AS projectManager,
      reference_number AS referenceNumber,
      status,
      photo_url AS photoUri,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM projects
    ORDER BY created_at DESC
  `);
}
