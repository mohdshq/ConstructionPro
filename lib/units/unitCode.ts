import { Project, Building } from '../../store/projectsStore';

// Decide format from EXPLICIT config only. Ambiguity → no prefix.
export function isMultiBuilding(project: Project): boolean {
  return Array.isArray(project.buildings) && project.buildings.length >= 2;
}

// Generation-only. Display layer (S2) will prefer unit.legacyCode when present; never regenerate legacy codes.
export function makeUnitCode(
  floor: number | undefined,
  flat: number | undefined,
  project: Project,
  building?: Building,
  areaType?: string,
): string {
  const prefix =
    isMultiBuilding(project) && building?.code?.trim()
      ? building.code.trim()
      : '';

  // Non-unit (common/other): building marker only, floor-independent.
  if (areaType && areaType !== 'unit') {
    return prefix ? `${prefix}-C` : 'C';
  }

  // Unit snag: prefix + floor + padded flat.
  if (floor === undefined || flat === undefined) return '';
  const flatStr = String(flat).padStart(2, '0');
  const stack = `${floor}${flatStr}`;
  return prefix ? `${prefix}${stack}` : stack;
}
