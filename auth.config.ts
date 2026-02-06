// auth.config.ts
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

export default {
  providers: [
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
      // PUT IT HERE INSTEAD
      allowDangerousEmailAccountLinking: true, 
      authorization: {
        params: { prompt: "select_account" },
      },
    }),
    Github({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      // AND HERE
      allowDangerousEmailAccountLinking: true, 
      authorization: {
        params: { prompt: "login" },
      },
    }),
  ],
} satisfies NextAuthConfig;