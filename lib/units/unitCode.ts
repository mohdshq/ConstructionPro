import { Project, Building } from '../../store/projectsStore';

// Decide format from EXPLICIT config only. Ambiguity → no prefix.
export function isMultiBuilding(project: Project): boolean {
  return Array.isArray(project.buildings) && project.buildings.length >= 2;
}

// Generation-only. Display layer (S2) will prefer unit.legacyCode when present; never regenerate legacy codes.
export function makeUnitCode(floor: number, flat: number, project: Project, building?: Building): string {
  const flatStr = String(flat).padStart(2, '0');     // "01"
  const stack = `${floor}${flatStr}`;                 // "101"
  
  // Prefix ONLY when multi-building AND this unit has a building with a non-empty code
  if (isMultiBuilding(project) && building?.code?.trim()) {
    return `${building.code.trim()}${stack}`;         // "A101"
  }
  
  return stack;                                       // "101" fallback
}
