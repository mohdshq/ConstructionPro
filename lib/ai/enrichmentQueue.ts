import type { ProjectSnag } from '../../store/projectsStore';
import { normalizeSeverity } from './persistSnags';

export type QueueSnag = Pick<ProjectSnag,
  'id' | 'description' | 'photos' | 'createdAt'
> & Partial<Pick<ProjectSnag,
  'aiStatus' | 'aiAttempts' | 'aiUpdatedAt' | 'buildingId' | 'floor' | 'flat' | 'areaType'
>>;

export function backoffMs(attempts: number): number {
  if (attempts <= 0) return 0;
  const ms = 5000 * Math.pow(3, attempts - 1);
  return Math.min(ms, 300000);
}

export function isCandidateEligible(snag: QueueSnag, now: number): boolean {
  if (!snag.photos || snag.photos.length === 0) return false;
  const attempts = snag.aiAttempts ?? 0;
  if (attempts >= 5) return false;

  const status = snag.aiStatus;
  if (status === 'done') return false;

  if (!status) {
    if (snag.description !== 'Pending analysis') {
      return false;
    }
  }

  const updatedAtMs = snag.aiUpdatedAt ? new Date(snag.aiUpdatedAt).getTime() : NaN;

  if (status === 'running') {
    // Reclaim if running > 2 minutes (120,000 ms)
    if (isNaN(updatedAtMs)) return true;
    return now - updatedAtMs >= 120000;
  }

  if (status === 'failed') {
    if (isNaN(updatedAtMs)) return true;
    const requiredBackoff = attempts === 0 ? 5000 : backoffMs(attempts);
    return now - updatedAtMs >= requiredBackoff;
  }

  if (status === 'pending' || !status) {
    if (attempts === 0) return true;
    if (isNaN(updatedAtMs)) return true;
    const requiredBackoff = backoffMs(attempts);
    return now - updatedAtMs >= requiredBackoff;
  }

  return false;
}

export function selectNextCandidate<T extends QueueSnag = QueueSnag>(
  snags: T[],
  now: number = Date.now()
): T | null {
  const eligible = snags.filter(s => isCandidateEligible(s, now));
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => {
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeA - timeB;
  });

  return eligible[0];
}

export interface EdgeSnagPayload {
  issue?: string;
  assetName?: string;
  system?: string;
  trade?: string;
  severity?: string;
  recommendation?: string;
}

export function buildSuccessPatch(result?: EdgeSnagPayload): Partial<ProjectSnag> {
  const description = (result?.issue || result?.assetName || 'Snag').trim();
  const trade = (result?.trade || result?.system)?.trim() || undefined;
  return {
    description,
    trade,
    severity: normalizeSeverity(result?.severity),
    aiStatus: 'done',
    aiError: undefined,
  };
}

export function buildFailurePatch(attempts: number, message: string): Partial<ProjectSnag> {
  return {
    aiAttempts: (attempts ?? 0) + 1,
    aiStatus: 'failed',
    aiError: (message || '').slice(0, 200),
  };
}
