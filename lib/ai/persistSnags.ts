import { ProjectSnag } from '../../store/projectsStore';

export function normalizeSeverity(raw?: string): ProjectSnag['severity'] {
    const v = (raw || '').toLowerCase().trim();
    if (v.includes('crit')) return 'critical';
    if (v.includes('major') || v.includes('high')) return 'major';
    if (v.includes('cosmetic') || v.includes('trivial')) return 'cosmetic';
    if (v.includes('minor') || v.includes('low')) return 'minor';
    if (v.includes('mod') || v.includes('med')) return 'major';
    return 'minor';
}

export function normalizeFloorToInt(raw?: string | number | null): number | undefined {
    if (raw === undefined || raw === null || raw === '') return undefined;
    const s = String(raw).toLowerCase().trim();
    if (s === 'ground' || s === 'g' || s === 'ground floor') return 0;
    
    const words: Record<string, number> = {
        zero: 0, one: 1, first: 1,
        two: 2, second: 2,
        three: 3, third: 3,
        four: 4, fourth: 4,
        five: 5, fifth: 5,
        six: 6, sixth: 6,
        seven: 7, seventh: 7,
        eight: 8, eighth: 8,
        nine: 9, ninth: 9,
        ten: 10, tenth: 10,
        eleven: 11, eleventh: 11,
        twelve: 12, twelfth: 12
    };
    
    if (words[s] !== undefined) return words[s];

    const noFloor = s.replace(/floor/g, '').trim();
    if (words[noFloor] !== undefined) return words[noFloor];

    const parsed = parseInt(noFloor, 10);
    if (!isNaN(parsed)) return parsed;

    return undefined;
}

export async function persistCapturedSnags(
    capturedSnags: any[], 
    projectId: string, 
    addSnag: (snag: any) => Promise<any>
): Promise<number> {
    let savedCount = 0;
    for (const s of capturedSnags) {
        const ctx = s._ctx || {};
        const areaType = ctx.areaType || 'unit';
        const result = await addSnag({
            projectId,
            buildingId: ctx.buildingId || undefined,
            floor: ctx.floor,
            flat: areaType === 'unit' ? ctx.flat : undefined,
            areaType,
            severity: normalizeSeverity(s.severity),
            trade: s.trade?.trim() || undefined,
            room: (ctx.room || s.room)?.trim() || undefined,
            description: (s.issue || s.description || '').trim(),
            photos: s.photos || (s.photoUri ? [s.photoUri] : []),
            status: 'open',
        });
        if (result !== undefined) {
            savedCount++;
        }
    }
    return savedCount;
}
