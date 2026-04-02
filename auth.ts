// auth.ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { db } from "@/lib/db";
import { getUserById } from "./features/auth/actions";
import authConfig from "./auth.config"

export const { auth, handlers, signIn, signOut } = NextAuth({
  // 1. Spread authConfig at the TOP!
  ...authConfig, 
  
  pages: {
    signIn: "/auth/sign-in",
    error: "/auth/error",
  },
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  
  // 2. The Grand Unified Callbacks!
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // A. Fresh login — store provider + access token
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;

        // Update avatar in DB to match the provider just used
        const freshImage = (profile as any)?.picture    // Google
                        || (profile as any)?.avatar_url  // GitHub
                        || null;
        if (freshImage && token.sub) {
          await db.user.update({
            where: { id: token.sub },
            data: { image: freshImage },
          }).catch(() => {});
          token.picture = freshImage;
        }
      }

      if (!token.sub) return token;

      // B. Only hit DB on first load (user object present) or when token has no role yet
      if (user || !token.role) {
        const existingUser = await getUserById(token.sub);
        if (existingUser) {
          token.name    = existingUser.name;
          token.email   = existingUser.email;
          token.picture = existingUser.image ?? token.picture;
          token.role    = (existingUser as any).role;
        }
      }

      // C. If provider is github but accessToken is missing, fetch from DB Account
      if (token.provider === "github" && !token.accessToken) {
        const account = await db.account.findFirst({
          where: { userId: token.sub, provider: "github" },
          select: { access_token: true },
        });
        if (account?.access_token) {
          token.accessToken = account.access_token;
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const customUser = session.user as any;
        if (token.sub)           customUser.id          = token.sub;
        customUser.role          = token.role;
        customUser.image         = token.picture;
        customUser.accessToken   = token.accessToken;
        customUser.provider      = token.provider;
      }
      return session;
    },
  },
})