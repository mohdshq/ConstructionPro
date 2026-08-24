import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import TeamScreen from '../project/[id]/team';
import DrawingsBrowserScreen from '../project/[id]/drawings/index';
import { usePowerSyncProject } from '../../lib/powersync/useProjects';
import { useProjectsStore } from '../../store/projectsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { usePowerSyncMembers } from '../../lib/powersync/useMembers';
import { usePowerSyncFolders } from '../../lib/powersync/useFolders';
import { usePowerSyncDrawings } from '../../lib/powersync/useDrawings';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'proj-123' }),
  useRouter: () => ({ back: mockBack, push: mockPush }),
  Stack: { Screen: () => null },
}));

jest.mock('../../components/BackButton', () => () => null);
jest.mock('../../components/UserAvatar', () => () => null);

jest.mock('../../lib/powersync/useProjects', () => ({
  usePowerSyncProject: jest.fn(),
}));

jest.mock('../../lib/powersync/useMembers', () => ({
  usePowerSyncMembers: jest.fn(() => []),
}));

jest.mock('../../lib/powersync/useFolders', () => ({
  usePowerSyncFolders: jest.fn(() => []),
}));

jest.mock('../../lib/powersync/useDrawings', () => ({
  usePowerSyncDrawings: jest.fn(() => []),
}));

jest.mock('../../store/projectsStore', () => ({
  useProjectsStore: jest.fn(() => ({
    getProject: jest.fn(() => undefined),
    addFolder: jest.fn(),
    addDrawing: jest.fn(),
    deleteFolder: jest.fn(),
    deleteDrawing: jest.fn(),
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

describe('TeamScreen & DrawingsBrowserScreen PowerSync Resolution & Explicit States', () => {
  const mockProject = {
    id: 'proj-123',
    name: 'Skyline Tower',
    location: 'Downtown',
    userId: 'owner-id',
    memberRole: 'viewer',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: { id: 'viewer-id' } as any });
  });

  describe('TeamScreen (app/project/[id]/team.tsx)', () => {
    it('(a) renders loading indicator and non-empty output when query is unresolved', async () => {
      (usePowerSyncProject as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { getByText, container } = await render(<TeamScreen />);

      expect(getByText('Loading team...')).toBeTruthy();
      expect(container.children.length).toBeGreaterThan(0);
    });

    it('(b) renders full team screen and non-empty output when project exists', async () => {
      (usePowerSyncProject as jest.Mock).mockReturnValue({
        data: mockProject,
        isLoading: false,
      });

      const { getByText, container } = await render(<TeamScreen />);

      expect(getByText('Team Members')).toBeTruthy();
      expect(container.children.length).toBeGreaterThan(0);
    });

    it('(c) renders Project Not Found view and non-empty output when query resolves empty', async () => {
      (usePowerSyncProject as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
      });

      const { getAllByText, getByText, container } = await render(<TeamScreen />);

      expect(getAllByText('Project Not Found').length).toBeGreaterThanOrEqual(1);
      expect(getByText('Go Back')).toBeTruthy();
      expect(container.children.length).toBeGreaterThan(0);
    });
  });

  describe('DrawingsBrowserScreen (app/project/[id]/drawings/index.tsx)', () => {
    it('(a) renders loading indicator and non-empty output when query is unresolved', async () => {
      (usePowerSyncProject as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
      });

      const { getByText, container } = await render(<DrawingsBrowserScreen />);

      expect(getByText('Loading drawings...')).toBeTruthy();
      expect(container.children.length).toBeGreaterThan(0);
    });

    it('(b) renders drawings screen and non-empty output when project exists', async () => {
      (usePowerSyncProject as jest.Mock).mockReturnValue({
        data: mockProject,
        isLoading: false,
      });

      const { getByText, container } = await render(<DrawingsBrowserScreen />);

      expect(getByText('Drawings & Documents')).toBeTruthy();
      expect(container.children.length).toBeGreaterThan(0);
    });

    it('(c) renders Project Not Found view and non-empty output when query resolves empty', async () => {
      (usePowerSyncProject as jest.Mock).mockReturnValue({
        data: null,
        isLoading: false,
      });

      const { getAllByText, getByText, container } = await render(<DrawingsBrowserScreen />);

      expect(getAllByText('Project Not Found').length).toBeGreaterThanOrEqual(1);
      expect(getByText('Go Back')).toBeTruthy();
      expect(container.children.length).toBeGreaterThan(0);
    });

    it('recomputes manager gating when auth store emits new user id without remounting', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

      // 1. Initial render as viewer
      useAuthStore.setState({ user: { id: 'viewer-user-id' } as any });
      (usePowerSyncProject as jest.Mock).mockReturnValue({
        data: mockProject,
        isLoading: false,
      });
      (usePowerSyncMembers as jest.Mock).mockReturnValue([
        { userId: 'viewer-user-id', role: 'viewer' },
        { userId: 'manager-user-id', role: 'manager' },
      ]);
      (usePowerSyncFolders as jest.Mock).mockReturnValue([
        { id: 'folder-1', name: 'Structural Plans', projectId: 'proj-123', createdAt: '2026-08-24' },
      ]);

      const renderResult = await render(<DrawingsBrowserScreen />);
      expect(renderResult.getByText('Structural Plans')).toBeTruthy();

      const getOptionTouch = () => {
        const icon = renderResult.container.find(
          (node: any) => node.type === 'Icon' && node.props?.name === 'MoreVertical'
        );
        let curr = icon?.parent;
        while (curr && typeof curr.props?.onPress !== 'function') {
          curr = curr.parent;
        }
        return curr;
      };

      const optionTouch = getOptionTouch();
      expect(optionTouch).toBeTruthy();

      // Press options button as viewer
      await act(async () => {
        optionTouch.props.onPress({ stopPropagation: () => {} });
      });

      // As viewer on folder, Alert.alert is NOT called (only Cancel in options)
      expect(mockAlert).not.toHaveBeenCalled();

      // 2. Perform in-app user switch to manager without remounting
      await act(async () => {
        useAuthStore.setState({ user: { id: 'manager-user-id' } as any });
      });

      const updatedOptionTouch = getOptionTouch();
      expect(updatedOptionTouch).toBeTruthy();

      // Press options button as manager
      await act(async () => {
        updatedOptionTouch.props.onPress({ stopPropagation: () => {} });
      });

      // As manager, Alert.alert is called with Rename & Delete
      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Options',
          'Manage Folder',
          expect.arrayContaining([
            expect.objectContaining({ text: 'Rename' }),
            expect.objectContaining({ text: 'Delete' }),
          ])
        );
      });
    });
  });
});
