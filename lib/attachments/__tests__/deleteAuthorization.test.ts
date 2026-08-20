describe('Drawings Role-Based Authorization Logic', () => {
  interface Member {
    userId: string;
    role: 'owner' | 'manager' | 'editor' | 'viewer';
  }

  function canUserDeleteDrawing(
    currentUserId: string,
    projectOwnerId: string,
    members: Member[],
    drawingCreatorId: string
  ): boolean {
    if (!currentUserId) return false;
    // 1. Project creator / owner
    if (projectOwnerId === currentUserId) return true;
    // 2. Drawing creator
    if (drawingCreatorId === currentUserId) return true;
    // 3. Project role owner or manager
    const currentMember = members.find((m) => m.userId === currentUserId);
    return currentMember?.role === 'owner' || currentMember?.role === 'manager';
  }

  const projectOwner = 'user-owner';
  const managerUser = 'user-manager';
  const editorUser = 'user-editor';
  const viewerUser = 'user-viewer';
  const outsiderUser = 'user-outsider';

  const membersList: Member[] = [
    { userId: projectOwner, role: 'owner' },
    { userId: managerUser, role: 'manager' },
    { userId: editorUser, role: 'editor' },
    { userId: viewerUser, role: 'viewer' },
  ];

  it('allows project owner to delete any drawing', () => {
    expect(canUserDeleteDrawing(projectOwner, projectOwner, membersList, 'someone-else')).toBe(true);
  });

  it('allows project manager to delete any drawing', () => {
    expect(canUserDeleteDrawing(managerUser, projectOwner, membersList, 'someone-else')).toBe(true);
  });

  it('allows original creator of drawing to delete their own drawing', () => {
    expect(canUserDeleteDrawing(editorUser, projectOwner, membersList, editorUser)).toBe(true);
  });

  it('PREVENTS editor from deleting other users drawings', () => {
    expect(canUserDeleteDrawing(editorUser, projectOwner, membersList, 'other-user')).toBe(false);
  });

  it('PREVENTS viewer from deleting any drawing', () => {
    expect(canUserDeleteDrawing(viewerUser, projectOwner, membersList, 'other-user')).toBe(false);
  });

  it('PREVENTS outsiders from deleting drawings', () => {
    expect(canUserDeleteDrawing(outsiderUser, projectOwner, membersList, 'other-user')).toBe(false);
  });
});
