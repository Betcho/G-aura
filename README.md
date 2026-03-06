# G-ora AI — Futuristic Multimodal AI Assistant

A production-ready AI chat and image generation app with a **Gemini-inspired** futuristic interface.

## ✨ Features

- **AI Chat** — Powered by **Cerebras** (`llama3.1-8b`) for ultra-fast responses
- **AI Image Generation** — Powered by **Kie AI** (`Nano Banana Pro`) with Pollinations.ai fallback
- **Gemini-style Image Toggle** — Switch between Chat and Image mode with a single click
- **Persistent History** — All conversations stored in **Supabase** via secure backend
- **Futuristic UI** — Dark glassmorphism, neon glow effects, typing animations
- **Fullscreen Image Viewer** — Zoom, pan, rotate, and download generated images
- **Multi-conversation** — Create, switch, and delete separate chat threads
- **Zero frontend secrets** — All API keys stay server-side in Vercel env vars

---

## 🔒 Security Architecture

```
┌───────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend    │────▶│  Vercel Serverless │────▶│   External APIs  │
│  (React App)  │     │   Functions       │     │                  │
│  NO API KEYS  │◀────│  process.env.*    │◀────│  Cerebras        │
│               │     │                    │     │  Kie AI          │
│               │     │  /api/chat         │────▶│  Supabase        │
│               │     │  /api/generate-image│    │                  │
│               │     │  /api/history      │    └─────────────────┘
└───────────────┘     └──────────────────┘
```

- **Frontend has ZERO API keys** — no Supabase URL, no anon key, nothing
- All database operations go through `/api/history` endpoint
- All AI calls go through `/api/chat` and `/api/generate-image`
- Backend saves to Supabase automatically after each response

---

## 🚀 Deployment (GitHub → Vercel)

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/g-ora-ai.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and import your GitHub repository
2. Vercel will auto-detect the project settings from `vercel.json`
3. **Add Environment Variables** in Vercel Dashboard → Settings → Environment Variables:

| Variable | Required | Description |
|---|---|---|
| `CEREBRAS_API_KEY` | ✅ | Cerebras API key for chat (`llama3.1-8b`) |
| `KIE_AI_API_KEY` | ✅ | Kie AI API key for image generation (`Nano Banana Pro`) |
| `SUPABASE_URL` | ✅ | Your Supabase project URL (e.g., `https://xxxxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | ✅ | Your Supabase anonymous/public key |
| `KIE_AI_API_ENDPOINT` | ❌ | Custom Kie AI endpoint (default: `https://api.kie.ai/v1/images/generations`) |
| `KIE_AI_MODEL` | ❌ | Model name override (default: `nano-banana-pro`) |

4. Click **Deploy**

### Step 3: Set up Supabase

1. Go to your Supabase project dashboard
2. Run this SQL in the SQL Editor:

```sql
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  conversation_title TEXT DEFAULT 'Untitled',
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS for simplicity (or add your own policies)
ALTER TABLE chat_history DISABLE ROW LEVEL SECURITY;

-- Create indexes for faster queries
CREATE INDEX idx_chat_history_conversation_id ON chat_history(conversation_id);
CREATE INDEX idx_chat_history_created_at ON chat_history(created_at DESC);
```

---

## 🏗️ Project Structure

```
├── api/
│   ├── chat.js              # Vercel serverless — Cerebras LLM (llama3.1-8b)
│   │                        # Saves chat to Supabase via REST API
│   ├── generate-image.js    # Vercel serverless — Kie AI (Nano Banana Pro)
│   │                        # Saves image URL to Supabase via REST API
│   └── history.js           # Vercel serverless — Load/Delete chat history
│                            # Reads from Supabase via REST API
├── src/
│   ├── App.tsx               # Main React application
│   ├── main.tsx              # Entry point
│   ├── index.css             # Tailwind + custom animations
│   ├── lib/
│   │   ├── supabase.ts       # API-based history functions (NO direct DB client)
│   │   └── ai-responses.ts   # Local fallback responses (dev mode only)
│   └── utils/
│       └── cn.ts             # className utility
├── index.html
├── vercel.json               # Vercel deployment config
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🔧 Environment Variables

All environment variables must be set in **Vercel Dashboard → Settings → Environment Variables**.

```env
# Required — Chat API (Cerebras)
CEREBRAS_API_KEY=your_cerebras_api_key_here

# Required — Image Generation API (Kie AI)
KIE_AI_API_KEY=your_kie_ai_api_key_here

# Required — Database (Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional — Kie AI customization
KIE_AI_API_ENDPOINT=https://api.kie.ai/v1/images/generations
KIE_AI_MODEL=nano-banana-pro
```

**⚠️ IMPORTANT:** None of these keys appear in the frontend code. They are only accessible in Vercel serverless functions via `process.env`.

---

## 🔄 API Endpoints

### `POST /api/chat`
- **Input:** `{ message, history, conversation_id, conversation_title }`
- **Process:** Calls Cerebras API → Saves to Supabase → Returns response
- **Output:** `{ response: "AI reply text" }`

### `POST /api/generate-image`
- **Input:** `{ prompt, conversation_id, conversation_title }`
- **Process:** Calls Kie AI API → Saves to Supabase → Returns image URL
- **Output:** `{ image_url: "https://...", source: "kie-ai", model: "nano-banana-pro" }`

### `GET /api/history`
- **Process:** Loads all chat history from Supabase (up to 500 messages)
- **Output:** `{ data: [{ conversation_id, message, response, image_url, ... }] }`

### `DELETE /api/history?conversation_id=xxx`
- **Process:** Deletes all messages for the given conversation from Supabase
- **Output:** `{ success: true }`

---

## 🎨 UI Modes

### Chat Mode (default)
- Routes to `/api/chat` → Cerebras `llama3.1-8b`
- Full conversational AI with markdown support

### Image Mode (toggle)
- Click the **"Image"** chip in the input area to activate
- Routes to `/api/generate-image` → Kie AI Nano Banana Pro
- Shows **IMAGE MODE** banner with **X** to exit
- Generated images appear inline with Download + Full Screen options

---

## 💻 Local Development

```bash
npm install
npm run dev
```

> **Note:** Without Vercel, the `/api/*` endpoints won't be available.
> The app automatically falls back to local AI responses and Pollinations.ai for images.
> Deploy to Vercel for full production functionality.

---

## 📋 Deployment Checklist

- [ ] Push code to GitHub
- [ ] Import repo in Vercel
- [ ] Add `CEREBRAS_API_KEY` in Vercel env vars
- [ ] Add `KIE_AI_API_KEY` in Vercel env vars
- [ ] Add `SUPABASE_URL` in Vercel env vars
- [ ] Add `SUPABASE_ANON_KEY` in Vercel env vars
- [ ] Create `chat_history` table in Supabase (SQL above)
- [ ] Disable RLS on `chat_history` table
- [ ] Deploy and verify

---

## 📄 License

MIT
