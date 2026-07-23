export async function getBestGeminiModel(apiKey: string, requireVision: boolean = false, excludeModels: string[] = []): Promise<string> {
    const preferences = ['gemini-2.5-flash', 'gemini-3-flash', 'gemini-3.5-flash', 'gemini-2.0-flash'];
    for (const pref of preferences) {
        if (!excludeModels.includes(pref)) return pref;
    }
    return 'gemini-2.5-flash';
}
