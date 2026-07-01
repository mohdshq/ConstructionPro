// Stable, never re-indexed. Counter is per-project, monotonic.
export function makeSnagRef(unitCode: string, seq: number): string {
  return `${unitCode}-${String(seq).padStart(3, '0')}`; // 001..999, then 1000, 1001... unpadded past 999
}
