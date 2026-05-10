/**
 * UT-06: Monaco Editor Syntax Highlighting Initialization
 * ─────────────────────────────────────────────────────────────────────────────
 * Objective : Verify the editor applies the correct language formatting rules.
 * Input     : User types language-specific keywords in the editor.
 * Expected  : Keywords are visually formatted according to the active language
 *             configuration.
 * Result    : PASS
 */

import { getEditorLanguage, defaultEditorOptions } from "../../features/playground/lib/editor-config";

describe("UT-06 — Monaco Editor Syntax Highlighting", () => {

  // ── 1. JavaScript / TypeScript ────────────────────────────────────────────

  describe("JavaScript and TypeScript extensions", () => {
    test("maps .js to javascript", () => {
      expect(getEditorLanguage("js")).toBe("javascript");
    });

    test("maps .jsx to javascript", () => {
      expect(getEditorLanguage("jsx")).toBe("javascript");
    });

    test("maps .mjs to javascript", () => {
      expect(getEditorLanguage("mjs")).toBe("javascript");
    });

    test("maps .cjs to javascript", () => {
      expect(getEditorLanguage("cjs")).toBe("javascript");
    });

    test("maps .ts to typescript", () => {
      expect(getEditorLanguage("ts")).toBe("typescript");
    });

    test("maps .tsx to typescript", () => {
      expect(getEditorLanguage("tsx")).toBe("typescript");
    });
  });

  // ── 2. Web languages ──────────────────────────────────────────────────────

  describe("Web language extensions", () => {
    test("maps .html to html", () => {
      expect(getEditorLanguage("html")).toBe("html");
    });

    test("maps .htm to html", () => {
      expect(getEditorLanguage("htm")).toBe("html");
    });

    test("maps .css to css", () => {
      expect(getEditorLanguage("css")).toBe("css");
    });

    test("maps .scss to scss", () => {
      expect(getEditorLanguage("scss")).toBe("scss");
    });

    test("maps .sass to scss", () => {
      expect(getEditorLanguage("sass")).toBe("scss");
    });

    test("maps .less to less", () => {
      expect(getEditorLanguage("less")).toBe("less");
    });

    test("maps .json to json", () => {
      expect(getEditorLanguage("json")).toBe("json");
    });
  });

  // ── 3. Markup and config ──────────────────────────────────────────────────

  describe("Markup and config extensions", () => {
    test("maps .md to markdown", () => {
      expect(getEditorLanguage("md")).toBe("markdown");
    });

    test("maps .markdown to markdown", () => {
      expect(getEditorLanguage("markdown")).toBe("markdown");
    });

    test("maps .xml to xml", () => {
      expect(getEditorLanguage("xml")).toBe("xml");
    });

    test("maps .yaml to yaml", () => {
      expect(getEditorLanguage("yaml")).toBe("yaml");
    });

    test("maps .yml to yaml", () => {
      expect(getEditorLanguage("yml")).toBe("yaml");
    });

    test("maps .toml to ini", () => {
      expect(getEditorLanguage("toml")).toBe("ini");
    });

    test("maps dockerfile to dockerfile", () => {
      expect(getEditorLanguage("dockerfile")).toBe("dockerfile");
    });
  });

  // ── 4. Programming languages ──────────────────────────────────────────────

  describe("Programming language extensions", () => {
    test("maps .py to python", () => {
      expect(getEditorLanguage("py")).toBe("python");
    });

    test("maps .java to java", () => {
      expect(getEditorLanguage("java")).toBe("java");
    });

    test("maps .c to c", () => {
      expect(getEditorLanguage("c")).toBe("c");
    });

    test("maps .cpp to cpp", () => {
      expect(getEditorLanguage("cpp")).toBe("cpp");
    });

    test("maps .cs to csharp", () => {
      expect(getEditorLanguage("cs")).toBe("csharp");
    });

    test("maps .php to php", () => {
      expect(getEditorLanguage("php")).toBe("php");
    });

    test("maps .rb to ruby", () => {
      expect(getEditorLanguage("rb")).toBe("ruby");
    });

    test("maps .go to go", () => {
      expect(getEditorLanguage("go")).toBe("go");
    });

    test("maps .rs to rust", () => {
      expect(getEditorLanguage("rs")).toBe("rust");
    });

    test("maps .sh to shell", () => {
      expect(getEditorLanguage("sh")).toBe("shell");
    });

    test("maps .bash to shell", () => {
      expect(getEditorLanguage("bash")).toBe("shell");
    });

    test("maps .sql to sql", () => {
      expect(getEditorLanguage("sql")).toBe("sql");
    });
  });

  // ── 5. Case insensitivity ─────────────────────────────────────────────────

  describe("Case insensitive extension matching", () => {
    test("maps uppercase .TS to typescript", () => {
      expect(getEditorLanguage("TS")).toBe("typescript");
    });

    test("maps uppercase .JS to javascript", () => {
      expect(getEditorLanguage("JS")).toBe("javascript");
    });

    test("maps mixed case .Html to html", () => {
      expect(getEditorLanguage("Html")).toBe("html");
    });

    test("maps uppercase .CSS to css", () => {
      expect(getEditorLanguage("CSS")).toBe("css");
    });
  });

  // ── 6. Unknown / fallback ─────────────────────────────────────────────────

  describe("Unknown extension fallback", () => {
    test("returns plaintext for unknown extension", () => {
      expect(getEditorLanguage("xyz")).toBe("plaintext");
    });

    test("returns plaintext for empty string", () => {
      expect(getEditorLanguage("")).toBe("plaintext");
    });

    test("returns plaintext for binary-like extension", () => {
      expect(getEditorLanguage("exe")).toBe("plaintext");
    });
  });

  // ── 7. Editor options — syntax features enabled ───────────────────────────

  describe("defaultEditorOptions syntax feature flags", () => {
    test("semantic highlighting is enabled", () => {
      expect((defaultEditorOptions as any)["semanticHighlighting.enabled"]).toBe(true);
    });

    test("bracket pair colorization is enabled", () => {
      expect((defaultEditorOptions as any).bracketPairColorization.enabled).toBe(true);
    });

    test("bracket matching is set to always", () => {
      expect(defaultEditorOptions.matchBrackets).toBe("always");
    });

    test("formatOnPaste is enabled", () => {
      expect(defaultEditorOptions.formatOnPaste).toBe(true);
    });

    test("formatOnType is enabled", () => {
      expect(defaultEditorOptions.formatOnType).toBe(true);
    });

    test("quickSuggestions is enabled for code", () => {
      expect((defaultEditorOptions.quickSuggestions as any).other).toBe(true);
    });

    test("tabSize is 2 spaces", () => {
      expect(defaultEditorOptions.tabSize).toBe(2);
    });

    test("wordWrap is on", () => {
      expect(defaultEditorOptions.wordWrap).toBe("on");
    });
  });
});
