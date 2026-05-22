import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { getBestGeminiModel } from '../_shared/gemini.ts'

const SYSTEM_PROMPT = `
You are an expert construction site inspector AI.
Your task is to analyze construction site photos and identify defects, snags, or incomplete work.
Return the result strictly as a valid JSON object without any markdown wrapping (no \`\`\`json).
Do not include any other text.
The JSON must have the following schema:
{
  "system": "CIVIL | MEP | ARCHITECTURAL | STRUCTURAL",
  "assetName": "Name of the element (e.g., Concrete Wall, Gypsum Ceiling, Pipe)",
  "issue": "Detailed description of the observed defect",
  "recommendation": "Suggested corrective action",
  "severity": "Low | Moderate | High"
}
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { base64Image, context } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }
    
    if (!base64Image) {
        throw new Error('base64Image is required')
    }

    // Extract mime type and raw base64 data
    const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64Image format. Expected data:image/...;base64,...');
    }
    const mimeType = matches[1];
    const dataString = matches[2];

    const modelName = await getBestGeminiModel(apiKey, true)
    
    let textPrompt = "Identify the construction defect in this image.";
    if (context) {
        textPrompt += ` Additional context: ${context}`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
            {
                role: 'user',
                parts: [
                    { inlineData: { mimeType, data: dataString } },
                    { text: textPrompt }
                ]
            }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate response')
    }

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
    
    // Validate JSON
    let parsedJson = {}
    try {
        parsedJson = JSON.parse(aiResponse)
    } catch (e) {
        console.error("AI returned invalid JSON:", aiResponse)
        throw new Error("AI returned invalid format")
    }

    return new Response(JSON.stringify({ snag: parsedJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error('Error in ai-snag-from-photo:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
