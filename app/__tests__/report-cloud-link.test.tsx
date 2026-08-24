import React from 'react';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ReportViewerScreen from '../project/[id]/report/[reportId]';
import { usePowerSyncReport } from '../../lib/powersync/useReports';
import { useProjectsStore } from '../../store/projectsStore';
import { supabase } from '../../lib/supabase';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ reportId: 'report-123', id: 'proj-123' }),
  useRouter: () => ({ back: jest.fn() }),
  Stack: { Screen: () => null },
}));

jest.mock('../../components/BackButton', () => () => null);

jest.mock('../../lib/powersync/useReports', () => ({
  usePowerSyncReport: jest.fn(),
}));

jest.mock('../../store/projectsStore', () => ({
  useProjectsStore: jest.fn(),
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

jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(),
  printAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

jest.mock('../../lib/report/templates/DailyReportHTML', () => ({
  generateDailyReportHTML: jest.fn(() => '<html><body>Daily Report</body></html>'),
}));

jest.mock('../../lib/report/templates/SnaggingReportHTML', () => ({
  generateSnaggingHTML: jest.fn(() => '<html><body>Snagging Report</body></html>'),
}));

jest.mock('../../lib/report/templates/HSEReportHTML', () => ({
  generateHSEHTML: jest.fn(() => '<html><body>HSE Report</body></html>'),
}));

jest.mock('../../lib/report/templates/QuickLogHTML', () => ({
  generateQuickLogHTML: jest.fn(() => '<html><body>Quick Log</body></html>'),
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    storage: {
      from: jest.fn(),
    },
  },
}));

describe('ReportViewerScreen Cloud Link Generation', () => {
  const mockProject = {
    id: 'proj-123',
    name: 'Project Alpha',
    location: 'Downtown',
  };

  const mockReport = {
    id: 'report-123',
    projectId: 'proj-123',
    type: 'daily',
    date: '2026-08-24',
    templateData: JSON.stringify({ summary: 'All good' }),
  };

  let mockUpload: jest.Mock;
  let mockCreateSignedUrl: jest.Mock;
  let mockGetPublicUrl: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    (usePowerSyncReport as jest.Mock).mockReturnValue(mockReport);
    (useProjectsStore as unknown as jest.Mock).mockReturnValue({
      getProject: jest.fn(() => mockProject),
      updateReport: jest.fn(),
    });

    (Print.printToFileAsync as jest.Mock).mockResolvedValue({ uri: 'file:///tmp/generated-report.pdf' });
    (Sharing.isAvailableAsync as jest.Mock).mockResolvedValue(true);
    (Sharing.shareAsync as jest.Mock).mockResolvedValue(true);

    mockUpload = jest.fn().mockResolvedValue({ data: { path: 'proj-123/report_123.pdf' }, error: null });
    mockCreateSignedUrl = jest.fn().mockResolvedValue({
      data: { signedUrl: 'https://supabase.co/storage/v1/object/sign/pdfs/proj-123/report_123.pdf?token=abc' },
      error: null,
    });
    mockGetPublicUrl = jest.fn().mockReturnValue({ data: { publicUrl: 'https://supabase.co/public.pdf' } });

    (supabase.storage.from as jest.Mock).mockReturnValue({
      upload: mockUpload,
      createSignedUrl: mockCreateSignedUrl,
      getPublicUrl: mockGetPublicUrl,
    });

    // Mock global fetch for print URI -> blob conversion
    (global as any).fetch = jest.fn().mockResolvedValue({
      blob: () => Promise.resolve({ size: 1024, type: 'application/pdf' }),
    });
  });

  it('calls createSignedUrl with 604800s expiration (not getPublicUrl) and shares the signed URL', async () => {
    const { getByText, container } = await render(<ReportViewerScreen />);

    // Find share button containing Share2 icon
    const shareIcon = container.find(
      (node: any) => node.type === 'Icon' && node.props?.name === 'Share2'
    );
    expect(shareIcon).toBeTruthy();

    let shareTouch = shareIcon.parent;
    while (shareTouch && typeof shareTouch.props?.onPress !== 'function') {
      shareTouch = shareTouch.parent;
    }

    await act(async () => {
      fireEvent.press(shareTouch);
    });

    // Click "Share Cloud Link"
    const cloudLinkOption = getByText('Share Cloud Link');
    await act(async () => {
      fireEvent.press(cloudLinkOption);
    });

    await waitFor(() => {
      // Must call storage on 'pdfs' bucket
      expect(supabase.storage.from).toHaveBeenCalledWith('pdfs');
      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(/^proj-123\/report_report-123_\d+\.pdf$/),
        expect.anything(),
        expect.objectContaining({ contentType: 'application/pdf', upsert: true })
      );

      // Must call createSignedUrl with 7 days (604800 seconds)
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        expect.stringMatching(/^proj-123\/report_report-123_\d+\.pdf$/),
        604800
      );

      // Must NOT call getPublicUrl
      expect(mockGetPublicUrl).not.toHaveBeenCalled();

      // Must share the generated signed URL
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        'https://supabase.co/storage/v1/object/sign/pdfs/proj-123/report_123.pdf?token=abc',
        expect.objectContaining({ dialogTitle: 'Share Daily Report Link' })
      );
    });
  });

  it('surfaces the actual Supabase RLS/storage error message in the Alert dialog on upload failure', async () => {
    const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockUpload.mockResolvedValue({
      data: null,
      error: { message: 'new row violates row-level security policy for table "objects"' },
    });

    const { getByText, container } = await render(<ReportViewerScreen />);

    const shareIcon = container.find(
      (node: any) => node.type === 'Icon' && node.props?.name === 'Share2'
    );
    let shareTouch = shareIcon.parent;
    while (shareTouch && typeof shareTouch.props?.onPress !== 'function') {
      shareTouch = shareTouch.parent;
    }

    await act(async () => {
      fireEvent.press(shareTouch);
    });

    // Click "Share Cloud Link"
    const cloudLinkOption = getByText('Share Cloud Link');
    await act(async () => {
      fireEvent.press(cloudLinkOption);
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('new row violates row-level security policy for table "objects"')
      );
    });
  });

  it('surfaces the error message in the Alert dialog when createSignedUrl fails', async () => {
    const mockAlert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'Object not found in pdfs storage' },
    });

    const { getByText, container } = await render(<ReportViewerScreen />);

    const shareIcon = container.find(
      (node: any) => node.type === 'Icon' && node.props?.name === 'Share2'
    );
    let shareTouch = shareIcon.parent;
    while (shareTouch && typeof shareTouch.props?.onPress !== 'function') {
      shareTouch = shareTouch.parent;
    }

    await act(async () => {
      fireEvent.press(shareTouch);
    });

    // Click "Share Cloud Link"
    const cloudLinkOption = getByText('Share Cloud Link');
    await act(async () => {
      fireEvent.press(cloudLinkOption);
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        expect.stringContaining('Object not found in pdfs storage')
      );
    });
  });
});
