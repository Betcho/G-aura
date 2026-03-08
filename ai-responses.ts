// Local fallback response generator for G-aura AI
// Used when the Cerebras API (/api/chat) is unavailable

const greetings = [
  "Hello! I'm G-aura, your futuristic AI assistant. How can I help you today?",
  "Hey there! G-aura at your service. What would you like to explore?",
  "Welcome! I'm G-aura — ready to assist you. What's on your mind?",
];

const fallbackResponses = [
  "That's an interesting thought! I'm currently running in offline mode with limited capabilities. For the best experience, deploy me on Vercel with the Cerebras API key configured. In the meantime, feel free to try **Image Mode** — click the Image button below to generate AI images!",
  "Thanks for your message! I'm running locally without my full AI brain (Cerebras). Try switching to **Image Mode** to generate stunning visuals, or deploy me on Vercel for full AI chat capabilities.",
  "I appreciate your message! For full AI-powered responses, I need to be deployed on Vercel with the Cerebras API. Right now I can still generate images — click the **Image** button to try it!",
];

const aboutResponses = [
  "I'm **G-aura AI** — a futuristic multimodal AI assistant. Here's what I can do:\n\n🧠 **AI Chat** — Powered by advanced language models for intelligent conversation\n🎨 **Image Generation** — Create stunning AI-generated images from text prompts\n💾 **History** — All conversations saved securely\n\nSwitch between **Chat Mode** and **Image Mode** using the toggle below!",
];

const thankResponses = [
  "You're welcome! Let me know if there's anything else I can help with. 😊",
  "Glad I could help! Feel free to ask more questions or try generating an image.",
  "Anytime! That's what I'm here for. Try switching to Image Mode for some visual magic!",
];

function randomPick(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateResponse(message: string): string {
  const lower = message.toLowerCase().trim();

  // Greetings
  if (/^(hi|hello|hey|greetings|sup|what'?s up|howdy|yo)\b/i.test(lower)) {
    return randomPick(greetings);
  }

  // Thanks
  if (/\b(thanks|thank you|thx|ty|appreciate)\b/i.test(lower)) {
    return randomPick(thankResponses);
  }

  // About/Help
  if (/\b(who are you|what are you|what can you do|help|about|capabilities)\b/i.test(lower)) {
    return randomPick(aboutResponses);
  }

  // Time
  if (/\b(what time|current time|time is it)\b/i.test(lower)) {
    return `The current time is **${new Date().toLocaleTimeString()}** on ${new Date().toLocaleDateString()}.`;
  }

  // Jokes
  if (/\b(joke|funny|humor|laugh)\b/i.test(lower)) {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
      "Why did the AI go to therapy? It had too many unresolved layers! 🤖",
      "What's a computer's favorite snack? Microchips! 💻",
    ];
    return randomPick(jokes);
  }

  // Default fallback
  return randomPick(fallbackResponses);
}

export function generateImageUrl(prompt: string): string {
  // Pollinations.ai fallback — free, no API key needed, real AI image generation
  const encoded = encodeURIComponent(prompt);
  const seed = Math.floor(Math.random() * 100000);
  return `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true`;
}
