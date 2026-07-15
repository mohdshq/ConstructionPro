import { DAILY_SECTIONS, getSectionLabel } from '../dailySections';
import fs from 'fs';
import path from 'path';
import { generateDailyReportHTML } from '../templates/DailyReportHTML';

describe('dailySections', () => {
    it('numbered sections yield gapless 1..N', () => {
        let expectedNumber = 1;
        DAILY_SECTIONS.forEach((section) => {
            const label = getSectionLabel(section.key);
            if (section.numbered) {
                expect(label).toMatch(new RegExp(`^${expectedNumber}\\. `));
                expect(label).toBe(`${expectedNumber}. ${section.title}`);
                expectedNumber++;
            }
        });
    });

    it('unnumbered sections return title only', () => {
        DAILY_SECTIONS.forEach((section) => {
            if (!section.numbered) {
                const label = getSectionLabel(section.key);
                expect(label).toBe(section.title);
            }
        });
    });

    it('getSectionLabel(key) returns identical values for specific keys', () => {
        expect(getSectionLabel('general')).toBe('General Information');
        expect(getSectionLabel('manpower')).toBe('1. Manpower');
        expect(getSectionLabel('logos')).toBe('Project Logos');
        expect(getSectionLabel('equipment')).toBe('2. Equipment & Vehicles');
        expect(getSectionLabel('activities')).toBe('3. On-Going Activities');
        expect(getSectionLabel('concerns')).toBe('4. Areas of Concern');
        expect(getSectionLabel('delays')).toBe('5. Delays / Disruptions');
        expect(getSectionLabel('photos')).toBe('Photographic Evidence');
        expect(getSectionLabel('aiSummary')).toBe('AI Executive Summary');
    });

    it('throws error for unknown keys', () => {
        expect(() => getSectionLabel('unknownKey')).toThrow('Unknown daily section: unknownKey');
    });

    it('no literal N. prefix regex still appears in DailyReportHTML.ts section headers', () => {
        const filePath = path.join(__dirname, '../templates/DailyReportHTML.ts');
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Assert getSectionLabel is never called with a sub-section name
        expect(content.includes("getSectionLabel('overview')")).toBe(false);
        expect(content.includes("getSectionLabel('summaries')")).toBe(false);
        expect(content.includes("getSectionLabel('details')")).toBe(false);

        // Generated HTML contains no top-level number outside a .section-header element
        // We'll generate a dummy HTML and test it.
        const dummyData = {
            manpower: [],
            equipment: [],
            activitiesProgress: [],
            areasOfConcern: [],
            delays: [],
        };
        const dummyReport = { author: 'Test' } as any;
        const dummyProject = { name: 'Test' } as any;
        
        const html = generateDailyReportHTML(dummyData, dummyReport, dummyProject);
        
        // Regex to find a number followed by a dot and space inside a heading but NOT inside section-header
        // First find all tags that look like headers
        const headingRegex = /<(div|th)[^>]*class="(section-heading|blue-hdr)"[^>]*>(.*?)<\/(div|th)>/gi;
        let match;
        while ((match = headingRegex.exec(html)) !== null) {
            const innerText = match[3];
            // Check if innerText starts with a number like "1. "
            expect(innerText).not.toMatch(/^\d+\.\s/);
        }
    });
});
