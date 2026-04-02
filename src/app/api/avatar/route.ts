import { NextRequest, NextResponse } from "next/server";

// Proxies external avatar images to bypass COEP restrictions required by WebContainer
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing url param", { status: 400 });
  }

  // Only allow known avatar CDN hostnames
  const allowed = [
    "lh3.googleusercontent.com",
    "avatars.githubusercontent.com",
    "pbs.twimg.com",
  ];

  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return new NextResponse("Invalid url", { status: 400 });
  }

  if (!allowed.includes(hostname)) {
    return new NextResponse("Hostname not allowed", { status: 403 });
  }

  const res = await fetch(url);
  if (!res.ok) {
    return new NextResponse("Failed to fetch image", { status: res.status });
  }

  const buffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") || "image/jpeg";

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      // Allow embedding under COEP
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}
