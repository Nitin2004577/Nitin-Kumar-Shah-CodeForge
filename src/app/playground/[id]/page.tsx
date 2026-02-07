"use client";

import React, { useState, useCallback } from "react";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { TemplateFileTree } from "@/../../features/playground/components/playground-explorer";
import type { TemplateFile } from "@/../../features/playground/lib/path-to-json";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  FileText,
  FolderOpen,
  AlertCircle,
  Save,
  X,
  Settings,
  Loader2, // Added for a standard loading spinner
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlayground } from "@/../features/playground/hooks/usePlayground";
import { ConfirmationDialog } from "@/../../features/playground/components/dialogs/conformation-dialog";

const MainPlaygroundPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  // UI state
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  // Local state stubs
  const [openFiles, setOpenFiles] = useState<any[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);

  // Custom hook to load initial data
  const { playgroundData, templateData, isLoading, error } = usePlayground(id);

  const activeFile = openFiles.find((file) => file.id === activeFileId);

  const handleFileSelect = (file: TemplateFile) => {
    console.log("File selected:", file);
  };

  const handleSave = useCallback(async () => {
    if (!activeFileId) return;
    toast.success("Save triggered");
  }, [activeFileId]);

  // ERROR BOUNDARY: Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
      </div>
    );
  }

  // LOADING STATE: Replaced LoadingStep with a standard Spinner
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Loading Playground...</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen overflow-hidden">
        <TemplateFileTree
          data={templateData}
          onFileSelect={handleFileSelect}
          selectedFile={activeFile}
          title="File Explorer"
        />

        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-1 items-center gap-2">
              <div className="flex flex-col flex-1">
                <h1 className="text-sm font-medium">{playgroundData?.name || "Code Playground"}</h1>
                <p className="text-xs text-muted-foreground">
                  {openFiles.length} file(s) open
                </p>
              </div>

              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSave}
                      disabled={!activeFile}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-hidden flex flex-col">
            {openFiles.length > 0 ? (
              <>
                <div className="border-b bg-muted/30">
                  <Tabs value={activeFileId || ""} onValueChange={setActiveFileId}>
                    <div className="flex items-center px-4 py-2">
                      <TabsList className="h-8 bg-transparent p-0">
                        {openFiles.map((file) => (
                          <TabsTrigger
                            key={file.id}
                            value={file.id}
                            className="relative h-8 px-3 data-[state=active]:bg-background group"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-3 w-3" />
                              <span>{file.filename}.{file.fileExtension}</span>
                              <X className="h-3 w-3 ml-2 opacity-50 hover:opacity-100 cursor-pointer" />
                            </div>
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </div>
                  </Tabs>
                </div>

                <div className="flex-1 p-6 bg-slate-50 overflow-auto font-mono text-sm">
                   <div className="p-4 border rounded bg-white shadow-sm">
                      <p className="text-slate-400 mb-2 border-b pb-2">// File View Placeholder</p>
                      <pre>{activeFile?.content || "No content available"}</pre>
                   </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full items-center justify-center text-muted-foreground gap-4">
                <FolderOpen className="h-16 w-16 text-gray-300" />
                <div className="text-center">
                  <p className="text-lg font-medium">No files open</p>
                  <p className="text-sm text-gray-500">Select a file from the sidebar</p>
                </div>
              </div>
            )}
          </main>
        </SidebarInset>

        <ConfirmationDialog
          isOpen={confirmationDialog.isOpen}
          title={confirmationDialog.title}
          description={confirmationDialog.description}
          onConfirm={confirmationDialog.onConfirm}
          onCancel={confirmationDialog.onCancel}
          setIsOpen={(open) => setConfirmationDialog((prev) => ({ ...prev, isOpen: open }))}
        />
      </div>
    </TooltipProvider>
  );
};

export default MainPlaygroundPage;