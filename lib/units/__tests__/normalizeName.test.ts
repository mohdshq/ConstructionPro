import { normalizeName, namesMatch, normalizeCompanyName, companyNamesMatch } from '../normalizeName';
import { ROOM_PRESETS } from '../roomPresets';

describe('normalizeName', () => {
    it('normalizes standard strings with title casing', () => {
        expect(normalizeName("guest wc")).toBe("Guest WC");
        expect(normalizeName("MASTER bedroom")).toBe("Master Bedroom");
        expect(normalizeName("kitchen")).toBe("Kitchen");
    });

    it('preserves apostrophes and lowercases what follows', () => {
        expect(normalizeName("maid's room")).toBe("Maid's Room");
        expect(normalizeName("MAID'S ROOM")).toBe("Maid's Room");
    });

    it('correctly compares strings for dedup matching', () => {
        expect(namesMatch("Guest WC", "guest wc")).toBe(true);
        expect(namesMatch("Maid's Room", "maid's room")).toBe(true);
        expect(namesMatch("Hallway/Corridor", "hallway/corridor")).toBe(true);
        expect(namesMatch("Kitchen", "Bedroom")).toBe(false);
    });

    it('round-trips all ROOM_PRESETS unchanged', () => {
        ROOM_PRESETS.forEach(preset => {
            expect(normalizeName(preset)).toBe(preset);
        });
    });
});

describe('normalizeCompanyName', () => {
    it('normalizes lowercase strings with title casing', () => {
        expect(normalizeCompanyName("main contractor")).toBe("Main Contractor");
        expect(normalizeCompanyName("abc contracting")).toBe("Abc Contracting");
    });

    it('preserves existing uppercase letters', () => {
        expect(normalizeCompanyName("EMAAR")).toBe("EMAAR");
        expect(normalizeCompanyName("ABC MEP LLC")).toBe("ABC MEP LLC");
        expect(normalizeCompanyName("Al-Futtaim")).toBe("Al-Futtaim");
    });

    it('correctly compares strings for dedup matching', () => {
        expect(companyNamesMatch("EMAAR", "emaar")).toBe(true);
        expect(companyNamesMatch("Main Contractor", "main contractor")).toBe(true);
        expect(companyNamesMatch("ABC MEP LLC", "abc mep llc")).toBe(true);
        expect(companyNamesMatch("Al-Futtaim", "al-futtaim")).toBe(true);
        expect(companyNamesMatch("EMAAR", "Nakheel")).toBe(false);
    });
});
