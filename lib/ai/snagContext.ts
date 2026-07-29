import { normalizeFloorToInt } from './persistSnags';

export type AreaType = 'unit' | 'elevation' | 'parking' | 'landscape' | 'roof' | 'mep' | 'common';
const AREA_TYPES: AreaType[] = ['unit', 'elevation', 'parking', 'landscape', 'roof', 'mep', 'common'];

const strip = (s: string) =>
    s.toLowerCase().replace(/\b(building|tower|block|bldg)\b/g, '').replace(/[^a-z0-9]/g, '').trim();

export function matchBuildingId(buildings: any[], spoken?: string): string | undefined {
    if (!spoken || !buildings?.length) return undefined;
    const q = strip(String(spoken));
    if (!q) return undefined;
    const cands = buildings.map(b => ({ id: b.id, keys: [strip(b.code || ''), strip(b.name || '')].filter(Boolean) }));
    const exact = cands.filter(c => c.keys.includes(q));
    if (exact.length === 1) return exact[0].id;
    const partial = cands.filter(c => c.keys.some(k => k.startsWith(q) || q.startsWith(k)));
    if (partial.length === 1) return partial[0].id;
    return undefined; // ambiguous or unmatched -> leave for manual selection
}

export function normalizeAreaType(raw?: string): AreaType | undefined {
    const v = (raw || '').toLowerCase().trim();
    if (!v) return undefined;
    if (AREA_TYPES.includes(v as AreaType)) return v as AreaType;
    if (/facade|elevation|external wall|cladding/.test(v)) return 'elevation';
    if (/parking|car park|basement/.test(v)) return 'parking';
    if (/landscape|garden|hardscape|external work/.test(v)) return 'landscape';
    if (/roof|terrace|parapet/.test(v)) return 'roof';
    if (/mep|plant|shaft|riser|duct|pump/.test(v)) return 'mep';
    if (/common|corridor|lobby|stair|hall/.test(v)) return 'common';
    if (/unit|flat|apartment|villa/.test(v)) return 'unit';
    return undefined;
}

export function mergeVoiceContext(prev: any, result: any, buildings: any[]) {
    const r = result || {};
    const flat = normalizeFloorToInt(r.flat);
    const areaType = normalizeAreaType(r.areaType) ?? (flat !== undefined ? 'unit' : undefined);
    return {
        ...prev,
        buildingSpoken: r.building || prev?.buildingSpoken,
        buildingId: matchBuildingId(buildings, r.building) ?? prev?.buildingId,
        floor: normalizeFloorToInt(r.floor) ?? prev?.floor,
        flat: flat ?? prev?.flat,
        areaType: areaType ?? prev?.areaType ?? 'unit',
        area: r.area || prev?.area,
    };
}
