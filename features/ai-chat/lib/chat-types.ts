export interface FileAttachment {
  id: string;
  name: string;
  content: string;
  language: string;
  size: number;
  type: "code";
  preview?: string;
  mimeType?: string;
}

export interface CodeSuggestion {
  id: string;
  title: string;
  description: string;
  code: string;
  language: string;
  insertPosition?: { line: number; column: number };
  fileName?: string;
  confidence?: number;
  category?: "optimization" | "bug_fix" | "feature" | "refactor" | "security";
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  id: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  suggestions?: CodeSuggestion[];
  type?: "chat" | "code_review" | "suggestion" | "error_fix" | "optimization";
  tokens?: number;
  model?: string;
}