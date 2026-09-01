import React from 'react';
import { render, waitFor, fireEvent, act } from '@testing-library/react-native';
import CreateProjectScreen from '../project/create';
import AIWizardScreen from '../ai-wizard';
import QuickLogScreen from '../quick-log';
import SaveCalculationModal from '../../components/SaveCalculationModal';
import DrawingViewerScreen from '../project/[id]/drawings/[drawingId]';
import SavedCalculationsScreen from '../saved-calculations';
import { usePowerSyncProject, usePowerSyncProjects } from '../../lib/powersync/useProjects';
import { usePowerSyncDrawings } from '../../lib/powersync/useDrawings';
import { usePowerSyncCalculations } from '../../lib/powersync/useCalculations';
import { useProjectsStore } from '../../store/projectsStore';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({ back: mockBack, push: mockPush, replace: mockReplace })),
  useExpoRouter: jest.fn(() => ({ back: mockBack, push: mockPush, replace: mockReplace })),
  Stack: { Screen: () => null },
}));

jest.mock('../../components/BackButton', () => () => null);
jest.mock('../../components/ProjectImage', () => () => null);

jest.mock('../../lib/powersync/useProjects', () => ({
  usePowerSyncProject: jest.fn(),
  usePowerSyncProjects: jest.fn(),
}));

jest.mock('../../lib/powersync/useDrawings', () => ({
  usePowerSyncDrawings: jest.fn(() => []),
}));

jest.mock('../../lib/powersync/useCalculations', () => ({
  usePowerSyncCalculations: jest.fn(() => []),
}));

jest.mock('../../store/projectsStore', () => ({
  useProjectsStore: Object.assign(
    jest.fn(() => ({
      projects: [],
      drawings: [],
      calculations: [],
      getProject: jest.fn(() => undefined),
      addProject: jest.fn(),
      updateProject: jest.fn(),
      addReport: jest.fn(),
      addCalculation: jest.fn(),
    })),
    {
      getState: jest.fn(() => ({
        projects: [],
        addBuilding: jest.fn(),
        addSnag: jest.fn(),
      })),
      setState: jest.fn(),
    }
  ),
}));

jest.mock('../../store/useAuthStore', () => ({
  useAuthStore: jest.fn((selector) => {
    const state = { user: { id: 'test-user-id' } };
    return typeof selector === 'function' ? selector(state) : state;
  }),
}));

jest.mock('../../store/useThemeColors', () => ({
  useThemeColors: () => ({
    colors: {
      background: '#FFF',
      text: '#000',
      textMuted: '#666',
      card: '#FFF',
      border: '#CCC',
      inputBackground: '#EEE',
      primary: '#0EA5E9',
    },
    isDark: false,
  }),
}));

jest.mock('../../store/useStore', () => ({
  useStore: (selector?: any) => {
    const state = { isPremium: true, userName: 'Engineer Bob' };
    return typeof selector === 'function' ? selector(state) : state;
  },
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
    SlideInRight: { duration: () => ({}) },
  };
});

jest.mock('@/lib/attachments/resolveMediaUri', () => ({
  resolveMediaUri: jest.fn().mockResolvedValue('file:///mock/path/drawing.pdf'),
  classifyMediaSource: jest.fn().mockReturnValue('direct_uri'),
}));

jest.mock('react-native-webview', () => {
  const React = require('react');
  return {
    WebView: (props: any) => React.createElement('WebView', props),
  };
});

describe('Fresh Install PowerSync Project Reads (B11)', () => {
  const mockProject = {
    id: 'proj-123',
    name: 'Marina Towers',
    location: 'Dubai Marina',
    client: 'Emaar Properties',
    description: 'High-rise residential complex',
    contractValue: '5000000',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    projectManager: 'Alice Smith',
    mainContractorName: 'Arabtec',
    referenceNumber: 'MT-2026',
    photoUri: 'cover.jpg',
    employerLogo: null,
    consultantLogo: null,
    contractorLogos: [],
    buildings: [{ id: 'b1', code: 'T1', name: 'Tower 1' }],
    status: 'active',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useProjectsStore as unknown as jest.Mock).mockReturnValue({
      projects: [],
      drawings: [],
      calculations: [],
      getProject: jest.fn(() => undefined),
      addProject: jest.fn(),
      updateProject: jest.fn(),
      addReport: jest.fn(),
      addCalculation: jest.fn(),
    });
  });

  describe('app/project/create.tsx in Edit Mode', () => {
    it('pre-fills project metadata from PowerSync when Zustand projects is empty', async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'proj-123' });
      (usePowerSyncProject as jest.Mock).mockReturnValue({
        data: mockProject,
        isLoading: false,
      });
      (usePowerSyncProjects as jest.Mock).mockReturnValue({
        data: [mockProject],
      });

      const { getByDisplayValue } = await render(<CreateProjectScreen />);

      await waitFor(() => {
        expect(getByDisplayValue('Marina Towers')).toBeTruthy();
        expect(getByDisplayValue('Dubai Marina')).toBeTruthy();
        expect(getByDisplayValue('Emaar Properties')).toBeTruthy();
        expect(getByDisplayValue('MT-2026')).toBeTruthy();
      });
    });

    it('guards submission when in edit mode and project is unresolved', async () => {
      const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
      (useLocalSearchParams as jest.Mock).mockReturnValue({ id: 'proj-123' });
      (usePowerSyncProject as jest.Mock).mockReturnValue({
        data: null,
        isLoading: true,
      });
      (usePowerSyncProjects as jest.Mock).mockReturnValue({
        data: [],
      });

      const updateProjectMock = jest.fn();
      (useProjectsStore as unknown as jest.Mock).mockReturnValue({
        projects: [],
        getProject: jest.fn(() => undefined),
        updateProject: updateProjectMock,
      });

      const { getByText } = await render(<CreateProjectScreen />);

      // Attempt to save
      const saveBtn = getByText('Save');
      await act(async () => {
        fireEvent.press(saveBtn);
      });

      expect(updateProjectMock).not.toHaveBeenCalled();
    });
  });

  describe('app/ai-wizard.tsx Project Selection', () => {
    it('renders project cards from PowerSync when Zustand projects is empty', async () => {
      (usePowerSyncProjects as jest.Mock).mockReturnValue({
        data: [mockProject],
      });

      const { getByText } = await render(<AIWizardScreen />);

      await waitFor(() => {
        expect(getByText('Marina Towers')).toBeTruthy();
      });
    });
  });

  describe('app/quick-log.tsx Project Resolution', () => {
    it('auto-selects project from PowerSync via route param when Zustand is empty', async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({ projectId: 'proj-123' });
      (usePowerSyncProjects as jest.Mock).mockReturnValue({
        data: [mockProject],
      });

      const { getAllByText } = await render(<QuickLogScreen />);

      await waitFor(() => {
        expect(getAllByText('Marina Towers').length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('components/SaveCalculationModal.tsx', () => {
    it('lists active projects from PowerSync when Zustand projects is empty', async () => {
      (usePowerSyncProjects as jest.Mock).mockReturnValue({
        data: [mockProject],
      });

      const { getByText } = await render(
        <SaveCalculationModal
          visible={true}
          onClose={jest.fn()}
          calculationType="concrete"
          calculationData={{ result: '10' }}
        />
      );

      await waitFor(() => {
        expect(getByText('Marina Towers')).toBeTruthy();
      });
    });
  });

  describe('app/project/[id]/drawings/[drawingId].tsx', () => {
    it('renders drawing name and content from PowerSync when Zustand store is empty', async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        id: 'proj-123',
        drawingId: 'draw-1',
      });
      (usePowerSyncProject as jest.Mock).mockReturnValue({
        data: mockProject,
        isLoading: false,
      });
      (usePowerSyncDrawings as jest.Mock).mockReturnValue([
        {
          id: 'draw-1',
          projectId: 'proj-123',
          name: 'Foundation Structural Plan.pdf',
          size: 1048576,
          type: 'pdf',
          uri: 'drawings/proj-123/draw-1.pdf',
          uploadedAt: '2026-08-25',
          author: 'Alice',
        },
      ]);

      const { getByText, queryByText } = await render(<DrawingViewerScreen />);

      await waitFor(() => {
        expect(getByText('Foundation Structural Plan.pdf')).toBeTruthy();
        expect(queryByText('File Not Found')).toBeNull();
      });
    });
  });

  describe('app/saved-calculations.tsx', () => {
    it('displays resolved project name from PowerSync instead of Unknown Project', async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({});
      (usePowerSyncProjects as jest.Mock).mockReturnValue({
        data: [mockProject],
      });
      (usePowerSyncCalculations as jest.Mock).mockReturnValue([
        {
          id: 'calc-1',
          projectId: 'proj-123',
          userId: 'test-user-id',
          type: 'concrete',
          data: { result: 25, resultUnit: 'm³', wasteResult: 2.5 },
          createdAt: new Date().toISOString(),
        },
      ]);

      const { getByText, queryByText } = await render(<SavedCalculationsScreen />);

      await waitFor(() => {
        expect(getByText('Project: Marina Towers')).toBeTruthy();
        expect(queryByText('Project: Unknown Project')).toBeNull();
      });
    });
  });
});
