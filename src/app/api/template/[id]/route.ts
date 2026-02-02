import {
  readTemplateStructureFromJson,
  saveTemplateStructureToJson,
} from "@/../features/playground/lib/path-to-json";
import { db } from "@../../../src/lib/db";

import path from "path";
import fs from "fs/promises";
import { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "Missing Template ID" }, { status: 400 });
  }
  const playground = await db.playground.findUnique({
    where: {
      id,
    },
  });
}
