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
        
        // Default (2-up) should SHOULD contain Floor headers
        expect(html).toContain('Floor 1');
    });
});
