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
      // A. Fresh login — account is present
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;

        // Update the avatar in DB to match the provider just used
        const freshImage = (profile as any)?.picture   // Google
                        || (profile as any)?.avatar_url // GitHub
                        || null;

        if (freshImage && token.sub) {
          await db.user.update({
            where: { id: token.sub },
            data: { image: freshImage },
          }).catch(() => {}); // silent — don't crash login if this fails
          token.picture = freshImage;
        }
      }

      if (!token.sub) return token;

      const existingUser = await getUserById(token.sub);
      if (!existingUser) return token;

      token.name  = existingUser.name;
      token.email = existingUser.email;
      token.picture = existingUser.image ?? token.picture;
      token.role  = (existingUser as any).role;

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        const customUser = session.user as any;

        if (token.sub)       customUser.id          = token.sub;
        customUser.role      = token.role;
        customUser.image     = token.picture;        // always in sync with token
        customUser.accessToken = token.accessToken;
        customUser.provider  = token.provider;
      }
      return session;
    },
  },
})