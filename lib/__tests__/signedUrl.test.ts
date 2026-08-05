jest.mock('expo-file-system/legacy', () => ({
    readAsStringAsync: jest.fn(),
    writeAsStringAsync: jest.fn(),
    deleteAsync: jest.fn(),
    getInfoAsync: jest.fn(),
    makeDirectoryAsync: jest.fn(),
    documentDirectory: 'file:///mock/doc/',
    cacheDirectory: 'file:///mock/cache/',
}));

jest.mock('expo-image-manipulator', () => ({
    manipulateAsync: jest.fn(),
    SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

const mockCreateSignedUrl = jest.fn();
const mockFrom = jest.fn(() => ({
    createSignedUrl: mockCreateSignedUrl,
}));

jest.mock('../supabase', () => ({
    supabase: {
        storage: {
            from: mockFrom,
        },
    },
}));

import { getSignedUrl, SignedUrlResult } from '../supabaseSync';
import { generateSnagReportHTML } from '../report/templates/SnagReportHTML';
import { Project, ProjectSnag } from '../../store/projectsStore';

describe('getSignedUrl', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('input validation', () => {
        it('returns missing for null path without calling Supabase', async () => {
            const result = await getSignedUrl('report-photos', null);
            expect(result).toEqual({ ok: false, reason: 'missing', message: expect.any(String) });
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('returns missing for undefined path without calling Supabase', async () => {
            const result = await getSignedUrl('report-photos', undefined);
            expect(result).toEqual({ ok: false, reason: 'missing', message: expect.any(String) });
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('returns missing for empty string path without calling Supabase', async () => {
            const result = await getSignedUrl('report-photos', '');
            expect(result).toEqual({ ok: false, reason: 'missing', message: expect.any(String) });
            expect(mockFrom).not.toHaveBeenCalled();
        });

        it('returns missing for whitespace-only path without calling Supabase', async () => {
            const result = await getSignedUrl('report-photos', '   ');
            expect(result).toEqual({ ok: false, reason: 'missing', message: expect.any(String) });
            expect(mockFrom).not.toHaveBeenCalled();
        });
    });

    describe('successful resolution', () => {
        it('returns ok: true with signed URL', async () => {
            mockCreateSignedUrl.mockResolvedValueOnce({
                data: { signedUrl: 'https://example.com/storage/v1/object/sign/photos/image.jpg?token=abc' },
                error: null,
            });

            const result = await getSignedUrl('report-photos', 'photos/image.jpg');
            expect(result).toEqual({
                ok: true,
                url: 'https://example.com/storage/v1/object/sign/photos/image.jpg?token=abc',
            });
            expect(mockFrom).toHaveBeenCalledWith('report-photos');
            expect(mockCreateSignedUrl).toHaveBeenCalledWith('photos/image.jpg', 3600);
        });
    });

    describe('failure classification', () => {
        it('classifies "not found" error message as reason: missing', async () => {
            mockCreateSignedUrl.mockResolvedValueOnce({
                data: null,
                error: { message: 'Object not found', status: 404 },
            });

            const result = await getSignedUrl('report-photos', 'photos/missing.jpg');
            expect(result).toEqual({
                ok: false,
                reason: 'missing',
                message: 'Object not found',
            });
        });

        it('classifies 404 status code as reason: missing even with generic message', async () => {
            mockCreateSignedUrl.mockResolvedValueOnce({
                data: null,
                error: { message: 'The resource could not be found', status: 404 },
            });

            const result = await getSignedUrl('drawings', 'drawings/missing.pdf');
            expect(result).toEqual({
                ok: false,
                reason: 'missing',
                message: 'The resource could not be found',
            });
        });

        it('classifies network error in returned error as reason: offline', async () => {
            mockCreateSignedUrl.mockResolvedValueOnce({
                data: null,
                error: { message: 'TypeError: Failed to fetch', status: 0 },
            });

            const result = await getSignedUrl('report-photos', 'photos/pic.jpg');
            expect(result).toEqual({
                ok: false,
                reason: 'offline',
                message: 'TypeError: Failed to fetch',
            });
        });

        it('classifies thrown network error exception as reason: offline', async () => {
            mockCreateSignedUrl.mockRejectedValueOnce(new Error('Network request failed'));

            const result = await getSignedUrl('report-photos', 'photos/pic.jpg');
            expect(result).toEqual({
                ok: false,
                reason: 'offline',
                message: 'Network request failed',
            });
        });

        it('classifies 401/403 status and unauthorized messages as reason: unauthorized', async () => {
            mockCreateSignedUrl.mockResolvedValueOnce({
                data: null,
                error: { message: 'JWT expired or invalid token', status: 401 },
            });

            const result = await getSignedUrl('avatars', 'user/avatar.jpg');
            expect(result).toEqual({
                ok: false,
                reason: 'unauthorized',
                message: 'JWT expired or invalid token',
            });
        });

        it('classifies unexpected errors as reason: unknown', async () => {
            mockCreateSignedUrl.mockResolvedValueOnce({
                data: null,
                error: { message: 'Internal server error 500', status: 500 },
            });

            const result = await getSignedUrl('report-photos', 'photos/pic.jpg');
            expect(result).toEqual({
                ok: false,
                reason: 'unknown',
                message: 'Internal server error 500',
            });
        });
    });

    describe('timeout handling', () => {
        it('resolves to reason: offline when request times out without leaking timer', async () => {
            mockCreateSignedUrl.mockImplementationOnce(() => new Promise((resolve) => setTimeout(resolve, 200)));

            const result = await getSignedUrl('report-photos', 'photos/slow.jpg', 3600, 50);
            expect(result).toEqual({
                ok: false,
                reason: 'offline',
                message: expect.stringMatching(/timed out/i),
            });
        });
    });
});

describe('Report HTML generation with offline/missing logos (Step 5a)', () => {
    const mockProject: Project = {
        id: 'proj-1',
        name: 'Marina Towers',
        location: 'Dubai Marina',
        client: 'Emaar',
        status: 'active',
        createdAt: '2026-08-01T00:00:00Z',
        updatedAt: '2026-08-01T00:00:00Z',
        syncStatus: 'synced',
        employerLogo: undefined,
        consultantLogo: undefined,
        buildings: [{ id: 'bldg-1', code: 'A', name: 'Tower A' }],
    };

    const mockSnags: ProjectSnag[] = [
        {
            id: 'snag-1',
            projectId: 'proj-1',
            buildingId: 'bldg-1',
            floor: 1,
            flat: 101,
            seq: 1,
            description: 'Paint scratch on door frame',
            status: 'open',
            severity: 'minor',
            areaType: 'unit',
            room: 'Living Room',
            trade: 'Painting',
            photos: [],
            createdAt: '2026-08-03T10:00:00Z',
        },
    ];

    it('produces valid HTML with client name in header placeholder when logo cannot be resolved', () => {
        const html = generateSnagReportHTML(mockSnags, mockProject, { format: 'detailed' });

        expect(html).toContain('<!DOCTYPE html>');
        expect(html).toContain('SNAG REPORT');
        expect(html).toContain('Marina Towers');
        expect(html).toContain('Emaar');
    });

    it('falls back to project.name then MAIN CONTRACTOR when client is absent', () => {
        const projectEmptyClient: Project = { ...mockProject, client: '' };
        const htmlNoClient = generateSnagReportHTML(mockSnags, projectEmptyClient, { format: 'detailed' });
        expect(htmlNoClient).toContain('Marina Towers');

        const projectUndefClient: Project = { ...mockProject, client: undefined as any };
        const htmlUndef = generateSnagReportHTML(mockSnags, projectUndefClient, { format: 'detailed' });
        expect(htmlUndef).toContain('Marina Towers');

        const projectNoNameNoClient: Project = { ...mockProject, client: '', name: '' };
        const htmlEmpty = generateSnagReportHTML(mockSnags, projectNoNameNoClient, { format: 'detailed' });
        expect(htmlEmpty).toContain('MAIN CONTRACTOR');

        const projectWithSpecialChars: Project = { ...mockProject, client: 'A & B <Contractors> "LLC"' };
        const htmlEscaped = generateSnagReportHTML(mockSnags, projectWithSpecialChars, { format: 'detailed' });
        expect(htmlEscaped).toContain('A &amp; B &lt;Contractors&gt; &quot;LLC&quot;');
    });

    it('contains no empty <img tags with missing or empty src attributes', () => {
        const html = generateSnagReportHTML(mockSnags, mockProject, { format: 'detailed' });

        const emptyImgMatches = html.match(/<img[^>]*src=["']\s*["']/g);
        expect(emptyImgMatches).toBeNull();

        const projectWithEmptyLogos: Project = {
            ...mockProject,
            employerLogo: '',
            consultantLogo: 'https://unresolved.storage.url/logo.png',
            contractorLogos: ['not-base64'],
        };
        const htmlEmptyLogos = generateSnagReportHTML(mockSnags, projectWithEmptyLogos, { format: 'detailed' });
        const emptyImgMatches2 = htmlEmptyLogos.match(/<img[^>]*src=["']\s*["']/g);
        expect(emptyImgMatches2).toBeNull();
    });

    it('renders two <img> tags and no placeholder when snag has two data:image base64 photos', () => {
        const base64Photo1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const base64Photo2 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        const snagsWithPhotos: ProjectSnag[] = [
            {
                ...mockSnags[0],
                photos: [base64Photo1, base64Photo2],
            },
        ];

        const html = generateSnagReportHTML(snagsWithPhotos, mockProject, { format: 'detailed' });
        const imgMatches = html.match(/<img[^>]*>/g);
        expect(imgMatches).toHaveLength(2);
        expect(html).not.toContain('No Context Photo');
        expect(html).not.toContain('No Detail Photo');
    });

    it('renders two <img> tags and no placeholder when snag has two https:// URLs', () => {
        const httpPhoto1 = 'https://example.com/photos/snag-context.jpg';
        const httpPhoto2 = 'https://example.com/photos/snag-detail.jpg';
        const snagsWithHttpPhotos: ProjectSnag[] = [
            {
                ...mockSnags[0],
                photos: [httpPhoto1, httpPhoto2],
            },
        ];

        const html = generateSnagReportHTML(snagsWithHttpPhotos, mockProject, { format: 'detailed' });
        const imgMatches = html.match(/<img[^>]*>/g);
        expect(imgMatches).toHaveLength(2);
        expect(html).not.toContain('No Context Photo');
        expect(html).not.toContain('No Detail Photo');
        expect(html).toContain('src="https://example.com/photos/snag-context.jpg"');
        expect(html).toContain('src="https://example.com/photos/snag-detail.jpg"');
    });
});
