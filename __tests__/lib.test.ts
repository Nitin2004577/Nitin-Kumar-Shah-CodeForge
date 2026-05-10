/**
 * Unit Tests: Playground Utility Functions
 * Tests for findFilePath and generateFileId from features/playground/lib/index.ts
 */

import { findFilePath, generateFileId } from "../features/playground/lib";
import type { TemplateFile, TemplateFolder } from "../features/playground/types";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const makeFile = (filename: string, ext: string, content = ""): TemplateFile => ({
  id: `${filename}.${ext}`,
  filename,
  fileExtension: ext,
  content,
});

const rootFolder: TemplateFolder = {
  id: "root",
  folderName: "Root",
  items: [
    makeFile("index", "ts", "console.log('hello')"),
    makeFile("App", "tsx", "<App />"),
    {
      id: "src",
      folderName: "src",
      items: [
        makeFile("utils", "ts", "export const add = (a,b) => a+b"),
        {
          id: "components",
          folderName: "components",
          items: [
            makeFile("Button", "tsx", "<button />"),
          ],
        },
      ],
    },
  ],
};

// ─── findFilePath ─────────────────────────────────────────────────────────────

describe("findFilePath", () => {
  test("finds a file at the root level", () => {
    const file = makeFile("index", "ts");
    const result = findFilePath(file, rootFolder);
    expect(result).toBe("index.ts");
  });

  test("finds a file one level deep", () => {
    const file = makeFile("utils", "ts");
    const result = findFilePath(file, rootFolder);
    expect(result).toBe("src/utils.ts");
  });

  test("finds a file two levels deep (nested folder)", () => {
    const file = makeFile("Button", "tsx");
    const result = findFilePath(file, rootFolder);
    expect(result).toBe("src/components/Button.tsx");
  });

  test("returns null when file does not exist in tree", () => {
    const file = makeFile("NotExist", "ts");
    const result = findFilePath(file, rootFolder);
    expect(result).toBeNull();
  });

  test("returns null for empty folder", () => {
    const emptyFolder: TemplateFolder = { id: "empty", folderName: "Empty", items: [] };
    const file = makeFile("index", "ts");
    expect(findFilePath(file, emptyFolder)).toBeNull();
  });

  test("does not match file with same name but different extension", () => {
    const file = makeFile("index", "tsx"); // root has index.ts not index.tsx
    const result = findFilePath(file, rootFolder);
    expect(result).toBeNull();
  });

  test("does not match file with same extension but different name", () => {
    const file = makeFile("main", "ts");
    const result = findFilePath(file, rootFolder);
    expect(result).toBeNull();
  });
});

// ─── generateFileId ───────────────────────────────────────────────────────────

describe("generateFileId", () => {
  test("generates ID for root-level file", () => {
    const file = makeFile("index", "ts");
    const id = generateFileId(file, rootFolder);
    expect(id).toBe("index.ts/index.ts");
  });

  test("generates ID for nested file", () => {
    const file = makeFile("utils", "ts");
    const id = generateFileId(file, rootFolder);
    expect(id).toBe("src/utils.ts/utils.ts");
  });

  test("generates ID for deeply nested file", () => {
    const file = makeFile("Button", "tsx");
    const id = generateFileId(file, rootFolder);
    expect(id).toBe("src/components/Button.tsx/Button.tsx");
  });

  test("generates ID for file not in tree (fallback to filename only)", () => {
    const file = makeFile("ghost", "js");
    const id = generateFileId(file, rootFolder);
    expect(id).toBe("ghost.js");
  });

  test("handles file with no extension", () => {
    const file: TemplateFile = { id: "Makefile", filename: "Makefile", fileExtension: "", content: "" };
    const id = generateFileId(file, rootFolder);
    expect(id).toBe("Makefile");
  });
});
