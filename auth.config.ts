import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export default {
  providers: [
    Github({
      clientId: process.env.GITHUB_CLIENT_ID || process.env.GITHUB_ID,
      clientSecret:
        process.env.GITHUB_CLIENT_SECRET || process.env.GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true, // This is the fix
    }),
    // auth.config.ts
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID,
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "consent", // Forces the user to pick an account and agree
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  ],
} satisfies NextAuthConfig;
