export async function getBestGeminiModel(apiKey: string, requireVision: boolean = false): Promise<string> {
    const fallbackModel = requireVision ? 'gemini-1.5-flash' : 'gemini-1.5-flash';
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) return fallbackModel;
        
        const data = await response.json();
        const models = data.models || [];
        
        // Find all gemini models
        const availableModels = models
            .map((m: any) => m.name.replace('models/', ''))
            .filter((m: string) => m.startsWith('gemini'));
            
        // For vision, we want pro or flash, prefer pro
        if (requireVision) {
            if (availableModels.includes('gemini-1.5-pro')) return 'gemini-1.5-pro';
            if (availableModels.includes('gemini-1.5-flash')) return 'gemini-1.5-flash';
            if (availableModels.includes('gemini-pro-vision')) return 'gemini-pro-vision';
            return availableModels[0] || fallbackModel;
        }

        // For standard chat
        if (availableModels.includes('gemini-1.5-pro')) return 'gemini-1.5-pro';
        if (availableModels.includes('gemini-1.5-flash')) return 'gemini-1.5-flash';
        if (availableModels.includes('gemini-pro')) return 'gemini-pro';

        return availableModels[0] || fallbackModel;
    } catch (e) {
        console.error("Error discovering models:", e);
        return fallbackModel;
    }
}
