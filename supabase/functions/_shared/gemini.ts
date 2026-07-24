// Module-level cache — persists across invocations while the function instance is warm
let cachedModel: string | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function getBestGeminiModel(
    apiKey: string,
    requireVision: boolean = false,
    excludeModels: string[] = []
): Promise<string> {
    const fallbackModel = 'gemini-2.5-flash';
    const preferences = ['gemini-2.5-flash', 'gemini-3-flash', 'gemini-3.5-flash', 'gemini-2.0-flash'];

    // Serve from cache unless we're being asked to exclude the cached model (failover path)
    const now = Date.now();
    if (cachedModel && now < cacheExpiry && !excludeModels.includes(cachedModel)) {
        return cachedModel;
    }

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) return fallbackModel;

        const data = await response.json();
        const models = data.models || [];
        const availableModels = models
            .filter((m: any) => m.name.startsWith('models/gemini') && (m.supportedGenerationMethods || []).includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''))
            .filter((m: string) => !excludeModels.includes(m));

        for (const pref of preferences) {
            if (availableModels.includes(pref)) {
                if (excludeModels.length === 0) { cachedModel = pref; cacheExpiry = now + CACHE_TTL_MS; }
                return pref;
            }
        }
        const flashModels = availableModels.filter((m: string) => m.includes('flash') && !m.includes('embedding') && !m.includes('preview'));
        if (flashModels.length > 0) {
            if (excludeModels.length === 0) { cachedModel = flashModels[0]; cacheExpiry = now + CACHE_TTL_MS; }
            return flashModels[0];
        }
        return availableModels[0] || fallbackModel;
    } catch (e) {
        console.error("Error discovering models:", e);
        return fallbackModel;
    }
}
