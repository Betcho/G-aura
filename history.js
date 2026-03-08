export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'SUPABASE_URL or SUPABASE_ANON_KEY not configured in Vercel environment variables',
    });
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: supabaseKey,
    Authorization: `Bearer ${supabaseKey}`,
  };

  // ── GET: Load all chat history ──
  if (req.method === 'GET') {
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/chat_history?select=*&order=created_at.asc&limit=500`,
        { method: 'GET', headers }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('Supabase load error:', response.status, errText);

        // Detect specific errors
        if (errText.includes('does not exist') || response.status === 404) {
          return res.status(404).json({
            error: 'Table "chat_history" not found. Please create it in Supabase.',
          });
        }

        return res.status(response.status).json({ error: 'Failed to load history' });
      }

      const data = await response.json();
      return res.status(200).json({ data: data || [] });
    } catch (error) {
      console.error('History load exception:', error?.message || error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // ── DELETE: Delete a conversation ──
  if (req.method === 'DELETE') {
    const conversationId = req.query?.conversation_id;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversation_id query parameter is required' });
    }

    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/chat_history?conversation_id=eq.${encodeURIComponent(conversationId)}`,
        {
          method: 'DELETE',
          headers: {
            ...headers,
            Prefer: 'return=minimal',
          },
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.error('Supabase delete error:', response.status, errText);
        return res.status(response.status).json({ error: 'Failed to delete conversation' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('History delete exception:', error?.message || error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed. Use GET or DELETE.' });
}
