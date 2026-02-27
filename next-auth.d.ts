import { UserRole } from "@prisma/client";
import NextAuth, { type DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

// 1. Extend the User type to include both the Prisma Role and the GitHub Access Token
export type ExtendedUser = DefaultSession["user"] & {
  role: UserRole;
  accessToken?: string; // Added for GitHub API calls
  provider?: string;    // Useful to check if the user is logged in via GitHub or Google
};

declare module "next-auth" {
  interface Session {
    user: ExtendedUser;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: UserRole;
    accessToken?: string; // Added to persist the token in the web token
    provider?: string;
  }
}