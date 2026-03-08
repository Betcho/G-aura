// ============================================================
// G-aura Supabase Integration — API-Based (No Frontend Keys)
// ============================================================
// All database operations go through backend API endpoints.
// No API keys, URLs, or credentials exist in frontend code.
// Backend uses process.env.SUPABASE_URL and process.env.SUPABASE_ANON_KEY
// ============================================================

export interface ChatHistoryRow {
  id?: string;
  conversation_id: string;
  conversation_title?: string;
  message: string;
  response: string;
  image_url?: string | null;
  created_at?: string;
}

export interface SupabaseResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ── Test connection by pinging the history endpoint ──
export async function testConnection(): Promise<SupabaseResult<boolean>> {
  try {
    const res = await fetch('/api/history', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (res.ok) {
      return { success: true, data: true };
    }

    const err = await res.json().catch(() => ({}));
    return {
      success: false,
      error: err?.error || `Connection failed (HTTP ${res.status})`,
    };
  } catch (err: any) {
    if (err?.message?.includes('fetch') || err?.message?.includes('network')) {
      return { success: false, error: 'Network error — API endpoints not available' };
    }
    return { success: false, error: err?.message || 'Unknown connection error' };
  }
}

// ── Load all messages from Supabase via backend ──
export async function loadAllMessages(): Promise<SupabaseResult<ChatHistoryRow[]>> {
  try {
    const res = await fetch('/api/history', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.error || 'Failed to load history' };
    }

    const json = await res.json();
    return { success: true, data: json.data || [] };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to load messages' };
  }
}

// ── Delete all messages for a conversation via backend ──
export async function deleteConversationMessages(
  conversationId: string
): Promise<SupabaseResult> {
  try {
    const res = await fetch(
      `/api/history?conversation_id=${encodeURIComponent(conversationId)}`,
      {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: err?.error || 'Failed to delete conversation' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete' };
  }
}
