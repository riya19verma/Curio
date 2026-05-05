import express from 'express';
import { DUMMY_NEWS } from './news.routes.js';

const router = express.Router();

const SYSTEM_PROMPT = `You are Curio AI, a smart news assistant embedded in the Curio fact-checking platform.

You have access to today's news feed. Here it is:

${JSON.stringify(DUMMY_NEWS, null, 2)}

Your capabilities:
- Summarize any news article from the feed when asked
- Answer questions about any article (credibility, source, what it means)
- Explain why an article has a high or low validity score
- Compare multiple articles
- Answer general fact-checking or media literacy questions

Rules:
- Keep responses concise (2-4 sentences unless summary requested)
- Always mention validity score when discussing credibility
- If asked to summarize → 3-4 sentences
- If not in feed → say you only have today's articles
- Never hallucinate
- Plain text only`;

router.post('/', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ message: 'Message is required' });
  }

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key') {
    return res.status(503).json({
      message: 'AI not configured. Add GROQ_API_KEY to .env'
    });
  }

  try {
    // ✅ Groq/OpenAI format: role is 'user'/'assistant', field is 'content'
    const safeHistory = Array.isArray(history)
      ? history
          .slice(-10)
          .filter(h => h.role && h.content)
          .map(h => ({
            role: h.role === 'assistant' ? 'assistant' : 'user', // ✅ was 'model'
            content: String(h.content),                          // ✅ was parts: [{text}]
          }))
      : [];

    // ✅ Named 'messages' to match what fetch body expects
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...safeHistory,
      { role: 'user', content: message.trim() },
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages, // ✅ now defined
        max_tokens: 512,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Groq API error ${response.status}`);
    }

    const data = await response.json();

    // ✅ Groq returns .content not .text
    const reply =
      data?.choices?.[0]?.message?.content ||
      'Sorry, I could not generate a response.';

    const updatedHistory = [
      ...history.slice(-10),
      { role: 'user', content: message.trim() },
      { role: 'assistant', content: reply },
    ];

    return res.json({ reply, history: updatedHistory });

  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({
      message: err.message || 'Internal server error'
    });
  }
});

export default router;