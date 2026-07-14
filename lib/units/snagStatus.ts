import { ProjectSnag } from '../../store/projectsStore';

export const getSnagStatusColor = (s: ProjectSnag['status']) => {
    if (s === 'open') return '#D97706'; // Amber
    if (s === 'in_progress') return '#2563EB'; // Blue
    if (s === 'closed') return '#059669'; // Green
    return '#6B7280'; // Fallback
};

export const getSnagStatusBg = (s: ProjectSnag['status']) => {
    if (s === 'open') return '#FEF3C7';
    if (s === 'in_progress') return '#DBEAFE';
    if (s === 'closed') return '#D1FAE5';
    return '#E5E7EB'; // Fallback
};

export const getSnagStatusLabel = (s: ProjectSnag['status']) => {
    if (s === 'in_progress') return 'IN PROGRESS';
    return s ? s.toUpperCase() : 'UNKNOWN';
};
