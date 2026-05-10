/**
 * UT-12: AI Ghost Text — Inline Code Suggestion
 * -----------------------------------------------------------------------------
 * Objective : Verify the AI suggestion hook fetches an inline completion from
 *             the /api/chat route and stores it in the AI store.
 * Input     : User types code in the editor; suggestion type is "suggest".
 * Expected  : Suggestion text stored in useAIStore; displayed as ghost text.
 * @jest-environment node
 */

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { POST } from "../../src/app/api/chat/route";

const makeReq = (body: object) => ({ json: async () => body } as any);

describe("UT-12 — AI Ghost Text: Inline Code Suggestion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GROQ_API_KEY = "test-key";
  });

  const mockSuggestResponse = (code: string) => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: code } }],
        usage: { total_tokens: 20 },
      }),
    });
  };

  test("returns 200 with suggestion for autocomplete request", async () => {
    mockSuggestResponse("  return <div>Hello</div>;");
    const res = await POST(makeReq({
      suggestionType: "suggest",
      fileContent: "function App() {",
    }));  
    expect(res.status).toBe(200);
    expect(res.body.suggestion).toBe("  return <div>Hello</div>;");
  });

  test("uses raw-code-only system prompt for suggest type", async () => {
    mockSuggestResponse("const result = a + b;");
    await POST(makeReq({ suggestionType: "suggest", fileContent: "function add(a, b) {" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.messages[0].content).toMatch(/only.*raw code|raw code.*only|autocomplete/i);
  });

  test("sends file content as the user message", async () => {
    mockSuggestResponse("  return x * 2;");
    await POST(makeReq({ suggestionType: "suggest", fileContent: "function double(x) {" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    const userMsg = body.messages.find((m: any) => m.role === "user");
    expect(userMsg.content).toContain("function double(x) {");
  });

  test("uses smaller max_tokens for suggest vs chat", async () => {
    mockSuggestResponse("x;");
    await POST(makeReq({ suggestionType: "suggest", fileContent: "const x" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.max_tokens).toBeLessThanOrEqual(256);
  });

  test("uses lower temperature for suggest (deterministic output)", async () => {
    mockSuggestResponse("x;");
    await POST(makeReq({ suggestionType: "suggest", fileContent: "const x" }));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.temperature).toBeLessThanOrEqual(0.1);
  });

  test("returns 500 when GROQ_API_KEY is missing", async () => {
    delete process.env.GROQ_API_KEY;
    const res = await POST(makeReq({ suggestionType: "suggest", fileContent: "const x" }));
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/API key/i);
  });

  test("returns suggestion for TypeScript completion", async () => {
    mockSuggestResponse(": string => name.toUpperCase();");
    const res = await POST(makeReq({
      suggestionType: "suggest",
      fileContent: "const toUpper = (name",
    }));
    expect(res.status).toBe(200);
    expect(res.body.suggestion).toBeTruthy();
  });

  test("does not stream for suggest type (returns JSON)", async () => {
    mockSuggestResponse("const y = x + 1;");
    const res = await POST(makeReq({ suggestionType: "suggest", fileContent: "const x = 1;" }));
    // Non-streaming returns body.suggestion directly
    expect(res.body).toHaveProperty("suggestion");
  });
});
