import { Report } from '@/store/projectsStore';
import { useQuery } from '@powersync/react';

const REPORT_SELECT = `id,
  project_id AS projectId,
  type,
  date,
  author,
  template_data AS templateData,
  status,
  created_at AS createdAt,
  updated_at AS updatedAt`;

// Watched list of reports for a project, newest first.
export function usePowerSyncReports(projectId?: string): Report[] {
  const { data } = useQuery<Report>(
    `SELECT ${REPORT_SELECT} FROM reports WHERE project_id = ? ORDER BY date DESC`,
    [projectId ?? '']
  );
  return data ?? [];
}

// Watched single report by id.
export function usePowerSyncReport(reportId?: string): Report | undefined {
  const { data } = useQuery<Report>(
    `SELECT ${REPORT_SELECT} FROM reports WHERE id = ? LIMIT 1`,
    [reportId ?? '']
  );
  return data?.[0];
}
