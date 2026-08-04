export interface SnagAiStatusDescriptor {
    label: string | null;
    color: string;
    state: 'analysing' | 'retrying' | 'failed';
    icon: 'spinner' | 'dot' | 'alert';
}

export function getSnagAiStatusDescriptor(
    aiStatus?: string | null,
    aiAttempts?: number | null,
    compact?: boolean
): SnagAiStatusDescriptor | null {
    if (!aiStatus || aiStatus === 'done') {
        return null;
    }

    if (aiStatus === 'pending' || aiStatus === 'running') {
        return {
            label: compact ? null : 'Analysing…',
            color: '#3B82F6',
            state: 'analysing',
            icon: 'spinner',
        };
    }

    if (aiStatus === 'failed') {
        const attempts = aiAttempts ?? 0;
        if (attempts < 5) {
            return {
                label: compact ? null : 'Retrying…',
                color: '#F59E0B',
                state: 'retrying',
                icon: 'dot',
            };
        }
        return {
            label: compact ? null : 'Analysis failed',
            color: '#EF4444',
            state: 'failed',
            icon: 'alert',
        };
    }

    return null;
}

export interface SnagWithAiStatus {
    aiStatus?: string | null;
    description?: string | null;
}

export function isSnagUnanalysed(snag: SnagWithAiStatus): boolean {
    const status = snag.aiStatus;
    if (status === 'pending' || status === 'running' || status === 'failed') {
        return true;
    }
    if (snag.description === 'Pending analysis') {
        return true;
    }
    return false;
}

export function countUnanalysedSnags(snags: SnagWithAiStatus[]): number {
    return snags.filter(isSnagUnanalysed).length;
}
