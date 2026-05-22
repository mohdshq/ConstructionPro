import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { getBestGeminiModel } from '../_shared/gemini.ts'

const SYSTEM_PROMPT = `
You are ConstructionPro AI, an expert construction engineer and site manager assistant.
Your goal is to provide concise, accurate, and professional answers regarding construction standards, methods, and project management.
You know about ACI, IBC, FIDIC, and general construction best practices.
Always be direct and professional.
`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messages, userMessage } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured')
    }

    const modelName = await getBestGeminiModel(apiKey, false)
    
    // Format messages for Gemini API
    const formattedMessages = (messages || []).map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }))
    
    formattedMessages.push({
      role: 'user',
      parts: [{ text: userMessage }]
    })

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: formattedMessages,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        }
      })
    })

    const data = await response.json()
    
    if (!response.ok) {
      throw new Error(data.error?.message || 'Failed to generate response')
    }

    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'I could not generate a response.'

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error) {
    console.error('Error in ai-chat:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  }
})
