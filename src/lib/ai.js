/**
 * ai.js
 * AI Rule Suggester powered by Claude API.
 * Requires VITE_ANTHROPIC_API_KEY environment variable.
 */

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

export async function suggestRules(businessDescription, existingRules = []) {
  if (!API_KEY) {
    throw new Error('ANTHROPIC API KEY NOT SET. ADD VITE_ANTHROPIC_API_KEY TO VERCEL ENV VARS.')
  }

  const systemPrompt = `You are an expert CFO and DeFi treasury manager specializing in on-chain payment automation on Arbitrum.

A user has deployed a CFO Agent smart contract that automates payments with two rule types:
1. SCHEDULED: Execute at fixed intervals (hourly, daily, weekly, monthly)
2. CONDITIONAL: Execute when treasury balance exceeds a threshold

Available tokens: USDC, ETH

Analyze their business and suggest 3-5 optimal automation rules.

Respond ONLY with a valid JSON array. No markdown, no explanation, just the array:
[
  {
    "name": "RULE NAME IN CAPS MAX 20 CHARS",
    "type": "SCHEDULED",
    "token": "USDC",
    "recipient": "0x0000000000000000000000000000000000000000",
    "amount": "500",
    "limit": "600",
    "interval": "604800",
    "condVal": "",
    "reasoning": "One sentence explaining why this rule helps their specific business"
  }
]

For SCHEDULED: interval in seconds. 3600=hourly, 86400=daily, 604800=weekly, 2592000=monthly.
For CONDITIONAL: condVal=threshold in token units, interval="0".
Keep amounts realistic for the business described.`

  const userPrompt = `Business: ${businessDescription}

Existing rules: ${existingRules.length > 0 ? existingRules.map(r => `${r.name} (${r.type})`).join(', ') : 'none'}

Generate the best 3-5 automation rules for this business.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error?.message || `API ERROR ${response.status}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || '[]'

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    throw new Error('FAILED TO PARSE AI RESPONSE')
  }
}
