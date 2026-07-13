import { normalizeName, namesMatch } from '../normalizeName';
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
