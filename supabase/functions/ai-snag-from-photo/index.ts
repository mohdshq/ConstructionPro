import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { getBestGeminiModel, parseGeminiJson } from '../_shared/gemini.ts'

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
      return new Response(JSON.stringify({ error: 'GEMINI_API_KEY is not configured' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      })
    }
    
    if (!base64Image) {
      return new Response(JSON.stringify({ error: 'base64Image is required' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    // Extract mime type and raw base64 data
    const matches = base64Image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return new Response(JSON.stringify({ error: 'Invalid base64Image format. Expected data:image/...;base64,...' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }
    const mimeType = matches[1];
    const dataString = matches[2];

    let textPrompt = "Identify the construction defect in this image.";
    if (context) {
      textPrompt += ` Additional context: ${context}`;
    }

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
                { inlineData: { mimeType, data: dataString } },
                { text: textPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 }
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

    const executeAnalysis = async (model: string): Promise<{ snag: any }> => {
      const delays = [400, 1200];
      let finalResponse: Response | undefined;
      let finalResponseText = '';
      let success = false;

      for (let attempt = 0; attempt <= 2; attempt++) {
        if (attempt > 0) {
          await new Promise(r => setTimeout(r, delays[attempt - 1]));
        }
        try {
          const { response, responseText } = await callGemini(model);
          finalResponse = response;
          finalResponseText = responseText;
          
          if (response.ok) {
            success = true;
            break;
          } else if (!isTransientError(response.status, responseText)) {
            break;
          }
        } catch (e) {
          // Network error
        }
      }

      if (!success || !finalResponse || !finalResponse.ok) {
        if (finalResponse && isTransientError(finalResponse.status, finalResponseText)) {
          const err: any = new Error("The AI service is busy right now. Please try again in a moment.");
          err.status = 503;
          throw err;
        }
        
        let parsedErr: any = {};
        try { parsedErr = JSON.parse(finalResponseText || '{}'); } catch(e) {}
        throw new Error(parsedErr?.error?.message || 'Failed to generate response');
      }

      let data: any;
      try {
        data = JSON.parse(finalResponseText);
      } catch (e) {
        console.error(`[ai-snag-from-photo] Failed to parse API envelope JSON. Model=${model} raw=${finalResponseText.slice(0, 500)}`);
        throw new Error('AI service returned an invalid response envelope');
      }

      if (!data.candidates || data.candidates.length === 0) {
        const blockReason = data.promptFeedback?.blockReason;
        console.error(`[ai-snag-from-photo] No candidates returned. Model=${model} blockReason=${blockReason}`);
        throw new Error(`AI response blocked: ${blockReason || 'No candidates returned'}`);
      }

      const candidate = data.candidates[0];
      const finishReason = candidate.finishReason;
      const aiResponse = candidate.content?.parts?.[0]?.text || '';

      if (finishReason && finishReason !== 'STOP') {
        console.error(`[ai-snag-from-photo] Non-STOP finishReason. Model=${model} finishReason=${finishReason} raw=${aiResponse.slice(0, 500)}`);
        if (finishReason === 'SAFETY') {
          throw new Error(`AI generation blocked by safety filters (${finishReason})`);
        } else if (finishReason === 'MAX_TOKENS') {
          throw new Error(`AI response exceeded maximum tokens (${finishReason})`);
        } else {
          throw new Error(`AI generation incomplete (finishReason: ${finishReason})`);
        }
      }

      if (!aiResponse.trim()) {
        console.error(`[ai-snag-from-photo] Empty response text. Model=${model} finishReason=${finishReason}`);
        throw new Error('AI returned empty response');
      }

      let parsedJson: any;
      try {
        parsedJson = parseGeminiJson(aiResponse);
      } catch (e) {
        console.error(`[ai-snag-from-photo] JSON parse failed. Model=${model} finishReason=${finishReason} raw=${aiResponse.slice(0, 500)}`);
        throw new Error("AI returned invalid format");
      }

      if (!parsedJson || typeof parsedJson !== 'object' || !parsedJson.issue || typeof parsedJson.issue !== 'string' || !parsedJson.issue.trim()) {
        console.error(`[ai-snag-from-photo] Parsed object missing issue field. Model=${model} finishReason=${finishReason} parsed=${JSON.stringify(parsedJson)} raw=${aiResponse.slice(0, 500)}`);
        throw new Error("AI response missing issue description");
      }

      return { snag: parsedJson };
    };

    let modelName = await getBestGeminiModel(apiKey, true);
    console.log('[ai-snag-from-photo] using primary model:', modelName);

    let snagResult: any = null;
    let lastError: any = null;

    // Server-side retry with primary model (up to 2 attempts for parse/empty failures)
    for (let parseAttempt = 0; parseAttempt < 2; parseAttempt++) {
      try {
        if (parseAttempt > 0) {
          console.log(`[ai-snag-from-photo] Retrying with model=${modelName} (attempt ${parseAttempt + 1})...`);
        }
        const result = await executeAnalysis(modelName);
        snagResult = result.snag;
        break;
      } catch (err: any) {
        lastError = err;
        if (err.status === 503) {
          // If service is busy (429/503), do not repeatedly hammer
          break;
        }
      }
    }

    // If primary model failed all attempts, try fallback model once
    if (!snagResult && lastError?.status !== 503) {
      const fallbackModel = await getBestGeminiModel(apiKey, true, [modelName]);
      if (fallbackModel !== modelName) {
        console.log('[ai-snag-from-photo] using fallback model:', fallbackModel);
        try {
          const result = await executeAnalysis(fallbackModel);
          snagResult = result.snag;
        } catch (err) {
          lastError = err;
        }
      }
    }

    if (!snagResult) {
      const status = lastError?.status === 503 ? 503 : 500;
      return new Response(JSON.stringify({ error: lastError?.message || 'Failed to generate response' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status,
      });
    }

    return new Response(JSON.stringify({ snag: snagResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error('Error in ai-snag-from-photo:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
})
