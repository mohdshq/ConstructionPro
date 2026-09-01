import type { Project } from '@/store/projectsStore';
import { useQuery } from '@powersync/react';
import { useAuthStore } from '@/store/useAuthStore';

function parseJsonArray<T = any>(val: any): T[] {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseProjectRow(row: any): Project {
  if (!row) return row;

  const knownCompaniesParsed = parseJsonArray<string>(row.knownCompanies);
  const knownRoomsParsed = parseJsonArray<string>(row.knownRooms);
  const contractorLogosParsed = parseJsonArray<string>(row.contractorLogos);
  const buildingsParsed = parseJsonArray<any>(row.buildings);

  return {
    ...row,
    knownCompanies: knownCompaniesParsed,
    knownRooms: knownRoomsParsed,
    contractorLogos: contractorLogosParsed,
    buildings: buildingsParsed,
    snagCounter: row.snagCounter || 0,
  } as Project;
}

// Aliases map snake_case SQLite columns to the camelCase Project shape
// the UI already expects. Live query: auto-updates when local SQLite changes.
export function usePowerSyncProjects() {
  const currentUserId = useAuthStore((state) => state.user?.id) ?? '';
  const result = useQuery<any>(`
    SELECT
      p.id,
      p.user_id AS userId,
      p.name,
      p.location,
      p.client,
      p.description,
      p.contract_value AS contractValue,
      p.start_date AS startDate,
      p.end_date AS endDate,
      p.project_manager AS projectManager,
      p.reference_number AS referenceNumber,
      p.status,
      p.photo_url AS photoUri,
      p.contractor_logos AS contractorLogos,
      p.employer_logo AS employerLogo,
      p.consultant_logo AS consultantLogo,
      p.main_contractor_name AS mainContractorName,
      p.known_companies AS knownCompanies,
      p.known_rooms AS knownRooms,
      p.buildings,
      p.snag_counter AS snagCounter,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      (
        SELECT role FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = ?
        LIMIT 1
      ) AS memberRole
    FROM projects p
    ORDER BY p.created_at DESC
  `, [currentUserId]);

  const parsedData = (result.data || []).map(parseProjectRow);

  return { ...result, data: parsedData };
}

export function usePowerSyncProject(projectId?: string) {
  const currentUserId = useAuthStore((state) => state.user?.id) ?? '';
  const result = useQuery<any>(`
    SELECT
      p.id,
      p.user_id AS userId,
      p.name,
      p.location,
      p.client,
      p.description,
      p.contract_value AS contractValue,
      p.start_date AS startDate,
      p.end_date AS endDate,
      p.project_manager AS projectManager,
      p.reference_number AS referenceNumber,
      p.status,
      p.photo_url AS photoUri,
      p.contractor_logos AS contractorLogos,
      p.employer_logo AS employerLogo,
      p.consultant_logo AS consultantLogo,
      p.main_contractor_name AS mainContractorName,
      p.known_companies AS knownCompanies,
      p.known_rooms AS knownRooms,
      p.buildings,
      p.snag_counter AS snagCounter,
      p.created_at AS createdAt,
      p.updated_at AS updatedAt,
      (
        SELECT role FROM project_members pm
        WHERE pm.project_id = p.id AND pm.user_id = ?
        LIMIT 1
      ) AS memberRole
    FROM projects p
    WHERE p.id = ?
    LIMIT 1
  `, [currentUserId, projectId ?? '']);

  const row = result.data?.[0];
  const parsedProject = row ? parseProjectRow(row) : null;

  return {
    ...result,
    data: parsedProject,
  };
}
