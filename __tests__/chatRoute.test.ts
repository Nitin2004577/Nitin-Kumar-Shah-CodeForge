/**
 * Unit Tests: /api/chat route handler
 * Tests request validation, payload routing, and error handling
 */

// Mock next/server before importing the route
jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    }),
  },
}));

// Mock global fetch used to call Groq API
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { POST } from "../src/app/api/chat/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeRequest = (body: object): Request =>
  ({ json: async () => body } as unknown as Request);

const groqSuccess = (content: string) =>
  Promise.resolve({
    ok: true,
    json: async () => ({
      choices: [{ message: { content } }],
      usage: { total_tokens: 42 },
    }),
  });

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  process.env.GROQ_API_KEY = "test-key-123";
});

describe("POST /api/chat — request validation", () => {
  test("returns 400 when body has neither message nor suggestionType", async () => {
    const req = makeRequest({});
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid request/i);
  });

  test("returns 500 when GROQ_API_KEY is missing", async () => {
    delete process.env.GROQ_API_KEY;
    const req = makeRequest({ message: "hello" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/api key/i);
  });
});

describe("POST /api/chat — chat sidebar (message payload)", () => {
  test("returns AI response for a valid chat message", async () => {
    mockFetch.mockResolvedValueOnce(groqSuccess("Here is your answer"));
    const req = makeRequest({ message: "What is TypeScript?" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.body.response).toBe("Here is your answer");
  });

  test("includes conversation history in the Groq request", async () => {
    mockFetch.mockResolvedValueOnce(groqSuccess("Continued answer"));
    const req = makeRequest({
      message: "Follow up question",
      history: [
        { role: "user", content: "First question" },
        { role: "model", content: "First answer" },
      ],
    });
    await POST(req);

    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body);
    // history role "model" should be mapped to "assistant"
    expect(sentBody.messages.some((m: any) => m.role === "assistant")).toBe(true);
  });

  test("returns model name and token count in response", async () => {
    mockFetch.mockResolvedValueOnce(groqSuccess("answer"));
    const req = makeRequest({ message: "hi" });
    const res = await POST(req);
    expect(res.body.model).toBe("llama-3.3-70b-versatile");
    expect(res.body.tokens).toBe(42);
  });
});

describe("POST /api/chat — context menu (suggestionType payload)", () => {
  test("handles explain suggestionType", async () => {
    mockFetch.mockResolvedValueOnce(groqSuccess("This code does X"));
    const req = makeRequest({
      suggestionType: "explain",
      fileContent: "const x = 1;",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.body.suggestion).toBe("This code does X");
  });

  test("handles debug suggestionType", async () => {
    mockFetch.mockResolvedValueOnce(groqSuccess("Bug found on line 3"));
    const req = makeRequest({
      suggestionType: "debug",
      fileContent: "let x = undefinedVar;",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.body.suggestion).toBe("Bug found on line 3");
  });

  test("handles suggest (autocomplete) suggestionType", async () => {
    mockFetch.mockResolvedValueOnce(groqSuccess("  return a + b;"));
    const req = makeRequest({
      suggestionType: "suggest",
      fileContent: "function add(a, b) {",
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.body.suggestion).toBe("  return a + b;");
  });
});

describe("POST /api/chat — Groq API error handling", () => {
  test("returns 429 when Groq rate limits", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429, text: async () => "rate limited" });
    const req = makeRequest({ message: "hi" });
    const res = await POST(req);
    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/rate-limited/i);
  });

  test("returns 403 when Groq API key is invalid", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => "forbidden" });
    const req = makeRequest({ message: "hi" });
    const res = await POST(req);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/invalid or expired/i);
  });

  test("returns 500 when Groq returns empty choices", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [], usage: {} }),
    });
    const req = makeRequest({ message: "hi" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/empty response/i);
  });

  test("returns 500 when fetch throws a network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));
    const req = makeRequest({ message: "hi" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/network failure/i);
  });
});
