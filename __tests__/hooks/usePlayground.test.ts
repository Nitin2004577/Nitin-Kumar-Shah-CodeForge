/**
 * Unit Tests: hasSavedTemplate logic from usePlayground hook
 * Tests the logic that determines whether to fetch from API or use DB data.
 * This logic is extracted and tested in isolation (pure function style).
 */

// ─── Extracted logic (mirrors the useMemo in usePlayground.tsx) ───────────────

function hasSavedTemplate(playgroundData: any): boolean {
  const raw = playgroundData?.templateFiles?.[0]?.content;
  return typeof raw === "string" || (raw != null && typeof raw === "object");
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("hasSavedTemplate logic", () => {
  test("returns true when content is a JSON string", () => {
    const data = { templateFiles: [{ content: '{"folderName":"Root","items":[]}' }] };
    expect(hasSavedTemplate(data)).toBe(true);
  });

  test("returns true when content is an object (already parsed)", () => {
    const data = { templateFiles: [{ content: { folderName: "Root", items: [] } }] };
    expect(hasSavedTemplate(data)).toBe(true);
  });

  test("returns false when templateFiles array is empty", () => {
    const data = { templateFiles: [] };
    expect(hasSavedTemplate(data)).toBe(false);
  });

  test("returns false when content is null", () => {
    const data = { templateFiles: [{ content: null }] };
    expect(hasSavedTemplate(data)).toBe(false);
  });

  test("returns false when content is undefined", () => {
    const data = { templateFiles: [{ content: undefined }] };
    expect(hasSavedTemplate(data)).toBe(false);
  });

  test("returns false when playgroundData is null", () => {
    expect(hasSavedTemplate(null)).toBe(false);
  });

  test("returns false when playgroundData is undefined", () => {
    expect(hasSavedTemplate(undefined)).toBe(false);
  });

  test("returns false when templateFiles key is missing", () => {
    const data = { title: "My Playground" };
    expect(hasSavedTemplate(data)).toBe(false);
  });

  test("returns true when content is an empty string (falsy but still a string)", () => {
    // An empty string means a save was attempted — treat as saved
    const data = { templateFiles: [{ content: "" }] };
    expect(hasSavedTemplate(data)).toBe(true);
  });
});

// ─── Template JSON parsing logic ──────────────────────────────────────────────

describe("template content parsing", () => {
  function parseTemplateContent(raw: any) {
    if (typeof raw === "string") return JSON.parse(raw);
    if (raw != null && typeof raw === "object") return raw;
    return null;
  }

  test("parses a valid JSON string into an object", () => {
    const raw = '{"folderName":"Root","items":[]}';
    const result = parseTemplateContent(raw);
    expect(result).toEqual({ folderName: "Root", items: [] });
  });

  test("returns the object as-is when already parsed", () => {
    const raw = { folderName: "Root", items: [] };
    const result = parseTemplateContent(raw);
    expect(result).toBe(raw);
  });

  test("returns null for null input", () => {
    expect(parseTemplateContent(null)).toBeNull();
  });

  test("returns null for undefined input", () => {
    expect(parseTemplateContent(undefined)).toBeNull();
  });

  test("throws on malformed JSON string", () => {
    expect(() => parseTemplateContent("{bad json}")).toThrow();
  });
});
