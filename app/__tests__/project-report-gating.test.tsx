import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';
import ProjectDashboardScreen from '../project/[id]';
import { usePowerSyncProject } from '../../lib/powersync/useProjects';
import { usePowerSyncReports } from '../../lib/powersync/useReports';
import { usePowerSyncMembers } from '../../lib/powersync/useMembers';
import { useProjectsStore } from '../../store/projectsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useLocalSearchParams, useRouter } from 'expo-router';

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
  useStore: () => ({ isPremium: true }),
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
    Swipeable: ({ children, renderRightActions }: any) => (
      React.createElement('View', { testID: 'swipeable-container' },
        children,
        typeof renderRightActions === 'function' ? renderRightActions() : null
      )
    ),
  };
});

describe('ProjectDashboardScreen Report Actions & Creation Gating', () => {
  const mockProject = {
    id: 'proj-123',
    name: 'Skyline Project',
    location: 'Downtown',
    status: 'active',
    userId: 'owner-user-id', // current user is NOT direct owner
  };

  const mockDailyReport = {
    id: 'rep-daily-1',
    projectId: 'proj-123',
    type: 'daily',
    date: '2026-08-24T10:00:00Z',
    author: 'John Doe',
    status: 'draft',
    createdAt: '2026-08-24T10:00:00Z',
    templateData: JSON.stringify({ summary: 'Daily site progress' }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'proj-123' });
    (useRouter as jest.Mock).mockReturnValue({ back: mockBack, push: mockPush });
    (usePowerSyncProject as jest.Mock).mockReturnValue({ data: mockProject, isLoading: false });
    (usePowerSyncReports as jest.Mock).mockReturnValue([mockDailyReport]);
    useAuthStore.setState({ user: { id: 'member-user-id' } as any });
  });

  it('correctly gates edit/delete/duplicate controls, swipe actions, and creation entry points for viewer vs manager', async () => {
    // 1. Render as viewer
    (usePowerSyncMembers as jest.Mock).mockReturnValue([
      { userId: 'member-user-id', role: 'viewer' },
    ]);

    const { getByText, getAllByText, queryByText, container, rerender } = await render(<ProjectDashboardScreen />);

    // Assert daily report is rendered
    expect(getAllByText('Daily Reports').length).toBe(2); // 1 category card + 1 recent report item
    expect(getByText('DRAFT')).toBeTruthy();

    // Assert NO edit (Pencil), delete (Trash2), or duplicate controls on the daily report row
    const findIconsNamed = (name: string) =>
      container.findAll((node: any) => node.type === 'Icon' && node.props?.name === name);

    const pencilIconsViewer = findIconsNamed('Pencil');
    const trashIconsViewer = findIconsNamed('Trash2');
    expect(pencilIconsViewer.length).toBe(0);
    expect(trashIconsViewer.length).toBe(0);

    // Assert NO swipe actions (Detail, Company, Trade) rendered in the Swipeable
    expect(queryByText('Detail')).toBeNull();
    expect(queryByText('Company')).toBeNull();
    expect(queryByText('Trade')).toBeNull();

    // Assert report creation entry point (e.g. Daily Reports category card) is disabled and Plus affordance is hidden
    const dailyCard = getByText('Progress, Weather & Workforce');
    await act(async () => {
      fireEvent.press(dailyCard);
    });
    // Should NOT push navigation for report creation when viewer
    expect(mockPush).not.toHaveBeenCalledWith(expect.stringContaining('/report/create'));

    // 2. Flip role to manager
    (usePowerSyncMembers as jest.Mock).mockReturnValue([
      { userId: 'member-user-id', role: 'manager' },
    ]);

    await act(async () => {
      await rerender(<ProjectDashboardScreen />);
    });

    // Assert edit (Pencil) and delete (Trash2) controls ARE present
    const pencilIconsManager = findIconsNamed('Pencil');
    const trashIconsManager = findIconsNamed('Trash2');
    expect(pencilIconsManager.length).toBeGreaterThanOrEqual(1);
    expect(trashIconsManager.length).toBeGreaterThanOrEqual(1);

    // Assert swipe actions (Detail, Company, Trade) ARE rendered
    expect(getByText('Detail')).toBeTruthy();
    expect(getByText('Company')).toBeTruthy();
    expect(getByText('Trade')).toBeTruthy();

    // Assert report creation category card IS interactive for manager
    const managerDailyCard = getByText('Progress, Weather & Workforce');
    await act(async () => {
      fireEvent.press(managerDailyCard);
    });
    expect(mockPush).toHaveBeenCalledWith('/project/proj-123/report/create?type=daily');
  });
});
