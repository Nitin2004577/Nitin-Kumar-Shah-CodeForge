import { DefaultSession } from "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role?: string
      accessToken?: string
      provider?: string
    } & DefaultSession["user"]
  }

  interface User {
    role?: string
    accessToken?: string
    provider?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    accessToken?: string
    provider?: string
  }
}