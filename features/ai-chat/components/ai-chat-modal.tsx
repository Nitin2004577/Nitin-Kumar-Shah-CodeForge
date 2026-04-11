"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X, Send, Loader2, Bot, Brain, Zap, Terminal, MessageSquare,
  Paperclip, Plus, Settings, Search, Filter, Copy, Check,
  FileText, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EnhancedCodeBlock } from "./ai-chat-code-blocks";
import { ChatMessage, FileAttachment } from "../lib/chat-types";
import { detectLanguage, detectFileType, getChatModePrompt, generateCodeSuggestions } from "../lib/chat-utils";

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertCode?: (code: string) => void;
  activeFileName?: string;
  activeFileContent?: string;
  activeFileLanguage?: string;
}

type ChatMode = "chat" | "review" | "fix" | "optimize";

const QUICK_ACTIONS = [
  { label: "Explain this file", icon: Brain, prompt: "Explain what this file does and how it works." },
  { label: "Find bugs", icon: Zap, prompt: "Find any bugs or issues in the current file." },
  { label: "Optimize code", icon: Terminal, prompt: "Suggest performance optimizations for this code." },
  { label: "Write tests", icon: MessageSquare, prompt: "Write unit tests for the functions in this file." },
  { label: "Add comments", icon: FileText, prompt: "Add clear JSDoc comments to all functions." },
  { label: "Refactor", icon: Sparkles, prompt: "Refactor this code to follow best practices." },
];

export const AIChatModal: React.FC<AIChatModalProps> = ({
  isOpen,
  onClose,
  onInsertCode,
  activeFileName,
  activeFileContent,
  activeFileLanguage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>("chat");
  const [searchTerm, setSearchTerm] = useState("");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const addCurrentFile = () => {
    if (!activeFileName || !activeFileContent) return;
    const language = detectLanguage(activeFileName, activeFileContent);
    const existing = attachments.find((a) => a.name === activeFileName);
    if (existing) return;
    setAttachments((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: activeFileName,
        content: activeFileContent,
        language,
        size: activeFileContent.length,
        type: "code",
        preview: activeFileContent.substring(0, 200),
      },
    ]);
  };

  const handleFileAttach = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      const language = detectLanguage(file.name, content);
      setAttachments((prev) => [
        ...prev,
        { id: Date.now().toString(), name: file.name, content, language, size: content.length, type: "code" },
      ]);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: text.trim(),
      id: Date.now().toString(),
      timestamp: new Date(),
      attachments: [...attachments],
      type: chatMode === "chat" ? "chat" : chatMode === "review" ? "code_review" : chatMode === "fix" ? "error_fix" : "optimization",
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setAttachments([]);
    setIsLoading(true);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      let contextualMessage = getChatModePrompt(chatMode, text.trim(), {
        activeFile: activeFileName,
        activeFileContent: activeFileContent?.substring(0, 3000),
        language: activeFileLanguage,
      });

      if (attachments.length > 0) {
        contextualMessage += "\n\nAttached files:\n";
        attachments.forEach((f) => {
          contextualMessage += `\n**${f.name}** (${f.language}):\n\`\`\`${f.language}\n${f.content.substring(0, 1500)}\n\`\`\`\n`;
        });
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message: contextualMessage,
          history: messages.slice(-8).map((m) => ({ role: m.role, content: m.content })),
          mode: chatMode,
        }),
      });

      clearTimeout(timeout);
      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.ok ? data.response : `Error ${res.status}: ${data.error || "Something went wrong."}`,
          id: Date.now().toString(),
          timestamp: new Date(),
          tokens: data.tokens,
          model: data.model,
        },
      ]);
    } catch (err: any) {
      clearTimeout(timeout);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: err.name === "AbortError"
            ? "Request timed out. Please try again."
            : "Connection error. Please check your internet and try again.",
          id: Date.now().toString(),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const filteredMessages = messages.filter((m) =>
    !searchTerm ? true : m.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto w-full max-w-2xl h-[80vh] max-h-[700px] bg-[#0d0d14] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                <Bot className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-100">Enhanced AI Assistant</p>
                <p className="text-[11px] text-zinc-500">
                  {activeFileName ? `Working on ${activeFileName}` : "Ready to help"} · {messages.length} messages
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200" onClick={addCurrentFile}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Add Current File</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach File</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200" onClick={() => setShowSearch((v) => !v)}>
                    <Search className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Search messages</TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-zinc-200" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* ── Tabs + Search ── */}
          <div className="px-4 py-2 border-b border-zinc-800 shrink-0 flex items-center justify-between gap-2">
            <Tabs value={chatMode} onValueChange={(v) => setChatMode(v as ChatMode)}>
              <TabsList className="bg-zinc-900/60 h-8 gap-0.5">
                <TabsTrigger value="chat" className="text-xs h-7 px-3 gap-1.5 data-[state=active]:bg-zinc-700">
                  <MessageSquare className="w-3 h-3" /> Chat
                </TabsTrigger>
                <TabsTrigger value="review" className="text-xs h-7 px-3 gap-1.5 data-[state=active]:bg-zinc-700">
                  <Brain className="w-3 h-3" /> Review
                </TabsTrigger>
                <TabsTrigger value="fix" className="text-xs h-7 px-3 gap-1.5 data-[state=active]:bg-zinc-700">
                  <Zap className="w-3 h-3" /> Fix
                </TabsTrigger>
                <TabsTrigger value="optimize" className="text-xs h-7 px-3 gap-1.5 data-[state=active]:bg-zinc-700">
                  <Terminal className="w-3 h-3" /> Optimize
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {showSearch && (
              <Input
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search messages..."
                className="h-7 text-xs bg-zinc-900 border-zinc-700 w-44"
              />
            )}
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 ? (
              <EmptyState onQuickAction={(prompt) => sendMessage(prompt)} activeFileName={activeFileName} />
            ) : (
              filteredMessages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} onInsertCode={onInsertCode} />
              ))
            )}
            {isLoading && (
              <div className="flex items-center gap-2 text-zinc-500">
                <div className="w-7 h-7 rounded-full bg-purple-600/20 flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ── Attachments preview ── */}
          {attachments.length > 0 && (
            <div className="px-4 py-2 border-t border-zinc-800 flex gap-2 overflow-x-auto shrink-0">
              {attachments.map((f) => (
                <div key={f.id} className="flex items-center gap-1.5 bg-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-300 shrink-0">
                  <FileText className="w-3 h-3 text-purple-400" />
                  <span className="max-w-[120px] truncate">{f.name}</span>
                  <button onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== f.id))} className="text-zinc-500 hover:text-red-400 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Input ── */}
          <div className="px-4 py-3 border-t border-zinc-800 shrink-0">
            <form onSubmit={handleSubmit} className="relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                placeholder={activeFileName ? `Ask about ${activeFileName}...` : "Ask AI anything..."}
                className="min-h-[72px] w-full bg-zinc-900 border-zinc-700 focus:border-purple-500/60 resize-none pr-12 text-sm placeholder:text-zinc-600 rounded-xl"
                rows={3}
              />
              <Button
                type="submit"
                disabled={!input.trim() || isLoading}
                size="icon"
                className="absolute right-2 bottom-2 h-8 w-8 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 rounded-lg"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
            <p className="text-[10px] text-zinc-600 mt-1.5">Enter to send · Shift+Enter for new line</p>
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileAttach} />
    </TooltipProvider>
  );
};

// ── Empty state with quick action cards ──────────────────────────────────────
function EmptyState({ onQuickAction, activeFileName }: { onQuickAction: (p: string) => void; activeFileName?: string }) {
  return (
    <div className="flex flex-col items-center justify-start pt-4 gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative">
          <Sparkles className="w-5 h-5 text-purple-400 absolute -top-1 -right-1 animate-pulse" />
          <Brain className="w-12 h-12 text-zinc-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-200">Enhanced AI Assistance</p>
          <p className="text-xs text-zinc-500 max-w-xs mt-1">
            Advance AI coding assistance with file attaches, code execution, smart suggestions, and comprehensive analysis capabilities.
          </p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 w-full">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.label}
            onClick={() => onQuickAction(action.prompt)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl px-3 py-2.5 text-left transition-colors group"
          >
            <action.icon className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, onInsertCode }: { msg: ChatMessage; onInsertCode?: (code: string) => void }) {
  const [copied, setCopied] = useState(false);

  const copyMessage = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 items-start group">
      <div className="w-7 h-7 rounded-full bg-purple-600/20 border border-purple-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <Bot className="w-3.5 h-3.5 text-purple-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-zinc-200">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                return !inline ? (
                  <EnhancedCodeBlock className={className} onInsert={onInsertCode ? (code) => onInsertCode(code) : undefined}>
                    {String(children).replace(/\n$/, "")}
                  </EnhancedCodeBlock>
                ) : (
                  <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                );
              },
            }}
          >
            {msg.content}
          </ReactMarkdown>
        </div>
        {msg.tokens && (
          <p className="text-[10px] text-zinc-600 mt-1 px-1">{msg.tokens} tokens · {msg.model}</p>
        )}
      </div>
      <button
        onClick={copyMessage}
        className="opacity-0 group-hover:opacity-100 transition-opacity mt-1 text-zinc-600 hover:text-zinc-300"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}
