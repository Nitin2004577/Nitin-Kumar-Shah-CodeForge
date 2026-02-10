import React from "react";
import { FileText } from "lucide-react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

// Feature Components
// (Fixed relative imports based on your error log)
import { PlaygroundEditor } from "@/../features/playground/components/playground-editor";
import WebContainerPreview from "@/../features/webcontianers/components/webcontainer-preveiw";

// Types
import { TemplateFile } from "@/../features/playground/types";
import { WebContainer } from "@webcontainer/api";

interface PlaygroundWorkspaceProps {
  // File State
  activeFile?: TemplateFile | undefined;
  
  // Layout State
  isPreviewVisible: boolean;

  // Editor Actions
  onContentChange: (value: string | undefined) => void;
  
  // AI Props
  ai: {
    suggestion: string;
    isLoading: boolean;
    // FIXED: Changed to line/column to match PlaygroundEditor expectations
    position: { line: number; column: number }; 
    onAccept: (editor: any, monaco: any) => void;
    onReject: (editor: any) => void;
    onTrigger: (type: string, editor: any) => void;
  };

  // Preview / WebContainer Props
  preview: {
    templateData: any;
    instance: WebContainer | null;
    serverUrl: string | null;
    isLoading: boolean;
    error: string | null;
    writeFileSync?: (path: string, content: string) => Promise<void>;
  };
}

export const PlaygroundWorkspace: React.FC<PlaygroundWorkspaceProps> = ({
  activeFile,
  isPreviewVisible,
  onContentChange,
  ai,
  preview,
}) => {
  // 1. Empty State (No file selected)
  if (!activeFile) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-4 bg-muted/10">
        <FileText className="h-16 w-16 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">No files open</p>
          <p className="text-sm text-muted-foreground">
            Select a file from the sidebar to start editing
          </p>
        </div>
      </div>
    );
  }

  // 2. Active Workspace
  return (
    <div className="flex-1 overflow-hidden h-full">
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* --- LEFT PANEL: EDITOR --- */}
        <ResizablePanel 
          defaultSize={isPreviewVisible ? 50 : 100} 
          minSize={20}
          className="bg-background"
        >
          <PlaygroundEditor
            activeFile={activeFile}
            content={activeFile.content || ""}
            onContentChange={onContentChange}
            // AI Integration
            suggestion={ai.suggestion}
            suggestionLoading={ai.isLoading}
            suggestionPosition={ai.position}
            onAcceptSuggestion={ai.onAccept}
            onRejectSuggestion={ai.onReject}
            onTriggerSuggestion={ai.onTrigger}
          />
        </ResizablePanel>

        {/* --- RIGHT PANEL: PREVIEW --- */}
        {isPreviewVisible && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={50} minSize={20}>
              <WebContainerPreview
                templateData={preview.templateData}
                instance={preview.instance}
                // FIXED: Provide a fallback function if writeFileSync is undefined
                writeFileSync={preview.writeFileSync || (async () => {})}
                isLoading={preview.isLoading}
                error={preview.error}
                serverUrl={preview.serverUrl || ""}
                forceResetup={false}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </div>
  );
};