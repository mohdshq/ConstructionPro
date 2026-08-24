import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import ProjectsScreen from '../(tabs)/projects';
import { usePowerSyncProjects } from '../../lib/powersync/useProjects';
import { useProjectsStore } from '../../store/projectsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useStatus } from '@powersync/react';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  Stack: { Screen: () => null },
}));

jest.mock('../../components/ProjectImage', () => () => null);
jest.mock('../../components/ConnectionBadge', () => () => null);

jest.mock('../../lib/powersync/useProjects', () => ({
  usePowerSyncProjects: jest.fn(),
}));

jest.mock('@powersync/react', () => ({
  useStatus: jest.fn(() => ({ hasSynced: true, connected: true })),
  useQuery: jest.fn(() => ({ data: [] })),
}));

jest.mock('../../store/projectsStore', () => ({
  useProjectsStore: jest.fn(() => ({
    reports: [],
    deleteProject: jest.fn(),
    initialSync: jest.fn(),
    isSyncing: false,
  })),
}));

jest.mock('../../store/useStore', () => ({
  useStore: () => ({ isPremium: true }),
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

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: {
      View: ({ children, ...props }: any) => React.createElement('View', props, children),
    },
    FadeInDown: { delay: () => ({ springify: () => ({}) }) },
    FadeIn: { duration: () => ({}) },
  };
});

function findIcons(container: any, name: string) {
  return container.findAll((node: any) => node.type === 'Icon' && node.props?.name === name);
}

describe('ProjectsScreen Action Gating & Sync-State Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useStatus as jest.Mock).mockReturnValue({ hasSynced: true, connected: true });
  });

  describe('Action Gating (Edit/Delete Buttons)', () => {
    it('fails CLOSED: does NOT render Edit or Delete for role "viewer"', async () => {
      useAuthStore.setState({ user: { id: 'viewer-user-id', email: 'viewer@example.com' } as any });

      (usePowerSyncProjects as jest.Mock).mockReturnValue({
        data: [
          {
            id: 'proj-viewer',
            name: 'Castle Project',
            userId: 'owner-user-id',
            memberRole: 'viewer',
            status: 'active',
            createdAt: '2026-08-20T10:00:00Z',
          },
        ],
      });

      const { container } = await render(<ProjectsScreen />);

      const pencilIcons = findIcons(container, 'Pencil');
      const trashIcons = findIcons(container, 'Trash2');

      expect(pencilIcons.length).toBe(0);
      expect(trashIcons.length).toBe(0);
    });

    it('fails CLOSED: does NOT render Edit or Delete when memberRole and userId are null/undefined', async () => {
      useAuthStore.setState({ user: { id: 'viewer-user-id', email: 'viewer@example.com' } as any });

      (usePowerSyncProjects as jest.Mock).mockReturnValue({
        data: [
          {
            id: 'proj-unknown',
            name: 'Test 1 Project',
            userId: undefined,
            memberRole: undefined,
            status: 'active',
            createdAt: '2026-08-20T10:00:00Z',
          },
        ],
      });

      const { container } = await render(<ProjectsScreen />);

      const pencilIcons = findIcons(container, 'Pencil');
      const trashIcons = findIcons(container, 'Trash2');

      expect(pencilIcons.length).toBe(0);
      expect(trashIcons.length).toBe(0);
    });

    it('fails CLOSED: does NOT render Edit or Delete when currentUserId is undefined/null (unauthenticated or hydrating)', async () => {
      useAuthStore.setState({ user: null });

      (usePowerSyncProjects as jest.Mock).mockReturnValue({
        data: [
          {
            id: 'proj-unauth',
            name: 'Unauth Project',
            userId: undefined,
            memberRole: undefined,
            status: 'active',
            createdAt: '2026-08-20T10:00:00Z',
          },
        ],
      });

      const { container } = await render(<ProjectsScreen />);

      const pencilIcons = findIcons(container, 'Pencil');
      const trashIcons = findIcons(container, 'Trash2');

      expect(pencilIcons.length).toBe(0);
      expect(trashIcons.length).toBe(0);
    });

    it('renders Edit and Delete for manager role', async () => {
      useAuthStore.setState({ user: { id: 'manager-user-id', email: 'manager@example.com' } as any });

      (usePowerSyncProjects as jest.Mock).mockReturnValue({
        data: [
          {
            id: 'proj-manager',
            name: 'Managed Project',
            userId: 'owner-user-id',
            memberRole: 'manager',
            status: 'active',
            createdAt: '2026-08-20T10:00:00Z',
          },
        ],
      });

      const { container } = await render(<ProjectsScreen />);

      const pencilIcons = findIcons(container, 'Pencil');
      const trashIcons = findIcons(container, 'Trash2');

      expect(pencilIcons.length).toBe(1);
      expect(trashIcons.length).toBe(1);
    });

    it('renders Edit and Delete for project owner', async () => {
      useAuthStore.setState({ user: { id: 'owner-user-id', email: 'owner@example.com' } as any });

      (usePowerSyncProjects as jest.Mock).mockReturnValue({
        data: [
          {
            id: 'proj-owner',
            name: 'Owned Project',
            userId: 'owner-user-id',
            memberRole: null,
            status: 'active',
            createdAt: '2026-08-20T10:00:00Z',
          },
        ],
      });

      const { container } = await render(<ProjectsScreen />);

      const pencilIcons = findIcons(container, 'Pencil');
      const trashIcons = findIcons(container, 'Trash2');

      expect(pencilIcons.length).toBe(1);
      expect(trashIcons.length).toBe(1);
    });
  });

  describe('Initial Sync State vs Empty State', () => {
    it('renders loading state (Syncing projects...) and NOT empty state when hasSynced is false', async () => {
      useAuthStore.setState({ user: { id: 'owner-user-id' } as any });
      (useStatus as jest.Mock).mockReturnValue({ hasSynced: false, connected: true });
      (usePowerSyncProjects as jest.Mock).mockReturnValue({ data: [] });

      const { getByText, queryByText } = await render(<ProjectsScreen />);

      expect(getByText('Syncing projects...')).toBeTruthy();
      expect(queryByText('No Projects Yet')).toBeNull();
    });

    it('renders empty state (No Projects Yet) only when hasSynced is true and zero rows', async () => {
      useAuthStore.setState({ user: { id: 'owner-user-id' } as any });
      (useStatus as jest.Mock).mockReturnValue({ hasSynced: true, connected: true });
      (usePowerSyncProjects as jest.Mock).mockReturnValue({ data: [] });

      const { getByText, queryByText } = await render(<ProjectsScreen />);

      expect(getByText('No Projects Yet')).toBeTruthy();
      expect(queryByText('Syncing projects...')).toBeNull();
    });
  });
});
