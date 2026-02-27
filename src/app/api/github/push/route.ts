import { auth } from "@/../auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { repo, message, files } = await req.json();
    const [owner, repoName] = repo.split("/");
    const token = session.user.accessToken;

    // 1. Check if the branch exists
    const branchRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/branches/main`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    let parentCommitSha = "";
    let baseTreeSha = "";

    if (branchRes.ok) {
      const branchData = await branchRes.json();
      parentCommitSha = branchData.commit.sha;
      // CRITICAL FIX: Extract the actual Tree SHA, not the Commit SHA
      baseTreeSha = branchData.commit.commit.tree.sha; 
    } else {
      // Initialize empty repo
      const initRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/contents/README.md`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Initialize repository",
          content: Buffer.from(`# ${repoName}\n\nInitialized from CodeForge IDE.`).toString("base64"),
        }),
      });

      if (!initRes.ok) {
        const initError = await initRes.json();
        throw new Error(`Failed to initialize empty repo: ${initError.message}`);
      }

      const initData = await initRes.json();
      parentCommitSha = initData.commit.sha;
      // CRITICAL FIX: Get the Tree SHA from the init response
      baseTreeSha = initData.commit.tree.sha; 
    }

    // 2. Create the Tree (Your files)
    const treeItems = Object.entries(files).map(([path, content]) => {
      // CRITICAL FIX: Remove any leading slashes from the file path
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      
      return {
        path: cleanPath,
        mode: "100644",
        type: "blob",
        content: content ? String(content) : "", // Ensure content is always a string
      };
    });

    if (treeItems.length === 0) {
      throw new Error("No files provided to push.");
    }

    const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/trees`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        base_tree: baseTreeSha, // Now passing the correct Tree SHA
        tree: treeItems,
      }),
    });
    
    const treeData = await treeRes.json();
    if (!treeRes.ok) throw new Error(`Tree Creation Failed: ${treeData.message}`);

    // 3. Create the Commit
    const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/commits`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        tree: treeData.sha,
        parents: [parentCommitSha], // Commit needs the parent Commit SHA
      }),
    });
    
    const commitData = await commitRes.json();
    if (!commitRes.ok) throw new Error(`Commit Creation Failed: ${commitData.message}`);

    // 4. Update Reference (The Push)
    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repoName}/git/refs/heads/main`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ sha: commitData.sha, force: true }),
    });

    if (!refRes.ok) {
      const refError = await refRes.json();
      throw new Error(`Branch Update Failed: ${refError.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DETAILED_PUSH_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}