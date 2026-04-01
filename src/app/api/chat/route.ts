import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Destructure BOTH possible payloads (Chat format OR Context Menu format)
    const {
      message,
      history,
      mode, // Used by Chat Sidebar
      fileContent,
      cursorLine,
      cursorColumn,
      suggestionType, // Used by Explain/Debug/Suggest
    } = body;

    let messages: any[] = [];
    let systemPrompt =
      "You are a helpful AI coding assistant. Provide clean, efficient code and concise explanations.";

    // --- SCENARIO 1: Context Menu (Explain, Debug, or Autocomplete) ---
    if (suggestionType && fileContent) {
      let promptMessage = "";

      if (suggestionType === "explain") {
        systemPrompt =
          "You are an expert programming tutor. Explain the given code concisely and clearly. Do not output the original code.";
        promptMessage = `Please explain the following code:\n\n\`\`\`\n${fileContent}\n\`\`\``;
      } else if (suggestionType === "debug") {
        systemPrompt =
          "You are an expert debugger. Find issues in the given code and concisely explain how to fix them.";
        promptMessage = `Please find bugs and explain how to fix this code:\n\n\`\`\`\n${fileContent}\n\`\`\``;
      } else {
        // "suggest" / Ghost text
        systemPrompt =
          "You are an AI code autocomplete tool. ONLY return the code that should come next. Do not include markdown formatting, explanations, or backticks. Only output raw code.";
        promptMessage = `Complete the following code. ONLY output the missing code that comes immediately after this:\n\n\`\`\`\n${fileContent}\n\`\`\``;
      }

      messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: promptMessage },
      ];
    }
    // --- SCENARIO 2: Chat Sidebar ---
    else if (message) {
      messages = [
        { role: "system", content: systemPrompt },
        ...(history || []).map((msg: any) => ({
          role: msg.role === "model" ? "assistant" : msg.role,
          content: msg.content,
        })),
        { role: "user", content: message },
      ];
    } else {
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }

    // Ensure the API key exists
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY environment variable.");
      return NextResponse.json(
        { error: "AI API key not configured on server." },
        { status: 500 }
      );
    }
    // Call Google Gemini using the OpenAI-compatible endpoint
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gemini-2.0-flash",
          messages: messages,
          temperature: 0.2,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Gemini API Error] Status ${response.status}:`, errorText);

      if (response.status === 429) {
        return NextResponse.json(
          { error: "AI is currently rate-limited. Please wait a moment and try again." },
          { status: 429 }
        );
      }

      // Return the actual Gemini error message to help debug
      return NextResponse.json(
        { error: `Gemini API error (${response.status}): ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const aiText = data.choices?.[0]?.message?.content;

    if (!aiText) {
      console.error("[Gemini] Unexpected response shape:", JSON.stringify(data));
      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      suggestion: aiText,
      response: aiText,
      model: "gemini-2.0-flash",
      tokens: data.usage?.total_tokens || 0,
    });
  } catch (error: any) {
    console.error("AI API Error:", error?.message || error);
    return NextResponse.json(
      { error: error?.message || "Failed to connect to the AI provider." },
      { status: 500 }
    );
  }
}
