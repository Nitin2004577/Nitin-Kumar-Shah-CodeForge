// server-only auth setup
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"

import authConfig from "./auth.config"
import { db } from "@/lib/db";
import { getAccountByUserId, getUserById } from "./features/auth/actions";

 

 
export const { auth, handlers, signIn, signOut } = NextAuth({
  callbacks: {
    /**
     * Handle user creation and account linking after a successful sign-in
     */
    async signIn({ user, account, profile }) {
      console.log("NextAuth signIn callback - user:", user, "account:", account, "profile:", profile);
      if (!user || !account) return false;

      try {
        // Check if the user already exists
        const existingUser = await db.user.findUnique({
          where: { email: user.email! },
        });

        // If user does not exist, create a new one
        if (!existingUser) {
          const newUser = await db.user.create({
            data: {
              email: user.email!,
              name: user.name,
              image: user.image,

              accounts: {
                // @ts-ignore
                create: {
                  type: account.type,
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                  refresh_token: account.refresh_token,
                  access_token: account.access_token,
                  expires_at: account.expires_at,
                  token_type: account.token_type,
                  scope: account.scope,
                  id_token: account.id_token,
                  session_state: account.session_state != null ? String(account.session_state) : undefined,
                },
              },
            },
          });

          if (!newUser) {
            console.error("Failed to create user during signIn", { user, account });
            return false; // Return false if user creation fails
          }
        } else {
          // Link the account if user exists
          const existingAccount = await db.account.findUnique({
            where: {
              provider_providerAccountId: {
                provider: account.provider,
                providerAccountId: account.providerAccountId,
              },
            },
          });

          // If the account does not exist, create it
          if (!existingAccount) {
            await db.account.create({
              data: {
                userId: existingUser.id,
                type: account.type,
                provider: account.provider,
                providerAccountId: account.providerAccountId,
                refresh_token: account.refresh_token,
                access_token: account.access_token,
                expires_at: account.expires_at,
                token_type: account.token_type,
                scope: account.scope,
                id_token: account.id_token,
                // ensure session_state is stored as a string | null | undefined
                session_state: account.session_state != null ? String(account.session_state) : undefined,
              },
            });
          }
        }
      } catch (err) {
        console.error("Error in signIn callback:", err);
        return false;
      }

      return true;
    },

    async jwt({ token, user, account }) {
      if(!token.sub) return token;
      const existingUser = await getUserById(token.sub)

      if(!existingUser) return token;

      const exisitingAccount = await getAccountByUserId(existingUser.id);

      token.name = existingUser.name;
      token.email = existingUser.email;
      if ('role' in existingUser) {
        token.role = (existingUser as any).role;
      }

      return token;
    },

    async session({ session, token }) {
      // Attach the user ID from the token to the session
    if(token.sub  && session.user){
      session.user.id = token.sub
    } 

    if(token.sub && session.user){
      session.user.role = token.role
    }

    return session;
    },
  },
  
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  ...authConfig,
})