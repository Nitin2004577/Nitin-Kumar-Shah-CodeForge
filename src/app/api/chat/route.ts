import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { message, history, mode } = await req.json();

    // Map your history to the format Ollama/Llama expects
    const ollamaMessages = [
      {
        role: "system",
        content: "You are a helpful AI coding assistant. Provide clean, efficient code and concise explanations."
      },
      ...(history || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      { role: "user", content: message },
    ];

    // Call your local Ollama instance
    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3", // Or "deepseek-coder", "mistral", etc.
        messages: ollamaMessages,
        stream: false, // Set to false for a simpler JSON response
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json({
      response: data.message.content,
      model: data.model,
      tokens: data.eval_count || 0,
    });
  } catch (error: any) {
    console.error("Ollama API Error:", error);
    return NextResponse.json(
      { error: "Is Ollama running? Make sure to run 'ollama serve' in your terminal." },
      { status: 500 }
    );
  }
}