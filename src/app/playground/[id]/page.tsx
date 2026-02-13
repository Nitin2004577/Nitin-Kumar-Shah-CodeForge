"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { FileText, X } from "lucide-react";

// Git Imports
import git from "isomorphic-git";
import http from "isomorphic-git/http/web";

// UI Components
import { SidebarInset } from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import LoadingStep from "@/components/ui/loader";

// Feature Components
import { TemplateFileTree } from "@/../features/playground/components/playground-explorer";
import { ConfirmationDialog } from "@/../features/playground/components/dialogs/conformation-dialog";
import { PlaygroundHeader } from "@/../features/playground/components/playground-header";
import { PlaygroundWorkspace } from "@/../features/playground/components/playground-workspace";
import { GithubSettingsModal } from "@/../features/playground/components/github-settings-modal";

// Hooks
import { usePlayground } from "@/../features/playground/hooks/usePlayground";
import { useFileExplorer } from "@/../features/playground/hooks/useFileExplorer";
import { useAISuggestions } from "@/../features/playground/hooks/useAISuggestion";
import { usePlaygroundLogic } from "@/../features/playground/hooks/usePlaygroundLogic";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

const MainPlaygroundPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // 1. Global Stores & Data
  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);
  const explorer = useFileExplorer();
  const ai = useAISuggestions();

  // 2. Local Controller Logic (The "Brain" Hook)
  const logic = usePlaygroundLogic(id, templateData, saveTemplateData);

  // 3. Git & Modal States
  const [isPushing, setIsPushing] = useState(false);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [gitSettings, setGitSettings] = useState({ token: "", repoUrl: "" });

  // 4. Load saved Git settings from browser storage
  useEffect(() => {
    const saved = localStorage.getItem("codeforge_git_settings");
    if (saved) {
      try {
        setGitSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse git settings");
      }
    }
  }, []);

  // 5. Git Logic with FS Shim
  const handlePushToGithub = async () => {
    if (!logic.instance) {
      alert("WebContainer not ready yet.");
      return;
    }

    // If settings are missing, open the modal instead of pushing
    if (!gitSettings.token || !gitSettings.repoUrl) {
      setIsGitModalOpen(true);
      return;
    }

    setIsPushing(true);
    try {
      const dir = "/";
      const wcFs = logic.instance.fs;

      /**
       * Mapping the WebContainer FS to the Node.js FS structure 
       * expected by isomorphic-git.
       */
      const fsShim: any = {
        promises: {
          readFile: wcFs.readFile.bind(wcFs),
          writeFile: wcFs.writeFile.bind(wcFs),
          readdir: wcFs.readdir.bind(wcFs),
          mkdir: wcFs.mkdir.bind(wcFs),
          unlink: wcFs.rm.bind(wcFs),
          rmdir: wcFs.rm.bind(wcFs),
          stat: async (path: string) => {
            const pathParts = path.split('/').filter(Boolean);
            const name = pathParts.pop();
            const parentDir = '/' + pathParts.join('/');
            
            try {
              const entries = await wcFs.readdir(parentDir, { withFileTypes: true });
              const entry = entries.find(e => e.name === name);
              return {
                type: entry?.isDirectory() ? 'dir' : 'file',
                mode: entry?.isDirectory() ? 0o777 : 0o666,
                size: 0,
                ino: 0,
                mtimeMs: Date.now(),
                isDirectory: () => entry?.isDirectory() || false,
                isFile: () => !entry?.isDirectory() || true,
                isSymbolicLink: () => false,
              };
            } catch {
              return { type: 'dir', mode: 0o777, size: 0, isDirectory: () => true, isFile: () => false };
            }
          },
          lstat: async (path: string) => fsShim.promises.stat(path),
        }
      };

      // Git Workflow: Init -> Add -> Commit -> Push
      try { await git.init({ fs: fsShim, dir }); } catch (e) {}
      
      await git.add({ fs: fsShim, dir, filepath: "." });
      
      await git.commit({
        fs: fsShim,
        dir,
        message: `Update from CodeForge IDE: ${new Date().toLocaleString()}`,
        author: { name: "CodeForge User", email: "user@codeforge.dev" },
      });

      await git.push({
        fs: fsShim,
        http,
        dir,
        remote: "origin",
        url: gitSettings.repoUrl,
        onAuth: () => ({ username: gitSettings.token }),
      });

      alert("Successfully pushed to GitHub!");
    } catch (err: any) {
      console.error("Git Push Error:", err);
      // If push fails due to auth, prompt the user to check settings
      if (err.message.includes("401") || err.message.includes("auth")) {
        alert("GitHub Authentication failed. Please check your token.");
        setIsGitModalOpen(true);
      } else {
        alert(`Push failed: ${err.message}`);
      }
    } finally {
      setIsPushing(false);
    }
  };

  // --- Render States ---
  if (error || logic.containerError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4 text-red-500">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p>{error || logic.containerError}</p>
        <Button onClick={() => window.location.reload()} variant="destructive" className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md p-6 rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-center">Loading Playground</h2>
          <LoadingStep currentStep={2} step={2} label="Setting up environment" />
        </div>
      </div>
    );
  }

  if (!templateData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <h2 className="text-xl font-semibold text-amber-600">No template data available</h2>
        <Button onClick={() => window.location.reload()} variant="outline" className="mt-4">
          Reload
        </Button>
      </div>
    );
  }

  const activeFile = explorer.openFiles.find((f) => f.id === explorer.activeFileId);
  const hasUnsaved = explorer.openFiles.some((f) => f.hasUnsavedChanges);

  return (
    <TooltipProvider>
      <TemplateFileTree
        data={templateData}
        onFileSelect={explorer.openFile}
        selectedFile={activeFile}
        title="Explorer"
        onAddFile={logic.actions.handleAddFile}
        onAddFolder={logic.actions.handleAddFolder}
        onDeleteFile={logic.actions.handleDeleteFile}
        onDeleteFolder={logic.actions.handleDeleteFolder}
        onRenameFile={logic.actions.handleRenameFile}
        onRenameFolder={logic.actions.handleRenameFolder}
      />

      <SidebarInset className="min-w-0 overflow-hidden">
       <PlaygroundHeader
  title={playgroundData?.name || "Code Playground"}
  openFilesCount={explorer.openFiles.length}
  hasUnsavedChanges={hasUnsaved}
  canSave={!!activeFile && activeFile.hasUnsavedChanges}
  onSave={() => logic.actions.handleSave()}
  onSaveAll={logic.actions.handleSaveAll}
  onTogglePreview={() => logic.setIsPreviewVisible(!logic.isPreviewVisible)}
  isPreviewVisible={logic.isPreviewVisible}
  onCloseAll={explorer.closeAllFiles}
  onPushToGithub={handlePushToGithub}
  onOpenGitSettings={() => setIsGitModalOpen(true)} // <-- Pass the trigger here
  isPushing={isPushing}
  aiProps={{
    isEnabled: ai.isEnabled,
    onToggle: ai.toggleEnabled,
    isLoading: ai.isLoading,
  }}
/>

        <div className="h-[calc(100vh-4rem)] flex flex-col min-w-0 overflow-hidden">
          {explorer.openFiles.length > 0 && (
            <div className="bg-[#18181B] border-b border-zinc-800 flex items-center w-full min-w-0 max-w-full h-9 overflow-hidden shrink-0">
              <Tabs value={explorer.activeFileId || ""} onValueChange={explorer.setActiveFileId} className="w-full h-full min-w-0 max-w-full">
                <TabsList className="h-full w-full justify-start bg-transparent p-0 border-none rounded-none flex flex-nowrap overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {explorer.openFiles.map((file) => (
                    <ContextMenu key={file.id}>
                      <ContextMenuTrigger asChild>
                        <TabsTrigger
                          value={file.id}
                          className="relative h-9 px-3 bg-[#18181B] text-zinc-400 data-[state=active]:bg-[#1E1E1E] data-[state=active]:text-white rounded-none border-r border-zinc-800 border-t-2 border-t-transparent data-[state=active]:border-t-[#007acc] shadow-none min-w-[120px] max-w-[220px] flex items-center justify-between group cursor-pointer transition-none shrink-0"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" />
                            <span className="truncate text-[13px] font-sans tracking-wide mt-[1px]">
                              {file.filename}.{file.fileExtension}
                            </span>
                            {file.hasUnsavedChanges && <span className="h-2 w-2 rounded-full bg-white opacity-80 shrink-0 ml-1" />}
                          </div>
                          <span
                            className="ml-2 h-5 w-5 rounded-md hover:bg-zinc-700 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-zinc-400 hover:text-white shrink-0"
                            onClick={(e) => { e.stopPropagation(); explorer.closeFile(file.id); }}
                          >
                            <X className="h-3.5 w-3.5" />
                          </span>
                        </TabsTrigger>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="bg-[#1e1e1e] border-zinc-800 text-zinc-300 shadow-xl w-48 rounded-md">
                        <ContextMenuItem onClick={() => explorer.closeFile(file.id)} className="text-xs cursor-pointer focus:bg-[#007acc] focus:text-white">Close</ContextMenuItem>
                        {explorer.openFiles.length > 1 && (
                          <>
                            <ContextMenuItem
                              onClick={() => {
                                explorer.openFiles.forEach((f) => { if (f.id !== file.id) explorer.closeFile(f.id); });
                                explorer.setActiveFileId(file.id);
                              }}
                              className="text-xs cursor-pointer focus:bg-[#007acc] focus:text-white"
                            >Close Others</ContextMenuItem>
                            <ContextMenuSeparator className="bg-zinc-800" />
                            <ContextMenuItem onClick={explorer.closeAllFiles} className="text-xs cursor-pointer text-red-400 focus:bg-red-500/20 focus:text-red-400">Close All</ContextMenuItem>
                          </>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          )}
          <PlaygroundWorkspace
            activeFile={activeFile}
            isPreviewVisible={logic.isPreviewVisible}
            onContentChange={(val) => { if (explorer.activeFileId) explorer.updateFileContent(explorer.activeFileId, val || ""); }}
            ai={{
              suggestion: ai.suggestion || "",
              isLoading: ai.isLoading,
              position: ai.position || { line: 0, column: 0 },
              onAccept: ai.acceptSuggestion,
              onReject: ai.rejectSuggestion,
              onTrigger: ai.fetchSuggestion,
            }}
            preview={{
              templateData: templateData!,
              instance: logic.instance,
              serverUrl: logic.serverUrl || "",
              isLoading: logic.containerLoading,
              error: logic.containerError,
              writeFileSync: logic.writeFileSync,
            }}
          />
        </div>
      </SidebarInset>

      {/* Git Settings Modal */}
      <GithubSettingsModal 
        isOpen={isGitModalOpen}
        onClose={() => setIsGitModalOpen(false)}
        initialSettings={gitSettings}
        onSave={(settings) => {
          setGitSettings(settings);
          localStorage.setItem("codeforge_git_settings", JSON.stringify(settings));
        }}
      />

      <ConfirmationDialog
        isOpen={logic.dialog.isOpen}
        title={logic.dialog.title}
        description={logic.dialog.description}
        onConfirm={logic.dialog.onConfirm}
        onCancel={logic.dialog.onCancel}
        setIsOpen={logic.dialog.setIsOpen}
      />
    </TooltipProvider>
  );
};

export default MainPlaygroundPage;