import { ProjectMember } from '@/store/projectsStore';
import { useQuery } from '@powersync/react';

interface MemberJoinRow {
  id: string;
  projectId: string;
  userId: string;
  role: 'owner' | 'manager' | 'viewer';
  createdAt: string;
  profileFullName: string | null;
  profileAvatarUrl: string | null;
  profileRole: string | null;
}

// Watched list of members for a project, with profile joined from local profiles table.
export function usePowerSyncMembers(projectId?: string): ProjectMember[] {
  const { data } = useQuery<MemberJoinRow>(
    `SELECT m.id,
            m.project_id AS projectId,
            m.user_id AS userId,
            m.role,
            m.created_at AS createdAt,
            p.full_name AS profileFullName,
            p.avatar_url AS profileAvatarUrl,
            p.role AS profileRole
     FROM project_members m
     LEFT JOIN profiles p ON p.id = m.user_id
     WHERE m.project_id = ?`,
    [projectId ?? '']
  );

  return (data ?? []).map((row) => ({
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    role: row.role,
    createdAt: row.createdAt,
    profile: {
      full_name: row.profileFullName ?? undefined,
      avatar_url: row.profileAvatarUrl ?? undefined,
      role: row.profileRole ?? undefined,
    },
  }));
}
