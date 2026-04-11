import { auth } from "@/../auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    const token = (session?.user as any)?.accessToken;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all repos the user has access to (up to 100)
    const res = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator",
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
        },
      }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json(
        { error: err.message || "Failed to fetch repositories" },
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
