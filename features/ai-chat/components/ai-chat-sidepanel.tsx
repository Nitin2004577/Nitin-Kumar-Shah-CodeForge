"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Send,
  User,
  Bot,
  Copy,
  Check,
  X,
  Paperclip,
  FileText,
  Code,
  Sparkles,
  MessageSquare,
  RefreshCw,
  Plus,
  Minus,
  Settings,
  Zap,
  Brain,
  Terminal,
  Search,
  Filter,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import "katex/dist/katex.min.css";

// --- 1. SIBLING COMPONENTS (Same Folder) ---
import { EnhancedCodeBlock } from "./ai-chat-code-blocks";
import { EnhancedFilePreview } from "./file-preview";
import { MessageTypeIndicator } from "./MessageTypeIndicator";
import { CodeSuggestionCard } from "./CodeSuggestionCard";

// --- 2. TYPES & UTILS (Up one level in lib/) ---
import { FileAttachment, CodeSuggestion, ChatMessage } from "../lib/chat-types";
import {
  detectLanguage,
  detectFileType,
  generateCodeSuggestions,
  getChatModePrompt,
} from "../lib/chat-utils";

// --- 3. HOOKS (Up one level in hooks/) ---
import { useResponsive } from "../hooks/use-responsive";

interface AIChatSidePanelProps {
  isOpen: boolean;
  inline?: boolean;
  onClose: () => void;
  onInsertCode?: (
    code: string,
    fileName?: string,
    position?: { line: number; column: number }
  ) => void;
  onRunCode?: (code: string, language: string) => void;
  activeFileName?: string;
  activeFileContent?: string;
  activeFileLanguage?: string;
  cursorPosition?: { line: number; column: number };
  theme?: "dark" | "light";
}

export const AIChatSidePanel: React.FC<AIChatSidePanelProps> = ({
  isOpen,
  inline = false,
  onClose,
  onInsertCode,
  onRunCode,
  activeFileName,
  activeFileContent,
  activeFileLanguage,
  cursorPosition,
  theme = "dark",
}) => {
  // Setup Responsive Hook
  const { isMobile, isTablet } = useResponsive();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [chatMode, setChatMode] = useState<
    "chat" | "review" | "fix" | "optimize"
  >("chat");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showSettings, setShowSettings] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [streamResponse, setStreamResponse] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      scrollToBottom();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [messages, isLoading]);

  const addFileAttachment = (
    fileName: string,
    content: string,
    mimeType?: string
  ) => {
    const language = detectLanguage(fileName, content);
    const type = detectFileType(fileName, content);
    if (type !== "code") return;
    const newFile: FileAttachment = {
      id: Date.now().toString(),
      name: fileName,
      content: content.trim(),
      language,
      size: content.length,
      type,
      preview: content.substring(0, 200) + (content.length > 200 ? "..." : ""),
      mimeType,
    };
    setAttachments((prev) => [...prev, newFile]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((file) => file.id !== id));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData("text");

    if (pastedText.length > 50 && pastedText.includes("\n")) {
      const lines = pastedText.split("\n");
      const hasImports = lines.some(
        (line) =>
          line.trim().startsWith("import ") || line.trim().startsWith("from ")
      );
      const hasFunctions = lines.some(
        (line) =>
          line.includes("function ") ||
          line.includes("def ") ||
          line.includes("=>") ||
          line.includes("class ") ||
          line.includes("interface ")
      );
      const hasCodeStructure = lines.some(
        (line) =>
          line.includes("{") ||
          line.includes("}") ||
          line.includes("class ") ||
          line.includes("SELECT") ||
          line.includes("CREATE")
      );

      if (hasImports || hasFunctions || hasCodeStructure) {
        e.preventDefault();

        let suggestedName = "pasted-code.txt";
        if (hasImports && pastedText.includes("React")) {
          suggestedName =
            pastedText.includes("tsx") || pastedText.includes("interface")
              ? "component.tsx"
              : "component.jsx";
        } else if (
          pastedText.includes("def ") ||
          pastedText.includes("import ")
        ) {
          suggestedName = "script.py";
        } else if (
          pastedText.includes("function ") ||
          pastedText.includes("=>")
        ) {
          suggestedName = pastedText.includes("interface")
            ? "script.ts"
            : "script.js";
        } else if (
          pastedText.includes("SELECT") ||
          pastedText.includes("CREATE")
        ) {
          suggestedName = "query.sql";
        } else if (
          pastedText.includes("<!DOCTYPE") ||
          pastedText.includes("<html")
        ) {
          suggestedName = "page.html";
        } else if (pastedText.includes("public class")) {
          suggestedName = "Main.java";
        }

        const fileName = prompt(
          `Detected code content! Enter filename:`,
          suggestedName
        );
        if (fileName) {
          addFileAttachment(fileName, pastedText);
          return;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        addFileAttachment(file.name, content, file.type);
      };
      reader.readAsText(file);
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageType =
      chatMode === "chat"
        ? "chat"
        : chatMode === "review"
        ? "code_review"
        : chatMode === "fix"
        ? "error_fix"
        : "optimization";

    const newMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
      attachments: [...attachments],
      id: Date.now().toString(),
      type: messageType,
    };

    setMessages((prev) => [...prev, newMessage]);
    setInput("");
    setIsLoading(true);

    // ✨ 1. Create an AbortController for a 15-second timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      let contextualMessage = getChatModePrompt(chatMode, input.trim(), {
        activeFile: activeFileName,
        activeFileContent: activeFileContent?.substring(0, 2000),
        language: activeFileLanguage,
        cursorPosition,
        attachments: attachments.map((f) => ({
          name: f.name,
          language: f.language,
          size: f.size,
          type: f.type,
        })),
      });

      if (attachments.length > 0) {
        contextualMessage += "\n\nAttached files:\n";
        attachments.forEach((file) => {
          contextualMessage += `\n**${file.name}** (${file.language}, ${
            file.type
          }):\n\`\`\`${file.language}\n${file.content.substring(
            0,
            1000
          )}\n\`\`\`\n`;
        });
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // ✨ 2. Attach the abort signal to the fetch request
        signal: controller.signal,
        body: JSON.stringify({
          message: contextualMessage,
          history: messages
            .slice(-10)
            .map((msg) => ({ role: msg.role, content: msg.content })),
          // ✨ 3. Force stream to false since we are expecting a single JSON response
          stream: false,
          mode: chatMode,
        }),
      });

      // ✨ Clear the timeout if the request succeeds!
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const suggestions = generateCodeSuggestions(
          input.trim(),
          attachments,
          activeFileName,
          activeFileContent,
          activeFileLanguage
        );

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.response,
            timestamp: new Date(),
            suggestions: suggestions.length > 0 ? suggestions : undefined,
            id: Date.now().toString(),
            type: messageType,
            tokens: data.tokens,
            model: data.model || "AI Assistant",
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Error: The server responded with status ${response.status}. Please try again.`,
            timestamp: new Date(),
            id: Date.now().toString(),
          },
        ]);
      }
    } catch (error: any) {
      console.error("Error sending message:", error);

      // ✨ 4. Handle the specific timeout error cleanly
      const isTimeout = error.name === "AbortError";
      const errorMessage = isTimeout
        ? "The request timed out because the AI took too long to respond. Please try again."
        : "I'm having trouble connecting right now. Please check your internet connection and try again.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: errorMessage,
          timestamp: new Date(),
          id: Date.now().toString(),
        },
      ]);
    } finally {
      setIsLoading(false);
      setAttachments([]);
      clearTimeout(timeoutId); // Safety clear
    }
  };

  const handleInsertCode = (
    code: string,
    fileName?: string,
    position?: { line: number; column: number }
  ) => {
    if (onInsertCode) {
      onInsertCode(
        code,
        fileName || activeFileName,
        position || cursorPosition
      );
    }
  };

  const handleCopySuggestion = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const addCurrentFileAsContext = () => {
    if (activeFileName && activeFileContent) {
      addFileAttachment(activeFileName, activeFileContent);
    }
  };

  const exportChat = () => {
    const chatData = {
      messages,
      timestamp: new Date().toISOString(),
      activeFile: activeFileName,
      attachments: attachments.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
      })),
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-chat-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredMessages = messages
    .filter((msg) => (filterType === "all" ? true : msg.type === filterType))
    .filter((msg) =>
      !searchTerm
        ? true
        : msg.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <TooltipProvider>
      <>
        {/* Backdrop — only in overlay mode */}
        {!inline && (
          <div
            className={cn(
              "fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300",
              isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            onClick={onClose}
          />
        )}

        {/* Panel — fixed overlay OR inline fill */}
        <div
          className={cn(
            inline
              ? "flex flex-col h-full w-full bg-zinc-950"
              : cn(
                  "fixed right-0 top-0 h-full w-full max-w-[450px] bg-zinc-950 border-l border-zinc-800 z-50 flex flex-col transition-transform duration-300 ease-out shadow-2xl",
                  isOpen ? "translate-x-0" : "translate-x-full"
                )
          )}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
        >
          {/* 1. HEADER */}
          <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-500/10 rounded-lg">
                <Bot className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-100">
                  AI Assistant
                </h2>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                    Online
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 text-zinc-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* 2. CHAT MODES (Tabs) */}
          <div className="px-2 py-1.5 border-b border-zinc-800 bg-zinc-900/30 shrink-0">
            <Tabs
              value={chatMode}
              onValueChange={(v: any) => setChatMode(v)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-4 bg-zinc-900 h-7">
                <TabsTrigger value="chat" className="text-[10px] gap-1">
                  <MessageSquare className="w-3 h-3" /> Chat
                </TabsTrigger>
                <TabsTrigger value="review" className="text-[10px] gap-1">
                  <Brain className="w-3 h-3" /> Review
                </TabsTrigger>
                <TabsTrigger value="fix" className="text-[10px] gap-1">
                  <Zap className="w-3 h-3" /> Fix
                </TabsTrigger>
                <TabsTrigger value="optimize" className="text-[10px] gap-1">
                  <Terminal className="w-3 h-3" /> Optimize
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* 3. MESSAGES AREA */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <Sparkles className="w-12 h-12 text-zinc-700" />
                <p className="text-sm text-zinc-400 max-w-[200px]">
                  Ask me to write code, debug errors, or explain logic.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex flex-col gap-2",
                    msg.role === "user" ? "items-end" : "items-start"
                  )}
                >
                  <div className="flex items-center gap-2 px-1">
                    {msg.role === "assistant" && (
                      <MessageTypeIndicator
                        type={msg.type}
                        model={msg.model}
                        tokens={msg.tokens}
                      />
                    )}
                  </div>

                  <div
                    className={cn(
                      "max-w-[90%] rounded-2xl px-4 py-3 text-sm",
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-tr-none"
                        : "bg-zinc-900 text-zinc-200 border border-zinc-800 rounded-tl-none"
                    )}
                  >
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        code({
                          node,
                          inline,
                          className,
                          children,
                          ...props
                        }: any) {
                          const match = /language-(\w+)/.exec(className || "");
                          return !inline ? (
                            <EnhancedCodeBlock
                              className={className}
                              onInsert={(code: string) =>
                                handleInsertCode(code)
                              }
                            >
                              {String(children).replace(/\n$/, "")}
                            </EnhancedCodeBlock>
                          ) : (
                            <code
                              className="bg-zinc-800 px-1 rounded"
                              {...props}
                            >
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>

                  {/* Render Suggestions if any */}
                  {msg.suggestions?.map((s, i) => (
                    <CodeSuggestionCard
                      key={i}
                      suggestion={s}
                      onInsert={() => handleInsertCode(s.code)}
                      onCopy={() => handleCopySuggestion(s.code)}
                    />
                  ))}
                </div>
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-zinc-500 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">AI is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 4. ATTACHMENTS PREVIEW */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/50 flex gap-2 overflow-x-auto">
              {attachments.map((file) => (
                <div key={file.id} className="relative group shrink-0">
                  <EnhancedFilePreview
                    file={file}
                    onRemove={() => removeAttachment(file.id)}
                  />
                </div>
              ))}
            </div>
          )}

          {/* 5. INPUT AREA */}
          <div className="p-3 bg-zinc-900/80 border-t border-zinc-800 shrink-0">
            <form onSubmit={handleSendMessage} className="relative">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e as any);
                  }
                }}
                onPaste={handlePaste}
                placeholder={
                  activeFileName
                    ? `Ask about ${activeFileName}...`
                    : "Ask AI anything..."
                }
                className="min-h-[80px] w-full bg-zinc-950 border-zinc-800 focus:border-purple-500/50 resize-none pr-10 pb-9 text-sm placeholder:text-zinc-600"
              />

              <div className="absolute left-2 bottom-2 flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-600 hover:text-zinc-300"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Attach file</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-zinc-600 hover:text-zinc-300"
                      onClick={addCurrentFileAsContext}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Add active file as context</TooltipContent>
                </Tooltip>
              </div>

              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 bottom-2 h-7 w-7 bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40"
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
              </Button>
            </form>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    const content = event.target?.result as string;
                    addFileAttachment(file.name, content, file.type);
                  };
                  reader.readAsText(file);
                }
              }}
            />
          </div>
        </div>
      </>
    </TooltipProvider>
  );
};
