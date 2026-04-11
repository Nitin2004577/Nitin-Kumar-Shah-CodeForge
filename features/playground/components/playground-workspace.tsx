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
import { AIChatSidePanel } from "@/../features/ai-chat/components/ai-chat-sidepanel";
import { TemplateFile } from "@/../features/playground/types";
import { WebContainer } from "@webcontainer/api";

interface PlaygroundWorkspaceProps {
  activeFile?: TemplateFile | undefined;
  isPreviewVisible: boolean;
  isChatOpen?: boolean;
  onChatClose?: () => void;
  onContentChange: (value: string | undefined) => void;
  editorRef?: React.MutableRefObject<any>;
  monacoRef?: React.MutableRefObject<any>;
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
  isChatOpen = false,
  onChatClose,
  onContentChange,
  editorRef: externalEditorRef,
  monacoRef: externalMonacoRef,
  ai,
  preview,
}) => {
  const lastLoadedFileId = useRef<string | null>(null);
  const internalEditorRef = useRef<any>(null);
  const internalMonacoRef = useRef<any>(null);
  const editorRef = externalEditorRef ?? internalEditorRef;
  const monacoRef = externalMonacoRef ?? internalMonacoRef;
  const liveWriteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- PERSISTENCE LOGIC ---
  useEffect(() => {
    if (activeFile && activeFile.id !== lastLoadedFileId.current) {
      const fullPath = `${activeFile.filename}.${activeFile.fileExtension}`;
      const savedContent = localStorage.getItem(`file-storage-${fullPath}`);
      if (savedContent && savedContent !== activeFile.content) {
        onContentChange(savedContent);
      }
      lastLoadedFileId.current = activeFile.id;
    }
  }, [activeFile?.id, activeFile?.filename, activeFile?.fileExtension, onContentChange]);

  // Debounced live write — pushes every edit to WebContainer after 300ms idle
  // This triggers Vite/webpack HMR without waiting for Ctrl+S
  const handleLiveWrite = (newContent: string) => {
    if (!activeFile || !preview.writeFileSync) return;
    if (liveWriteTimer.current) clearTimeout(liveWriteTimer.current);
    liveWriteTimer.current = setTimeout(async () => {
      try {
        const fullPath = `${activeFile.filename}.${activeFile.fileExtension}`;
        await preview.writeFileSync!(fullPath, newContent);
      } catch (err) {
        // Silent — live write failures shouldn't interrupt editing
      }
    }, 300);
  };

  const handleSave = async (newContent: string) => {
    if (!activeFile || !preview.writeFileSync) return;
    // Cancel any pending live write — save is immediate
    if (liveWriteTimer.current) clearTimeout(liveWriteTimer.current);
    try {
      const fullPath = `${activeFile.filename}.${activeFile.fileExtension}`;
      await preview.writeFileSync(fullPath, newContent);
      localStorage.setItem(`file-storage-${fullPath}`, newContent);
    } catch (err) {
      console.error("❌ Save failed:", err);
    }
  };

  const handleInsertCode = (code: string) => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const position = editor.getPosition();
    if (!position) return;
    editor.executeEdits("ai-insert", [
      {
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
        text: code,
        forceMoveMarkers: true,
      },
    ]);
    editor.focus();
  };

  // Keep a ref to handleInsertCode so the event listener always calls the latest version
  const handleInsertCodeRef = useRef(handleInsertCode);
  useEffect(() => { handleInsertCodeRef.current = handleInsertCode; });

  useEffect(() => {
    const handler = (e: Event) => {
      const code = (e as CustomEvent).detail?.code;
      if (code) handleInsertCodeRef.current(code);
    };
    window.addEventListener("ai-insert-code", handler);
    return () => {
      window.removeEventListener("ai-insert-code", handler);
      if (liveWriteTimer.current) clearTimeout(liveWriteTimer.current);
    };
  }, []);

  const activeFileName = activeFile
    ? `${activeFile.filename}.${activeFile.fileExtension}`
    : undefined;

  return (
    <div className="flex-1 overflow-hidden h-full flex">
      {/* Main editor + preview area */}
      <div className="flex-1 overflow-hidden">
        {!activeFile ? (
          <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-4 bg-muted/10">
            <FileText className="h-16 w-16 text-muted-foreground/30" />
            <div className="text-center">
              <p className="text-lg font-medium text-foreground">No files open</p>
              <p className="text-sm text-muted-foreground">
                Select a file to start
              </p>
            </div>
          </div>
        ) : (
          <ResizablePanelGroup direction="horizontal" className="h-full">
            <ResizablePanel
              defaultSize={isPreviewVisible ? 50 : 100}
              minSize={20}
              className="bg-background"
            >
              <PlaygroundEditor
                activeFile={activeFile}
                content={activeFile.content || ""}
                onContentChange={(val) => {
                  onContentChange(val);
                  handleLiveWrite(val || "");
                }}
                onSave={handleSave}
                onEditorMount={(editor: any, monaco: any) => {
                  editorRef.current = editor;
                  monacoRef.current = monaco;
                }}
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
        )}
      </div>

      {/* Inline AI Chat Panel — always available regardless of open file */}
      {isChatOpen && (
        <div className="w-[380px] shrink-0 border-l border-zinc-800 flex flex-col overflow-hidden">
          <AIChatSidePanel
            isOpen={true}
            inline={true}
            onClose={onChatClose || (() => {})}
            onInsertCode={handleInsertCode}
            activeFileName={activeFileName}
            activeFileContent={activeFile?.content || ""}
            activeFileLanguage={activeFile?.fileExtension || ""}
            theme="dark"
          />
        </div>
      )}
    </div>
  );
};