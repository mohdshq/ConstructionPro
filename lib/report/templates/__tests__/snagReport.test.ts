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
            trade: 'Carpentry',
            photos: ['data:image/png;base64,mock'],
            createdAt: new Date().toISOString(),
        },
        {
            id: 'snag-2',
            projectId: 'proj-1',
            buildingId: 'bldg-1',
            floor: 1,
            flat: 2,
            seq: 2,
            description: 'Paint scratch',
            status: 'in_progress',
            severity: 'cosmetic',
            areaType: 'common',
            trade: 'Painting',
            photos: [],
            createdAt: new Date().toISOString(),
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
    });

    it('generates the summary report without throwing', () => {
        const html = generateSnagReportHTML(mockSnags, mockProject, { format: 'summary' });
        expect(html).toContain('SNAG REPORT');
        expect(html).toContain('101-001');
        expect(html).toContain('Fix the door');
        expect(html).toContain('102-002');
        expect(html).toContain('Paint scratch');
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
            } as ProjectSnag
        ];
        
        const html = generateSnagReportHTML(multiBldgSnags, multiBldgProject, { format: 'detailed' });
        expect(html).toContain('A101-001'); // Building 1
        expect(html).toContain('A102-002'); // Building 1
        expect(html).toContain('B503-001'); // Building 2, floor 5, flat 3 -> 503
    });

});
