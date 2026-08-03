import type { Building } from '../../store/projectsStore';

export type AddBuildingResult =
  | { status: 'added'; buildings: Building[]; building: Building }
  | { status: 'duplicate' }
  | { status: 'error' };

export function addBuildingToList(
  existing: Building[],
  rawName: string,
  generateId: () => string
): AddBuildingResult {
  const trimmedName = rawName.trim();
  if (!trimmedName) {
    return { status: 'error' };
  }

  const isDuplicate = existing.some(
    b =>
      (b.code || '').toLowerCase() === trimmedName.toLowerCase() ||
      (b.name || '').toLowerCase() === trimmedName.toLowerCase()
  );

  if (isDuplicate) {
    return { status: 'duplicate' };
  }

  const newBuilding: Building = {
    id: generateId(),
    code: trimmedName,
    name: trimmedName,
  };

  return {
    status: 'added',
    buildings: [...existing, newBuilding],
    building: newBuilding,
  };
}
