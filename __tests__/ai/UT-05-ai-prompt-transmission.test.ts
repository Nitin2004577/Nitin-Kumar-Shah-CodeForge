/**
 * UT-05: AI Prompt Transmission to Groq Cloud API
 * -----------------------------------------------------------------------------
 * Objective : Verify the /api/chat serverless function successfully transmits
 *             user prompts to the Groq API and handles the response.
 * Input     : User submits a text prompt in the CodeForge IDE AI chat panel.
 * Expected  : The /api/chat route forwards the payload and a response begins.
 * Result    : PASS
 *
 * @jest-environment node
 */

// --- Mocks -------------------------------------------------------------------

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body, init) => ({ body, status: init?.status ?? 200 }),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const groqOk = (content, tokens = 55) => {
  // Chat messages use streaming — simulate SSE stream
  const encoder = new TextEncoder();
  const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseData));
      controller.close();
    },
  });
  return Promise.resolve({ ok: true, body: stream, status: 200 });
};

// For non-streaming (suggest/explain/debug) responses
const groqOkJson = (content, tokens = 55) =>
  Promise.resolve({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
      usage: { total_tokens: tokens },
    }),
  });

import { POST } from "../../src/app/api/chat/route";

const makeReq = (body) => ({ json: async () => body });

// --- Tests -------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GROQ_API_KEY = "test-groq-key-ut05";
});

describe("UT-05 — AI Prompt Transmission to Groq Cloud API", () => {

  // 1. Prompt is forwarded to Groq
  test("forwards user prompt to the Groq API endpoint", async () => {
    mockFetch.mockResolvedValueOnce(groqOk("Here is the answer"));
    await POST(makeReq({ message: "Explain useEffect in React" }));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
  });

  test("sends the correct model in the Groq request body", async () => {
    mockFetch.mockResolvedValueOnce(groqOk("answer"));
    await POST(makeReq({ message: "What is TypeScript?" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.model).toBe("llama-3.1-8b-instant");
  });

  test("includes the user prompt as the last message in the payload", async () => {
    mockFetch.mockResolvedValueOnce(groqOk("answer"));
    await POST(makeReq({ message: "How do I fix this bug?" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const lastMsg = body.messages[body.messages.length - 1];
    expect(lastMsg.role).toBe("user");
    expect(lastMsg.content).toBe("How do I fix this bug?");
  });

  test("includes Authorization header with Bearer token", async () => {
    mockFetch.mockResolvedValueOnce(groqOk("answer"));
    await POST(makeReq({ message: "hello" }));

    const headers = mockFetch.mock.calls[0][1].headers;
    expect(headers["Authorization"]).toBe("Bearer test-groq-key-ut05");
  });

  test("includes system prompt as first message in payload", async () => {
    mockFetch.mockResolvedValueOnce(groqOk("answer"));
    await POST(makeReq({ message: "hello" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toBeTruthy();
  });

  // 2. Response is received and returned
  test("returns 200 with streaming response when Groq responds successfully", async () => {
    mockFetch.mockResolvedValueOnce(groqOk("useEffect runs after every render"));
    const res = await POST(makeReq({ message: "Explain useEffect" }));
    // Streaming returns a Response object with status 200
    expect(res.status).toBe(200);
  });

  test("returns token count from Groq usage for non-streaming requests", async () => {
    mockFetch.mockResolvedValueOnce(groqOkJson("answer", 128));
    const res = await POST(makeReq({ suggestionType: "explain", fileContent: "const x = 1;" }));
    expect(res.body.tokens).toBe(128);
  });

  test("returns model name for non-streaming requests", async () => {
    mockFetch.mockResolvedValueOnce(groqOkJson("answer"));
    const res = await POST(makeReq({ suggestionType: "explain", fileContent: "const x = 1;" }));
    expect(res.body.model).toBe("llama-3.1-8b-instant");
  });

  // 3. Conversation history is forwarded correctly
  test("maps conversation history role 'model' to 'assistant' for Groq", async () => {
    mockFetch.mockResolvedValueOnce(groqOk("follow-up answer"));
    await POST(makeReq({
      message: "Follow up",
      history: [
        { role: "user",  content: "First question" },
        { role: "model", content: "First answer" },
      ],
    }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const assistantMsg = body.messages.find((m) => m.role === "assistant");
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.content).toBe("First answer");
  });

  test("sends full conversation history to Groq for context", async () => {
    mockFetch.mockResolvedValueOnce(groqOk("answer"));
    await POST(makeReq({
      message: "Third message",
      history: [
        { role: "user",  content: "First" },
        { role: "model", content: "Second" },
      ],
    }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    // system + 2 history + 1 new user = 4 messages
    expect(body.messages.length).toBe(4);
  });

  // 4. Groq API error handling
  test("returns 429 when Groq rate limits the request", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false, status: 429, text: async () => "rate limited",
    });
    const res = await POST(makeReq({ message: "hello" }));

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/rate limit/i);
  });

  test("returns 500 when Groq returns an empty response", async () => {
    mockFetch.mockResolvedValueOnce(groqOkJson(""));
    const res = await POST(makeReq({ suggestionType: "explain", fileContent: "x" }));
    expect(res.status).toBe(500);
  });

  test("returns 500 when network request to Groq fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));
    const res = await POST(makeReq({ message: "hello" }));

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/network failure/i);
  });

  // 5. Suggest / explain / debug modes also transmit correctly
  test("forwards explain prompt with correct system instruction", async () => {
    mockFetch.mockResolvedValueOnce(groqOk("This code does X"));
    await POST(makeReq({ suggestionType: "explain", fileContent: "const x = 1;" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toMatch(/explain/i);
  });

  test("forwards debug prompt with correct system instruction", async () => {
    mockFetch.mockResolvedValueOnce(groqOk("Bug on line 2"));
    await POST(makeReq({ suggestionType: "debug", fileContent: "let x = undef;" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toMatch(/debug/i);
  });

  test("forwards autocomplete prompt with raw-code-only system instruction", async () => {
    mockFetch.mockResolvedValueOnce(groqOk("  return a + b;"));
    await POST(makeReq({ suggestionType: "suggest", fileContent: "function add(a,b){" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toMatch(/autocomplete|raw code/i);
  });
});
