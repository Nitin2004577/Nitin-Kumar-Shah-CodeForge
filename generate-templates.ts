import { saveTemplateStructureToJson } from "./features/playground/lib/path-to-json";

async function generateAllTemplates() {
  console.log("Generating template JSONs...");

  // 1. Generate React Template
  await saveTemplateStructureToJson(
    './CodeForge-starters/react', 
    './public/templates/REACT.json'
  );

  // 2. Generate Next.js Template
  await saveTemplateStructureToJson(
    './CodeForge-starters/nextjs', 
    './public/templates/NEXTJS.json'
  );

  console.log("✅ All templates generated successfully in /public/templates!");
}

generateAllTemplates();