// 1. Fixed Import: Moving up from src/app/api/template/[id] to the root to find /features
import { readTemplateStructureFromJson, saveTemplateStructureToJson } from "../../../../../features/playground/lib/path-to-json";
import { db } from "@/lib/db";
import { templatePaths } from "@/lib/template";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import { NextRequest } from "next/server";
import os from "os"; // 👈 VERCEL FIX: Import 'os' to access the allowed temporary directory

// Helper function to ensure valid JSON
function validateJsonStructure(data: unknown): boolean {
  try {
    JSON.parse(JSON.stringify(data)); 
    return true;
  } catch (error) {
    console.error("Invalid JSON structure:", error);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return Response.json({ error: "Missing playground ID" }, { status: 400 });
  }

  const playground = await db.playground.findUnique({
    where: { id },
  });

  if (!playground) {
    return Response.json({ error: "Playground not found" }, { status: 404 });
  }

  const templateKey = playground.template as keyof typeof templatePaths;
  const relativeTemplatePath = templatePaths[templateKey];

  if (!relativeTemplatePath) {
    return Response.json({ error: "Invalid template key" }, { status: 404 });
  }

  try {
    // 1. Build Absolute Path to your starter files
    const inputPath = path.resolve(process.cwd(), relativeTemplatePath);
    
    // 2. VERCEL FIX: We MUST use the system's /tmp directory for writing files!
    const tmpDir = os.tmpdir();
    // We add Date.now() to make sure multiple users don't overwrite each other's files
    const outputFile = path.join(tmpDir, `${templateKey}-${Date.now()}.json`);

    // DEBUG LOGS
    console.log("--- Path Debugging ---");
    console.log("Target Path:", inputPath);
    console.log("Folder Exists?:", existsSync(inputPath));
    console.log("----------------------");

    if (!existsSync(inputPath)) {
        throw new Error(`Directory not found at: ${inputPath}. Vercel might not have bundled this folder.`);
    }

    // 3. Process the structure and save it to the /tmp folder
    await saveTemplateStructureToJson(inputPath, outputFile);
    const result = await readTemplateStructureFromJson(outputFile);

    if (!validateJsonStructure(result.items)) {
      return Response.json({ error: "Invalid JSON structure" }, { status: 500 });
    }

    // 4. Cleanup the temporary file so we don't clog up Vercel's memory
    await fs.unlink(outputFile);

    return Response.json({ success: true, templateJson: result }, { status: 200 });

  } catch (error) {
    console.error("Error generating template JSON:", error);
    return Response.json({ 
      error: "Failed to generate template", 
      details: (error as Error).message 
    }, { status: 500 });
  }
}