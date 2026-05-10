/**
 * UT-03: Fetch Starter Template for a New Project
 * ─────────────────────────────────────────────────────────────────────────────
 * Objective : Verify the /api/template/[id] serverless function returns the
 *             correct file tree.
 * Input     : User selects a language (e.g., React) and clicks "Create Project".
 * Expected  : Server responds with 200 OK and loads the JSON file tree into
 *             the editor.
 * Result    : PASS
 *
 * @jest-environment node
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("next/server", () => ({
  NextRequest: jest.fn(),
}));

// Mock Prisma DB
jest.mock("@/lib/db", () => ({
  db: {
    playground: {
      findUnique: jest.fn(),
    },
  },
}));

// Mock fs.readFile to avoid hitting the real filesystem
jest.mock("fs", () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

import { promises as fs } from "fs";
import { db } from "@/lib/db";
import { GET } from "../../src/app/api/template/[id]/route";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const reactTemplateJson = {
  folderName: "react",
  items: [
    { filename: "package", fileExtension: "json", content: '{"name":"react-starter"}' },
    {
      folderName: "src",
      items: [
        { filename: "index", fileExtension: "tsx", content: "import React from 'react'" },
        { filename: "App",   fileExtension: "tsx", content: "export default function App() {}" },
      ],
    },
    {
      folderName: "public",
      items: [
        { filename: "index", fileExtension: "html", content: '<div id="app"></div>' },
      ],
    },
  ],
};

const nextjsTemplateJson = {
  folderName: "nextjs",
  items: [
    { filename: "package", fileExtension: "json", content: '{"name":"nextjs-starter"}' },
    {
      folderName: "src",
      items: [
        { filename: "page", fileExtension: "tsx", content: "export default function Page() {}" },
      ],
    },
  ],
};

// Helper — builds the params object the route expects
const makeParams = (id: string) =>
  ({ params: Promise.resolve({ id }) } as any);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("UT-03 — GET /api/template/[id]", () => {

  beforeEach(() => jest.clearAllMocks());

  // ── 1. Happy path — React template ────────────────────────────────────────

  test("returns 200 with React file tree when playground template is REACT", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue({
      id: "playground-abc",
      template: "REACT",
    });
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(reactTemplateJson));

    const res = await GET({} as any, makeParams("playground-abc"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.templateJson.folderName).toBe("react");
  });

  test("React template contains a src folder in the file tree", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue({
      id: "playground-abc",
      template: "REACT",
    });
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(reactTemplateJson));

    const res = await GET({} as any, makeParams("playground-abc"));
    const body = await res.json();

    const hasSrcFolder = body.templateJson.items.some(
      (item: any) => item.folderName === "src"
    );
    expect(hasSrcFolder).toBe(true);
  });

  test("React template contains a public folder in the file tree", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue({
      id: "playground-abc",
      template: "REACT",
    });
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(reactTemplateJson));

    const res = await GET({} as any, makeParams("playground-abc"));
    const body = await res.json();

    const hasPublicFolder = body.templateJson.items.some(
      (item: any) => item.folderName === "public"
    );
    expect(hasPublicFolder).toBe(true);
  });

  test("React template contains package.json at root level", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue({
      id: "playground-abc",
      template: "REACT",
    });
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(reactTemplateJson));

    const res = await GET({} as any, makeParams("playground-abc"));
    const body = await res.json();

    const hasPackageJson = body.templateJson.items.some(
      (item: any) => item.filename === "package" && item.fileExtension === "json"
    );
    expect(hasPackageJson).toBe(true);
  });

  // ── 2. Happy path — Next.js template ──────────────────────────────────────

  test("returns 200 with Next.js file tree when playground template is NEXTJS", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue({
      id: "playground-xyz",
      template: "NEXTJS",
    });
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(nextjsTemplateJson));

    const res = await GET({} as any, makeParams("playground-xyz"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.templateJson.folderName).toBe("nextjs");
  });

  test("reads the correct JSON file based on playground template type", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue({
      id: "playground-xyz",
      template: "NEXTJS",
    });
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(nextjsTemplateJson));

    await GET({} as any, makeParams("playground-xyz"));

    // Verify it reads the NEXTJS.json file, not REACT.json
    const readFilePath = (fs.readFile as jest.Mock).mock.calls[0][0] as string;
    expect(readFilePath).toContain("NEXTJS.json");
  });

  // ── 3. Error cases ─────────────────────────────────────────────────────────

  test("returns 404 when playground ID does not exist in DB", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue(null);

    const res = await GET({} as any, makeParams("nonexistent-id"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toMatch(/not found/i);
  });

  test("returns 400 when playground ID is missing", async () => {
    const res = await GET({} as any, { params: Promise.resolve({ id: "" }) } as any);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/missing/i);
  });

  test("returns 500 when template JSON file cannot be read from disk", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue({
      id: "playground-abc",
      template: "REACT",
    });
    (fs.readFile as jest.Mock).mockRejectedValue(
      new Error("ENOENT: no such file or directory")
    );

    const res = await GET({} as any, makeParams("playground-abc"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/failed to load template/i);
  });

  test("returns 500 with details when JSON file is malformed", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue({
      id: "playground-abc",
      template: "REACT",
    });
    (fs.readFile as jest.Mock).mockResolvedValue("{ invalid json ::::");

    const res = await GET({} as any, makeParams("playground-abc"));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.details).toBeDefined();
  });

  // ── 4. DB interaction ──────────────────────────────────────────────────────

  test("queries DB with the correct playground ID", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue({
      id: "playground-abc",
      template: "REACT",
    });
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(reactTemplateJson));

    await GET({} as any, makeParams("playground-abc"));

    expect(db.playground.findUnique).toHaveBeenCalledWith({
      where: { id: "playground-abc" },
    });
  });

  test("reads template from public/templates directory", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue({
      id: "playground-abc",
      template: "REACT",
    });
    (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(reactTemplateJson));

    await GET({} as any, makeParams("playground-abc"));

    const readFilePath = (fs.readFile as jest.Mock).mock.calls[0][0] as string;
    expect(readFilePath).toContain("public");
    expect(readFilePath).toContain("templates");
    expect(readFilePath).toContain("REACT.json");
  });
});
