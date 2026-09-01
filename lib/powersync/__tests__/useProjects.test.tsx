import React from 'react';
import { render, renderHook, act, waitFor } from '@testing-library/react-native';
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

  it('correctly parses knownRooms JSON and snagCounter in usePowerSyncProjects and usePowerSyncProject', async () => {
    const mockData = [
      {
        id: 'proj-1',
        name: 'Project 1',
        knownRooms: JSON.stringify(['Kitchen', 'Balcony']),
        snagCounter: 5,
      },
      {
        id: 'proj-2',
        name: 'Project 2',
        knownRooms: 'invalid-json',
        snagCounter: null,
      },
    ];

    (useQuery as jest.Mock).mockReturnValue({
      data: mockData,
    });

    const { result: projectsResult } = await renderHook(() => usePowerSyncProjects());
    expect(projectsResult.current.data[0].knownRooms).toEqual(['Kitchen', 'Balcony']);
    expect(projectsResult.current.data[0].snagCounter).toBe(5);
    expect(projectsResult.current.data[1].knownRooms).toEqual([]);
    expect(projectsResult.current.data[1].snagCounter).toBe(0);

    const { result: singleProjectResult } = await renderHook(() => usePowerSyncProject('proj-1'));
    expect(singleProjectResult.current.data?.knownRooms).toEqual(['Kitchen', 'Balcony']);
    expect(singleProjectResult.current.data?.snagCounter).toBe(5);
  });

  it('coerces buildings to [] when arriving as a raw string, null, or non-array JSON value', async () => {
    const mockData = [
      {
        id: 'proj-raw-string',
        name: 'Project Raw String',
        buildings: 'not-json-string',
      },
      {
        id: 'proj-null',
        name: 'Project Null',
        buildings: null,
      },
      {
        id: 'proj-non-array-json',
        name: 'Project Non Array JSON',
        buildings: '{"key": "value"}',
      },
      {
        id: 'proj-valid-json-array',
        name: 'Project Valid JSON Array',
        buildings: JSON.stringify([{ id: 'b-1', code: 'A' }]),
      },
      {
        id: 'proj-preparsed-array',
        name: 'Project Preparsed Array',
        buildings: [{ id: 'b-2', code: 'B' }],
      },
    ];

    (useQuery as jest.Mock).mockReturnValue({
      data: mockData,
    });

    const { result } = await renderHook(() => usePowerSyncProjects());
    // 1. Raw unparseable string yields []
    expect(result.current.data[0].buildings).toEqual([]);
    // 2. null yields []
    expect(result.current.data[1].buildings).toEqual([]);
    // 3. Non-array JSON value yields []
    expect(result.current.data[2].buildings).toEqual([]);
    // 4. Valid JSON array yields parsed array
    expect(result.current.data[3].buildings).toEqual([{ id: 'b-1', code: 'A' }]);
    // 5. Already parsed array yields array
    expect(result.current.data[4].buildings).toEqual([{ id: 'b-2', code: 'B' }]);
  });
});
