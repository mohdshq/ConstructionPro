import {
  selectNextCandidate,
  backoffMs,
  buildSuccessPatch,
  buildFailurePatch,
  QueueSnag,
} from '../enrichmentQueue';

describe('enrichmentQueue', () => {
  const createMockSnag = (overrides: Partial<QueueSnag> = {}): QueueSnag => ({
    id: 'snag-1',
    description: 'Pending analysis',
    photos: ['data:image/jpeg;base64,photo1'],
    aiStatus: 'pending',
    aiAttempts: 0,
    createdAt: '2026-08-01T10:00:00.000Z',
    ...overrides,
  });

  describe('backoffMs', () => {
    it('returns 0ms for 0 attempts', () => {
      expect(backoffMs(0)).toBe(0);
      expect(backoffMs(-1)).toBe(0);
    });

    it('returns exponential backoff: 5s, 15s, 45s, 135s', () => {
      expect(backoffMs(1)).toBe(5000);
      expect(backoffMs(2)).toBe(15000);
      expect(backoffMs(3)).toBe(45000);
      expect(backoffMs(4)).toBe(135000);
    });

    it('caps backoff at 300000ms', () => {
      expect(backoffMs(5)).toBe(300000);
      expect(backoffMs(10)).toBe(300000);
    });
  });

  describe('selectNextCandidate', () => {
    const now = new Date('2026-08-01T12:00:00.000Z').getTime();

    it('selects candidates oldest-first by createdAt', () => {
      const snagOld = createMockSnag({
        id: 'old-snag',
        createdAt: '2026-08-01T08:00:00.000Z',
      });
      const snagNew = createMockSnag({
        id: 'new-snag',
        createdAt: '2026-08-01T09:00:00.000Z',
      });

      const selected = selectNextCandidate([snagNew, snagOld], now);
      expect(selected?.id).toBe('old-snag');
    });

    it('never selects done snags', () => {
      const doneSnag = createMockSnag({
        id: 'done-snag',
        aiStatus: 'done',
      });
      expect(selectNextCandidate([doneSnag], now)).toBeNull();
    });

    it('never selects snags with aiAttempts >= 5', () => {
      const terminalSnag = createMockSnag({
        id: 'term-snag',
        aiStatus: 'failed',
        aiAttempts: 5,
      });
      const terminalSnag6 = createMockSnag({
        id: 'term-snag-6',
        aiStatus: 'failed',
        aiAttempts: 6,
      });
      expect(selectNextCandidate([terminalSnag, terminalSnag6], now)).toBeNull();
    });

    it('excludes snags whose backoff has not yet elapsed', () => {
      // 1 attempt requires 5000ms backoff
      const notReadySnag = createMockSnag({
        id: 'not-ready',
        aiStatus: 'failed',
        aiAttempts: 1,
        aiUpdatedAt: new Date(now - 3000).toISOString(), // only 3s elapsed
      });
      expect(selectNextCandidate([notReadySnag], now)).toBeNull();

      const readySnag = createMockSnag({
        id: 'ready',
        aiStatus: 'failed',
        aiAttempts: 1,
        aiUpdatedAt: new Date(now - 6000).toISOString(), // 6s elapsed
      });
      expect(selectNextCandidate([readySnag], now)?.id).toBe('ready');
    });

    it('enforces 5000ms minimum backoff for failed snags even with aiAttempts: 0', () => {
      const recentFailed0 = createMockSnag({
        id: 'recent-failed-0',
        aiStatus: 'failed',
        aiAttempts: 0,
        aiUpdatedAt: new Date(now - 2000).toISOString(), // 2s elapsed
      });
      expect(selectNextCandidate([recentFailed0], now)).toBeNull();

      const readyFailed0 = createMockSnag({
        id: 'ready-failed-0',
        aiStatus: 'failed',
        aiAttempts: 0,
        aiUpdatedAt: new Date(now - 6000).toISOString(), // 6s elapsed
      });
      expect(selectNextCandidate([readyFailed0], now)?.id).toBe('ready-failed-0');
    });

    it('keeps pending snags with aiAttempts: 0 immediately eligible', () => {
      const pending0 = createMockSnag({
        id: 'pending-0',
        aiStatus: 'pending',
        aiAttempts: 0,
        aiUpdatedAt: new Date(now - 1000).toISOString(),
      });
      expect(selectNextCandidate([pending0], now)?.id).toBe('pending-0');
    });

    it('excludes photoless snags', () => {
      const noPhotos = createMockSnag({
        id: 'no-photos',
        photos: [],
      });
      const undefinedPhotos = createMockSnag({
        id: 'undefined-photos',
        photos: undefined,
      });
      expect(selectNextCandidate([noPhotos, undefinedPhotos], now)).toBeNull();
    });

    it('never selects legacy snags with undefined aiStatus and a real description', () => {
      const legacySnag = createMockSnag({
        id: 'legacy-snag',
        aiStatus: undefined,
        description: 'Chipped marble tile at master bath entrance',
      });
      expect(selectNextCandidate([legacySnag], now)).toBeNull();
    });

    it('selects snags with undefined aiStatus when description is Pending analysis', () => {
      const pendingLegacy = createMockSnag({
        id: 'pending-legacy',
        aiStatus: undefined,
        description: 'Pending analysis',
      });
      expect(selectNextCandidate([pendingLegacy], now)?.id).toBe('pending-legacy');
    });

    it('selects snags with explicit pending status regardless of description', () => {
      const pendingCustomDesc = createMockSnag({
        id: 'pending-custom',
        aiStatus: 'pending',
        description: 'Pre-filled note',
      });
      expect(selectNextCandidate([pendingCustomDesc], now)?.id).toBe('pending-custom');
    });

    it('reclaims running snags older than 2 minutes', () => {
      const freshRunning = createMockSnag({
        id: 'fresh-running',
        aiStatus: 'running',
        aiUpdatedAt: new Date(now - 60000).toISOString(), // 1 min ago
      });
      expect(selectNextCandidate([freshRunning], now)).toBeNull();

      const stuckRunning = createMockSnag({
        id: 'stuck-running',
        aiStatus: 'running',
        aiUpdatedAt: new Date(now - 130000).toISOString(), // 2m 10s ago
      });
      expect(selectNextCandidate([stuckRunning], now)?.id).toBe('stuck-running');
    });
  });

  describe('buildSuccessPatch', () => {
    it('maps issue to description and normalises severity', () => {
      const patch = buildSuccessPatch({
        issue: 'Exposed rebar on column C3',
        system: 'CIVIL',
        severity: 'High',
      });

      expect(patch).toEqual({
        description: 'Exposed rebar on column C3',
        trade: 'CIVIL',
        severity: 'major',
        aiStatus: 'done',
        aiError: undefined,
      });
    });

    it('falls back description to assetName then Snag', () => {
      const patchFromAsset = buildSuccessPatch({
        assetName: 'Concrete Wall',
        system: 'STRUCTURAL',
        severity: 'Low',
      });
      expect(patchFromAsset.description).toBe('Concrete Wall');
      expect(patchFromAsset.trade).toBe('STRUCTURAL');
      expect(patchFromAsset.severity).toBe('minor');

      const patchDefault = buildSuccessPatch({
        severity: 'Critical Defect',
      });
      expect(patchDefault.description).toBe('Snag');
      expect(patchDefault.severity).toBe('critical');
    });

    it('normalises cosmetic and minor severity', () => {
      const cosmeticPatch = buildSuccessPatch({ severity: 'Cosmetic scratch' });
      expect(cosmeticPatch.severity).toBe('cosmetic');

      const minorPatch = buildSuccessPatch({ severity: 'Minor paint peeling' });
      expect(minorPatch.severity).toBe('minor');
    });
  });

  describe('buildFailurePatch', () => {
    it('increments attempts and truncates error message to 200 characters', () => {
      const longMessage = 'A'.repeat(300);
      const patch = buildFailurePatch(1, longMessage);

      expect(patch).toEqual({
        aiAttempts: 2,
        aiStatus: 'failed',
        aiError: 'A'.repeat(200),
      });
    });

    it('handles initial attempts as undefined / 0', () => {
      const patch = buildFailurePatch(0, 'Network timeout');
      expect(patch.aiAttempts).toBe(1);
      expect(patch.aiStatus).toBe('failed');
      expect(patch.aiError).toBe('Network timeout');
    });
  });
});
