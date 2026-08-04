import { 
    getSnagAiStatusDescriptor, 
    isSnagUnanalysed, 
    countUnanalysedSnags 
} from '../../lib/units/snagAiStatus';

describe('SnagAiStatusBadge & helpers', () => {
    describe('getSnagAiStatusDescriptor', () => {
        it('returns null for done and for undefined aiStatus', () => {
            expect(getSnagAiStatusDescriptor('done')).toBeNull();
            expect(getSnagAiStatusDescriptor(undefined)).toBeNull();
            expect(getSnagAiStatusDescriptor(null)).toBeNull();
            expect(getSnagAiStatusDescriptor('')).toBeNull();
        });

        it('pending and running both produce the analysing label', () => {
            const pendingDesc = getSnagAiStatusDescriptor('pending');
            expect(pendingDesc).not.toBeNull();
            expect(pendingDesc?.label).toBe('Analysing…');
            expect(pendingDesc?.state).toBe('analysing');
            expect(pendingDesc?.color).toBe('#3B82F6');

            const runningDesc = getSnagAiStatusDescriptor('running');
            expect(runningDesc).not.toBeNull();
            expect(runningDesc?.label).toBe('Analysing…');
            expect(runningDesc?.state).toBe('analysing');
            expect(runningDesc?.color).toBe('#3B82F6');
        });

        it('failed at 2 attempts reads as retrying while failed at 5 reads as terminal failure', () => {
            // attempts 0, 2, 4 are retrying
            const failedAttempt0 = getSnagAiStatusDescriptor('failed', 0);
            expect(failedAttempt0?.label).toBe('Retrying…');
            expect(failedAttempt0?.state).toBe('retrying');
            expect(failedAttempt0?.color).toBe('#F59E0B');

            const failedAttempt2 = getSnagAiStatusDescriptor('failed', 2);
            expect(failedAttempt2?.label).toBe('Retrying…');
            expect(failedAttempt2?.state).toBe('retrying');
            expect(failedAttempt2?.color).toBe('#F59E0B');

            const failedAttempt4 = getSnagAiStatusDescriptor('failed', 4);
            expect(failedAttempt4?.label).toBe('Retrying…');
            expect(failedAttempt4?.state).toBe('retrying');
            expect(failedAttempt4?.color).toBe('#F59E0B');

            // attempts 5 and above are terminal failure
            const failedAttempt5 = getSnagAiStatusDescriptor('failed', 5);
            expect(failedAttempt5?.label).toBe('Analysis failed');
            expect(failedAttempt5?.state).toBe('failed');
            expect(failedAttempt5?.color).toBe('#EF4444');

            const failedAttempt6 = getSnagAiStatusDescriptor('failed', 6);
            expect(failedAttempt6?.label).toBe('Analysis failed');
            expect(failedAttempt6?.state).toBe('failed');
            expect(failedAttempt6?.color).toBe('#EF4444');
        });

        it('compact suppresses the label', () => {
            const pendingCompact = getSnagAiStatusDescriptor('pending', 0, true);
            expect(pendingCompact).not.toBeNull();
            expect(pendingCompact?.label).toBeNull();
            expect(pendingCompact?.state).toBe('analysing');

            const runningCompact = getSnagAiStatusDescriptor('running', 0, true);
            expect(runningCompact).not.toBeNull();
            expect(runningCompact?.label).toBeNull();
            expect(runningCompact?.state).toBe('analysing');

            const retryingCompact = getSnagAiStatusDescriptor('failed', 2, true);
            expect(retryingCompact).not.toBeNull();
            expect(retryingCompact?.label).toBeNull();
            expect(retryingCompact?.state).toBe('retrying');

            const failedCompact = getSnagAiStatusDescriptor('failed', 5, true);
            expect(failedCompact).not.toBeNull();
            expect(failedCompact?.label).toBeNull();
            expect(failedCompact?.state).toBe('failed');
        });
    });

    describe('Report gate counting logic (countUnanalysedSnags & isSnagUnanalysed)', () => {
        it('returns 0 for empty array or fully enriched snags', () => {
            expect(countUnanalysedSnags([])).toBe(0);

            const enrichedSnags = [
                { aiStatus: 'done', description: 'Cracked window' },
                { aiStatus: 'done', description: 'Paint peeling' },
            ];
            expect(countUnanalysedSnags(enrichedSnags)).toBe(0);
        });

        it('returns 0 for legacy snags with undefined aiStatus and real description', () => {
            const legacySnags = [
                { aiStatus: undefined, description: 'Leaking pipe' },
                { aiStatus: undefined, description: 'Door alignment issue' },
            ];
            expect(countUnanalysedSnags(legacySnags)).toBe(0);
        });

        it('identifies unanalysed snags by aiStatus (pending, running, failed)', () => {
            expect(isSnagUnanalysed({ aiStatus: 'pending', description: 'Pending analysis' })).toBe(true);
            expect(isSnagUnanalysed({ aiStatus: 'running', description: 'Pending analysis' })).toBe(true);
            expect(isSnagUnanalysed({ aiStatus: 'failed', description: 'Pending analysis' })).toBe(true);
        });

        it('identifies unanalysed snags by description equal to "Pending analysis" even if aiStatus is undefined', () => {
            expect(isSnagUnanalysed({ aiStatus: undefined, description: 'Pending analysis' })).toBe(true);
            expect(isSnagUnanalysed({ aiStatus: null, description: 'Pending analysis' })).toBe(true);
        });

        it('correctly counts a mixture of analysed and unanalysed snags', () => {
            const mixedSnags = [
                { aiStatus: 'done', description: 'Fix wall plug' },
                { aiStatus: 'pending', description: 'Pending analysis' },
                { aiStatus: 'running', description: 'Pending analysis' },
                { aiStatus: 'failed', description: 'Pending analysis' },
                { aiStatus: undefined, description: 'Old pre-existing snag' },
                { aiStatus: undefined, description: 'Pending analysis' },
            ];

            // Pending (1) + running (2) + failed (3) + undefined with 'Pending analysis' (4) = 4
            expect(countUnanalysedSnags(mixedSnags)).toBe(4);
        });
    });
});
