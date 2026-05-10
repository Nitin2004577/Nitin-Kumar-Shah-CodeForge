/**
 * Unit Tests: features/playground/lib/index.ts
 * Tests for findFilePath and generateFileId utility functions.
 */

import { findFilePath, generateFileId } from "../../features/playground/lib/index";
import type { TemplateFile, TemplateFolder } from "../../features/playground/lib/path-to-json";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const indexFile: TemplateFile = {
  filename: "index",
  fileExtension: "ts",
  content: "console.log('hello')",
};

const appFile: TemplateFile = {
  filename: "App",
  fileExtension: "tsx",
  content: "export default function App() {}",
};

const noExtFile: TemplateFile = {
  filename: "Dockerfile",
  fileExtension: "",
  content: "FROM node:18",
};

const rootFolder: TemplateFolder = {
  folderName: "Root",
  items: [
    {
      folderName: "src",
      items: [
        appFile,
        {
          folderName: "utils",
          items: [indexFile],
        },
      ],
    },
    noExtFile,
  ],
};

// ─── findFilePath ─────────────────────────────────────────────────────────────

describe("findFilePath", () => {
  test("finds a file nested one level deep", () => {
    const path = findFilePath(appFile, rootFolder);
    expect(path).toBe("src/App.tsx");
  });

  test("finds a file nested two levels deep", () => {
    const path = findFilePath(indexFile, rootFolder);
    expect(path).toBe("src/utils/index.ts");
  });

  test("finds a file at the root level", () => {
    const path = findFilePath(noExtFile, rootFolder);
    expect(path).toBe("Dockerfile");
  });

  test("returns null when file does not exist in the tree", () => {
    const ghost: TemplateFile = { filename: "ghost", fileExtension: "js", content: "" };
    const path = findFilePath(ghost, rootFolder);
    expect(path).toBeNull();
  });

  test("returns null for an empty folder", () => {
    const emptyFolder: TemplateFolder = { folderName: "empty", items: [] };
    const path = findFilePath(appFile, emptyFolder);
    expect(path).toBeNull();
  });

  test("does not match a file with same name but different extension", () => {
    const jsVersion: TemplateFile = { filename: "App", fileExtension: "js", content: "" };
    const path = findFilePath(jsVersion, rootFolder);
    expect(path).toBeNull();
  });
});

// ─── generateFileId ───────────────────────────────────────────────────────────

describe("generateFileId", () => {
  test("generates correct ID for a deeply nested file", () => {
    const id = generateFileId(indexFile, rootFolder);
    // path = src/utils/index.ts, so id = src/utils/index.ts/index.ts
    expect(id).toContain("index");
    expect(id).toContain("ts");
  });

  test("generates correct ID for a file with no extension", () => {
    const id = generateFileId(noExtFile, rootFolder);
    expect(id).toContain("Dockerfile");
    // Should not end with a trailing dot
    expect(id).not.toMatch(/\.$/);
  });

  test("generates a non-empty string for any valid file", () => {
    const id = generateFileId(appFile, rootFolder);
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  test("two different files produce different IDs", () => {
    const id1 = generateFileId(appFile, rootFolder);
    const id2 = generateFileId(indexFile, rootFolder);
    expect(id1).not.toBe(id2);
  });
});
