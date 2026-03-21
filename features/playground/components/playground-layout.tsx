"use client"

import { usePlaygroundContext } from "../context/playground-context"
import { AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadingStep } from "@/components/ui/loader"
import { PlaygroundHeader } from "./playground-header"
import { PlaygroundWorkspace } from "./playground-workspace" // ✨ Import the workspace

export function PlaygroundLayout() {
  // Pull everything we need from our unified Context
  const { 
    error, 
    loadingStep, 
    templateData, 
    playgroundData,
    explorer, 
    ai, 
    logic 
  } = usePlaygroundContext()

  // --- Error State ---
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={() => window.location.reload()} variant="destructive">
          Try Again
        </Button>
      </div>
    )
  }

  // --- Loading State ---
  if (loadingStep < 3 || !templateData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <div className="w-full max-w-md p-6 rounded-lg shadow-sm border">
          <h2 className="text-xl font-semibold mb-6 text-center">Loading Playground</h2>
          <div className="mb-8">
            <LoadingStep currentStep={loadingStep} step={1} label="Loading playground metadata" />
            <LoadingStep currentStep={loadingStep} step={2} label="Loading template structure" />
            <LoadingStep currentStep={loadingStep} step={3} label="Ready to explore" />
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-secondary">
            <div
              className="bg-primary h-full transition-all duration-300 ease-in-out"
              style={{ width: `${(loadingStep / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  // --- Main IDE Render ---
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 1. Header is now fully powered by Context data */}
      <PlaygroundHeader 
        title={playgroundData?.name || "Code Playground"}
        openFilesCount={explorer.openFiles.length}
        hasUnsavedChanges={explorer.openFiles.some((f: any) => f.hasUnsavedChanges)}
        canSave={!!explorer.activeFileId} 
        onSave={() => logic.actions.handleSave()}
        onSaveAll={logic.actions.handleSaveAll}
        onTogglePreview={() => logic.setIsPreviewVisible(!logic.isPreviewVisible)}
        isPreviewVisible={logic.isPreviewVisible}
        onCloseAll={explorer.closeAllFiles}
        onGitPush={() => {}} // You can add your modal logic here
        isPushing={false}
        aiProps={{
          isEnabled: ai.isEnabled,
          onToggle: ai.toggleEnabled as any,
          isLoading: ai.isLoading,
        } as any}
      />

      {/* 2. Main Workspace Area */}
      <div className="flex-1 min-h-0 flex flex-col">
        <PlaygroundWorkspace
          activeFile={explorer.openFiles?.find((f: any) => f.id === explorer.activeFileId)}
          isPreviewVisible={logic.isPreviewVisible}
          onContentChange={(val) => {
            if (explorer.activeFileId) {
              explorer.updateFileContent(explorer.activeFileId, val || "");
            }
          }}
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
            templateData: templateData,
            instance: logic.instance,
            serverUrl: logic.serverUrl || "",
            isLoading: logic.containerLoading,
            error: logic.containerError,
            writeFileSync: logic.writeFileSync,
          } as any}
        />
      </div>
    </div>
  )
}