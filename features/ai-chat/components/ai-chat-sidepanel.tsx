"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2, Send, Bot, X, Paperclip, FileText, Code,
  Sparkles, MessageSquare, RefreshCw, Plus, Zap, Brain,
  Terminal, Search, Copy, Check, ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

import { EnhancedCodeBlock } from "./ai-chat-code-blocks";
import { EnhancedFilePreview } from "./file-preview";
import { MessageTypeIndicator } from "./MessageTypeIndicator";
import { CodeSuggestionCard } from "./CodeSuggestionCard";
import { FileAttachment, ChatMessage } from "../lib/chat-types";
import {
  detectLanguage, detectFileType, generateCodeSuggestions, getChatModePrompt,
} from "../lib/chat-utils";
import { useResponsive } from "../hooks/use-responsive";

interface AIChatSidePanelProps {
  isOpen: boolean;
  inline?: boolean;
  onClose: () => void;
  onInsertCode?: (code: string, fileName?: string, position?: { line: number; column: number }) => void;
  onRunCode?: (code: string, language: string) => void;
  activeFileName?: string;
  activeFileContent?: string;
  activeFileLanguage?: string;
  cursorPosition?: { line: number; column: number };
  theme?: "dark" | "light";
}

type ChatMode = "chat" | "review" | "fix" | "optimize";

const QUICK_PROMPTS = [
  { label: "Explain this file", icon: Brain },
  { label: "Find bugs & fix them", icon: Zap },
  { label: "Write unit tests", icon: Code },
  { label: "Optimize performance", icon: Terminal },
  { label: "Add TypeScript types", icon: FileText },
  { label: "Refactor this code", icon: RefreshCw },
];

export const AIChatSidePanel: React.FC<AIChatSidePanelProps> = ({
  isOpen,
  inline = false,
  onClose,
  onInsertCode,
  activeFileName,
  activeFileContent,
  activeFileLanguage,
  cursorPosition,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [chatMode, setChatMode] = useState<ChatMode>("chat");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const addFileAttachment = (fileName: string, content: string, mimeType?: string) => {
    const language = detectLanguage(fileName, content);
    const type = detectFileType(fileName, content);
    if (type !== "code") return;
    setAttachments((prev) => [
      ...prev,
      { id: Date.now().toString(), name: fileName, content: content.trim(), language, size: content.length, type, preview: content.substring(0, 200), mimeType },
    ]);
  };

  const removeAttachment = (id: string) => setAttachments((prev) => prev.filter((f) => f.id !== id));
  const addCurrentFileAsContext = () => {
    if (activeFileName && activeFileContent) addFileAttachment(activeFileName, activeFileContent);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => addFileAttachment(file.name, ev.target?.result as string, file.type);
      reader.readAsText(file);
    });
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    const typeMap: Record<ChatMode, ChatMessage["type"]> = {
      chat: "chat", review: "code_review", fix: "error_fix", optimize: "optimization",
    };

    const userMsg: ChatMessage = {
      role: "user", content: trimmed, timestamp: new Date(),
      attachments: [...attachments], id: Date.now().toString(), type: typeMap[chatMode],
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Placeholder assistant message that we'll stream into
    const assistantId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { role: "assistant", content: "", id: assistantId, timestamp: new Date(), type: typeMap[chatMode] }]);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      let contextualMessage = getChatModePrompt(chatMode, trimmed, {
        activeFile: activeFileName,
        activeFileContent: activeFileContent?.substring(0, 3000),
        language: activeFileLanguage,
        cursorPosition,
      });

      if (attachments.length > 0) {
        contextualMessage += "\n\nAttached files:\n";
        attachments.forEach((f) => {
          contextualMessage += `\n**${f.name}** (${f.language}):\n\`\`\`${f.language}\n${f.content.substring(0, 1500)}\n\`\`\`\n`;
        });
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: contextualMessage,
          history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          mode: chatMode,
        }),
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: `Error ${response.status}: ${data.error || "Something went wrong."}` } : m));
        return;
      }

      if (!response.body) {
        setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: "Error: No response body received." } : m));
        return;
      }

      // Stream the response token by token
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMessages((prev) =>
          prev.map((m) => m.id === assistantId ? { ...m, content: accumulated } : m)
        );
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      const errMsg = error.name === "AbortError" ? "Request timed out. Please try again." : "Connection error. Please try again.";
      setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, content: errMsg } : m));
    } finally {
      setIsLoading(false);
      setAttachments([]);
    }
  };

  const handleInsertCode = (code: string, fileName?: string, position?: { line: number; column: number }) => {
    onInsertCode?.(code, fileName || activeFileName, position || cursorPosition);
  };

  const handleCopySuggestion = async (code: string) => {
    try { await navigator.clipboard.writeText(code); } catch {}
  };

  const filteredMessages = messages.filter((msg) =>
    !searchTerm ? true : msg.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── Shared panel content (used by both inline and overlay) ───────────────────
  const panelContent = (
    <div className="flex flex-col h-full w-full bg-[#0d0d10] border-l border-zinc-800">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-800/80 shrink-0 bg-[#111116]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-600/20 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <span className="text-[13px] font-semibold text-zinc-100">AI Chat</span>
          {activeFileName && (
            <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded truncate max-w-[120px]">
              {activeFileName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" onClick={addCurrentFileAsContext}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Add current file</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" onClick={() => fileInputRef.current?.click()}>
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Attach file</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className={cn("h-6 w-6 hover:bg-zinc-800", showSearch ? "text-purple-400" : "text-zinc-500 hover:text-zinc-200")} onClick={() => setShowSearch((v) => !v)}>
                <Search className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Search</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800" onClick={onClose}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">Close</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* ── Mode tabs ── */}
      <div className="px-2 pt-2 pb-1.5 border-b border-zinc-800/60 shrink-0">
        <div className="flex items-center gap-1">
          {(["chat", "review", "fix", "optimize"] as ChatMode[]).map((mode) => {
            const icons = { chat: MessageSquare, review: Code, fix: Zap, optimize: Terminal };
            const Icon = icons[mode];
            return (
              <button
                key={mode}
                onClick={() => setChatMode(mode)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors capitalize",
                  chatMode === mode
                    ? "bg-zinc-700/80 text-zinc-100"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
                )}
              >
                <Icon className="w-3 h-3" />
                {mode}
              </button>
            );
          })}
        </div>
        {showSearch && (
          <div className="relative mt-1.5">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-500" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search messages..."
              className="h-6 pl-7 text-[11px] bg-zinc-900 border-zinc-700 text-zinc-300 placeholder:text-zinc-600 rounded-md"
            />
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <EmptyState onQuickAction={sendMessage} activeFileName={activeFileName} />
        ) : (
          filteredMessages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} onInsertCode={handleInsertCode} onCopySuggestion={handleCopySuggestion} />
          ))
        )}
        {isLoading && (
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-3 h-3 text-purple-400" />
            </div>
            <div className="flex gap-1 pt-1.5">
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}        <div ref={messagesEndRef} />
      </div>

      {/* ── Attachments ── */}
      {attachments.length > 0 && (
        <div className="px-3 py-1.5 border-t border-zinc-800/60 flex gap-1.5 overflow-x-auto shrink-0 bg-zinc-900/40">
          {attachments.map((f) => (
            <div key={f.id} className="flex items-center gap-1 bg-zinc-800 rounded px-2 py-0.5 text-[11px] text-zinc-300 shrink-0">
              <FileText className="w-3 h-3 text-purple-400" />
              <span className="max-w-[100px] truncate">{f.name}</span>
              <button onClick={() => removeAttachment(f.id)} className="text-zinc-500 hover:text-red-400 ml-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Input ── */}
      <div className="px-3 py-2.5 border-t border-zinc-800/80 shrink-0 bg-[#111116]">
        <div className="relative bg-zinc-900 border border-zinc-700/60 rounded-xl overflow-hidden focus-within:border-purple-500/50 transition-colors">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
            }}
            placeholder={activeFileName ? `Ask about ${activeFileName}...` : "Ask AI anything..."}
            className="min-h-[72px] max-h-[160px] w-full bg-transparent border-0 focus-visible:ring-0 resize-none px-3 pt-2.5 pb-8 text-[13px] text-zinc-200 placeholder:text-zinc-600"
            rows={3}
          />
          <div className="absolute bottom-1.5 left-2 flex items-center gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700/50 rounded-md" onClick={() => fileInputRef.current?.click()}>
                  <Paperclip className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Attach file</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-700/50 rounded-md" onClick={addCurrentFileAsContext}>
                  <FileText className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">Add active file</TooltipContent>
            </Tooltip>
          </div>
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="absolute bottom-1.5 right-1.5 h-6 w-6 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 rounded-md"
          >
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </Button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-1 px-0.5">↵ Send · Shift+↵ New line</p>
      </div>

      <input type="file" ref={fileInputRef} className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => addFileAttachment(file.name, ev.target?.result as string, file.type);
            reader.readAsText(file);
          }
          if (e.target) e.target.value = "";
        }}
      />
    </div>
  );

  // ── INLINE (side panel embedded in layout) ───────────────────────────────────
  if (inline) {
    return <TooltipProvider>{panelContent}</TooltipProvider>;
  }

  // ── OVERLAY (slides in from right, fixed position) ───────────────────────────
  return (
    <TooltipProvider>
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[340px] z-40 shadow-2xl transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {panelContent}
      </div>
    </TooltipProvider>
  );
};

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onQuickAction, activeFileName }: { onQuickAction: (p: string) => void; activeFileName?: string }) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex flex-col items-center gap-2 text-center py-2">
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute inset-0 bg-purple-600/10 rounded-full" />
          <Bot className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <p className="text-[13px] font-medium text-zinc-300">AI Assistant</p>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            {activeFileName ? `Ask anything about ${activeFileName}` : "Ask me anything about your code"}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {QUICK_PROMPTS.map((q) => (
          <button
            key={q.label}
            onClick={() => onQuickAction(q.label)}
            className="flex items-center gap-2.5 bg-zinc-900/60 hover:bg-zinc-800/80 border border-zinc-800/60 hover:border-zinc-700 rounded-lg px-3 py-2 text-left transition-all group"
          >
            <q.icon className="w-3.5 h-3.5 text-purple-400/70 group-hover:text-purple-400 shrink-0 transition-colors" />
            <span className="text-[12px] text-zinc-500 group-hover:text-zinc-300 transition-colors">{q.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  msg,
  onInsertCode,
  onCopySuggestion,
}: {
  msg: ChatMessage;
  onInsertCode?: (code: string) => void;
  onCopySuggestion?: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const isStreaming = msg.role === "assistant" && msg.content === "";

  const copyMessage = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-purple-600/90 text-white rounded-2xl rounded-tr-sm px-3 py-2 text-[13px] leading-relaxed">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-start group">
      <div className="w-5 h-5 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-2.5 h-2.5 text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-zinc-900/80 border border-zinc-800/60 rounded-2xl rounded-tl-sm px-3 py-2.5 text-[13px] text-zinc-200 leading-relaxed min-h-[36px]">
          {isStreaming ? (
            <span className="inline-flex items-center gap-1 text-zinc-500">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ node, inline, className, children, ...props }: any) {
                  return !inline ? (
                    <EnhancedCodeBlock className={className} onInsert={onInsertCode ? (code) => onInsertCode(code) : undefined}>
                      {String(children).replace(/\n$/, "")}
                    </EnhancedCodeBlock>
                  ) : (
                    <code className="bg-zinc-800 px-1 py-0.5 rounded text-[12px] font-mono text-purple-300" {...props}>{children}</code>
                  );
                },
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
                li: ({ children }) => <li className="text-zinc-300">{children}</li>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>
        {!isStreaming && (
          <div className="flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={copyMessage} className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
              {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            {msg.tokens && <span className="text-[10px] text-zinc-700">{msg.tokens} tokens</span>}
          </div>
        )}
        {msg.suggestions?.map((s, i) => (
          <CodeSuggestionCard key={i} suggestion={s} onInsert={() => onInsertCode?.(s.code)} onCopy={() => onCopySuggestion?.(s.code)} />
        ))}
      </div>
    </div>
  );
}
