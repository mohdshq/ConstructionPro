import type { Building } from '../../store/projectsStore';

export type AddBuildingResult =
  | { status: 'added'; buildings: Building[]; building: Building }
  | { status: 'duplicate' }
  | { status: 'error' };

export function formatBuildingLabel(b: { id?: string; code?: string; name?: string }): string {
  const code = (b.code ?? '').trim();
  const name = (b.name ?? '').trim();
  if (code && name && code !== name) {
    return `${code} - ${name}`;
  }
  return code || name || 'Unnamed';
}

export function addBuildingToList(
  existing: Building[],
  rawName: string,
  generateId: () => string
): AddBuildingResult {
  const trimmedName = rawName.trim();
  if (!trimmedName) {
    return { status: 'error' };
  }

  const isDuplicate = existing.some(b => {
    const code = (b.code || '').trim().toLowerCase();
    const name = (b.name || '').trim().toLowerCase();
    const fallback = (b.code || b.name || 'Unnamed').trim().toLowerCase();
    const target = trimmedName.toLowerCase();
    return (code && code === target) || (name && name === target) || fallback === target;
  });

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
