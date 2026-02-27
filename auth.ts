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
    async jwt({ token, user, account }) {
      // A. Handle OAuth tokens (from your old auth.config.ts)
      if (account) {
        token.accessToken = account.access_token;
        token.provider = account.provider;
      }

      // B. Handle Database User data (from your old auth.ts)
      if (user) console.log("LOGIN DETECTED:", user.email);
      if (!token.sub) return token;

      const existingUser = await getUserById(token.sub);
      if (!existingUser) return token;

      token.name = existingUser.name;
      token.email = existingUser.email;
      token.role = (existingUser as any).role;

      return token;
    },
    
    async session({ session, token }) {
      if (session.user) {
        // Attach the ID and Role
        if (token.sub) {
          session.user.id = token.sub;
        }
        session.user.role = token.role as any;
        
        // Attach the Access Token and Provider
        session.user.accessToken = token.accessToken as string;
        session.user.provider = token.provider as string;
      }
      return session;
    },
  },
})