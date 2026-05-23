import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { getBestGeminiModel } from '../_shared/gemini.ts'

// Prompts based on step and type
const PROMPTS = {
    'snagging': {
        'context': `You are an AI assistant helping a construction inspector.
The user is providing their current location/context (e.g., building, floor, area).
Extract the location details into a JSON object.
Schema: { "building": "string", "floor": "string", "area": "string" }
If a field is not mentioned, leave it empty.`,
        
        'snag': `You are an expert construction inspector.
Analyze the provided image and the user's audio/text description to identify the defect or snag.
Output a JSON object matching this schema:
{
  "system": "CIVIL | MEP | ARCHITECTURAL | STRUCTURAL",
  "assetName": "Name of the element",
  "issue": "Detailed description of the observed defect",
  "recommendation": "Suggested corrective action",
  "severity": "Low | Moderate | High"
}
Ensure the output is strictly valid JSON without markdown wrapping.`
    },
    'daily': {
        'generate': `You are an expert construction manager.
The user is dictating their daily report summary. Extract the details into a structured JSON object.
Schema:
{
  "manpowerMainContractor": "Text summary of main contractor manpower",
  "manpowerSubcontractors": "Text summary of subcontractors",
  "manpowerOthers": "Text summary of other manpower",
  "climateHumidity": "Text or empty",
  "climateVisibility": "Text or empty",
  "climateTemp": "Text or empty",
  "climateWindSpeed": "Text or empty",
  "activities": [
    { "activityName": "string", "uom": "string", "totalQty": "string", "todayQty": "string" }
  ],
  "areasOfConcern": [
    { "location": "string", "concern": "string", "action": "string" }
  ]
}
If a specific field or array is not mentioned, leave it empty or omit it. Keep text concise and professional.
Strictly valid JSON only.`
    }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audioBase64, audioMimeType, text, imageBase64, currentStep, reportType, contextData } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    if (!reportType || !currentStep) {
        throw new Error('reportType and currentStep are required')
    }

    // Determine prompt
    // @ts-ignore
    const systemPrompt = PROMPTS[reportType]?.[currentStep];
    if (!systemPrompt) {
        throw new Error(`Invalid reportType (${reportType}) or currentStep (${currentStep})`);
    }

    const requireVision = !!imageBase64;
    const modelName = await getBestGeminiModel(apiKey, requireVision);

    const parts: any[] = [];

    // Add audio if present
    if (audioBase64) {
        // Strip data prefix if present
        const matches = audioBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        let mime = audioMimeType || 'audio/m4a';
        let b64Data = audioBase64;
        
        if (matches && matches.length === 3) {
            mime = matches[1];
            b64Data = matches[2];
        }
        parts.push({ inlineData: { mimeType: mime, data: b64Data } });
    }

    // Add image if present
    if (imageBase64) {
        const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        let mime = 'image/jpeg';
        let b64Data = imageBase64;
        if (matches && matches.length === 3) {
            mime = matches[1];
            b64Data = matches[2];
        }
        parts.push({ inlineData: { mimeType: mime, data: b64Data } });
    }

    // Add text if present
    if (text) {
        parts.push({ text: text });
    }
    
    // Add context if present
    if (contextData) {
        parts.push({ text: `Additional context from earlier steps: ${JSON.stringify(contextData)}` });
    }
    
    // Fallback if parts is empty
    if (parts.length === 0) {
        parts.push({ text: "Please generate empty structure." });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [
            {
                role: 'user',
                parts: parts
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
        throw new Error("AI returned invalid JSON format")
    }

    return new Response(JSON.stringify({ result: parsedJson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error('Error in ai-report-wizard:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
