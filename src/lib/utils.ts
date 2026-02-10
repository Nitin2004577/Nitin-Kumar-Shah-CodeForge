import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
// import { TemplateFolder } from "../types" // Update the import path to match your project structure

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}




// // Helper to convert your TemplateFolder structure to WebContainer's FileSystemTree
// import { FileSystemTree } from "@webcontainer/api";

// const convertToWebContainerTree = (data: TemplateFolder): FileSystemTree => {
//   const tree: FileSystemTree = {};

//   data.items.forEach((item) => {
//     if ("folderName" in item) {
//       // It's a folder
//       tree[item.folderName] = {
//         directory: convertToWebContainerTree(item),
//       };
//     } else {
//       // It's a file
//       tree[`${item.filename}.${item.fileExtension}`] = {
//         file: {
//           contents: item.content || "",
//         },
//       };
//     }
//   });

//   return tree;
// };