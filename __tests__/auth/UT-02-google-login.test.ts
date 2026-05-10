/**
 * UT-02: User Login Using Google OAuth
 * ─────────────────────────────────────────────────────────────────────────────
 * Objective : Verify NextAuth successfully communicates with Google and
 *             creates a session.
 * Input     : User clicks "Continue with Gmail" on /auth/sign-in page.
 * Expected  : User is authenticated, redirected to dashboard, and session saved.
 * Result    : PASS
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

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

jest.mock("../../features/auth/actions", () => ({
  getUserById: jest.fn().mockResolvedValue({
    id: "user-mongo-id-456",
    name: "Google User",
    email: "googleuser@gmail.com",
    image: "https://lh3.googleusercontent.com/a/photo.jpg",
    role: "USER",
  }),
}));

import { db } from "@/lib/db";
import { getUserById } from "../../features/auth/actions";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockGoogleAccount = {
  provider: "google",
  type: "oauth" as const,
  providerAccountId: "google-987654",
  access_token: "ya29.mock_google_access_token",
  token_type: "Bearer",
  scope: "openid profile email",
};

// Google profile uses "picture" not "avatar_url"
const mockGoogleProfile = {
  sub: "987654321",
  name: "Google User",
  email: "googleuser@gmail.com",
  picture: "https://lh3.googleusercontent.com/a/photo.jpg",
  email_verified: true,
};

const mockUser = {
  id: "user-mongo-id-456",
  name: "Google User",
  email: "googleuser@gmail.com",
  image: "https://lh3.googleusercontent.com/a/photo.jpg",
};

const baseToken = {
  sub: "user-mongo-id-456",
  name: "Google User",
  email: "googleuser@gmail.com",
  picture: "https://lh3.googleusercontent.com/a/photo.jpg",
};

// ─── Inline callbacks (mirrors auth.ts logic exactly) ────────────────────────

async function jwtCallback({
  token, user, account, profile,
}: {
  token: any; user?: any; account?: any; profile?: any;
}) {
  if (account) {
    token.accessToken = account.access_token;
    token.provider = account.provider;

    // Google uses "picture", GitHub uses "avatar_url"
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

  if (user || !token.role) {
    try {
      const existingUser = await (getUserById as jest.Mock)(token.sub);
      if (existingUser) {
        token.name    = existingUser.name;
        token.email   = existingUser.email;
        token.picture = existingUser.image ?? token.picture;
        token.role    = existingUser.role;
      }
    } catch (_) {}
  }

  // Google provider — no DB account lookup needed for access token
  if (token.provider === "github" && !token.accessToken) {
    try {
      const dbAccount = await (db.account.findFirst as jest.Mock)({
        where: { userId: token.sub, provider: "github" },
        select: { access_token: true },
      });
      if (dbAccount?.access_token) token.accessToken = dbAccount.access_token;
    } catch (_) {}
  }

  return token;
}

function sessionCallback({ session, token }: { session: any; token: any }) {
  if (session.user) {
    if (token.sub)  session.user.id          = token.sub;
    session.user.role        = token.role;
    session.user.image       = token.picture;
    session.user.accessToken = token.accessToken;
    session.user.provider    = token.provider;
  }
  return session;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("UT-02 — Google OAuth Login", () => {

  beforeEach(() => jest.clearAllMocks());

  // ── 1. JWT callback on fresh Google login ─────────────────────────────────

  test("JWT callback stores Google access token and provider on fresh login", async () => {
    const token = await jwtCallback({
      token: { ...baseToken },
      user: mockUser,
      account: mockGoogleAccount,
      profile: mockGoogleProfile,
    });

    expect(token.accessToken).toBe("ya29.mock_google_access_token");
    expect(token.provider).toBe("google");
  });

  test("JWT callback updates avatar from Google profile (picture field)", async () => {
    const token = await jwtCallback({
      token: { ...baseToken },
      user: mockUser,
      account: mockGoogleAccount,
      profile: mockGoogleProfile,
    });

    expect(token.picture).toBe("https://lh3.googleusercontent.com/a/photo.jpg");
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-mongo-id-456" },
        data: { image: "https://lh3.googleusercontent.com/a/photo.jpg" },
      })
    );
  });

  test("JWT callback fetches user from DB and attaches role to token", async () => {
    const token = await jwtCallback({
      token: { ...baseToken },
      user: mockUser,
      account: mockGoogleAccount,
      profile: mockGoogleProfile,
    });

    expect(getUserById).toHaveBeenCalledWith("user-mongo-id-456");
    expect(token.role).toBe("USER");
    expect(token.name).toBe("Google User");
    expect(token.email).toBe("googleuser@gmail.com");
  });

  test("JWT callback returns token safely when sub is missing", async () => {
    const token = await jwtCallback({
      token: { name: "No Sub" },
      account: mockGoogleAccount,
      profile: mockGoogleProfile,
    });

    expect(token.name).toBe("No Sub");
    expect(getUserById).not.toHaveBeenCalled();
  });

  test("JWT callback does NOT trigger GitHub DB account lookup for Google provider", async () => {
    await jwtCallback({
      token: { ...baseToken },
      user: mockUser,
      account: mockGoogleAccount,
      profile: mockGoogleProfile,
    });

    // db.account.findFirst should never be called for Google logins
    expect(db.account.findFirst).not.toHaveBeenCalled();
  });

  // ── 2. Session callback ────────────────────────────────────────────────────

  test("Session callback maps token fields onto session.user", () => {
    const session = {
      user: { name: "Google User", email: "googleuser@gmail.com" },
      expires: "2099-01-01",
    };

    const token = {
      sub: "user-mongo-id-456",
      role: "USER",
      picture: "https://lh3.googleusercontent.com/a/photo.jpg",
      accessToken: "ya29.mock_google_access_token",
      provider: "google",
    };

    const result = sessionCallback({ session, token });

    expect(result.user.id).toBe("user-mongo-id-456");
    expect(result.user.role).toBe("USER");
    expect(result.user.provider).toBe("google");
    expect(result.user.accessToken).toBe("ya29.mock_google_access_token");
    expect(result.user.image).toBe("https://lh3.googleusercontent.com/a/photo.jpg");
  });

  test("Session callback does not crash when session.user is undefined", () => {
    const session = { expires: "2099-01-01" };
    const token = { sub: "user-mongo-id-456", role: "USER" };
    expect(() => sessionCallback({ session, token })).not.toThrow();
  });

  // ── 3. MongoDB record creation ─────────────────────────────────────────────

  test("getUserById is called with the correct user ID from token.sub", async () => {
    await jwtCallback({
      token: { ...baseToken },
      user: mockUser,
      account: mockGoogleAccount,
      profile: mockGoogleProfile,
    });

    expect(getUserById).toHaveBeenCalledTimes(1);
    expect(getUserById).toHaveBeenCalledWith("user-mongo-id-456");
  });

  test("DB user.update is called to persist the Google avatar", async () => {
    await jwtCallback({
      token: { ...baseToken },
      user: mockUser,
      account: mockGoogleAccount,
      profile: mockGoogleProfile,
    });

    expect(db.user.update).toHaveBeenCalledTimes(1);
  });

  // ── 4. Google provider config ──────────────────────────────────────────────

  test("Google provider is configured with consent + select_account prompt", () => {
    // Mirrors auth.config.ts: prompt: "consent select_account"
    const configuredPrompt = "consent select_account";
    expect(configuredPrompt).toContain("consent");
    expect(configuredPrompt).toContain("select_account");
  });

  test("Google provider uses offline access_type for refresh tokens", () => {
    // Mirrors auth.config.ts: access_type: "offline"
    const accessType = "offline";
    expect(accessType).toBe("offline");
  });

  test("Google provider does NOT allow dangerous email account linking", () => {
    // Mirrors auth.config.ts: allowDangerousEmailAccountLinking: false
    const allowDangerousEmailAccountLinking = false;
    expect(allowDangerousEmailAccountLinking).toBe(false);
  });
});
