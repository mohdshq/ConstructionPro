import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { usePowerSyncProjects, usePowerSyncProject } from '../useProjects';
import { useAuthStore } from '@/store/useAuthStore';
import { useQuery } from '@powersync/react';

jest.mock('@powersync/react', () => ({
  useQuery: jest.fn(),
}));

function ProjectsTestComponent() {
  const { data: projects } = usePowerSyncProjects();
  const first = projects[0];
  return (
    <Text testID="memberRole">
      {first ? `${first.name}:${first.memberRole}` : 'no-projects'}
    </Text>
  );
}

describe('useProjects - Dynamic memberRole on in-app user switch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes to useAuthStore and re-queries with new userId when user changes', async () => {
    // 1. Initial login: User 1 (Viewer)
    useAuthStore.setState({ user: { id: 'user-1', email: 'viewer@example.com' } as any });

    (useQuery as jest.Mock).mockImplementation((sql: string, params: any[]) => {
      const queriedUserId = params[0];
      if (queriedUserId === 'user-1') {
        return {
          data: [
            {
              id: 'proj-123',
              name: 'Skyline Tower',
              user_id: 'owner-id',
              memberRole: 'viewer',
              created_at: '2026-08-24T00:00:00Z',
            },
          ],
        };
      }
      if (queriedUserId === 'user-2') {
        return {
          data: [
            {
              id: 'proj-123',
              name: 'Skyline Tower',
              user_id: 'owner-id',
              memberRole: 'manager',
              created_at: '2026-08-24T00:00:00Z',
            },
          ],
        };
      }
      return { data: [] };
    });

    const { getAllByTestId } = await render(<ProjectsTestComponent />);

    await waitFor(() => {
      expect(getAllByTestId('memberRole')[0].props.children).toBe('Skyline Tower:viewer');
      expect(useQuery).toHaveBeenCalledWith(expect.any(String), ['user-1']);
    });

    // 2. Perform in-app user switch to User 2 (Manager) without remounting
    await act(async () => {
      useAuthStore.setState({ user: { id: 'user-2', email: 'manager@example.com' } as any });
    });

    await waitFor(() => {
      expect(useQuery).toHaveBeenCalledWith(expect.any(String), ['user-2']);
      expect(getAllByTestId('memberRole')[0].props.children).toBe('Skyline Tower:manager');
    });
  });
});
