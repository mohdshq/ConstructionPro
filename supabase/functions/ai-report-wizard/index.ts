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
The user is dictating their daily report summary. 
First, transcribe the audio verbatim internally, preserving numbers and units exactly as spoken.
Second, extract the details into a structured JSON object.
Schema:
{
  "transcript": "verbatim transcription of what was said",
  "manpowerMainContractor": "",
  "manpowerSubcontractors": "",
  "manpowerOthers": "",
  "manpowerTotal": "",
  "climateHumidity": "",
  "climateTemp": "",
  "climateVisibility": "",
  "climateWindSpeed": "",
  "mainContractorStaff": [ { "description": "", "count": "" } ],
  "subcontractorStaff":  [ { "name": "", "count": "" } ],
  "equipment":           [ { "description": "", "count": "" } ],
  "mainContractorLabor": [ { "trade": "", "inHouse": "", "supply": "" } ],
  "subcontractorLabor":  [ { "name": "", "count": "" } ],
  "nightShift":          [ { "trade": "", "count": "" } ],
  "activitiesProgress":  [ { "activityName": "", "uom": "", "totalQty": "", "prevQty": "", "todayQty": "" } ],
  "areasOfConcern":      [ { "location": "", "concern": "", "action": "" } ]
}
Numbers only, no labels. Every manpower/count/quantity/climate field must contain ONLY the digits. If the user says 'total manpower three hundred fifty six', output manpowerTotal: "356" — never "total manpower 356". Strip all words, labels, and units from numeric fields.
Interpret natural speech and route information to the correct field even if the user doesn't name the field. 'We had 489 from the main contractor and 175 subs' → manpowerMainContractor: '489', manpowerSubcontractors: '175'. 'Leak in basement 2' → an areasOfConcern entry. The user will NOT speak field names; infer them.
CRITICAL: 'Manpower' and 'Staff' are TWO SEPARATE, INDEPENDENT inputs. Never compute one from the other.

MANPOWER fields (manpowerMainContractor, manpowerSubcontractors, manpowerOthers, manpowerTotal) hold BULK HEADCOUNT NUMBERS that the user states explicitly (e.g. 'main contractor manpower is 489', 'subcontractors 175'). Use ONLY the numbers the user actually says. NEVER calculate manpower by counting staff roles.

STAFF fields (mainContractorStaff, subcontractorStaff with {name/description, count}) hold NAMED ROLES/POSITIONS the user lists (e.g. 'project director, project manager, two site engineers'). Populate these ONLY from explicitly named roles.

If the user gives manpower numbers but no roles → fill manpower, leave staff arrays [].

If the user lists roles but no bulk manpower → fill staff arrays, leave manpower fields "" (empty). Do NOT count the roles and put that count in manpower.

If the user gives BOTH → fill both independently from what was said.

Same rule for mainContractorLabor / subcontractorLabor (trades) — these are independent of the manpower totals.
When the user mentions any work activity, ALWAYS create an activitiesProgress entry. If they state a quantity and unit, put the number in todayQty (and totalQty if a total is given) and the unit in uom. Example: 'poured 40 cubic meters of concrete on level 6' → { "activityName": "Level 6 concrete pour", "uom": "m3", "todayQty": "40" }. Never drop spoken quantities.
Only include mentioned items; unmentioned arrays return [], unmentioned scalars return "". Never invent.
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
    let modelName = await getBestGeminiModel(apiKey, requireVision);
    console.log('[ai-report-wizard] using primary model:', modelName);

    const parts: any[] = [];

    // Add audio if present
    if (audioBase64) {
        // Strip data prefix if present
        const matches = audioBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        let mime = audioMimeType || 'audio/mp4';
        let b64Data = audioBase64;
        
        if (matches && matches.length === 3) {
            mime = matches[1];
            b64Data = matches[2];
        }

        if (mime.includes('m4a') || mime.includes('x-m4a')) {
            mime = 'audio/mp4';
        } else if (mime.includes('3gp') || mime.includes('3gpp')) {
            mime = 'audio/aac';
        } else if (mime.includes('caf')) {
            mime = 'audio/aac';
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

    const callGemini = async (model: string) => {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: 'user', parts: parts }],
                generationConfig: { temperature: 0.1, responseMimeType: "application/json" }
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
        modelName = await getBestGeminiModel(apiKey, requireVision, [modelName]);
        console.log('[ai-report-wizard] using fallback model:', modelName);
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
