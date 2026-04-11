"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { FileText, X, TerminalSquare, GripHorizontal, Code2, Eye, MonitorSmartphone } from "lucide-react";
import dynamic from "next/dynamic";

// UI Components
import { SidebarInset } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoadingStep from "@/components/ui/loader";
import { toast } from "sonner";

// Feature Components
import { TemplateFileTree } from "@/../features/playground/components/playground-explorer";
import { ConfirmationDialog } from "../../../../features/playground/components/dialogs/confirmation-dialog";
import { PlaygroundHeader } from "@/../features/playground/components/playground-header";
import { PlaygroundWorkspace } from "@/../features/playground/components/playground-workspace";
import { GithubPushModal } from "@/../features/playground/components/GithubPushModal";
import { AIChatSidePanel } from "@/../features/ai-chat/components/ai-chat-sidepanel";

// Hooks
import { usePlayground } from "@/../features/playground/hooks/usePlayground";
import { useFileExplorer } from "@/../features/playground/hooks/useFileExplorer";
import { useAISuggestions } from "@/../features/playground/hooks/useAISuggestion";
import { usePlaygroundLogic } from "@/../features/playground/hooks/usePlaygroundLogic";

// Dynamically import the Terminal
const TerminalComponent = dynamic(
  () => import("@/../features/webcontianers/components/terminal"),
  { ssr: false }
);

const MainPlaygroundPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const router = useRouter(); // 🚨 FIX 2: Initialize router

  const terminalRef = useRef<any>(null);

  // ✨ NEW: Terminal Resizing & Visibility State ✨
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(256); // Default h-64 is 256px
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef(false); // Ref for immediate access in event listeners
  // --- 1. Global Stores & Data ---
  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);
    
  const explorer = useFileExplorer();
  const ai = useAISuggestions();

  // ✨ FIX: Prevent "Ghost Files" from bleeding over from other projects
  useEffect(() => {
    // Whenever the project ID changes, force close all previously opened tabs
    explorer.closeAllFiles();

    // We strictly ONLY want this to run when 'id' changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // --- 2. Local Controller Logic ---
  const logic = usePlaygroundLogic(id, templateData, saveTemplateData);

  // --- 3. Git Specific State ---
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  // --- 4. AI Chat State ---
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatWidth, setChatWidth] = useState(320);
  const [isChatDragging, setIsChatDragging] = useState(false);
  const chatDragRef = useRef(false);

  // --- 5. Mobile state ---
  const [isMobile, setIsMobile] = useState(false);
  const [mobileView, setMobileView] = useState<"editor" | "preview" | "terminal">("editor");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ✨ NEW: Resizer Mouse Event Handlers ✨
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = true;
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const newHeight = window.innerHeight - e.clientY;

    // Constrain height between 100px (min) and 80% of screen (max)
    if (newHeight > 100 && newHeight < window.innerHeight * 0.8) {
      setTerminalHeight(newHeight);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragRef.current = false;
  }, []);

  // Chat panel resize handlers
  const handleChatMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsChatDragging(true);
    chatDragRef.current = true;
  }, []);

  const handleChatMouseMove = useCallback((e: MouseEvent) => {
    if (!chatDragRef.current) return;
    const newWidth = window.innerWidth - e.clientX;
    if (newWidth >= 240 && newWidth <= 600) setChatWidth(newWidth);
  }, []);

  const handleChatMouseUp = useCallback(() => {
    setIsChatDragging(false);
    chatDragRef.current = false;
  }, []);

  // Attach mouse listeners to the window so it doesn't stutter if you drag fast
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    } else {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (isChatDragging) {
      window.addEventListener("mousemove", handleChatMouseMove);
      window.addEventListener("mouseup", handleChatMouseUp);
    } else {
      window.removeEventListener("mousemove", handleChatMouseMove);
      window.removeEventListener("mouseup", handleChatMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleChatMouseMove);
      window.removeEventListener("mouseup", handleChatMouseUp);
    };
  }, [isChatDragging, handleChatMouseMove, handleChatMouseUp]);

  const handleGitPush = async (repoFullName: string, commitMessage: string) => {
    setIsPushing(true);
    try {
      const filesToPush: Record<string, string> = {};

      if (templateData) {
        const extractFiles = (node: any, currentPath = "") => {
          const nodeName =
            node.folderName ||
            (node.filename ? `${node.filename}.${node.fileExtension}` : "");

          const isRoot = currentPath === "" && node.folderName;
          const nodePath = isRoot
            ? ""
            : currentPath
            ? `${currentPath}/${nodeName}`
            : nodeName;

          if (node.filename) {
            const openFileRef = explorer.openFiles.find(
              (f) =>
                f.filename === node.filename &&
                f.fileExtension === node.fileExtension
            );

            filesToPush[nodePath] = openFileRef
              ? openFileRef.content || ""
              : node.content || "";
          } else if (node.items && Array.isArray(node.items)) {
            node.items.forEach((child: any) => {
              extractFiles(child, nodePath);
            });
          }
        };

        extractFiles(templateData);
      }

      if (Object.keys(filesToPush).length === 0) {
        toast.error("No files found in project to push!");
        setIsPushing(false);
        return;
      }

      const response = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: repoFullName,
          message: commitMessage,
          files: filesToPush,
        }),
      });

      let result: any = {};
      try {
        result = await response.json();
      } catch {
        if (!response.ok) throw new Error(`Server error: ${response.status}`);
      }
      if (!response.ok) throw new Error(result.error || "Push failed");

      toast.success("Successfully pushed to GitHub!");
      setIsGitModalOpen(false);
    } catch (err: any) {
      console.error("PUSH_ERROR:", err);
      toast.error(err.message || "Failed to push to GitHub");
    } finally {
      setIsPushing(false);
    }
  };

  // --- Render States ---
  if (error || logic.containerError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4 text-red-500">
        <h2 className="text-xl font-semibold">Playground Unavailable</h2>
        <p className="mt-2 text-muted-foreground">
          {error || logic.containerError}
        </p>
        <div className="flex gap-4 mt-6">
          <Button onClick={() => router.push("/")} variant="default">
            Go Home
          </Button>
          <Button onClick={() => window.location.reload()} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-center">
            Loading Playground
          </h2>
          <LoadingStep
            currentStep={2}
            step={2}
            label="Setting up environment"
          />
        </div>
      </div>
    );
  }

  if (!templateData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <h2 className="text-xl font-semibold text-amber-600">
          No template data available
        </h2>
        <Button
          onClick={() => window.location.reload()}
          variant="outline"
          className="mt-4"
        >
          Reload
        </Button>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // Deep search templateData to guarantee we always have the true content
  // -----------------------------------------------------------------
  const findOriginalFile = (node: any, targetId: string): any => {
    if (!node) return null;
    if (Array.isArray(node)) {
      for (const item of node) {
        const found = findOriginalFile(item, targetId);
        if (found) return found;
      }
      return null;
    }
    if (node.id === targetId) return node;
    if (node.items && Array.isArray(node.items)) {
      for (const child of node.items) {
        const found = findOriginalFile(child, targetId);
        if (found) return found;
      }
    }
    return null;
  };

  const activeFileRaw = explorer.openFiles.find(
    (f) => f.id === explorer.activeFileId
  );

  const originalFileData =
    templateData && explorer.activeFileId
      ? findOriginalFile(templateData, explorer.activeFileId)
      : null;

  // If the file is unmodified, forcefully use the original content from the tree
  const activeFile = activeFileRaw
    ? {
        ...activeFileRaw,
        content: activeFileRaw.hasUnsavedChanges
          ? activeFileRaw.content
          : originalFileData?.content || activeFileRaw.content || "",
      }
    : undefined;

  const hasUnsaved = explorer.openFiles.some((f) => f.hasUnsavedChanges);

  return (
    <TooltipProvider>
      {/* File explorer sidebar — hidden on mobile (sidebar component handles this) */}
      <TemplateFileTree
        data={templateData}
        onFileSelect={(file: any) => {
          explorer.openFile(file);
          if (isMobile) setMobileView("editor");
        }}
        selectedFile={activeFile as any}
        title="Explorer"
        onAddFile={(...args: any[]) => (logic.actions.handleAddFile as any)(...args)}
        onAddFolder={(...args: any[]) => (logic.actions.handleAddFolder as any)(...args)}
        onDeleteFile={(...args: any[]) => (logic.actions.handleDeleteFile as any)(...args)}
        onDeleteFolder={(...args: any[]) => (logic.actions.handleDeleteFolder as any)(...args)}
        onRenameFile={(...args: any[]) => (logic.actions.handleRenameFile as any)(...args)}
        onRenameFolder={(...args: any[]) => (logic.actions.handleRenameFolder as any)(...args)}
      />

      <SidebarInset className="overflow-hidden min-w-0 flex flex-row">
        {/* ── Main content column ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <PlaygroundHeader
            title={playgroundData?.title || "Code Playground"}
            openFilesCount={explorer.openFiles.length}
            hasUnsavedChanges={hasUnsaved}
            canSave={!!activeFile && activeFile.hasUnsavedChanges}
            onSave={() => logic.actions.handleSave()}
            onSaveAll={logic.actions.handleSaveAll}
            onTogglePreview={() => logic.setIsPreviewVisible(!logic.isPreviewVisible)}
            isPreviewVisible={logic.isPreviewVisible}
            onCloseAll={explorer.closeAllFiles}
            onGitPush={() => setIsGitModalOpen(true)}
            isPushing={isPushing}
            onRun={logic.handleRun}
            isRunning={logic.isRunning}
            hasRun={logic.hasRun}
            isAutoSaveEnabled={logic.isAutoSaveEnabled}
            onToggleAutoSave={logic.toggleAutoSave}
            aiProps={{
              isEnabled: ai.isEnabled,
              onToggle: ai.toggleEnabled as any,
              isLoading: ai.isLoading,
              isChatOpen,
              onToggleChat: () => setIsChatOpen((v) => !v),
            } as any}
          />

          {(isDragging || isChatDragging) && <div className="fixed inset-0 z-50 cursor-row-resize" />}

          {/* ── DESKTOP layout ── */}
          {!isMobile && (
            <div className="h-[calc(100vh-3.5rem)] flex flex-col">
              {/* Tabs */}
              <div className="border-b bg-muted/30 shrink-0 flex items-center justify-between gap-2 pr-2">
                <div className="flex-1 min-w-0">
                  <Tabs value={explorer.activeFileId || ""} onValueChange={explorer.setActiveFileId} className="w-full">
                    <div className="flex items-center px-4 py-2">
                      <TabsList className="h-8 bg-transparent p-0 flex flex-nowrap overflow-x-auto no-scrollbar justify-start w-full">
                        {explorer.openFiles.map((file) => (
                          <TabsTrigger key={file.id} value={file.id}
                            className="relative h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm group border-r border-transparent data-[state=active]:border-border/50 min-w-[100px]">
                            <div className="flex items-center gap-2 max-w-[200px]">
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="truncate">{file.filename}.{file.fileExtension}</span>
                              {file.hasUnsavedChanges && <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />}
                              <span className="ml-1 h-4 w-4 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={(e) => { e.stopPropagation(); explorer.closeFile(file.id); }}>
                                <X className="h-3 w-3" />
                              </span>
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                  </Tabs>
                </div>
                <div className="flex items-center gap-2 shrink-0 py-2">
                  <Button size="sm" variant={isTerminalVisible ? "secondary" : "default"}
                    onClick={() => setIsTerminalVisible(!isTerminalVisible)} className="h-6 px-2 text-xs shrink-0">
                    <TerminalSquare className="w-3 h-3 mr-1.5" />
                    {isTerminalVisible ? "Hide Terminal" : "Terminal"}
                  </Button>
                  {explorer.openFiles.length > 1 && (
                    <Button size="sm" variant="ghost" onClick={explorer.closeAllFiles} className="h-6 px-2 text-xs shrink-0">
                      Close All
                    </Button>
                  )}
                </div>
              </div>

              {/* Workspace */}
              <div className="flex-1 min-h-0 flex flex-col">
                <PlaygroundWorkspace
                  activeFile={activeFile}
                  isPreviewVisible={logic.isPreviewVisible}
                  isChatOpen={false}
                  onChatClose={() => {}}
                  onContentChange={(val) => { if (activeFile?.id) explorer.updateFileContent(activeFile.id, val || ""); }}
                  ai={{
                    suggestion: ai.suggestion || "",
                    isLoading: ai.isLoading,
                    position: ai.position || { line: 0, column: 0 },
                    onAccept: ai.acceptSuggestion,
                    onReject: ai.rejectSuggestion,
                    onTrigger: ai.fetchSuggestion,
                    explanationData: ai.explanationData,
                    clearExplanation: ai.clearExplanation,
                  }}
                  preview={{
                    templateData: templateData!,
                    instance: logic.instance,
                    serverUrl: logic.serverUrl || "",
                    isLoading: logic.containerLoading,
                    error: logic.containerError,
                    writeFileSync: logic.writeFileSync,
                    hasRun: logic.hasRun,
                  } as any}
                />
              </div>

              {/* Terminal resizer */}
              {isTerminalVisible && (
                <div onMouseDown={handleMouseDown}
                  className="h-1.5 bg-border hover:bg-blue-500/50 cursor-row-resize shrink-0 flex items-center justify-center transition-colors group z-10">
                  <div className="w-12 h-1 rounded-full bg-transparent group-hover:bg-blue-500/80 transition-colors flex items-center justify-center">
                    <GripHorizontal className="w-4 h-4 text-blue-100 opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              )}

              {/* Terminal */}
              {isTerminalVisible && (
                <div style={{ height: `${terminalHeight}px` }} className="border-t border-border shrink-0 bg-[#1e1e1e] flex flex-col">
                  <div className="flex-1 min-h-0">
                    <TerminalComponent ref={terminalRef} webContainerInstance={logic.instance}
                      theme="dark" className="h-full w-full"
                      projectName={playgroundData?.title || "codeforge"}
                      onClose={() => setIsTerminalVisible(false)} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── MOBILE layout ── */}
          {isMobile && (
            <div className="flex flex-col h-[calc(100dvh-3rem)]">
              {/* Active file name bar */}
              <div className="border-b bg-muted/30 shrink-0 px-3 py-1.5 flex items-center justify-between">
                <span className="text-xs text-muted-foreground truncate">
                  {activeFile ? `${activeFile.filename}.${activeFile.fileExtension}` : "No file open"}
                </span>
                {activeFile?.hasUnsavedChanges && (
                  <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0 ml-2" />
                )}
              </div>

              {/* Content area */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {mobileView === "editor" && (
                  <PlaygroundWorkspace
                    activeFile={activeFile}
                    isPreviewVisible={false}
                    isChatOpen={false}
                    onChatClose={() => {}}
                    onContentChange={(val) => { if (activeFile?.id) explorer.updateFileContent(activeFile.id, val || ""); }}
                    ai={{
                      suggestion: ai.suggestion || "",
                      isLoading: ai.isLoading,
                      position: ai.position || { line: 0, column: 0 },
                      onAccept: ai.acceptSuggestion,
                      onReject: ai.rejectSuggestion,
                      onTrigger: ai.fetchSuggestion,
                      explanationData: ai.explanationData,
                      clearExplanation: ai.clearExplanation,
                    }}
                    preview={{
                      templateData: templateData!,
                      instance: logic.instance,
                      serverUrl: logic.serverUrl || "",
                      isLoading: logic.containerLoading,
                      error: logic.containerError,
                      writeFileSync: logic.writeFileSync,
                      hasRun: logic.hasRun,
                    } as any}
                  />
                )}
                {mobileView === "preview" && (
                  <iframe
                    src={logic.serverUrl || "about:blank"}
                    className="w-full h-full border-0"
                    title="Preview"
                  />
                )}
                {mobileView === "terminal" && (
                  <div className="h-full bg-[#1e1e1e]">
                    <TerminalComponent ref={terminalRef} webContainerInstance={logic.instance}
                      theme="dark" className="h-full w-full"
                      projectName={playgroundData?.title || "codeforge"}
                      onClose={() => setMobileView("editor")} />
                  </div>
                )}
              </div>

              {/* Bottom nav bar */}
              <div className="border-t bg-background shrink-0 flex items-center justify-around h-12 px-2">
                <button onClick={() => setMobileView("editor")}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${mobileView === "editor" ? "text-purple-500" : "text-muted-foreground"}`}>
                  <Code2 className="w-4 h-4" />
                  <span className="text-[10px]">Editor</span>
                </button>
                <button onClick={() => { setMobileView("preview"); if (!logic.hasRun) logic.handleRun(); }}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${mobileView === "preview" ? "text-purple-500" : "text-muted-foreground"}`}>
                  <Eye className="w-4 h-4" />
                  <span className="text-[10px]">Preview</span>
                </button>
                <button onClick={() => setMobileView("terminal")}
                  className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-lg transition-colors ${mobileView === "terminal" ? "text-purple-500" : "text-muted-foreground"}`}>
                  <TerminalSquare className="w-4 h-4" />
                  <span className="text-[10px]">Terminal</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── AI Chat Panel — full height on desktop, full-screen overlay on mobile ── */}
        {isChatOpen && !isMobile && (
          <div className="shrink-0 h-full flex overflow-hidden" style={{ width: chatWidth }}>
            <div onMouseDown={handleChatMouseDown}
              className="w-1 h-full bg-zinc-800 hover:bg-purple-500/60 cursor-col-resize shrink-0 transition-colors" />
            <div className="flex-1 min-w-0 flex flex-col overflow-hidden border-l border-zinc-800">
              <AIChatSidePanel
                isOpen={true} inline={true}
                onClose={() => setIsChatOpen(false)}
                onInsertCode={(code) => { window.dispatchEvent(new CustomEvent("ai-insert-code", { detail: { code } })); }}
                activeFileName={activeFile ? `${activeFile.filename}.${activeFile.fileExtension}` : undefined}
                activeFileContent={activeFile?.content}
                activeFileLanguage={activeFile?.fileExtension}
              />
            </div>
          </div>
        )}

        {/* Mobile AI chat — full screen overlay */}
        {isChatOpen && isMobile && (
          <div className="fixed inset-0 z-50 bg-[#0d0d10] flex flex-col">
            <AIChatSidePanel
              isOpen={true} inline={true}
              onClose={() => setIsChatOpen(false)}
              onInsertCode={(code) => { window.dispatchEvent(new CustomEvent("ai-insert-code", { detail: { code } })); }}
              activeFileName={activeFile ? `${activeFile.filename}.${activeFile.fileExtension}` : undefined}
              activeFileContent={activeFile?.content}
              activeFileLanguage={activeFile?.fileExtension}
            />
          </div>
        )}
      </SidebarInset>

      <ConfirmationDialog
        isOpen={logic.dialog.isOpen}
        title={logic.dialog.title}
        description={logic.dialog.description}
        onConfirm={logic.dialog.onConfirm}
        onCancel={logic.dialog.onCancel}
        setIsOpen={logic.dialog.setIsOpen}
      />

      <GithubPushModal
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        onPush={handleGitPush}
      />
    </TooltipProvider>
  );
};

export default MainPlaygroundPage;
