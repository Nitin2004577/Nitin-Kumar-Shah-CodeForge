"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
// 🚨 FIX 1: Import useRouter
import { useParams, useRouter } from "next/navigation";
import { FileText, X, TerminalSquare, GripHorizontal } from "lucide-react";
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

  const handleGitPush = async (repoFullName: string, commitMessage: string) => {
    setIsPushing(true);
    try {
      const filesToPush: Record<string, string> = {};

      if (templateData) {
        console.log("DEBUG: templateData structure:", templateData);

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

      const result = await response.json();
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
      <TemplateFileTree
        data={templateData}
        onFileSelect={(file: any) => explorer.openFile(file)}
        selectedFile={activeFile as any}
        title="Explorer"
        onAddFile={(...args: any[]) =>
          (logic.actions.handleAddFile as any)(...args)
        }
        onAddFolder={(...args: any[]) =>
          (logic.actions.handleAddFolder as any)(...args)
        }
        onDeleteFile={(...args: any[]) =>
          (logic.actions.handleDeleteFile as any)(...args)
        }
        onDeleteFolder={(...args: any[]) =>
          (logic.actions.handleDeleteFolder as any)(...args)
        }
        onRenameFile={(...args: any[]) =>
          (logic.actions.handleRenameFile as any)(...args)
        }
        onRenameFolder={(...args: any[]) =>
          (logic.actions.handleRenameFolder as any)(...args)
        }
      />

      <SidebarInset>
        <PlaygroundHeader
          title={playgroundData?.name || "Code Playground"}
          openFilesCount={explorer.openFiles.length}
          hasUnsavedChanges={hasUnsaved}
          canSave={!!activeFile && activeFile.hasUnsavedChanges}
          onSave={() => logic.actions.handleSave()}
          onSaveAll={logic.actions.handleSaveAll}
          onTogglePreview={() =>
            logic.setIsPreviewVisible(!logic.isPreviewVisible)
          }
          isPreviewVisible={logic.isPreviewVisible}
          onCloseAll={explorer.closeAllFiles}
          onGitPush={() => setIsGitModalOpen(true)}
          isPushing={isPushing}
          aiProps={
            {
              isEnabled: ai.isEnabled,
              onToggle: ai.toggleEnabled as any,
              isLoading: ai.isLoading,
            } as any
          }
        />

        {/* 🚨 This prevents iframes from eating mouse events during a drag! */}
        {isDragging && <div className="fixed inset-0 z-50 cursor-row-resize" />}

        <div className="h-[calc(100vh-4rem)] flex flex-col">
          {/* ✨ FIX 1: TABS AREA - Added min-w-0 to the tabs side to prevent squishing the buttons ✨ */}
          <div className="border-b bg-muted/30 shrink-0 flex items-center justify-between gap-2 pr-2">
            {/* The actual Tabs block - strictly constrained to available space */}
            <div className="flex-1 min-w-0">
              <Tabs
                value={explorer.activeFileId || ""}
                onValueChange={explorer.setActiveFileId}
                className="w-full"
              >
                <div className="flex items-center px-4 py-2">
                  <TabsList className="h-8 bg-transparent p-0 flex flex-nowrap overflow-x-auto no-scrollbar justify-start w-full">
                    {explorer.openFiles.map((file) => (
                      <TabsTrigger
                        key={file.id}
                        value={file.id}
                        className="relative h-8 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm group border-r border-transparent data-[state=active]:border-border/50 min-w-[100px]"
                      >
                        <div className="flex items-center gap-2 max-w-[200px]">
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {file.filename}.{file.fileExtension}
                          </span>
                          {file.hasUnsavedChanges && (
                            <span className="h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                          )}
                          <span
                            className="ml-1 h-4 w-4 hover:bg-destructive hover:text-destructive-foreground rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              explorer.closeFile(file.id);
                            }}
                          >
                            <X className="h-3 w-3" />
                          </span>
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>
              </Tabs>
            </div>

            {/* ✨ Fixed Action Buttons (Will never be pushed off screen now!) ✨ */}
            <div className="flex items-center gap-2 shrink-0 py-2">
              <Button
                size="sm"
                variant={isTerminalVisible ? "secondary" : "default"}
                onClick={() => setIsTerminalVisible(!isTerminalVisible)}
                className="h-6 px-2 text-xs shrink-0"
              >
                <TerminalSquare className="w-3 h-3 mr-1.5" />
                {isTerminalVisible ? "Hide Terminal" : "Terminal"}
              </Button>

              {explorer.openFiles.length > 1 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={explorer.closeAllFiles}
                  className="h-6 px-2 text-xs shrink-0"
                >
                  Close All
                </Button>
              )}
            </div>
          </div>

          {/* WORKSPACE AREA */}
          <div className="flex-1 min-h-0 flex flex-col">
            <PlaygroundWorkspace
              activeFile={activeFile}
              isPreviewVisible={logic.isPreviewVisible}
              onContentChange={(val) => {
                if (activeFile?.id) {
                  explorer.updateFileContent(activeFile.id, val || "");
                }
              }}
              ai={{
                suggestion: ai.suggestion || "",
                isLoading: ai.isLoading,
                position: ai.position || { line: 0, column: 0 },
                onAccept: ai.acceptSuggestion,
                onReject: ai.rejectSuggestion,
                onTrigger: ai.fetchSuggestion,
                // ✨ ADD THESE TWO NEW LINES HERE ✨
                explanationData: ai.explanationData,
                clearExplanation: ai.clearExplanation,
              }}
              preview={
                {
                  templateData: templateData!,
                  instance: logic.instance,
                  serverUrl: logic.serverUrl || "",
                  isLoading: logic.containerLoading,
                  error: logic.containerError,
                  writeFileSync: logic.writeFileSync,
                  terminalRef: terminalRef,
                } as any
              }
            />
          </div>

          {/* DRAGGABLE RESIZER HANDLE */}
          {isTerminalVisible && (
            <div
              onMouseDown={handleMouseDown}
              className="h-1.5 bg-border hover:bg-blue-500/50 cursor-row-resize shrink-0 flex items-center justify-center transition-colors group z-10"
            >
              <div className="w-12 h-1 rounded-full bg-transparent group-hover:bg-blue-500/80 transition-colors flex items-center justify-center">
                <GripHorizontal className="w-4 h-4 text-blue-100 opacity-0 group-hover:opacity-100" />
              </div>
            </div>
          )}

          {/* TERMINAL CONTAINER */}
          {isTerminalVisible && (
            <div
              style={{ height: `${terminalHeight}px` }}
              className="border-t border-border shrink-0 bg-[#1e1e1e] flex flex-col"
            >
              {/* ✨ FIX 2: Removed the redundant custom header. Only the internal TerminalComponent will show now! */}
              <div className="flex-1 min-h-0">
                <TerminalComponent
                  ref={terminalRef}
                  webContainerInstance={logic.instance}
                  theme="dark"
                  className="h-full w-full"
                  onClose={() => setIsTerminalVisible(false)} // ✨ Passed onClose just in case your internal terminal component supports it!
                />
              </div>
            </div>
          )}
        </div>
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
