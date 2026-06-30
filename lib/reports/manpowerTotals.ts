import { ManpowerRow } from '../../store/projectsStore';

export interface CompanySummary { company: string; isMainContractor: boolean; inHouse: number; supply: number; total: number; }
export interface TradeSummary { trade: string; count: number; }

export function rowTotal(r: ManpowerRow): number {
    if (r.category === 'staff') return Number(r.count) || 0;
    return r.isMainContractor ? (Number(r.inHouse) || 0) + (Number(r.supply) || 0) : (Number(r.count) || 0);
}

export function grandTotal(rows: ManpowerRow[]): number {
    return rows.reduce((sum, r) => sum + rowTotal(r), 0);
}

export function summaryByCompany(rows: ManpowerRow[]): CompanySummary[] {
    const map = new Map<string, CompanySummary>();
    for (const r of rows) {
        const key = r.company || 'Unknown';
        if (!map.has(key)) {
            map.set(key, { company: key, isMainContractor: r.isMainContractor, inHouse: 0, supply: 0, total: 0 });
        }
        const s = map.get(key)!;
        if (r.isMainContractor && r.category !== 'staff') {
            s.inHouse += (Number(r.inHouse) || 0);
            s.supply += (Number(r.supply) || 0);
        }
        s.total += rowTotal(r);
    }
    return Array.from(map.values());
}

export function summaryByTrade(rows: ManpowerRow[]): TradeSummary[] {
    const map = new Map<string, number>();
    for (const r of rows) {
        const raw = r.trade || 'Unknown';
        const normalized = raw.trim().toLowerCase();
        map.set(normalized, (map.get(normalized) || 0) + rowTotal(r));
    }
    
    const result: TradeSummary[] = [];
    for (const [trade, count] of map.entries()) {
        const titleCase = trade.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        result.push({ trade: titleCase, count });
    }
    
    return result.sort((a, b) => b.count - a.count);
}

export function nightShiftTotal(rows: ManpowerRow[]): number {
    return rows.filter(r => r.shift === 'night').reduce((sum, r) => sum + rowTotal(r), 0);
}
