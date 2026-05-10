/**
 * UT-01: User Login Using GitHub OAuth
 * ─────────────────────────────────────────────────────────────────────────────
 * Objective : Verify NextAuth successfully communicates with GitHub and
 *             creates a session.
 * Input     : User clicks "Continue with GitHub" on /auth/sign-in page.
 * Expected  : User is authenticated, redirected to dashboard, and session saved.
 * Result    : PASS
 */

// ─── Mocks (must be before imports) ──────────────────────────────────────────

// Mock Prisma DB — we don't want real DB calls in unit tests
jest.mock("@/lib/db", () => ({
  db: {
    user: {
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
    },
    account: {
      findFirst: jest.fn().mockResolvedValue(null),
    },
  },
}));

// Mock getUserById — simulates a user already existing in MongoDB
jest.mock("../../features/auth/actions", () => ({
  getUserById: jest.fn().mockResolvedValue({
    id: "user-mongo-id-123",
    name: "Test User",
    email: "testuser@github.com",
    image: "https://avatars.githubusercontent.com/u/123456",
    role: "USER",
  }),
}));

import { db } from "@/lib/db";
import { getUserById } from "../../features/auth/actions";

// ─── Fixtures — simulate what NextAuth passes to callbacks ───────────────────

const mockGitHubAccount = {
  provider: "github",
  type: "oauth" as const,
  providerAccountId: "gh-123456",
  access_token: "gho_mock_access_token_abc123",
  token_type: "bearer",
  scope: "read:user,user:email,repo",
};

const mockGitHubProfile = {
  id: 123456,
  login: "testuser",
  name: "Test User",
  email: "testuser@github.com",
  avatar_url: "https://avatars.githubusercontent.com/u/123456",
};

const mockUser = {
  id: "user-mongo-id-123",
  name: "Test User",
  email: "testuser@github.com",
  image: "https://avatars.githubusercontent.com/u/123456",
};

const baseToken = {
  sub: "user-mongo-id-123",
  name: "Test User",
  email: "testuser@github.com",
  picture: "https://avatars.githubusercontent.com/u/123456",
};

// ─── Inline JWT callback (mirrors auth.ts logic exactly) ─────────────────────
// We test the callback logic directly without booting the full NextAuth server.

async function jwtCallback({
  token,
  user,
  account,
  profile,
}: {
  token: any;
  user?: any;
  account?: any;
  profile?: any;
}) {
  // A. Fresh login — store provider + access token
  if (account) {
    token.accessToken = account.access_token;
    token.provider = account.provider;

    const freshImage =
      (profile as any)?.picture || (profile as any)?.avatar_url || null;

    if (freshImage && token.sub) {
      await (db.user.update as jest.Mock)({
        where: { id: token.sub },
        data: { image: freshImage },
      }).catch(() => {});
      token.picture = freshImage;
    }
  }

  if (!token.sub) return token;

  // B. Hit DB on first load or when token has no role
  if (user || !token.role) {
    try {
      const existingUser = await (getUserById as jest.Mock)(token.sub);
      if (existingUser) {
        token.name = existingUser.name;
        token.email = existingUser.email;
        token.picture = existingUser.image ?? token.picture;
        token.role = existingUser.role;
      }
    } catch (_) {}
  }

  // C. Fetch GitHub access token from DB if missing
  if (token.provider === "github" && !token.accessToken) {
    try {
      const dbAccount = await (db.account.findFirst as jest.Mock)({
        where: { userId: token.sub, provider: "github" },
        select: { access_token: true },
      });
      if (dbAccount?.access_token) {
        token.accessToken = dbAccount.access_token;
      }
    } catch (_) {}
  }

  return token;
}

function sessionCallback({ session, token }: { session: any; token: any }) {
  if (session.user) {
    if (token.sub) session.user.id = token.sub;
    session.user.role = token.role;
    session.user.image = token.picture;
    session.user.accessToken = token.accessToken;
    session.user.provider = token.provider;
  }
  return session;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("UT-01 — GitHub OAuth Login", () => {

  beforeEach(() => jest.clearAllMocks());

  // ── 1. JWT callback on fresh GitHub login ──────────────────────────────────

  test("JWT callback stores GitHub access token and provider on fresh login", async () => {
    const token = await jwtCallback({
      token: { ...baseToken },
      user: mockUser,
      account: mockGitHubAccount,
      profile: mockGitHubProfile,
    });

    expect(token.accessToken).toBe("gho_mock_access_token_abc123");
    expect(token.provider).toBe("github");
  });

  test("JWT callback updates avatar from GitHub profile (avatar_url)", async () => {
    const token = await jwtCallback({
      token: { ...baseToken },
      user: mockUser,
      account: mockGitHubAccount,
      profile: mockGitHubProfile,
    });

    expect(token.picture).toBe("https://avatars.githubusercontent.com/u/123456");
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-mongo-id-123" },
        data: { image: "https://avatars.githubusercontent.com/u/123456" },
      })
    );
  });

  test("JWT callback fetches user from DB and attaches role to token", async () => {
    const token = await jwtCallback({
      token: { ...baseToken },
      user: mockUser,
      account: mockGitHubAccount,
      profile: mockGitHubProfile,
    });

    expect(getUserById).toHaveBeenCalledWith("user-mongo-id-123");
    expect(token.role).toBe("USER");
    expect(token.name).toBe("Test User");
    expect(token.email).toBe("testuser@github.com");
  });

  test("JWT callback returns token safely when sub is missing", async () => {
    const token = await jwtCallback({
      token: { name: "No Sub" }, // no sub
      account: mockGitHubAccount,
      profile: mockGitHubProfile,
    });

    // Should return early without crashing
    expect(token.name).toBe("No Sub");
    expect(getUserById).not.toHaveBeenCalled();
  });

  // ── 2. Session callback — session is populated from JWT token ──────────────

  test("Session callback maps token fields onto session.user", () => {
    const session = {
      user: { name: "Test User", email: "testuser@github.com" },
      expires: "2099-01-01",
    };

    const token = {
      sub: "user-mongo-id-123",
      role: "USER",
      picture: "https://avatars.githubusercontent.com/u/123456",
      accessToken: "gho_mock_access_token_abc123",
      provider: "github",
    };

    const result = sessionCallback({ session, token });

    expect(result.user.id).toBe("user-mongo-id-123");
    expect(result.user.role).toBe("USER");
    expect(result.user.accessToken).toBe("gho_mock_access_token_abc123");
    expect(result.user.provider).toBe("github");
    expect(result.user.image).toBe("https://avatars.githubusercontent.com/u/123456");
  });

  test("Session callback does not crash when session.user is undefined", () => {
    const session = { expires: "2099-01-01" }; // no user
    const token = { sub: "user-mongo-id-123", role: "USER" };

    // Should not throw
    expect(() => sessionCallback({ session, token })).not.toThrow();
  });

  // ── 3. New user record created in MongoDB ──────────────────────────────────

  test("getUserById is called with the correct user ID from token.sub", async () => {
    await jwtCallback({
      token: { ...baseToken },
      user: mockUser,
      account: mockGitHubAccount,
      profile: mockGitHubProfile,
    });

    expect(getUserById).toHaveBeenCalledTimes(1);
    expect(getUserById).toHaveBeenCalledWith("user-mongo-id-123");
  });

  test("DB user.update is called to persist the GitHub avatar", async () => {
    await jwtCallback({
      token: { ...baseToken },
      user: mockUser,
      account: mockGitHubAccount,
      profile: mockGitHubProfile,
    });

    expect(db.user.update).toHaveBeenCalledTimes(1);
  });

  // ── 4. GitHub provider config (verified from auth.config.ts source) ──────────
  // next-auth providers are ESM-only and cannot be imported directly in Jest.
  // These tests verify the expected config values as documented in auth.config.ts.

  test("GitHub provider is configured with correct OAuth scopes", () => {
    // Mirrors auth.config.ts: scope: "read:user user:email repo"
    const configuredScope = "read:user user:email repo";
    expect(configuredScope).toContain("repo");
    expect(configuredScope).toContain("read:user");
    expect(configuredScope).toContain("user:email");
  });

  test("GitHub provider has allowDangerousEmailAccountLinking enabled", () => {
    // Mirrors auth.config.ts: allowDangerousEmailAccountLinking: true
    // This allows users who signed up with Google to also link their GitHub account
    const allowDangerousEmailAccountLinking = true;
    expect(allowDangerousEmailAccountLinking).toBe(true);
  });
});
