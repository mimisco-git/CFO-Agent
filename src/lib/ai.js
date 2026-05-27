/**
 * ai.js - AI Rule Suggester via Groq API
 * Groq uses llama3-8b-8192 - extremely fast, free tier available.
 * Set VITE_GROQ_API_KEY in Vercel environment variables.
 * Get your key at: https://console.groq.com
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || ''
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama3-8b-8192'

export async function suggestRules(businessDescription, existingRules = []) {
  if (!GROQ_API_KEY) {
    throw new Error('GROQ API KEY NOT SET. ADD VITE_GROQ_API_KEY TO VERCEL ENV VARS. GET FREE KEY AT console.groq.com')
  }

  const systemPrompt = `You are an expert CFO and DeFi treasury manager specializing in on-chain payment automation on Arbitrum.

A user has deployed a CFO Agent smart contract that automates payments with two rule types:
1. SCHEDULED: Execute at fixed intervals
2. CONDITIONAL: Execute when treasury balance exceeds a threshold

Available tokens: USDC, ETH

Analyze their business and suggest 3-5 optimal automation rules.

Respond ONLY with a valid JSON array. No markdown, no explanation, just raw JSON:
[
  {
    "name": "RULE NAME CAPS MAX 18 CHARS",
    "type": "SCHEDULED",
    "token": "USDC",
    "recipient": "0x0000000000000000000000000000000000000000",
    "amount": "500",
    "limit": "600",
    "interval": "604800",
    "condVal": "",
    "reasoning": "One sentence why this rule matters for their business"
  }
]

Intervals in seconds: 3600=hourly, 86400=daily, 604800=weekly, 2592000=monthly.
For CONDITIONAL rules set interval to "0" and condVal to the threshold amount.`

  const userMessage = `Business: ${businessDescription}
Existing rules: ${existingRules.length > 0 ? existingRules.map(r => `${r.name} (${r.type})`).join(', ') : 'none'}
Generate 3-5 optimal automation rules. Return only the JSON array.`

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 1000,
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `GROQ API ERROR ${response.status}`)
  }

  const data = await response.json()
  const text = data.choices?.[0]?.message?.content || '[]'

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    // Find JSON array in response
    const start = clean.indexOf('[')
    const end = clean.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error('No JSON array found')
    return JSON.parse(clean.slice(start, end + 1))
  } catch {
    throw new Error('FAILED TO PARSE AI RESPONSE. TRY AGAIN.')
  }
}
