"use client"

import { usePlayground } from "../context/playground-context"
import { AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LoadingStep } from "@/components/ui/loader"
// import { PlaygroundEditor } from "./playground-editor" // Uncomment when ready
import { PlaygroundHeader } from "./playground-header"
import { useFileExplorer } from "../hooks/useFileExplorer" // Adjust paths as needed
import { useAISuggestions } from "../hooks/useAISuggestion"

export function PlaygroundLayout() {
  const { error, loadingStep, templateData, playgroundData, fetchPlaygroundData } = usePlayground()
  
  // Pull the state needed for the Header
  const explorer = useFileExplorer()
  const ai = useAISuggestions()

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-red-600 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchPlaygroundData} variant="destructive">
          Try Again
        </Button>
      </div>
    )
  }

  if (loadingStep < 3) {
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
              className="bg-red-600 h-full transition-all duration-300 ease-in-out"
              style={{ width: `${(loadingStep / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (!templateData) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] p-4">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <h2 className="text-xl font-semibold mb-2">Loading template data...</h2>
      </div>
    )
  }

  // Calculate derived state for the header
  const hasUnsaved = explorer.openFiles.some((f) => f.hasUnsavedChanges);
  const activeFile = explorer.openFiles.find((f) => f.id === explorer.activeFileId);

  return (
    <div className="h-screen flex flex-col">
      {/* ✅ Pass all required props to the Header */}
      <PlaygroundHeader 
        title={playgroundData?.name || "Code Playground"}
        openFilesCount={explorer.openFiles.length}
        hasUnsavedChanges={hasUnsaved}
        canSave={!!activeFile && activeFile.hasUnsavedChanges}
        onSave={() => console.log("Save triggered")} // Replace with actual save logic
        onSaveAll={() => console.log("Save All triggered")}
        onTogglePreview={() => {}} // Connect to your layout state
        isPreviewVisible={true}
        onCloseAll={explorer.closeAllFiles}
        onPushToGithub={() => {}} // Connect to your Git logic
        onOpenGitSettings={() => {}} // Connect to your Git logic
        aiProps={{
          isEnabled: ai.isEnabled,
          onToggle: ai.toggleEnabled,
          isLoading: ai.isLoading,
        }}
      />
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden">
         {/* <PlaygroundEditor /> */}
      </main>
    </div>
  )
}