import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Sparkles, Image as ImageIcon, MessageSquare,
  Download, Trash2, Plus, Bot, User, Loader2, Menu, X,
  Zap, ChevronDown, Maximize2, ZoomIn, ZoomOut, RotateCw,
} from 'lucide-react';
import {
  testConnection,
  loadAllMessages,
  deleteConversationMessages,
} from './lib/supabase';
import {
  generateResponse, generateImageUrl,
} from './lib/ai-responses';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
  isLoading?: boolean;
  isImageLoading?: boolean;
  isImageMode?: boolean;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ============ Fullscreen Image Modal ============
function FullscreenImageModal({
  imageUrl,
  onClose,
}: {
  imageUrl: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25));
  const handleRotate = () => setRotation(prev => prev + 90);
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) setZoom(prev => Math.min(prev + 0.1, 5));
    else setZoom(prev => Math.max(prev - 0.1, 0.25));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `g-aura-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-[100] flex items-center justify-center fullscreen-modal-backdrop"
      onClick={handleBackdropClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 sm:px-6 py-4 fullscreen-top-bar">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] flex items-center justify-center">
            <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white text-sm font-semibold">Image Preview</h3>
            <p className="text-gray-400 text-[11px]">{Math.round(zoom * 100)}% • {rotation}°</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10
            flex items-center justify-center text-white transition-all duration-200 hover:scale-105
            hover:border-red-500/50 hover:text-red-400"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Image */}
      <div
        className="relative z-[1] max-w-[90vw] max-h-[80vh] flex items-center justify-center"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        <img
          src={imageUrl}
          alt="Full screen preview"
          className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl shadow-[#00e5ff]/10 fullscreen-image-enter select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          draggable={false}
        />
        <div className="absolute inset-0 rounded-2xl pointer-events-none fullscreen-glow-border" />
      </div>

      {/* Bottom controls */}
      <div className="absolute bottom-0 left-0 right-0 z-10 flex items-center justify-center px-4 sm:px-6 py-5 fullscreen-bottom-bar">
        <div className="flex items-center gap-2 p-2 rounded-2xl glass-dark border border-white/10">
          <button onClick={handleZoomOut} disabled={zoom <= 0.25} className="fullscreen-control-btn group" title="Zoom Out">
            <ZoomOut className="w-4 h-4 group-hover:text-[#00e5ff] transition-colors" />
          </button>
          <div className="px-3 py-1.5 rounded-lg bg-white/5 text-white text-xs font-mono min-w-[52px] text-center">
            {Math.round(zoom * 100)}%
          </div>
          <button onClick={handleZoomIn} disabled={zoom >= 5} className="fullscreen-control-btn group" title="Zoom In">
            <ZoomIn className="w-4 h-4 group-hover:text-[#00e5ff] transition-colors" />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button onClick={handleRotate} className="fullscreen-control-btn group" title="Rotate">
            <RotateCw className="w-4 h-4 group-hover:text-[#00e5ff] transition-colors" />
          </button>
          <button onClick={handleReset} className="fullscreen-control-btn group" title="Reset View">
            <Maximize2 className="w-4 h-4 group-hover:text-[#00e5ff] transition-colors" />
          </button>
          <div className="w-px h-6 bg-white/10 mx-1" />
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl
              bg-gradient-to-r from-[#00e5ff] to-[#7c3aed] text-white text-xs font-semibold
              hover:shadow-lg hover:shadow-[#00e5ff]/25 transition-all duration-200
              hover:scale-105 active:scale-95"
            title="Download Image"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 text-gray-500 text-[10px] tracking-wider uppercase">
        Press ESC to close • Scroll to zoom
      </div>
    </div>
  );
}

// ============ Typing Animation Component ============
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 px-4 py-3">
      <div className="w-2 h-2 rounded-full bg-[#00e5ff] typing-dot-1" />
      <div className="w-2 h-2 rounded-full bg-[#00e5ff] typing-dot-2" />
      <div className="w-2 h-2 rounded-full bg-[#00e5ff] typing-dot-3" />
    </div>
  );
}

// ============ Animated Text Component ============
function AnimatedText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!text) return;
    let i = 0;
    setDisplayed('');
    setDone(false);
    const speed = Math.max(8, Math.min(25, 800 / text.length));
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(interval);
        setDone(true);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text]);

  return (
    <span>
      {renderMarkdown(displayed)}
      {!done && <span className="inline-block w-0.5 h-4 bg-[#00e5ff] ml-0.5 animate-pulse align-middle" />}
    </span>
  );
}

// ============ Simple Markdown Renderer ============
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    let processed: React.ReactNode = line;
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }
      parts.push(<strong key={`b-${i}-${match.index}`} className="text-[#00e5ff] font-semibold">{match[1]}</strong>);
      lastIndex = match.index + match[0].length;
    }

    if (parts.length > 0) {
      if (lastIndex < line.length) parts.push(line.slice(lastIndex));
      processed = <>{parts}</>;
    }

    if (line.match(/^[🎨💬📝🤖💻🐛⚡]/)) {
      return <div key={i} className="ml-2 my-0.5">{processed}</div>;
    }

    return (
      <span key={i}>
        {processed}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

// ============ Main App ============
export function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>('');
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImageMode, setIsImageMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
  const [backendAvailable, setBackendAvailable] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find(c => c.id === activeConvId);
  const messages = activeConversation?.messages || [];

  // ── API Call: Chat (Cerebras via /api/chat) ──
  async function callChatAPI(
    message: string,
    conversationId: string,
    conversationTitle: string
  ): Promise<string> {
    const history = messages
      .filter(m => !m.isLoading && m.content)
      .map(m => ({ role: m.role, content: m.content }))
      .slice(-10);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history,
          conversation_id: conversationId,
          conversation_title: conversationTitle,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.response) {
          setBackendAvailable(true);
          return data.response;
        }
      }

      const errData = await res.json().catch(() => null);
      console.warn('Chat API error:', errData);
    } catch (err) {
      console.warn('Chat API unavailable, using fallback:', err);
      setBackendAvailable(false);
    }

    // Fallback to local response generator (development only)
    return generateResponse(message);
  }

  // ── API Call: Image (Kie AI via /api/generate-image) ──
  async function callImageAPI(
    prompt: string,
    conversationId: string,
    conversationTitle: string
  ): Promise<string> {
    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          conversation_id: conversationId,
          conversation_title: conversationTitle,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.image_url) {
          setBackendAvailable(true);
          return data.image_url;
        }
      }

      console.warn('Image API error');
    } catch (err) {
      console.warn('Image API unavailable, using fallback:', err);
      setBackendAvailable(false);
    }

    // Fallback to Pollinations.ai (development only)
    return generateImageUrl(prompt);
  }

  // ── Load history on mount ──
  useEffect(() => {
    async function init() {
      // Test backend availability and load history
      const connResult = await testConnection();

      if (connResult.success) {
        setBackendAvailable(true);
        const result = await loadAllMessages();

        if (result.success && result.data && result.data.length > 0) {
          const convMap = new Map<string, { title: string; messages: Message[]; createdAt: Date }>();

          for (const row of result.data) {
            const cid = row.conversation_id || 'default';
            if (!convMap.has(cid)) {
              convMap.set(cid, {
                title: row.conversation_title || row.message.slice(0, 40),
                messages: [],
                createdAt: new Date(row.created_at || Date.now()),
              });
            }
            const conv = convMap.get(cid)!;
            conv.messages.push({
              id: generateId(),
              role: 'user',
              content: row.message,
              timestamp: new Date(row.created_at || Date.now()),
            });
            conv.messages.push({
              id: generateId(),
              role: 'assistant',
              content: row.response,
              imageUrl: row.image_url || undefined,
              timestamp: new Date(row.created_at || Date.now()),
            });
          }

          const loadedConvs: Conversation[] = Array.from(convMap.entries()).map(([id, data]) => ({
            id,
            title: data.title,
            messages: data.messages,
            createdAt: data.createdAt,
          }));

          setConversations(loadedConvs);
          setActiveConvId(loadedConvs[0].id);
        } else {
          createNewConversation();
        }
      } else {
        setBackendAvailable(false);
        createNewConversation();
      }

      setLoaded(true);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function createNewConversation() {
    const conv: Conversation = {
      id: generateId(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
    };
    setConversations(prev => [conv, ...prev]);
    setActiveConvId(conv.id);
    setSidebarOpen(false);
    setIsImageMode(false);
  }

  async function handleDeleteConversation(id: string) {
    // Always attempt to delete from backend (it will silently fail if unavailable)
    deleteConversationMessages(id).catch(() => {});

    setConversations(prev => prev.filter(c => c.id !== id));
    if (activeConvId === id) {
      const remaining = conversations.filter(c => c.id !== id);
      if (remaining.length > 0) {
        setActiveConvId(remaining[0].id);
      } else {
        createNewConversation();
      }
    }
  }

  const addMessage = useCallback((convId: string, msg: Message) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      return {
        ...c,
        messages: [...c.messages, msg],
        title: c.messages.length === 0 ? msg.content.slice(0, 40) : c.title,
      };
    }));
  }, []);

  const updateLastAssistantMessage = useCallback((convId: string, updates: Partial<Message>) => {
    setConversations(prev => prev.map(c => {
      if (c.id !== convId) return c;
      const msgs = [...c.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'assistant') {
          msgs[i] = { ...msgs[i], ...updates };
          break;
        }
      }
      return { ...c, messages: msgs };
    }));
  }, []);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isProcessing) return;

    const convId = activeConvId;
    const convTitle = activeConversation?.title === 'New Chat'
      ? trimmed.slice(0, 40)
      : activeConversation?.title || trimmed.slice(0, 40);

    setInput('');
    setIsProcessing(true);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }

    // Add user message
    const userMsg: Message = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date(),
      isImageMode,
    };
    addMessage(convId, userMsg);

    // Add loading message
    const loadingMsg: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };
    addMessage(convId, loadingMsg);

    if (isImageMode) {
      // ── IMAGE MODE: Route to /api/generate-image (Kie AI) ──
      try {
        const imageUrl = await callImageAPI(trimmed, convId, convTitle);
        const responseText = `Here's your generated image for: **"${trimmed}"**\n\nThe image has been created using AI. You can download it or view it in full screen using the buttons below.`;
        updateLastAssistantMessage(convId, {
          content: responseText,
          imageUrl,
          isLoading: false,
          isImageLoading: true,
        });
      } catch {
        updateLastAssistantMessage(convId, {
          content: "Sorry, I couldn't generate the image. Please try again.",
          isLoading: false,
        });
      }
    } else {
      // ── CHAT MODE: Route to /api/chat (Cerebras) ──
      let responseText: string;
      try {
        responseText = await callChatAPI(trimmed, convId, convTitle);
      } catch {
        responseText = generateResponse(trimmed);
      }
      updateLastAssistantMessage(convId, {
        content: responseText,
        isLoading: false,
      });
    }

    // NOTE: Supabase saving is handled by the backend API endpoints.
    // No need to save from frontend — /api/chat and /api/generate-image
    // both save to Supabase automatically using process.env credentials.

    setIsProcessing(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleImageLoad(convId: string) {
    updateLastAssistantMessage(convId, { isImageLoading: false });
  }

  if (!loaded) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#0b0f1a]">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-[#00e5ff]/30 border-t-[#00e5ff] animate-spin-slow" />
            <Zap className="absolute inset-0 m-auto w-6 h-6 text-[#00e5ff]" />
          </div>
          <span className="text-[#00e5ff] font-orbitron text-sm tracking-widest">LOADING G-AURA</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex bg-[#0b0f1a] bg-grid overflow-hidden">
      {/* Background Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-[#00e5ff]/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#7c3aed]/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#00e5ff]/[0.02] rounded-full blur-[200px]" />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative z-40 h-full w-72 flex flex-col
        glass border-r border-[#00e5ff]/10
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-[#00e5ff]/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-[#00e5ff]/20">
                  <Zap className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="font-orbitron font-bold text-base text-white tracking-wider neon-text-subtle">
                  G-AURA
                </h1>
                <p className="text-[10px] text-[#00e5ff]/60 tracking-[0.2em] uppercase">AI Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg hover:bg-white/5 text-gray-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl
              border border-[#00e5ff]/20 hover:border-[#00e5ff]/40
              bg-[#00e5ff]/5 hover:bg-[#00e5ff]/10
              text-[#00e5ff] text-sm font-medium
              transition-all duration-200 group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
            New Chat
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
          {conversations.map(conv => (
            <div
              key={conv.id}
              className={`
                group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer
                transition-all duration-200
                ${conv.id === activeConvId
                  ? 'bg-[#00e5ff]/10 border border-[#00e5ff]/20 text-white'
                  : 'hover:bg-white/5 text-gray-400 hover:text-gray-200 border border-transparent'
                }
              `}
              onClick={() => { setActiveConvId(conv.id); setSidebarOpen(false); }}
            >
              <MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
              <span className="flex-1 text-sm truncate">{conv.title || 'New Chat'}</span>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded-lg transition-all"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-400" />
              </button>
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#00e5ff]/10">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] text-xs text-gray-500">
            <Sparkles className="w-3.5 h-3.5 text-[#00e5ff]/50" />
            <span>Powered by G-aura Engine</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Header */}
        <header className="glass border-b border-[#00e5ff]/10 px-4 py-3 flex items-center gap-3 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-xl hover:bg-white/5 text-gray-400"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
              isImageMode
                ? 'bg-gradient-to-br from-[#7c3aed]/20 to-[#ec4899]/20 border border-[#7c3aed]/20'
                : 'bg-gradient-to-br from-[#00e5ff]/20 to-[#7c3aed]/20 border border-[#00e5ff]/10'
            }`}>
              {isImageMode
                ? <ImageIcon className="w-4 h-4 text-[#c084fc]" />
                : <Bot className="w-4 h-4 text-[#00e5ff]" />
              }
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">G-aura AI</h2>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isImageMode ? 'bg-[#c084fc]' : 'bg-green-400'}`} />
                <span className="text-[11px] text-gray-400">
                  {isImageMode ? 'Image Generation Mode' : 'Online • Ready'}
                </span>
              </div>
            </div>
          </div>

          {/* Mode indicator badge in header */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all duration-300 ${
            isImageMode
              ? 'bg-[#7c3aed]/10 border border-[#7c3aed]/20'
              : 'bg-[#00e5ff]/5 border border-[#00e5ff]/10'
          }`}>
            {isImageMode ? (
              <>
                <ImageIcon className="w-3.5 h-3.5 text-[#c084fc]" />
                <span className="text-[11px] text-[#c084fc] font-medium">Image</span>
              </>
            ) : (
              <>
                <MessageSquare className="w-3.5 h-3.5 text-[#00e5ff]/60" />
                <span className="text-[11px] text-[#00e5ff]/60 font-medium">Chat</span>
              </>
            )}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 ? (
            <WelcomeScreen
              onSuggestion={(s) => { setInput(s); inputRef.current?.focus(); }}
              onActivateImageMode={() => setIsImageMode(true)}
              isImageMode={isImageMode}
              backendAvailable={backendAvailable}
            />
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg, idx) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLatest={idx === messages.length - 1}
                  onImageLoad={() => handleImageLoad(activeConvId)}
                  onFullscreen={(url) => setFullscreenImage(url)}
                />
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* ── Input Area with Image Toggle ── */}
        <div className="shrink-0 p-4 pt-2">
          <div className="max-w-3xl mx-auto">

            {/* Image Mode Banner */}
            {isImageMode && (
              <div className="mb-3 animate-float-in">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl
                  bg-gradient-to-r from-[#7c3aed]/10 via-[#ec4899]/5 to-[#7c3aed]/10
                  border border-[#7c3aed]/20 image-mode-banner">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#ec4899]
                    flex items-center justify-center shrink-0 shadow-lg shadow-[#7c3aed]/20">
                    <ImageIcon className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#c084fc] tracking-[0.15em] uppercase">
                      Image Mode
                    </span>
                    <span className="text-[11px] text-gray-500 ml-2 hidden sm:inline">
                      — Describe what you want to generate
                    </span>
                  </div>
                  <button
                    onClick={() => setIsImageMode(false)}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/15
                      flex items-center justify-center text-gray-400 hover:text-red-400
                      transition-all duration-200 shrink-0 border border-transparent hover:border-red-500/20"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Input Container */}
            <div className={`relative glass rounded-2xl transition-all duration-300 ${
              isImageMode
                ? 'border-[#7c3aed]/25 shadow-[0_0_25px_rgba(124,58,237,0.12)] image-mode-input'
                : 'animate-glow-pulse'
            } focus-within:shadow-[0_0_30px_${isImageMode ? 'rgba(124,58,237,0.2)' : 'rgba(0,229,255,0.15)'}]`}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isImageMode
                    ? 'Describe the image you want to create...'
                    : 'Ask G-aura anything...'
                }
                rows={1}
                className={`w-full bg-transparent text-white px-5 py-4 pr-14
                  resize-none outline-none text-sm leading-relaxed
                  rounded-2xl border border-transparent
                  transition-all duration-300
                  min-h-[56px] max-h-[160px]
                  ${isImageMode
                    ? 'placeholder-[#c084fc]/40 focus:border-[#7c3aed]/30 neon-input-purple'
                    : 'placeholder-gray-500 focus:border-[#00e5ff]/30 neon-input'
                  }`}
                style={{ height: 'auto', overflow: input.split('\n').length > 3 ? 'auto' : 'hidden' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = Math.min(target.scrollHeight, 160) + 'px';
                }}
                disabled={isProcessing}
              />

              {/* Send button */}
              <button
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className={`
                  absolute right-3 bottom-3 w-10 h-10 rounded-xl
                  flex items-center justify-center transition-all duration-200
                  ${input.trim() && !isProcessing
                    ? isImageMode
                      ? 'bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white shadow-lg shadow-[#7c3aed]/25 hover:shadow-[#7c3aed]/40 hover:scale-105'
                      : 'bg-gradient-to-r from-[#00e5ff] to-[#7c3aed] text-white shadow-lg shadow-[#00e5ff]/25 hover:shadow-[#00e5ff]/40 hover:scale-105'
                    : 'bg-white/5 text-gray-600 cursor-not-allowed'
                  }
                `}
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* ── Bottom Toolbar: Image Toggle Chip ── */}
            <div className="flex items-center gap-2 mt-2.5 px-1">
              {/* Image Mode Toggle Chip */}
              <button
                onClick={() => setIsImageMode(!isImageMode)}
                disabled={isProcessing}
                className={`
                  image-toggle-chip flex items-center gap-1.5 px-3.5 py-2 rounded-full
                  text-xs font-semibold transition-all duration-300
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${isImageMode
                    ? 'bg-gradient-to-r from-[#7c3aed] to-[#ec4899] text-white shadow-lg shadow-[#7c3aed]/25 scale-[1.02] hover:shadow-[#7c3aed]/40'
                    : 'bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-gray-200 border border-white/[0.08] hover:border-[#7c3aed]/30'
                  }
                `}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Image</span>
                {isImageMode && (
                  <X
                    className="w-3 h-3 ml-0.5 hover:text-red-200 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsImageMode(false);
                    }}
                  />
                )}
              </button>

              {/* Hint text */}
              <p className="flex-1 text-[11px] text-gray-600 text-right">
                {isImageMode
                  ? 'Image Mode • AI Generation'
                  : 'Press Enter to send'
                }
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <FullscreenImageModal
          imageUrl={fullscreenImage}
          onClose={() => setFullscreenImage(null)}
        />
      )}
    </div>
  );
}

// ============ Welcome Screen ============
function WelcomeScreen({
  onSuggestion,
  onActivateImageMode,
  isImageMode,
  backendAvailable,
}: {
  onSuggestion: (s: string) => void;
  onActivateImageMode: () => void;
  isImageMode: boolean;
  backendAvailable: boolean;
}) {
  const chatSuggestions = [
    { icon: <MessageSquare className="w-4 h-4" />, text: "Who are you and what can you do?", color: "from-[#00e5ff]/10 to-[#00e5ff]/5" },
    { icon: <Sparkles className="w-4 h-4" />, text: "Explain quantum computing simply", color: "from-[#7c3aed]/10 to-[#7c3aed]/5" },
    { icon: <Zap className="w-4 h-4" />, text: "Write a short poem about the future", color: "from-[#f59e0b]/10 to-[#f59e0b]/5" },
    { icon: <Bot className="w-4 h-4" />, text: "What are the best programming languages?", color: "from-[#ec4899]/10 to-[#ec4899]/5" },
  ];

  const imageSuggestions = [
    { icon: <ImageIcon className="w-4 h-4" />, text: "A futuristic city at sunset with flying cars", color: "from-[#7c3aed]/10 to-[#ec4899]/5" },
    { icon: <Sparkles className="w-4 h-4" />, text: "A cosmic nebula with vibrant colors and stars", color: "from-[#ec4899]/10 to-[#7c3aed]/5" },
    { icon: <Zap className="w-4 h-4" />, text: "A cute robot exploring a garden on Mars", color: "from-[#f59e0b]/10 to-[#7c3aed]/5" },
    { icon: <ImageIcon className="w-4 h-4" />, text: "An underwater crystal palace glowing in the deep ocean", color: "from-[#00e5ff]/10 to-[#ec4899]/5" },
  ];

  const suggestions = isImageMode ? imageSuggestions : chatSuggestions;

  return (
    <div className="h-full flex flex-col items-center justify-center animate-fade-in max-w-2xl mx-auto px-4">
      {/* Hero */}
      <div className="relative mb-8">
        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl rotate-3 transition-all duration-500 ${
          isImageMode
            ? 'bg-gradient-to-br from-[#7c3aed] to-[#ec4899] shadow-[#7c3aed]/20'
            : 'bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] shadow-[#00e5ff]/20'
        }`}>
          {isImageMode
            ? <ImageIcon className="w-10 h-10 text-white" />
            : <Zap className="w-10 h-10 text-white" />
          }
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gradient-to-br from-[#ec4899] to-[#f59e0b] flex items-center justify-center shadow-lg">
          <Sparkles className="w-3 h-3 text-white" />
        </div>
      </div>

      <h1 className="font-orbitron text-3xl md:text-4xl font-bold text-white neon-text mb-3 text-center">
        {isImageMode ? 'Create Images' : 'Welcome to G-aura'}
      </h1>
      <p className="text-gray-400 text-center mb-8 max-w-md leading-relaxed text-sm">
        {isImageMode
          ? 'Describe any image and I\'ll generate it for you using AI. Be as detailed as you want!'
          : 'Your futuristic AI assistant powered by advanced language models. Ask me anything or switch to Image Mode to generate stunning visuals.'
        }
      </p>

      {/* Dev mode indicator - only shown when backend is unavailable */}
      {!backendAvailable && (
        <div className="mb-4 px-4 py-2 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-400/80 text-[11px] text-center max-w-sm">
          Running in local mode — deploy to Vercel for full AI capabilities
        </div>
      )}

      {/* Mode toggle in welcome */}
      {!isImageMode && (
        <button
          onClick={onActivateImageMode}
          className="mb-6 flex items-center gap-2 px-5 py-2.5 rounded-full
            bg-gradient-to-r from-[#7c3aed]/10 to-[#ec4899]/10
            border border-[#7c3aed]/20 hover:border-[#7c3aed]/40
            text-[#c084fc] text-sm font-medium
            hover:shadow-lg hover:shadow-[#7c3aed]/10
            transition-all duration-300 group"
        >
          <ImageIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
          <span>Try Image Generation</span>
          <span className="text-[10px] text-gray-500 ml-1">→</span>
        </button>
      )}

      {/* Suggestion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(s.text)}
            className="glass-light rounded-xl px-4 py-3.5 text-left
              hover:border-[#00e5ff]/30 hover:bg-white/[0.04]
              transition-all duration-200 group
              animate-float-in"
            style={{ animationDelay: `${i * 100}ms`, animationFillMode: 'both' }}
          >
            <div className="flex items-start gap-3">
              <div className={`
                w-8 h-8 rounded-lg bg-gradient-to-br ${s.color}
                flex items-center justify-center shrink-0
                group-hover:scale-110 transition-transform
                ${isImageMode ? 'text-[#c084fc]' : 'text-[#00e5ff]'}
              `}>
                {s.icon}
              </div>
              <span className="text-xs text-gray-300 leading-relaxed group-hover:text-white transition-colors">
                {s.text}
              </span>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-10 flex items-center gap-2 text-gray-600 text-xs">
        <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
        <span>Type a message below to get started</span>
      </div>
    </div>
  );
}

// ============ Message Bubble ============
function MessageBubble({
  message,
  isLatest,
  onImageLoad,
  onFullscreen,
}: {
  message: Message;
  isLatest: boolean;
  onImageLoad: () => void;
  onFullscreen: (url: string) => void;
}) {
  const isUser = message.role === 'user';
  const [imageLoaded, setImageLoaded] = useState(false);
  const [downloadingState, setDownloadingState] = useState<'idle' | 'downloading' | 'done'>('idle');

  const handleDownload = async () => {
    if (!message.imageUrl) return;
    setDownloadingState('downloading');
    try {
      const response = await fetch(message.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `g-aura-image-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setDownloadingState('done');
      setTimeout(() => setDownloadingState('idle'), 2000);
    } catch {
      window.open(message.imageUrl, '_blank');
      setDownloadingState('idle');
    }
  };

  return (
    <div className={`flex gap-3 animate-float-in ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="shrink-0 mt-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00e5ff] to-[#7c3aed] flex items-center justify-center shadow-lg shadow-[#00e5ff]/15">
            <Bot className="w-4 h-4 text-white" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className={`max-w-[80%] min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {/* Image mode badge on user message */}
        {isUser && message.isImageMode && (
          <div className="flex items-center gap-1 mb-1 px-2 py-0.5 rounded-full
            bg-[#7c3aed]/10 border border-[#7c3aed]/20 self-end">
            <ImageIcon className="w-2.5 h-2.5 text-[#c084fc]" />
            <span className="text-[9px] text-[#c084fc] font-semibold tracking-wider uppercase">Image</span>
          </div>
        )}

        <div className={`
          rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? message.isImageMode
              ? 'bg-gradient-to-r from-[#7c3aed]/15 to-[#ec4899]/15 border border-[#7c3aed]/20 text-white rounded-br-md'
              : 'bg-gradient-to-r from-[#00e5ff]/15 to-[#7c3aed]/15 border border-[#00e5ff]/20 text-white rounded-br-md'
            : 'glass-light text-gray-200 rounded-bl-md'
          }
        `}>
          {message.isLoading ? (
            <TypingIndicator />
          ) : isUser ? (
            <span>{message.content}</span>
          ) : isLatest && !isUser ? (
            <div className="ai-text">
              <AnimatedText text={message.content} />
            </div>
          ) : (
            <div className="ai-text">{renderMarkdown(message.content)}</div>
          )}
        </div>

        {/* Image */}
        {message.imageUrl && !message.isLoading && (
          <div className="mt-3 animate-scale-in max-w-md w-full">
            <div className="relative group rounded-2xl overflow-hidden border border-[#00e5ff]/15 hover:border-[#00e5ff]/30 transition-all duration-300">
              {!imageLoaded && (
                <div className="w-full h-64 bg-[#111827] flex flex-col items-center justify-center gap-3 animate-shimmer rounded-2xl">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full border-2 border-[#7c3aed]/30 border-t-[#7c3aed] animate-spin-slow" />
                    <ImageIcon className="absolute inset-0 m-auto w-5 h-5 text-[#c084fc]/60" />
                  </div>
                  <span className="text-xs text-gray-500">Generating image...</span>
                </div>
              )}

              <img
                src={message.imageUrl}
                alt="AI Generated"
                className={`w-full rounded-2xl transition-all duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0 h-0'}`}
                onLoad={() => { setImageLoaded(true); onImageLoad(); }}
                onError={() => setImageLoaded(true)}
              />

              {imageLoaded && (
                <div
                  className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center cursor-pointer"
                  onClick={() => message.imageUrl && onFullscreen(message.imageUrl)}
                >
                  <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-100 scale-75">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white text-sm">
                      <Maximize2 className="w-4 h-4" />
                      Click to view full screen
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {imageLoaded && (
              <div className="flex gap-2 mt-3 image-actions-enter">
                <button
                  onClick={handleDownload}
                  disabled={downloadingState === 'downloading'}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                    bg-gradient-to-r from-[#00e5ff]/10 to-[#00e5ff]/5
                    border border-[#00e5ff]/20 hover:border-[#00e5ff]/40
                    text-[#00e5ff] text-xs font-semibold
                    hover:bg-[#00e5ff]/15 hover:shadow-lg hover:shadow-[#00e5ff]/10
                    transition-all duration-200 active:scale-95
                    disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  {downloadingState === 'downloading' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : downloadingState === 'done' ? (
                    <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <Download className="w-4 h-4 group-hover:animate-bounce" />
                  )}
                  <span>
                    {downloadingState === 'downloading' ? 'Downloading...' : downloadingState === 'done' ? 'Downloaded!' : 'Download'}
                  </span>
                </button>

                <button
                  onClick={() => message.imageUrl && onFullscreen(message.imageUrl)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                    bg-gradient-to-r from-[#7c3aed]/10 to-[#7c3aed]/5
                    border border-[#7c3aed]/20 hover:border-[#7c3aed]/40
                    text-[#c084fc] text-xs font-semibold
                    hover:bg-[#7c3aed]/15 hover:shadow-lg hover:shadow-[#7c3aed]/10
                    transition-all duration-200 active:scale-95 group"
                >
                  <Maximize2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  <span>Full Screen</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Timestamp */}
        <span className={`text-[10px] text-gray-600 mt-1.5 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="shrink-0 mt-1">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg ${
            message.isImageMode
              ? 'bg-gradient-to-br from-[#7c3aed] to-[#ec4899] shadow-[#7c3aed]/15'
              : 'bg-gradient-to-br from-[#7c3aed] to-[#ec4899] shadow-[#7c3aed]/15'
          }`}>
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}
