import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import NextAuth from "next-auth";
import authConfig from "../auth.config";

// Lightweight auth instance — no Prisma adapter, safe for Edge/middleware
const { auth } = NextAuth(authConfig);

export const proxy = auth(function middleware(req) {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth?.user;

  // Always pass through NextAuth API routes
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Always pass through other API routes
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isAuthPage = pathname.startsWith("/auth");
  const isPublicPage = pathname === "/";

  // Redirect logged-in users away from auth pages
  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Allow auth pages for unauthenticated users
  if (isAuthPage) {
    return NextResponse.next();
  }

  // Allow public home page
  if (isPublicPage) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to sign-in
  if (!isLoggedIn) {
    const signInUrl = new URL("/auth/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
