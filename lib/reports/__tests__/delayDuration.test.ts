import { parseHHMM, delayMinutes, formatDuration, totalDelayMinutes } from '../delayDuration';

describe('delayDuration', () => {
    describe('parseHHMM', () => {
        it('parses valid times', () => {
            expect(parseHHMM("08:30")).toBe(8 * 60 + 30);
            expect(parseHHMM("14:00")).toBe(14 * 60);
            expect(parseHHMM("0:00")).toBe(0);
            expect(parseHHMM("23:59")).toBe(23 * 60 + 59);
        });

        it('returns null for invalid formats or values', () => {
            expect(parseHHMM("25:00")).toBeNull();
            expect(parseHHMM("8:5")).toBeNull();
            expect(parseHHMM("")).toBeNull();
            expect(parseHHMM(undefined)).toBeNull();
            expect(parseHHMM("12:60")).toBeNull();
            expect(parseHHMM("invalid")).toBeNull();
        });
    });

    describe('delayMinutes', () => {
        it('calculates duration in minutes correctly', () => {
            expect(delayMinutes("08:30", "10:00")).toBe(90);
            expect(delayMinutes("14:00", "15:45")).toBe(105);
        });

        it('returns null if end is before start', () => {
            expect(delayMinutes("10:00", "08:30")).toBeNull();
        });

        it('returns null if input is invalid', () => {
            expect(delayMinutes("08:30", "invalid")).toBeNull();
            expect(delayMinutes(undefined, "10:00")).toBeNull();
        });
    });

    describe('formatDuration', () => {
        it('formats correctly', () => {
            expect(formatDuration(150)).toBe("2h 30m");
            expect(formatDuration(45)).toBe("45m");
            expect(formatDuration(180)).toBe("3h");
            expect(formatDuration(0)).toBe("0m");
        });
    });

    describe('totalDelayMinutes', () => {
        it('sums valid delays and skips invalid ones', () => {
            const delays = [
                { startTime: "08:00", endTime: "09:00" }, // 60
                { startTime: "10:00", endTime: "09:00" }, // invalid
                { startTime: "11:30", endTime: "12:00" }, // 30
                { startTime: "", endTime: "12:00" },      // invalid
            ];
            expect(totalDelayMinutes(delays)).toBe(90);
        });
    });
});
