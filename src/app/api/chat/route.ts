import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Destructure BOTH possible payloads (Chat format OR Context Menu format)
    const { 
      message, history, mode, // Used by Chat Sidebar
      fileContent, cursorLine, cursorColumn, suggestionType // Used by Explain/Debug/Suggest
    } = body;

    let ollamaMessages: any[] = [];
    let systemPrompt = "You are a helpful AI coding assistant. Provide clean, efficient code and concise explanations.";

    // --- SCENARIO 1: Context Menu (Explain, Debug, or Autocomplete) ---
    if (suggestionType && fileContent) {
      let promptMessage = "";

      if (suggestionType === "explain") {
        systemPrompt = "You are an expert programming tutor. Explain the given code concisely and clearly. Do not output the original code.";
        promptMessage = `Please explain the following code:\n\n\`\`\`\n${fileContent}\n\`\`\``;
      } 
      else if (suggestionType === "debug") {
        systemPrompt = "You are an expert debugger. Find issues in the given code and concisely explain how to fix them.";
        promptMessage = `Please find bugs and explain how to fix this code:\n\n\`\`\`\n${fileContent}\n\`\`\``;
      } 
      else {
        // "suggest" / Ghost text
        systemPrompt = "You are an AI code autocomplete tool. ONLY return the code that should come next. Do not include markdown formatting, explanations, or backticks. Only output raw code.";
        promptMessage = `Complete the following code. ONLY output the missing code that comes immediately after this:\n\n\`\`\`\n${fileContent}\n\`\`\``;
      }

      ollamaMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptMessage }
      ];
    } 
    // --- SCENARIO 2: Chat Sidebar ---
    else if (message) {
      ollamaMessages = [
        { role: "system", content: systemPrompt },
        ...(history || []).map((msg: any) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user", content: message },
      ];
    } else {
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }

    // Call your local Ollama instance
    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5-coder:1.5b", // Your local model
        messages: ollamaMessages,
        stream: false, 
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.statusText}`);
    }

    const data = await response.json();
    const aiText = data.message.content;

    // We return BOTH keys so it works for the Chat UI and the Context Menu UI perfectly!
    return NextResponse.json({
      suggestion: aiText, // Required by useAISuggestions.tsx
      response: aiText,   // Required by your Chat UI
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