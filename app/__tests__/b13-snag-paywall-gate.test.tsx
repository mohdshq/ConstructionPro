import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import ProjectDashboardScreen from '../project/[id]';
import { usePowerSyncProject } from '../../lib/powersync/useProjects';
import { usePowerSyncReports } from '../../lib/powersync/useReports';
import { usePowerSyncMembers } from '../../lib/powersync/useMembers';
import { useProjectsStore } from '../../store/projectsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useStore } from '../../store/useStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ id: 'proj-123' })),
  useRouter: jest.fn(() => ({ back: mockBack, push: mockPush })),
  Stack: { Screen: () => null },
}));

jest.mock('../../components/BackButton', () => () => null);
jest.mock('../../components/ProjectImage', () => () => null);

jest.mock('@powersync/react', () => ({
  useStatus: jest.fn(() => ({ hasSynced: true, connected: true })),
  useQuery: jest.fn(() => ({ data: [] })),
}));

jest.mock('../../lib/powersync/useProjects', () => ({
  usePowerSyncProject: jest.fn(),
}));

jest.mock('../../lib/powersync/useReports', () => ({
  usePowerSyncReports: jest.fn(),
}));

jest.mock('../../lib/powersync/useMembers', () => ({
  usePowerSyncMembers: jest.fn(),
}));

jest.mock('../../store/projectsStore', () => ({
  useProjectsStore: jest.fn(() => ({
    getProject: jest.fn(() => undefined),
    deleteProject: jest.fn(),
    getReportsForProject: jest.fn(() => []),
    deleteReport: jest.fn(),
    updateReport: jest.fn(),
    initialSync: jest.fn(),
  })),
}));

jest.mock('../../store/useThemeColors', () => ({
  useThemeColors: () => ({
    colors: {
      background: '#FFF',
      text: '#000',
      card: '#FFF',
      border: '#CCC',
      inputBackground: '#EEE',
      textMuted: '#888',
      primary: '#2563EB',
    },
    isDark: false,
  }),
}));

jest.mock('../../store/useStore', () => ({
  useStore: jest.fn(),
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: any) => React.createElement('View', props, children),
    },
    FadeInDown: { delay: () => ({ springify: () => ({}) }) },
    FadeIn: { delay: () => ({ springify: () => ({}) }) },
  };
});

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return {
    Swipeable: ({ children }: any) => React.createElement('View', null, children),
  };
});

describe('B13: Report-count paywall gating check on Snagging & Quick Log vs Reports', () => {
  const mockProject = {
    id: 'proj-123',
    name: 'Skyline Project',
    location: 'Downtown',
    status: 'active',
    userId: 'owner-user-id',
  };

  const mockReports = [
    { id: 'rep-1', projectId: 'proj-123', type: 'daily', date: '2026-08-20', status: 'draft', createdAt: '2026-08-20' },
    { id: 'rep-2', projectId: 'proj-123', type: 'daily', date: '2026-08-21', status: 'completed', createdAt: '2026-08-21' },
    { id: 'rep-3', projectId: 'proj-123', type: 'daily', date: '2026-08-22', status: 'completed', createdAt: '2026-08-22' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'proj-123' });
    (useRouter as jest.Mock).mockReturnValue({ back: mockBack, push: mockPush });
    (usePowerSyncProject as jest.Mock).mockReturnValue({ data: mockProject, isLoading: false });
    (usePowerSyncReports as jest.Mock).mockReturnValue(mockReports);
    (usePowerSyncMembers as jest.Mock).mockReturnValue([]);
    useAuthStore.setState({ user: { id: 'owner-user-id' } as any });
    (useStore as unknown as jest.Mock).mockReturnValue({ isPremium: false });
  });

  it('tapping Snagging navigates to snags list and does NOT show Premium alert when at report limit', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = await render(<ProjectDashboardScreen />);

    const snaggingCard = getByText('Defects & Punch Lists');
    await act(async () => {
      fireEvent.press(snaggingCard);
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/project/proj-123/snags');
  });

  it('tapping Quick Log navigates to quick log and does NOT show Premium alert when at report limit', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = await render(<ProjectDashboardScreen />);

    const quickLogCard = getByText('Notes, Voice & Photos');
    await act(async () => {
      fireEvent.press(quickLogCard);
    });

    expect(alertSpy).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/quick-log', params: { projectId: 'proj-123' } });
  });

  it('tapping a report card (e.g. Daily Report) DOES show Premium alert and blocks navigation when at report limit', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    const { getByText } = await render(<ProjectDashboardScreen />);

    const dailyReportCard = getByText('Progress, Weather & Workforce');
    await act(async () => {
      fireEvent.press(dailyReportCard);
    });

    expect(alertSpy).toHaveBeenCalledWith(
      'Premium Required',
      'Free users can only create up to 3 reports. Upgrade to Construction Pro Premium to create unlimited reports.',
      expect.any(Array)
    );
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/report/create'));
  });
});
