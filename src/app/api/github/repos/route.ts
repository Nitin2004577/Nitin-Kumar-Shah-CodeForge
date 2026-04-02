import { auth } from "@/../auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    const customUser = session?.user as any;

    // No session at all
    if (!customUser) {
      return NextResponse.json({ error: "NOT_AUTHENTICATED" }, { status: 401 });
    }

    // Logged in but not via GitHub — Google token won't work with GitHub API
    if (customUser.provider !== "github") {
      return NextResponse.json(
        { error: "NOT_CONNECTED", message: "Please sign in with GitHub to use this feature." },
        { status: 400 }
      );
    }

    if (!customUser.accessToken) {
      return NextResponse.json(
        { error: "NOT_CONNECTED", message: "GitHub access token missing. Please sign in with GitHub again." },
        { status: 400 }
      );
    }

    const response = await fetch(
      "https://api.github.com/user/repos?sort=updated&per_page=100&type=all",
      {
        headers: {
          Authorization: `Bearer ${customUser.accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      console.error("GitHub API error:", response.status, errBody);

      if (response.status === 401) {
        return NextResponse.json(
          { error: "TOKEN_EXPIRED", message: "GitHub token expired. Please sign out and sign in with GitHub again." },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: "GitHub API error", message: errBody.message },
        { status: response.status }
      );
    }

    const repos = await response.json();
    const formattedRepos = repos.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      private: repo.private,
    }));

    return NextResponse.json({ repos: formattedRepos });
  } catch (error) {
    console.error("REPOS_FETCH_ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}