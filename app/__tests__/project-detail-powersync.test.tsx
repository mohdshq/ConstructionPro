import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ProjectDashboardScreen from '../project/[id]';
import { usePowerSyncProject } from '../../lib/powersync/useProjects';
import { useProjectsStore } from '../../store/projectsStore';
import { useRouter, useLocalSearchParams } from 'expo-router';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({ id: 'proj-123' })),
  useRouter: jest.fn(() => ({ back: mockBack, push: mockPush })),
  Stack: { Screen: () => null },
}));

jest.mock('../../components/BackButton', () => () => null);
jest.mock('../../components/ProjectImage', () => () => null);

jest.mock('../../lib/powersync/useProjects', () => ({
  usePowerSyncProject: jest.fn(),
}));

jest.mock('../../lib/powersync/useReports', () => ({
  usePowerSyncReports: jest.fn(() => []),
}));

jest.mock('../../lib/powersync/useMembers', () => ({
  usePowerSyncMembers: jest.fn(() => []),
}));

jest.mock('../../store/projectsStore', () => ({
  useProjectsStore: jest.fn(),
}));

jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: jest.fn((selector) => {
    const state = { user: { id: 'viewer-user-id' } };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

jest.mock('../../store/useThemeColors', () => ({
  useThemeColors: () => ({ colors: { background: '#FFF', text: '#000', card: '#FFF', border: '#CCC', inputBackground: '#EEE' }, isDark: false }),
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
    Swipeable: ({ children }: any) => React.createElement('View', null, children),
  };
});

describe('ProjectDashboardScreen (app/project/[id].tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'proj-123' });
    (useRouter as jest.Mock).mockReturnValue({ back: mockBack, push: mockPush });
  });

  it('renders and does NOT call router.back when project is present in PowerSync but absent from zustand store', async () => {
    const mockProject = {
      id: 'proj-123',
      name: 'Shared Sky Tower',
      location: 'Dubai Downtown',
      client: 'Emaar',
      status: 'active',
      createdAt: '2026-08-20T10:00:00Z',
      updatedAt: '2026-08-20T10:00:00Z',
      userId: 'owner-user-id',
      memberRole: 'viewer',
    };

    (usePowerSyncProject as jest.Mock).mockReturnValue({
      data: mockProject,
      isLoading: false,
    });

    // Absent in zustand store
    (useProjectsStore as unknown as jest.Mock).mockReturnValue({
      getProject: jest.fn(() => undefined),
      deleteProject: jest.fn(),
      getReportsForProject: jest.fn(() => []),
      deleteReport: jest.fn(),
      updateReport: jest.fn(),
      initialSync: jest.fn(),
    });

    const { getAllByText } = await render(<ProjectDashboardScreen />);

    await waitFor(() => {
      expect(getAllByText('Shared Sky Tower').length).toBeGreaterThanOrEqual(1);
      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  it('does NOT call router.back while PowerSync query is loading and has no data yet', async () => {
    (usePowerSyncProject as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });

    (useProjectsStore as unknown as jest.Mock).mockReturnValue({
      getProject: jest.fn(() => undefined),
      deleteProject: jest.fn(),
      getReportsForProject: jest.fn(() => []),
      deleteReport: jest.fn(),
      updateReport: jest.fn(),
      initialSync: jest.fn(),
    });

    await render(<ProjectDashboardScreen />);

    // Give effects a tick
    await waitFor(() => {
      expect(mockBack).not.toHaveBeenCalled();
    });
  });

  it('calls router.back exactly once when query settles and project is definitively absent', async () => {
    (usePowerSyncProject as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    (useProjectsStore as unknown as jest.Mock).mockReturnValue({
      getProject: jest.fn(() => undefined),
      deleteProject: jest.fn(),
      getReportsForProject: jest.fn(() => []),
      deleteReport: jest.fn(),
      updateReport: jest.fn(),
      initialSync: jest.fn(),
    });

    await render(<ProjectDashboardScreen />);

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });
});
