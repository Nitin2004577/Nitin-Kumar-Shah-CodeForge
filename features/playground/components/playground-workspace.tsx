"use client";
import React, { useEffect, useRef } from "react";
import { FileText } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

import { PlaygroundEditor } from "@/../features/playground/components/playground-editor";
import WebContainerPreview from "@/../features/webcontianers/components/webcontainer-preveiw";
import { TemplateFile } from "@/../features/playground/types";
import { WebContainer } from "@webcontainer/api";

interface PlaygroundWorkspaceProps {
  activeFile?: TemplateFile | undefined;
  isPreviewVisible: boolean;
  onContentChange: (value: string | undefined) => void;
  ai: {
    suggestion: string;
    isLoading: boolean;
    position: { line: number; column: number };
    onAccept: (editor: any, monaco: any) => void;
    onReject: (editor: any) => void;
    onTrigger: (type: string, editor: any) => void;
    explanationData?: {
      text: string;
      type: string;
      position: { line: number; column: number };
    } | null;
    clearExplanation?: () => void;
  };
  preview: {
    templateData: any;
    instance: WebContainer | null;
    serverUrl: string | null;
    isLoading: boolean;
    error: string | null;
    writeFileSync?: (path: string, content: string) => Promise<void>;
    hasRun?: boolean;
  };
}

export const PlaygroundWorkspace: React.FC<PlaygroundWorkspaceProps> = ({
  activeFile,
  isPreviewVisible,
  onContentChange,
  ai,
  preview,
}) => {
  const lastLoadedFileId = useRef<string | null>(null);

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
    if (activeFile && activeFile.id !== lastLoadedFileId.current) {
      // FIX: Include the extension in the storage key to avoid collisions
      const fullPath = `${activeFile.filename}.${activeFile.fileExtension}`;
      const savedContent = localStorage.getItem(`file-storage-${fullPath}`);

      if (savedContent && savedContent !== activeFile.content) {
        onContentChange(savedContent);
      }

      lastLoadedFileId.current = activeFile.id;
    }
  }, [
    activeFile?.id,
    activeFile?.filename,
    activeFile?.fileExtension,
    onContentChange,
  ]);

  const handleSave = async (newContent: string) => {
    if (!activeFile || !preview.writeFileSync) return;

    try {
      // FIX: WebContainer MUST have the extension to bundle correctly
      const fullPath = `${activeFile.filename}.${activeFile.fileExtension}`;

      // 1. Write to WebContainer
      await preview.writeFileSync(fullPath, newContent);

      // 2. Persist to LocalStorage using the full path
      localStorage.setItem(`file-storage-${fullPath}`, newContent);

      console.log(`🚀 Sync Successful: ${fullPath}`);
    } catch (err) {
      console.error("❌ Save failed:", err);
    }
  };

  if (!activeFile) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-4 bg-muted/10">
        <FileText className="h-16 w-16 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">No files open</p>
          <p className="text-sm text-muted-foreground">
            Select a file to start
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel
          defaultSize={isPreviewVisible ? 50 : 100}
          minSize={20}
          className="bg-background"
        >
          <PlaygroundEditor
            activeFile={activeFile}
            content={activeFile.content || ""}
            onContentChange={onContentChange}
            onSave={handleSave}
            suggestion={ai.suggestion}
            suggestionLoading={ai.isLoading}
            suggestionPosition={ai.position}
            onAcceptSuggestion={ai.onAccept}
            onRejectSuggestion={ai.onReject}
            onTriggerSuggestion={ai.onTrigger}
            explanationData={ai.explanationData || null}
            clearExplanation={ai.clearExplanation || (() => {})}
          />
        </ResizablePanel>

        {isPreviewVisible && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={20}>
              {/* 🚨 THE FIX: "about:blank" kills the infinite loop 🚨 */}
              <WebContainerPreview
                templateData={preview.templateData}
                instance={preview.instance}
                writeFileSync={preview.writeFileSync || (async () => {})}
                isLoading={preview.isLoading}
                error={preview.error}
                serverUrl={preview.serverUrl || "about:blank"}
                forceResetup={false}
                hasRun={preview.hasRun}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};