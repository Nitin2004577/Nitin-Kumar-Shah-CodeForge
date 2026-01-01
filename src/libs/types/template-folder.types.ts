export type TemplateNode = {
  id?: string;
  name: string;
  path?: string;
  type: "file" | "folder";
  content?: string; // present for files
  children?: TemplateNode[]; // present for folders
};

export type TemplateFolder = TemplateNode;