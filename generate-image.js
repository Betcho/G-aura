export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, conversation_id, conversation_title } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  const apiKey = process.env.KIE_AI_API_KEY;
  const apiEndpoint =
    process.env.KIE_AI_API_ENDPOINT ||
    'https://api.kie.ai/v1/images/generations';
  const model = process.env.KIE_AI_MODEL || 'nano-banana-pro';

  let imageUrl = null;
  let source = 'pollinations';

  // ── Attempt Kie AI (Nano Banana Pro) ──
  if (apiKey) {
    try {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          prompt: prompt,
          size: '1024x1024',
          n: 1,
          response_format: 'url',
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Support multiple response formats
        if (data?.data?.[0]?.url) imageUrl = data.data[0].url;
        else if (data?.image_url) imageUrl = data.image_url;
        else if (data?.images?.[0]) imageUrl = data.images[0];
        else if (data?.output?.image_url) imageUrl = data.output.image_url;
        else if (data?.result?.url) imageUrl = data.result.url;
        else if (data?.url) imageUrl = data.url;

        if (imageUrl) {
          source = 'kie-ai';
        } else {
          console.error(
            'Kie AI: Could not extract image URL from response:',
            JSON.stringify(data).slice(0, 500)
          );
        }
      } else {
        const errorBody = await response.text().catch(() => '');
        console.error('Kie AI API error:', response.status, errorBody.slice(0, 500));
      }
    } catch (error) {
      console.error('Kie AI API exception:', error?.message || error);
    }
  } else {
    console.warn('KIE_AI_API_KEY not set — using Pollinations.ai fallback');
  }

  // ── Fallback: Pollinations.ai (free, real AI generation) ──
  if (!imageUrl) {
    const seed = Math.floor(Math.random() * 100000);
    imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      prompt
    )}?width=1024&height=1024&seed=${seed}&nologo=true`;
  }

  // Save to Supabase (non-blocking)
  saveToSupabase({
    conversation_id: conversation_id || 'default',
    conversation_title: conversation_title || prompt.slice(0, 40),
    message: prompt,
    response: `Generated image for: "${prompt}"`,
    image_url: imageUrl,
  }).catch((err) => console.warn('Supabase save error:', err?.message));

  return res.status(200).json({
    image_url: imageUrl,
    source: source,
    model: source === 'kie-ai' ? model : 'pollinations',
    prompt: prompt,
  });
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
