// auth.config.ts
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";
console.log(
  "DEBUG AUTH:",
  process.env.GOOGLE_CLIENT_ID ? "ID Found" : "ID MISSING"
);
export default {
  providers: [
    // auth.config.ts
    Google({
      // This checks for BOTH possible names in your .env
      clientId: process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_ID,
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),

    Github({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
} satisfies NextAuthConfig;
