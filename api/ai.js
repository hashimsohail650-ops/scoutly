// Vercel serverless function — talks to Google Gemini, keeping the API key private.
// The frontend always sends the same shape (Anthropic-style messages); this file
// translates it into Gemini's format, calls Gemini, then translates the response
// back into the same shape the frontend already knows how to read.

// Model name is set via an environment variable so if Google renames/retires this
// model later, you fix it in Vercel's dashboard — no code edit or redeploy of code needed.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing GEMINI_API_KEY. Set it in your hosting provider\'s environment variables.' });
  }

  try {
    const { messages = [], system, max_tokens, tools } = req.body;

    // Translate Anthropic-style messages -> Gemini "contents"
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
    }));

    const geminiBody = {
      contents,
      generationConfig: { maxOutputTokens: max_tokens || 1000 }
    };
    if (system) {
      geminiBody.systemInstruction = { parts: [{ text: system }] };
    }
    // If the frontend asked for web_search (used for the PR scan), enable Gemini's
    // built-in Google Search grounding tool.
    if (tools && tools.length) {
      geminiBody.tools = [{ google_search: {} }];
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    const data = await response.json();

    if (!response.ok) {
      const msg = data.error?.message || 'Gemini API error';
      const hint = response.status === 404
        ? ` — model "${GEMINI_MODEL}" may have been renamed or retired by Google. Check https://ai.google.dev/gemini-api/docs/models for the current model name and update the GEMINI_MODEL environment variable in Vercel.`
        : '';
      return res.status(response.status).json({ error: msg + hint, raw: data });
    }

    // Translate Gemini's response back into the {content:[{type:'text', text}]} shape
    // the frontend already expects (so index.html needs zero changes).
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.map(p => p.text || '').join('\n');

    res.status(200).json({ content: [{ type: 'text', text }] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach Gemini API', details: String(err) });
  }
}
