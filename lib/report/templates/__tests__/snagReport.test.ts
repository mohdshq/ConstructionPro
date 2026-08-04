import { generateSnagReportHTML } from '../SnagReportHTML';
import { ProjectSnag, Project } from '../../../../store/projectsStore';

describe('generateSnagReportHTML', () => {
    const mockProject: Project = {
        id: 'proj-1',
        name: 'Test Project',
        location: 'Dubai',
        client: 'Test Client',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        syncStatus: 'synced',
        buildings: [
            { id: 'bldg-1', code: 'A', name: 'Tower A' }
        ]
    };

    const mockSnags: ProjectSnag[] = [
        {
            id: 'snag-1',
            projectId: 'proj-1',
            buildingId: 'bldg-1',
            floor: 1,
            flat: 1,
            seq: 1,
            description: 'Fix the door',
            status: 'open',
            severity: 'major',
            areaType: 'unit',
            room: 'Kitchen',
            trade: 'Carpentry',
            photos: ['data:image/png;base64,mock'],
            createdAt: '2026-07-08T10:00:00.000Z',
        },
        {
            id: 'snag-2',
            projectId: 'proj-1',
            buildingId: 'bldg-1',
            floor: 7,
            flat: undefined,
            seq: 2,
            description: 'Paint scratch',
            status: 'in_progress',
            severity: 'cosmetic',
            areaType: 'common',
            room: 'Electrical Room',
            trade: 'Painting',
            photos: [],
            createdAt: '2026-07-09T10:00:00.000Z',
        }
    ];

    const generateFiveSnags = (): ProjectSnag[] => [
        {
            id: 's-1',
            projectId: 'proj-1',
            buildingId: 'bldg-1',
            floor: 1,
            flat: 1,
            seq: 1,
            description: 'Issue 1',
            status: 'open',
            severity: 'major',
            areaType: 'unit',
            photos: [],
            createdAt: '2026-07-08T10:00:00.000Z',
        },
        {
            id: 's-2',
            projectId: 'proj-1',
            buildingId: 'bldg-1',
            floor: 1,
            flat: 2,
            seq: 2,
            description: 'Issue 2',
            status: 'open',
            severity: 'minor',
            areaType: 'unit',
            photos: [],
            createdAt: '2026-07-08T10:01:00.000Z',
        },
        {
            id: 's-3',
            projectId: 'proj-1',
            buildingId: 'bldg-1',
            floor: 1,
            flat: 3,
            seq: 3,
            description: 'Issue 3',
            status: 'in_progress',
            severity: 'critical',
            areaType: 'unit',
            photos: [],
            createdAt: '2026-07-08T10:02:00.000Z',
        },
        {
            id: 's-4',
            projectId: 'proj-1',
            buildingId: 'bldg-1',
            floor: 1,
            flat: 4,
            seq: 4,
            description: 'Issue 4',
            status: 'closed',
            severity: 'cosmetic',
            areaType: 'unit',
            photos: [],
            createdAt: '2026-07-08T10:03:00.000Z',
        },
        {
            id: 's-5',
            projectId: 'proj-1',
            buildingId: 'bldg-1',
            floor: 1,
            flat: 5,
            seq: 5,
            description: 'Issue 5',
            status: 'open',
            severity: 'minor',
            areaType: 'unit',
            photos: [],
            createdAt: '2026-07-08T10:04:00.000Z',
        },
    ];

    it('generates the detailed report without throwing', () => {
        const html = generateSnagReportHTML(mockSnags, mockProject, { format: 'detailed', filterSummary: 'All Snags' });
        expect(html).toContain('SNAG REPORT');
        expect(html).toContain('Test Project');
        expect(html).toContain('All Snags');
        expect(html).toContain('Total Snags');
        expect(html).toContain('Fix the door');
        expect(html).toContain('101-001'); // Single building -> no prefix
        expect(html).toContain('Unit 101 · Kitchen'); // tests unit room presence
        expect(html).toContain('Tower A · Floor 7 · Electrical Room'); // tests common area fallback
        expect(html).toContain('08/07/2026'); // asserts createdAt date
        expect(html).toContain('09/07/2026');
    });

    it('generates the summary report without throwing', () => {
        const html = generateSnagReportHTML(mockSnags, mockProject, { format: 'summary' });
        expect(html).toContain('SNAG REPORT');
        expect(html).toContain('C-002');
        expect(html).toContain('Paint scratch');
        expect(html).toContain('Unit 101 · Kitchen'); // Summary Location column
        expect(html).toContain('Tower A · Floor 7 · Electrical Room');
        expect(html).toContain('08/07/2026'); // asserts summary date
        expect(html).toContain('09/07/2026');
        // Summary uses a table structure instead of blocks
        expect(html).toContain('<thead>');
    });

    it('generates the detailed report with multi-building prefixing', () => {
        const multiBldgProject = {
            ...mockProject,
            buildings: [
                { id: 'bldg-1', code: 'A', name: 'Tower A' },
                { id: 'bldg-2', code: 'B', name: 'Tower B' }
            ]
        };
        const multiBldgSnags = [
            ...mockSnags,
            {
                id: 'snag-3',
                projectId: 'proj-1',
                buildingId: 'bldg-2',
                floor: 5,
                flat: 3,
                seq: 1,
                description: 'Broken window',
                status: 'open',
                severity: 'minor',
                areaType: 'unit',
                photos: [],
                createdAt: new Date().toISOString()
            } as ProjectSnag,
            {
                id: 'snag-4',
                projectId: 'proj-1',
                buildingId: 'bldg-1',
                floor: undefined,
                flat: undefined,
                seq: 3,
                description: 'Roof leak',
                status: 'open',
                severity: 'minor',
                areaType: 'roof',
                photos: [],
                createdAt: new Date().toISOString()
            } as ProjectSnag
        ];
        
        const html = generateSnagReportHTML(multiBldgSnags, multiBldgProject, { format: 'detailed' });
        expect(html).toContain('A101-001'); // Building 1 unit
        expect(html).toContain('A-C-002'); // Building 1 common
        expect(html).toContain('B503-001'); // Building 2 unit
        expect(html).toContain('A-C-003'); // Building 1 roof, no floor
        expect(html).toContain('Tower A'); // location line without floor
    });

    it('sorts snags by ref ascending (flat, then seq) within each floor', () => {
        // Reverse mockSnags to provide them out of order
        const outOfOrderSnags = [...mockSnags].reverse();
        const html = generateSnagReportHTML(outOfOrderSnags, mockProject, { format: 'detailed' });
        
        const index1 = html.indexOf('101-001');
        const index2 = html.indexOf('C-002');
        expect(index1).toBeGreaterThan(-1);
        expect(index2).toBeGreaterThan(-1);
        expect(index1).toBeLessThan(index2);
    });

    it('applies density scaling classes for snagsPerPage: 3', () => {
        const html = generateSnagReportHTML(mockSnags, mockProject, { format: 'detailed', snagsPerPage: 3 });
        expect(html).toMatch(/class="snag-block[^"]*snags-compact[^"]*snags-per-3/);
    });

    it('applies density scaling classes for snagsPerPage: 4', () => {
        const html = generateSnagReportHTML(mockSnags, mockProject, { format: 'detailed', snagsPerPage: 4 });
        expect(html).toMatch(/class="snag-block[^"]*snags-compact[^"]*snags-per-4/);
    });

    it('does not apply density classes for default snagsPerPage', () => {
        const html = generateSnagReportHTML(mockSnags, mockProject, { format: 'detailed' });
        // CSS rule *definitions* always live in <style>; assert no density class is
        // *applied* to a snag-block container element.
        expect(html).not.toMatch(/class="snag-block[^"]*snags-compact/);
        expect(html).not.toMatch(/class="snag-block[^"]*snags-per-/);
        
        // Default (2-up) should contain Floor headers
        expect(html).toContain('Floor 1');
    });

    it('chunks detailed report into exactly 3 snag-page divs for 5 snags with snagsPerPage: 2', () => {
        const snags = generateFiveSnags();
        const html = generateSnagReportHTML(snags, mockProject, { format: 'detailed', snagsPerPage: 2 });
        const pageMatches = html.match(/<div class="snag-page[^"]*">/g);
        expect(pageMatches).not.toBeNull();
        expect(pageMatches!.length).toBe(3);
    });

    it.each([2, 4])('renders every snag reference exactly once in detailed report (snagsPerPage: %d)', (perPage) => {
        const snags = generateFiveSnags();
        const html = generateSnagReportHTML(snags, mockProject, { format: 'detailed', snagsPerPage: perPage as 2 | 4 });

        // Expected refs for the 5 snags: 101-001, 102-002, 103-003, 104-004, 105-005
        const expectedRefs = ['101-001', '102-002', '103-003', '104-004', '105-005'];
        expectedRefs.forEach(ref => {
            const matches = html.match(new RegExp(`<div class="snag-ref">${ref}</div>`, 'g'));
            expect(matches).not.toBeNull();
            expect(matches!.length).toBe(1);
        });
    });

    it('suppresses page-break-after on the last snag-page', () => {
        const snags = generateFiveSnags();
        const html = generateSnagReportHTML(snags, mockProject, { format: 'detailed', snagsPerPage: 2 });
        
        // The last snag page carries the last-page class
        expect(html).toContain('class="snag-page last-page"');
        // CSS rule ensures last-of-type / last-page has page-break-after: auto
        expect(html).toContain('.snag-page:last-of-type, .snag-page.last-page { page-break-after: auto; }');
    });

    it('produces one page and no (cont.) heading for a floor with a single snag', () => {
        const singleSnag = [mockSnags[0]]; // 1 snag on floor 1
        const html = generateSnagReportHTML(singleSnag, mockProject, { format: 'detailed', snagsPerPage: 2 });
        
        const pageMatches = html.match(/<div class="snag-page[^"]*">/g);
        expect(pageMatches).not.toBeNull();
        expect(pageMatches!.length).toBe(1);
        expect(html).toContain('Floor 1');
        expect(html).not.toContain('Floor 1 (cont.)');
        expect(html).not.toContain('(cont.)');
    });

    it('preserves total count of snag-block occurrences across all perPage settings', () => {
        const snags = generateFiveSnags();
        [2, 3, 4].forEach(perPage => {
            const html = generateSnagReportHTML(snags, mockProject, { format: 'detailed', snagsPerPage: perPage as 2 | 3 | 4 });
            const blockMatches = html.match(/class="snag-block/g);
            expect(blockMatches).not.toBeNull();
            expect(blockMatches!.length).toBe(snags.length);
        });
    });

    it('includes page-break-after: always on .summary in detailed mode, but not in summary mode', () => {
        const detailedHtml = generateSnagReportHTML(mockSnags, mockProject, { format: 'detailed' });
        expect(detailedHtml).toContain('.summary { page-break-after: always; }');

        const summaryHtml = generateSnagReportHTML(mockSnags, mockProject, { format: 'summary' });
        expect(summaryHtml).not.toContain('.summary { page-break-after: always; }');
    });
});
