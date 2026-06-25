export async function getBestGeminiModel(apiKey: string, requireVision: boolean = false, excludeModels: string[] = []): Promise<string> {
    const fallbackModel = 'gemini-2.5-flash';
    const preferences = ['gemini-2.5-flash', 'gemini-3-flash', 'gemini-3.5-flash', 'gemini-2.0-flash'];
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) return fallbackModel;
        
        const data = await response.json();
        const models = data.models || [];
        
        // Find all gemini models
        const availableModels = models
            .filter((m: any) => m.name.startsWith('models/gemini') && (m.supportedGenerationMethods || []).includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''))
            .filter((m: string) => !excludeModels.includes(m));
            
        for (const pref of preferences) {
            if (availableModels.includes(pref)) return pref;
        }

        // Return first flash-class model that isn't embedding or lite-preview
        const flashModels = availableModels.filter((m: string) => m.includes('flash') && !m.includes('embedding') && !m.includes('preview'));
        if (flashModels.length > 0) return flashModels[0];

        return availableModels[0] || fallbackModel;
    } catch (e) {
        console.error("Error discovering models:", e);
        return fallbackModel;
    }
}
