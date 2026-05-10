/**
 * Unit Tests: src/app/api/chat/route.ts
 * Tests the POST handler logic for the AI chat API route.
 * We mock fetch and env vars to avoid real network calls.
 * @jest-environment node
 */

// ─── Mock global fetch ────────────────────────────────────────────────────────
const mockFetch = jest.fn();
global.fetch = mockFetch;

// ─── Mock NextResponse ────────────────────────────────────────────────────────
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

import { POST } from "../../src/app/api/chat/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: object): Request {
  return {
    json: async () => body,
  } as unknown as Request;
}

function mockGroqSuccess(content: string) {
  // Chat uses streaming — mock a ReadableStream SSE response
  const encoder = new TextEncoder();
  const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseData));
      controller.close();
    },
  });
  mockFetch.mockResolvedValueOnce({ ok: true, body: stream, status: 200 });
}

function mockGroqSuccessJson(content: string) {
  // Non-streaming (suggest/explain/debug)
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
      usage: { total_tokens: 42 },
    }),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/chat", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV, GROQ_API_KEY: "test-key-123" };
    mockFetch.mockReset();
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  // ── Chat sidebar scenario ──────────────────────────────────────────────────

  test("returns AI response for a valid chat message", async () => {
    mockGroqSuccess("Here is your answer.");
    const req = makeRequest({ message: "How do I use useEffect?" });
    const res = await POST(req);
    // Streaming returns a Response with status 200
    expect(res.status).toBe(200);
  });

  test("includes chat history in the messages sent to Groq", async () => {
    mockGroqSuccess("Continued response.");
    const req = makeRequest({
      message: "What about cleanup?",
      history: [
        { role: "user", content: "How do I use useEffect?" },
        { role: "model", content: "useEffect runs after render." },
      ],
    });
    await POST(req);
    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(sentBody.messages.some((m: any) => m.role === "assistant")).toBe(true);
  });

  // ── Context menu scenario ──────────────────────────────────────────────────

  test("handles explain suggestionType correctly", async () => {
    mockGroqSuccessJson("This code does X.");
    const req = makeRequest({ suggestionType: "explain", fileContent: "const x = 1;" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.body.suggestion).toBe("This code does X.");
  });

  test("handles debug suggestionType correctly", async () => {
    mockGroqSuccessJson("Bug found on line 3.");
    const req = makeRequest({ suggestionType: "debug", fileContent: "let x = undefinedVar;" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.body.suggestion).toBe("Bug found on line 3.");
  });

  test("handles suggest (autocomplete) suggestionType correctly", async () => {
    mockGroqSuccessJson("  return <div />;");
    const req = makeRequest({ suggestionType: "suggest", fileContent: "function App() {" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  // ── Error scenarios ────────────────────────────────────────────────────────

  test("returns 400 when payload has neither message nor suggestionType", async () => {
    const req = makeRequest({ randomField: "oops" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid request payload");
  });

  test("returns 500 when GROQ_API_KEY is missing", async () => {
    delete process.env.GROQ_API_KEY;
    const req = makeRequest({ message: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("API key");
  });

  test("returns 429 when Groq rate limits the request", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429, text: async () => "rate limited" });
    const req = makeRequest({ message: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/rate limit/i);
  });

  test("returns 403 when Groq rejects the API key", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => "forbidden" });
    const req = makeRequest({ message: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/API key/i);
  });

  test("returns 500 when Groq returns empty choices", async () => {
    mockGroqSuccessJson("");
    const req = makeRequest({ suggestionType: "explain", fileContent: "x" });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  test("returns 500 when fetch throws a network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));
    const req = makeRequest({ message: "Hello" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(res.body.error).toContain("Network failure");
  });
});
