"use client";

import type React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Copy,
  Check,
  MoreHorizontal,
  FileText,
  ImportIcon as Insert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  vs,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnhancedCodeBlockProps {
  children: string;
  className?: string;
  inline?: boolean;
  onInsert?: (code: string) => void;
  onRun?: (code: string, language: string) => void;
  showLineNumbers?: boolean;
  theme?: "dark" | "light";
  maxHeight?: number;
  fileName?: string;
}

export const EnhancedCodeBlock: React.FC<EnhancedCodeBlockProps> = ({
  children,
  className,
  inline,
  onInsert,
  onRun,
  showLineNumbers = true,
  theme = "dark",
  maxHeight = 400,
  fileName,
}) => {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "text";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code: ", err);
    }
  };

  const downloadCode = () => {
    const blob = new Blob([children], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || `code.${getFileExtension(language)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileExtension = (lang: string): string => {
    const extensions: { [key: string]: string } = {
      javascript: "js",
      typescript: "ts",
      jsx: "jsx",
      tsx: "tsx",
      python: "py",
      java: "java",
      cpp: "cpp",
      c: "c",
      csharp: "cs",
      php: "php",
      ruby: "rb",
      go: "go",
      rust: "rs",
      html: "html",
      css: "css",
      scss: "scss",
      json: "json",
      yaml: "yml",
      xml: "xml",
      sql: "sql",
      bash: "sh",
      shell: "sh",
      powershell: "ps1",
      dockerfile: "dockerfile",
      markdown: "md",
    };
    return extensions[lang.toLowerCase()] || "txt";
  };

  const getLanguageDisplayName = (lang: string): string => {
    const languageMap: { [key: string]: string } = {
      js: "JavaScript",
      javascript: "JavaScript",
      ts: "TypeScript",
      typescript: "TypeScript",
      jsx: "React JSX",
      tsx: "React TSX",
      html: "HTML",
      css: "CSS",
      scss: "SCSS",
      sass: "Sass",
      json: "JSON",
      python: "Python",
      py: "Python",
      java: "Java",
      cpp: "C++",
      c: "C",
      csharp: "C#",
      php: "PHP",
      ruby: "Ruby",
      go: "Go",
      rust: "Rust",
      sql: "SQL",
      bash: "Bash",
      sh: "Shell",
      powershell: "PowerShell",
      dockerfile: "Dockerfile",
      yaml: "YAML",
      yml: "YAML",
      xml: "XML",
      markdown: "Markdown",
      md: "Markdown",
      plaintext: "Plain Text",
      text: "Plain Text",
    };
    return (
      languageMap[lang.toLowerCase()] ||
      lang.charAt(0).toUpperCase() + lang.slice(1)
    );
  };

  const isExecutable = (lang: string): boolean => {
    return ["javascript", "python", "bash", "shell", "sql"].includes(
      lang.toLowerCase()
    );
  };

  if (inline) {
    return (
      <code className="bg-zinc-800/60 text-zinc-200 px-1.5 py-0.5 rounded text-sm font-mono border border-zinc-700/50">
        {children}
      </code>
    );
  }

  const lineCount = children.split("\n").length;
  const shouldShowControls = lineCount > 3;

  return (
    <TooltipProvider>
      <div
        className="relative group my-4"
      >
        {/* Header with enhanced controls */}
        <div className="flex items-center justify-between bg-zinc-800/90 backdrop-blur-sm px-4 py-2.5 rounded-t-lg border border-zinc-700/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-zinc-400" />
              <span className="text-xs text-zinc-300 font-medium tracking-wide">
                {getLanguageDisplayName(language)}
              </span>
            </div>
            {lineCount > 1 && (
              <Badge variant="outline" className="text-xs">
                {lineCount} lines
              </Badge>
            )}
            {fileName && (
              <Badge variant="secondary" className="text-xs">
                {fileName}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {shouldShowControls && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 transition-colors"
                    onClick={() => setCollapsed(!collapsed)}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {collapsed ? "Expand code" : "Collapse code"}
                </TooltipContent>
              </Tooltip>
            )}

            {onInsert && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 gap-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors text-[10px] font-medium"
                    onClick={() => onInsert(children)}
                  >
                    <Insert className="h-3.5 w-3.5" />
                    Insert
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Insert into editor</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 transition-colors"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied!" : "Copy"}</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Code content */}
        <div className="border-x border-b border-zinc-700/50 rounded-b-lg overflow-hidden bg-[#1e1e1e] relative">
          <SyntaxHighlighter
            language={language}
            style={theme === "dark" ? vscDarkPlus : vs}
            showLineNumbers={showLineNumbers && lineCount > 1}
            wrapLines={true}
            wrapLongLines={true}
            customStyle={{
              margin: 0,
              padding: "16px",
              background: "transparent",
              fontSize: "13px",
              fontFamily:
                "'JetBrains Mono', 'Fira Code', 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace",
              maxHeight: collapsed ? "200px" : `${maxHeight}px`,
              overflow: "auto",
            }}
            lineNumberStyle={{
              color: "#6b7280",
              fontSize: "12px",
              paddingRight: "16px",
              userSelect: "none",
            }}
          >
            {children}
          </SyntaxHighlighter>

          {collapsed && lineCount > 20 && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#1e1e1e] to-transparent flex items-end justify-center pb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCollapsed(false)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Show {lineCount - 10} more lines
              </Button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
