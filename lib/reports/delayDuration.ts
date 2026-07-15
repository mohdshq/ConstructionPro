export function parseHHMM(t?: string): number | null {
    if (!t) return null;
    const match = t.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
}

export function delayMinutes(start?: string, end?: string): number | null {
    const s = parseHHMM(start);
    const e = parseHHMM(end);
    if (s === null || e === null) return null;
    if (e < s) return null;
    return e - s;
}

export function formatDuration(mins: number): string {
    if (mins < 0) return '';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
}

export function totalDelayMinutes(delays: { startTime?: string; endTime?: string }[]): number {
    if (!delays) return 0;
    return delays.reduce((acc, row) => {
        const mins = delayMinutes(row.startTime, row.endTime);
        if (mins !== null) {
            return acc + mins;
        }
        return acc;
    }, 0);
}
