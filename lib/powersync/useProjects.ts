import type { Project } from '@/store/projectsStore';
import { useQuery } from '@powersync/react';

// Aliases map snake_case SQLite columns to the camelCase Project shape
// the UI already expects. Live query: auto-updates when local SQLite changes.
export function usePowerSyncProjects() {
  const result = useQuery<any>(`
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
      contractor_logos AS contractorLogos,
      employer_logo AS employerLogo,
      consultant_logo AS consultantLogo,
      main_contractor_name AS mainContractorName,
      known_companies AS knownCompanies,
      buildings,
      created_at AS createdAt,
      updated_at AS updatedAt
    FROM projects
    ORDER BY created_at DESC
  `);

  const parsedData = (result.data || []).map(row => {
    let knownCompaniesParsed: string[] = [];
    try {
        knownCompaniesParsed = JSON.parse(row.knownCompanies || '[]');
    } catch (e) {
        knownCompaniesParsed = [];
    }
    
    let contractorLogosParsed: string[] = [];
    try {
        contractorLogosParsed = JSON.parse(row.contractorLogos || '[]');
    } catch (e) {
        contractorLogosParsed = [];
    }

    let buildingsParsed: any[] = [];
    try {
        buildingsParsed = JSON.parse(row.buildings || '[]');
    } catch (e) {
        buildingsParsed = [];
    }

    return {
      ...row,
      knownCompanies: knownCompaniesParsed,
      contractorLogos: contractorLogosParsed,
      buildings: buildingsParsed
    } as Project;
  });

  return { ...result, data: parsedData };
}
