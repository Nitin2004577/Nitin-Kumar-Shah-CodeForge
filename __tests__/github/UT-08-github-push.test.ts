/**
 * UT-08: GitHub Push — Commit Files to Repository
 * -----------------------------------------------------------------------------
 * Objective : Verify the /api/github/push route correctly builds a Git tree,
 *             creates a commit, and updates the branch reference.
 * Input     : Authenticated request with repo name, commit message, and files.
 * Expected  : Files committed to GitHub; success response returned.
 * @jest-environment node
 */

jest.mock("next/server", () => ({
  NextResponse: {
    json: (body: any, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }),
  },
}));

jest.mock("../../auth", () => ({
  auth: jest.fn(),
}));

import { auth } from "../../auth";
import { POST } from "../../src/app/api/github/push/route";

const mockFetch = jest.fn();
global.fetch = mockFetch;

const makeReq = (body: object) => ({ json: async () => body } as any);

const mockSession = (token = "gh-token-123") => {
  (auth as jest.Mock).mockResolvedValue({
    user: { accessToken: token, email: "test@example.com" },
  });
};

// GitHub API mock chain: branch → tree → commit → ref
function mockGitHubSuccess() {
  // 1. GET branch
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      commit: { sha: "abc123", commit: { tree: { sha: "tree-sha-001" } } },
    }),
  });
  // 2. POST tree
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ sha: "new-tree-sha" }),
  });
  // 3. POST commit
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ sha: "new-commit-sha" }),
  });
  // 4. PATCH ref
  mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
}

describe("UT-08 — GitHub Push: Commit Files to Repository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession();
  });

  test("returns 200 on successful push", async () => {
    mockGitHubSuccess();
    const res = await POST(makeReq({
      repo: "user/my-repo",
      message: "Update from CodeForge",
      files: { "src/App.tsx": "export default function App() {}" },
    }));
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test("calls GitHub branch API to get latest commit SHA", async () => {
    mockGitHubSuccess();
    await POST(makeReq({
      repo: "user/my-repo",
      message: "commit",
      files: { "index.js": "console.log('hello')" },
    }));
    const branchCall = mockFetch.mock.calls[0];
    expect(branchCall[0]).toContain("/branches/main");
  });

  test("creates a tree with the correct file contents", async () => {
    mockGitHubSuccess();
    await POST(makeReq({
      repo: "user/my-repo",
      message: "commit",
      files: { "src/App.tsx": "const x = 1;" },
    }));
    const treeCall = mockFetch.mock.calls[1];
    const treeBody = JSON.parse(treeCall[1].body);
    expect(treeBody.tree[0].path).toBe("src/App.tsx");
    expect(treeBody.tree[0].content).toBe("const x = 1;");
    expect(treeBody.tree[0].mode).toBe("100644");
  });

  test("creates commit with correct message and tree SHA", async () => {
    mockGitHubSuccess();
    await POST(makeReq({
      repo: "user/my-repo",
      message: "My commit message",
      files: { "README.md": "# Hello" },
    }));
    const commitCall = mockFetch.mock.calls[2];
    const commitBody = JSON.parse(commitCall[1].body);
    expect(commitBody.message).toBe("My commit message");
    expect(commitBody.tree).toBe("new-tree-sha");
  });

  test("updates branch ref to point to new commit", async () => {
    mockGitHubSuccess();
    await POST(makeReq({
      repo: "user/my-repo",
      message: "commit",
      files: { "index.js": "x" },
    }));
    const refCall = mockFetch.mock.calls[3];
    expect(refCall[0]).toContain("/git/refs/heads/main");
    const refBody = JSON.parse(refCall[1].body);
    expect(refBody.sha).toBe("new-commit-sha");
  });

  test("returns 401 when no access token in session", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: {} });
    const res = await POST(makeReq({
      repo: "user/my-repo",
      message: "commit",
      files: { "index.js": "x" },
    }));
    expect(res.status).toBe(401);
  });

  test("strips leading slash from file paths", async () => {
    mockGitHubSuccess();
    await POST(makeReq({
      repo: "user/my-repo",
      message: "commit",
      files: { "/src/App.tsx": "const x = 1;" },
    }));
    const treeBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(treeBody.tree[0].path).toBe("src/App.tsx");
  });

  test("handles multiple files in a single push", async () => {
    mockGitHubSuccess();
    await POST(makeReq({
      repo: "user/my-repo",
      message: "multi-file commit",
      files: {
        "src/App.tsx": "const a = 1;",
        "src/index.css": "body { margin: 0; }",
        "README.md": "# Project",
      },
    }));
    const treeBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(treeBody.tree).toHaveLength(3);
  });
});
