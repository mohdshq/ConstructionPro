import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import ProjectImage from '../ProjectImage';
import { resolveMediaUri } from '@/lib/attachments/resolveMediaUri';

jest.mock('@/lib/attachments/resolveMediaUri', () => ({
  resolveMediaUri: jest.fn(),
}));

describe('ProjectImage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes projectId to resolveMediaUri when photoUri is an attachment_ref', async () => {
    (resolveMediaUri as jest.Mock).mockResolvedValue('https://supabase.co/signed/report-photos/proj-123/cover.jpg');

    await render(<ProjectImage photoUri="cover.jpg" projectId="proj-123" />);

    await waitFor(() => {
      expect(resolveMediaUri).toHaveBeenCalledWith('cover.jpg', {
        bucket: 'report-photos',
        projectId: 'proj-123',
      });
    });
  });

  it('renders missing state and skips resolveMediaUri when photoUri is empty or null', async () => {
    const { rerender } = await render(<ProjectImage photoUri="" projectId="proj-123" />);
    expect(resolveMediaUri).not.toHaveBeenCalled();

    await rerender(<ProjectImage photoUri={null} projectId="proj-123" />);
    expect(resolveMediaUri).not.toHaveBeenCalled();

    await rerender(<ProjectImage photoUri={undefined} projectId="proj-123" />);
    expect(resolveMediaUri).not.toHaveBeenCalled();
  });

  it('renders missing state and avoids infinite re-fetching when resolveMediaUri returns null', async () => {
    (resolveMediaUri as jest.Mock).mockResolvedValue(null);

    await render(<ProjectImage photoUri="lost-cover.jpg" projectId="proj-123" />);

    await waitFor(() => {
      expect(resolveMediaUri).toHaveBeenCalledTimes(1);
    });

    // Advance any timers/ticks to ensure no loop occurs
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(resolveMediaUri).toHaveBeenCalledTimes(1);
  });
});
