export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history, conversation_id, conversation_title } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const apiKey = process.env.CEREBRAS_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'CEREBRAS_API_KEY not configured in Vercel environment variables' });
  }

  try {
    const messages = [
      {
        role: 'system',
        content:
          'You are G-aura, a futuristic AI assistant. You are intelligent, precise, fast, and helpful. ' +
          'Respond in a clear, well-structured manner. Use markdown formatting (bold, lists, etc.) when appropriate. ' +
          'Keep responses concise but thorough. You have image generation capabilities when the user switches to Image Mode.',
      },
      ...(Array.isArray(history) ? history.slice(-10) : []),
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama3.1-8b',
        messages,
        max_tokens: 1024,
        temperature: 0.7,
        top_p: 0.9,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Cerebras API error:', JSON.stringify(data));
      return res.status(response.status).json({
        error: data?.error?.message || data?.message || 'Cerebras API error',
      });
    }

    const reply =
      data?.choices?.[0]?.message?.content ||
      'I apologize, I could not generate a response. Please try again.';

    // Save to Supabase (non-blocking — don't fail the response if DB save fails)
    saveToSupabase({
      conversation_id: conversation_id || 'default',
      conversation_title: conversation_title || message.slice(0, 40),
      message: message,
      response: reply,
      image_url: null,
    }).catch((err) => console.warn('Supabase save error:', err?.message));

    return res.status(200).json({ response: reply });
  } catch (error) {
    console.error('Chat API exception:', error?.message || error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Save to Supabase via REST API ──
async function saveToSupabase(data) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.warn('SUPABASE_URL or SUPABASE_ANON_KEY not set — skipping save');
    return;
  }

  const response = await fetch(`${url}/rest/v1/chat_history`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    console.error('Supabase save failed:', response.status, errText);
  }
}
