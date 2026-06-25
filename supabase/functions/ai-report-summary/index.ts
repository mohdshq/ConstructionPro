import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { getBestGeminiModel } from '../_shared/gemini.ts'

const SYSTEM_PROMPT = `
You are an expert construction site manager.
Your task is to analyze the provided construction report data (JSON) and generate a concise, 3-bullet executive summary.
Focus on:
1. Overall progress or key activities completed.
2. Major issues, bottlenecks, or safety incidents identified.
3. Next steps or required actions.
Format the response strictly as a bulleted list using the '-' character, with no markdown wrapping. Keep it very professional and concise.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { reportData } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }
    
    if (!reportData) {
        throw new Error('reportData is required')
    }

    let modelName = await getBestGeminiModel(apiKey, false)
    console.log('[ai-report-summary] using primary model:', modelName);

    const callGemini = async (model: string) => {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: `Here is the report data: \n${JSON.stringify(reportData, null, 2)}` }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 500,
                }
            })
        });
        const responseText = await response.text();
        return { response, responseText };
    };

    const isTransientError = (status: number, text: string) => {
        if ([429, 500, 503].includes(status)) return true;
        const lower = text.toLowerCase();
        if (lower.includes('high demand') || lower.includes('overloaded') || lower.includes('try again later')) return true;
        return false;
    };

    const delays = [400, 1200];
    let finalResponse;
    let finalResponseText = '';
    let success = false;

    // Try primary model
    for (let attempt = 0; attempt <= 2; attempt++) {
        if (attempt > 0) {
            await new Promise(r => setTimeout(r, delays[attempt - 1]));
        }
        try {
            const { response, responseText } = await callGemini(modelName);
            finalResponse = response;
            finalResponseText = responseText;
            
            if (response.ok) {
                success = true;
                break;
            } else if (!isTransientError(response.status, responseText)) {
                // Persistent error, break and throw
                break;
            }
        } catch (e) {
            // Network error
        }
    }

    if (!success) {
        // Fallback model
        modelName = await getBestGeminiModel(apiKey, false, [modelName]);
        console.log('[ai-report-summary] using fallback model:', modelName);
        try {
            const { response, responseText } = await callGemini(modelName);
            finalResponse = response;
            finalResponseText = responseText;
            if (response.ok) {
                success = true;
            }
        } catch (e) {
            // Network error
        }
    }

    if (!success || !finalResponse || !finalResponse.ok) {
        if (finalResponse && isTransientError(finalResponse.status, finalResponseText)) {
            return new Response(JSON.stringify({ error: "The AI service is busy right now. Please try again in a moment." }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 503,
            });
        }
        
        let parsedErr = {};
        try { parsedErr = JSON.parse(finalResponseText || '{}'); } catch(e) {}
        throw new Error((parsedErr as any).error?.message || 'Failed to generate response');
    }

    const data = JSON.parse(finalResponseText);
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '- No summary generated.'

    return new Response(JSON.stringify({ summary: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error('Error in ai-report-summary:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
