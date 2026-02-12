import React, { useRef } from "react";
import dynamic from "next/dynamic"; // ✅ Needed for Terminal
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

// ✅ Import Terminal Dynamically (Same as before, but now here)
const TerminalComponent = dynamic(
  () => import("@/../features/webcontianers/components/terminal"), 
  { ssr: false, loading: () => <div className="h-full bg-[#1e1e1e]" /> }
);

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
  };
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
  // ✅ Create a Ref for the terminal to share between UI and Logic
  const terminalRef = useRef<any>(null);

  if (!activeFile) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-4 bg-muted/10">
        <FileText className="h-16 w-16 text-muted-foreground/30" />
        <div className="text-center">
          <p className="text-lg font-medium text-foreground">No files open</p>
          <p className="text-sm text-muted-foreground">Select a file to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-hidden h-full">
      {/* 1. OUTER SPLIT: Top (Editor/Preview) vs Bottom (Terminal) */}
      <ResizablePanelGroup direction="vertical" className="h-full">
        
        {/* --- TOP AREA: EDITOR & PREVIEW --- */}
        <ResizablePanel defaultSize={75} minSize={30}>
          <ResizablePanelGroup direction="horizontal" className="h-full">
            
            {/* Editor (Left) */}
            <ResizablePanel defaultSize={isPreviewVisible ? 50 : 100} minSize={20} className="bg-background">
              <PlaygroundEditor
                activeFile={activeFile}
                content={activeFile.content || ""}
                onContentChange={onContentChange}
                suggestion={ai.suggestion}
                suggestionLoading={ai.isLoading}
                suggestionPosition={ai.position}
                onAcceptSuggestion={ai.onAccept}
                onRejectSuggestion={ai.onReject}
                onTriggerSuggestion={ai.onTrigger}
              />
            </ResizablePanel>

            {/* Preview (Right) - Only visible if isPreviewVisible is true */}
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
                    serverUrl={preview.serverUrl || ""}
                    forceResetup={false}
                    // ✅ Pass the ref so the logic here can log to the bottom terminal
                    terminalRef={terminalRef}
                  />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </ResizablePanel>

        {/* --- BOTTOM AREA: TERMINAL --- */}
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={25} minSize={10} maxSize={50} className="bg-[#1e1e1e]">
             <TerminalComponent 
                ref={terminalRef}
                webContainerInstance={preview.instance}
                theme="dark"
                className="h-full"
                // Optional: You can handle close logic here if you want a close button
                onClose={() => {}} 
             />
        </ResizablePanel>

      </ResizablePanelGroup>
    </div>
  );
};