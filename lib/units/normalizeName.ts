export const ACRONYMS = new Set(['WC', 'MEP', 'AC', 'TV', 'A/C']);

export function normalizeName(input: string): string {
    return input
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(word => {
            const upper = word.toUpperCase();
            if (ACRONYMS.has(upper)) return upper;                 // WC, MEP → uppercase
            
            return word
                .split(/(['’\/])/)                                 // keep apostrophes and slashes as tokens
                .map((seg, i, arr) => {
                    if (/['’\/]/.test(seg)) return seg;            // It's a delimiter
                    
                    // If it's after an apostrophe, lowercase it (e.g., "s" in "Maid's")
                    if (i > 0 && /['’]/.test(arr[i-1])) return seg.toLowerCase();
                    
                    // Otherwise, titlecase it
                    return seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
                })
                .join('');
        })
        .join(' ');
}

// Case-insensitive equality for room dedup checks
export function namesMatch(a: string, b: string): boolean {
    return normalizeName(a).toLowerCase() === normalizeName(b).toLowerCase();
}

export function normalizeCompanyName(input: string): string {
    return input
        .trim()
        .replace(/\s+/g, ' ')
        .split(' ')
        .map(word => {
            if (word.length === 0) return word;
            // Leave alone if it contains ANY uppercase already (intentional caps/acronyms/brands)
            if (/[A-Z]/.test(word)) return word;
            // Pure-lowercase word → capitalize first letter only
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

// Case-insensitive equality for company dedup checks
export function companyNamesMatch(a: string, b: string): boolean {
    return normalizeCompanyName(a).toLowerCase() === normalizeCompanyName(b).toLowerCase();
}
