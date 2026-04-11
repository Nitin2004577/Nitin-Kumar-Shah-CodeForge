import { auth } from "@/../auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    const token = (session?.user as any)?.accessToken;

    if (!session?.user) {
      return NextResponse.json({ error: "Not authenticated. Please sign in." }, { status: 401 });
    }

    if (!token) {
      return NextResponse.json(
        { error: "No GitHub access token found. Please sign out and sign back in with GitHub." },
        { status: 401 }
      );
    }

    const res = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        // Don't cache — always fetch fresh list
        cache: "no-store",
      }
    );

    if (res.status === 401) {
      return NextResponse.json(
        { error: "GitHub token expired or revoked. Please sign out and sign back in with GitHub." },
        { status: 401 }
      );
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.message || `GitHub API error (${res.status})` },
        { status: res.status }
      );
    }

    const data = await res.json();

    const repos = data.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
    }));

    return NextResponse.json({ repos });
  } catch (error: any) {
    console.error("Failed to fetch GitHub repos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
