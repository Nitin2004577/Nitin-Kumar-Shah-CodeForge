import { auth } from "@/../auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    // Check if user is logged in and has a token
    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: "NOT_CONNECTED" }, { status: 400 });
    }

    const response = await fetch("https://api.github.com/user/repos?sort=updated&per_page=100", {
      headers: {
        Authorization: `Bearer ${session.user.accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: "GitHub API error" }, { status: response.status });
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