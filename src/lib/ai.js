/**
 * ai.js
 * AI Rule Suggester powered by Claude API.
 * User describes their business, Claude suggests optimal CFO Agent rules.
 * Targets the AI Agents prize track directly.
 */

export async function suggestRules(businessDescription, existingRules = []) {
  const systemPrompt = `You are an expert CFO and DeFi treasury manager specializing in on-chain payment automation on Arbitrum.

A user has deployed a CFO Agent smart contract that can automate payments with two types of rules:
1. SCHEDULED rules: Execute at a fixed interval (hourly, daily, weekly, monthly)
2. CONDITIONAL rules: Execute when treasury balance exceeds a threshold

Available tokens: USDC, ETH

Your job is to analyze their business and suggest 3-5 optimal automation rules.

Respond ONLY with a valid JSON array, no markdown, no explanation. Format:
[
  {
    "name": "RULE NAME IN CAPS",
    "type": "SCHEDULED" or "CONDITIONAL",
    "token": "USDC" or "ETH",
    "recipient": "0x0000000000000000000000000000000000000000",
    "amount": "500",
    "limit": "600",
    "interval": "604800",
    "condVal": "",
    "reasoning": "One sentence explaining why this rule matters for their business"
  }
]

For SCHEDULED rules: interval is in seconds. 3600=hourly, 86400=daily, 604800=weekly, 2592000=monthly.
For CONDITIONAL rules: condVal is the balance threshold in USDC or ETH units. interval should be "0".
Keep amounts realistic. Keep rule names concise, uppercase, under 20 chars.`

  const userPrompt = `Business description: ${businessDescription}

Existing rules already configured: ${existingRules.length > 0
    ? existingRules.map(r => `${r.name} (${r.type})`).join(', ')
    : 'none'}

Suggest the best automation rules for this business. Focus on practical, high-impact rules that save the most time and prevent the most financial errors.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || '[]'

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch {
    throw new Error('Failed to parse AI response')
  }
}
