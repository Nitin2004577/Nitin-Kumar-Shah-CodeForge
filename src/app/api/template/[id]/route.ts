import { db } from "@/lib/db";
import path from "path";
import { promises as fs } from "fs";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return Response.json({ error: "Missing playground ID" }, { status: 400 });
  }

  // 1. Find the playground to know which template it needs
  const playground = await db.playground.findUnique({
    where: { id },
  });

  if (!playground) {
    return Response.json({ error: "Playground not found" }, { status: 404 });
  }

  try {
    // 2. Point directly to the pre-built JSON file in the public folder
    // playground.template should match the file name, e.g., "REACT" or "NEXTJS"
    const jsonPath = path.join(process.cwd(), "public", "templates", `${playground.template}.json`);
    
    // 3. Read and serve it instantly
    const fileContent = await fs.readFile(jsonPath, "utf-8");
    const templateJson = JSON.parse(fileContent);

    return Response.json({ success: true, templateJson }, { status: 200 });

  } catch (error) {
    console.error("Error reading static template JSON:", error);
    return Response.json({ 
      error: "Failed to load template. Did you run the generation script?", 
      details: (error as Error).message 
    }, { status: 500 });
  }
}