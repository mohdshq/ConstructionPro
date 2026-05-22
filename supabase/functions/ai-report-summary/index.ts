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

    const modelName = await getBestGeminiModel(apiKey, false)

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
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
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate response')
    }

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
