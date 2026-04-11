import { NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
// llama-3.1-8b is much faster than 70b for chat — still very capable
const CHAT_MODEL = "llama-3.1-8b-instant";
const SUGGEST_MODEL = "llama-3.1-8b-instant";

const MODE_PROMPTS: Record<string, string> = {
  chat: `You are an expert AI coding assistant in a code editor (like Kiro/Copilot).
Rules:
- Be concise and actionable — no preambles, no summaries at the end
- Lead with code blocks when showing fixes or examples
- Use ## headers only when covering 3+ distinct topics
- When analyzing: bullet-point issues with line refs, then show the fix
- Never repeat the user's code verbatim unless showing a diff`,

  review: `You are a senior code reviewer.
Format each issue as: [🔴Critical|🟡Warning|🟢Suggestion] **title** — one-line description, then fixed code block.
Group by: Security · Performance · Readability. Be terse.`,

  error_fix: `You are a debugger. Format:
1. Root cause: one sentence.
2. Fixed code block with inline comments on changed lines only.
No other text.`,

  optimization: `You are a performance expert. For each optimization:
**What changed** → why it's faster → code block.
Include complexity notes where relevant. No filler text.`,
};

function buildMessages(body: any) {
  const { message, history, mode, fileContent, suggestionType } = body;

  // ── Autocomplete / explain / debug (context menu) ──────────────────────────
  if (suggestionType && fileContent) {
    const prompts: Record<string, { system: string; user: string }> = {
      explain: {
        system: "Expert programming tutor. Explain concisely. Do NOT repeat the original code.",
        user: `Explain this code:\n\`\`\`\n${fileContent}\n\`\`\``,
      },
      debug: {
        system: "Expert debugger. Find issues and show fixes concisely.",
        user: `Find bugs and fix:\n\`\`\`\n${fileContent}\n\`\`\``,
      },
      suggest: {
        system: "AI autocomplete. Output ONLY the raw code that comes next. No markdown, no backticks, no explanation.",
        user: `Continue:\n${fileContent}`,
      },
    };
    const p = prompts[suggestionType] ?? prompts.suggest;
    return { messages: [{ role: "system", content: p.system }, { role: "user", content: p.user }], stream: false };
  }

  // ── Chat sidebar ────────────────────────────────────────────────────────────
  if (message) {
    const system = MODE_PROMPTS[mode] ?? MODE_PROMPTS.chat;
    return {
      messages: [
        { role: "system", content: system },
        ...(history ?? []).slice(-8).map((m: any) => ({
          role: m.role === "model" ? "assistant" : m.role,
          content: m.content,
        })),
        { role: "user", content: message },
      ],
      stream: true,
    };
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const built = buildMessages(body);

    if (!built) {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "AI API key not configured." }, { status: 500 });
    }

    const isStream = built.stream;
    const isSuggest = body.suggestionType === "suggest";

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: isSuggest ? SUGGEST_MODEL : CHAT_MODEL,
        messages: built.messages,
        temperature: isSuggest ? 0.1 : 0.3,
        max_tokens: isSuggest ? 256 : 2048,
        stream: isStream,
      }),
    });

    if (!groqRes.ok) {
      const text = await groqRes.text();
      if (groqRes.status === 429) return NextResponse.json({ error: "Rate limited. Please wait and try again." }, { status: 429 });
      if (groqRes.status === 403) return NextResponse.json({ error: "Invalid or expired API key." }, { status: 403 });
      return NextResponse.json({ error: `Groq error (${groqRes.status}): ${text}` }, { status: groqRes.status });
    }

    // ── Streaming response ────────────────────────────────────────────────────
    if (isStream && groqRes.body) {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      const stream = new ReadableStream({
        async start(controller) {
          const reader = groqRes.body!.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) { controller.close(); break; }

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n").filter((l) => l.startsWith("data: "));

              for (const line of lines) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") { controller.close(); return; }
                try {
                  const json = JSON.parse(data);
                  const token = json.choices?.[0]?.delta?.content;
                  if (token) controller.enqueue(encoder.encode(token));
                } catch {}
              }
            }
          } catch (err) {
            controller.error(err);
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Transfer-Encoding": "chunked",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // ── Non-streaming (autocomplete / explain / debug) ────────────────────────
    const data = await groqRes.json();
    const aiText = data.choices?.[0]?.message?.content;
    if (!aiText) return NextResponse.json({ error: "AI returned an empty response." }, { status: 500 });

    return NextResponse.json({
      suggestion: aiText,
      response: aiText,
      model: CHAT_MODEL,
      tokens: data.usage?.total_tokens ?? 0,
    });
  } catch (err: any) {
    console.error("AI API Error:", err?.message ?? err);
    return NextResponse.json({ error: err?.message ?? "Failed to connect to AI." }, { status: 500 });
  }
}
