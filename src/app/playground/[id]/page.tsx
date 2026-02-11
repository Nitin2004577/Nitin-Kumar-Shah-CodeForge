"use client";

import React from "react";
import { useParams } from "next/navigation";
import { FileText, X } from "lucide-react";

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

// Hooks
import { usePlayground } from "@/../features/playground/hooks/usePlayground";
import { useFileExplorer } from "@/../features/playground/hooks/useFileExplorer";
import { useAISuggestions } from "@/../features/playground/hooks/useAISuggestion";
import { usePlaygroundLogic } from "@/../features/playground/hooks/usePlaygroundLogic";

const MainPlaygroundPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // 1. Global Stores & Data
  const { playgroundData, templateData, isLoading, error, saveTemplateData } =
    usePlayground(id);
  const explorer = useFileExplorer();
  const ai = useAISuggestions();

  // 2. Local Controller Logic (The "Brain" Hook)
  const logic = usePlaygroundLogic(id, templateData, saveTemplateData);

  // --- Render States ---
  if (error || logic.containerError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4 text-red-500">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p>{error || logic.containerError}</p>
        <Button
          onClick={() => window.location.reload()}
          variant="destructive"
          className="mt-4"
        >
          Try Again
        </Button>
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

  // Derived State
  const activeFile = explorer.openFiles.find(
    (f) => f.id === explorer.activeFileId
  );
  const hasUnsaved = explorer.openFiles.some((f) => f.hasUnsavedChanges);

  return (
    <TooltipProvider>
      {/* 1. Sidebar: File Explorer */}
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

      <SidebarInset>
        {/* 2. Header */}
        <PlaygroundHeader
          title={playgroundData?.name || "Code Playground"}
          openFilesCount={explorer.openFiles.length}
          hasUnsavedChanges={hasUnsaved}
          canSave={!!activeFile && activeFile.hasUnsavedChanges}
          // FIXED: Access handleSave via logic.actions
          onSave={() => logic.actions.handleSave()}
          onSaveAll={logic.actions.handleSaveAll}
          onTogglePreview={() =>
            logic.setIsPreviewVisible(!logic.isPreviewVisible)
          }
          isPreviewVisible={logic.isPreviewVisible}
          onCloseAll={explorer.closeAllFiles}
          aiProps={{
            isEnabled: ai.isEnabled,
            onToggle: ai.toggleEnabled,
            isLoading: ai.isLoading,
          }}
        />

        <div className="h-[calc(100vh-4rem)] flex flex-col">
          {/* 3. File Tabs Area */}
          {explorer.openFiles.length > 0 && (
            <div className="border-b bg-muted/30 shrink-0">
              <Tabs
                value={explorer.activeFileId || ""}
                onValueChange={explorer.setActiveFileId}
              >
                <div className="flex items-center justify-between px-4 py-2">
                  <TabsList className="h-8 bg-transparent p-0 flex flex-nowrap overflow-x-auto no-scrollbar">
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

                  {explorer.openFiles.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={explorer.closeAllFiles}
                      className="h-6 px-2 text-xs ml-2 shrink-0"
                    >
                      Close All
                    </Button>
                  )}
                </div>
              </Tabs>
            </div>
          )}

          {/* 4. Main Workspace (Editor + Preview) */}
          <PlaygroundWorkspace
            activeFile={activeFile}
            isPreviewVisible={logic.isPreviewVisible}
            onContentChange={(val) => {
              if (explorer.activeFileId) {
                explorer.updateFileContent(explorer.activeFileId, val || "");
              }
            }}
            ai={{
              // FIXED: Convert 'null' to empty string to satisfy type 'string'
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

      {/* 5. Dialogs */}
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
