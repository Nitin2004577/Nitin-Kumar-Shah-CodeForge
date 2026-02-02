import {
  readTemplateStructureFromJson,
  saveTemplateStructureToJson,
} from "@/../features/playground/lib/path-to-json";
import { db } from "@../../../src/lib/db";
import { templatePaths } from "@./../../src/lib/template";

import path from "path";
import fs from "fs/promises";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "Missing Playground ID" }, { status: 400 });
  }
  const playground = await db.playground.findUnique({
    where: {
      id,
    },
  });

  if (!playground) {
    return Response.json({ error: "Playground not found" }, { status: 404 });
  }
  const templateKey = playground.template as keyof typeof templatePaths;
  const templatePath = templatePaths[templateKey];

  if (!templatePath) {
    return Response.json({ error: "Invalid template path" }, { status: 400 });
  }

  try {
    const inputPath = path.join(process.cwd(), templatePath);
    const outputFiles = path.join(process.cwd(), `output/${templateKey}.json`);

    await saveTemplateStructureToJson(inputPath, outputFiles)
  } catch (error) {}
}
