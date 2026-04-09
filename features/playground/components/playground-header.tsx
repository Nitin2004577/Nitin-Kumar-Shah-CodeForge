"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  PanelRightOpen,
  PanelRightClose,
  X,
  Settings,
  Github,
  ArrowLeft,
  Play,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import ToggleAI from "../components/toggle-ai";
import { AISettingsDropdown } from "../components/ai-setting-dropdown";

interface PlaygroundHeaderProps {
  title: string;
  openFilesCount: number;
  hasUnsavedChanges: boolean;
  canSave: boolean;
  onSave: () => void;
  onSaveAll: () => void;
  onTogglePreview: () => void;
  onCloseAll: () => void;
  onGitPush?: () => void;
  isPushing?: boolean;
  isPreviewVisible: boolean;
  // Run & auto-save
  onRun: () => void;
  isRunning: boolean;
  hasRun: boolean;
  isAutoSaveEnabled: boolean;
  onToggleAutoSave: () => void;

  // UPDATED: Added all the props needed for the new AI components
  aiProps: {
    isEnabled: boolean;
    onToggle: (value: boolean) => void;
    isLoading: boolean;
    isCodeCompletionAllFilesEnabled: boolean;
    onToggleCodeCompletionAllFiles: (enabled: boolean) => void;
    isCodeCompletionTSXEnabled: boolean;
    onToggleCodeCompletionTSX: (enabled: boolean) => void;
    isNextEditSuggestionsEnabled: boolean;
    onToggleNextEditSuggestions: (enabled: boolean) => void;
    onTriggerAISuggestion: (type: string, mode: "overlay" | "inline") => void;
    activeFile: any;
  };
}

export const PlaygroundHeader: React.FC<PlaygroundHeaderProps> = ({
  title,
  openFilesCount,
  hasUnsavedChanges,
  canSave,
  onSave,
  onSaveAll,
  onTogglePreview,
  onCloseAll,
  onGitPush,
  isPushing,
  isPreviewVisible,
  onRun,
  isRunning,
  hasRun,
  isAutoSaveEnabled,
  onToggleAutoSave,
  aiProps,
}) => {
  const router = useRouter();

  return (
    <header className="h-14 border-b flex items-center px-4 justify-between bg-background shrink-0">
      {/* LEFT: Back Button, Sidebar Trigger & Title */}
      <div className="flex items-center gap-2">
        {/* ... Keep the existing left side code exactly as it was ... */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => router.push("/dashboard")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Back to Dashboard</TooltipContent>
        </Tooltip>

        <SidebarTrigger className="mr-2" />
        <h1 className="text-lg font-semibold">{title}</h1>
        {hasUnsavedChanges && (
          <Badge
            variant="secondary"
            className="ml-2 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200"
          >
            Unsaved
          </Badge>
        )}
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-2">
        {/* --- NEW: The Custom AI Components --- */}
        <ToggleAI
          isEnabled={aiProps.isEnabled}
          onToggle={aiProps.onToggle}
          suggestionLoading={aiProps.isLoading}
          activeFeature={aiProps.isLoading ? "Generating..." : undefined}
          loadingProgress={aiProps.isLoading ? 65 : 0}
        />

        <AISettingsDropdown
          isAISuggestionsEnabled={aiProps.isEnabled}
          onToggleAISuggestions={aiProps.onToggle}
          isCodeCompletionAllFilesEnabled={
            aiProps.isCodeCompletionAllFilesEnabled
          }
          onToggleCodeCompletionAllFiles={
            aiProps.onToggleCodeCompletionAllFiles
          }
          isCodeCompletionTSXEnabled={aiProps.isCodeCompletionTSXEnabled}
          onToggleCodeCompletionTSX={aiProps.onToggleCodeCompletionTSX}
          isNextEditSuggestionsEnabled={aiProps.isNextEditSuggestionsEnabled}
          onToggleNextEditSuggestions={aiProps.onToggleNextEditSuggestions}
          onTriggerAISuggestion={aiProps.onTriggerAISuggestion}
          suggestionLoading={aiProps.isLoading}
          activeFile={aiProps.activeFile}
        />
        {/* -------------------------------------- */}

        {/* Run Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={onRun}
              disabled={isRunning}
              className="h-8 gap-1.5 bg-green-600 hover:bg-green-500 text-white border-0"
            >
              {isRunning ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5 fill-white" />
              )}
              <span className="hidden sm:inline text-xs font-medium">
                {isRunning ? "Running..." : hasRun ? "Restart" : "Run"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {hasRun ? "Restart the dev server" : "Start the preview server"}
          </TooltipContent>
        </Tooltip>

        {/* Git Push Button */}
        {onGitPush && (
          <Button
            size="sm"
            variant="outline"
            onClick={onGitPush}
            disabled={isPushing}
            className="h-8 gap-2 bg-slate-900 text-white hover:bg-slate-800 hover:text-white dark:bg-slate-50 dark:text-slate-900"
          >
            <Github
              className={`h-4 w-4 ${isPushing ? "animate-bounce" : ""}`}
            />
            <span className="hidden sm:inline">
              {isPushing ? "Pushing..." : "Commit & Push"}
            </span>
          </Button>
        )}

        {/* Save Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={onSave}
          disabled={!canSave}
          className="h-8 gap-2 ml-2"
        >
          <Save className="h-4 w-4" />
          <span className="hidden sm:inline">Save</span>
        </Button>

        {/* Settings Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>View Options</DropdownMenuLabel>
            <DropdownMenuItem onClick={onTogglePreview}>
              {isPreviewVisible ? (
                <PanelRightClose className="mr-2 h-4 w-4" />
              ) : (
                <PanelRightOpen className="mr-2 h-4 w-4" />
              )}
              {isPreviewVisible ? "Hide Preview" : "Show Preview"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>Auto Save</DropdownMenuLabel>
            <DropdownMenuItem onClick={onToggleAutoSave}>
              <Save className="mr-2 h-4 w-4" />
              {isAutoSaveEnabled ? "✓ Auto Save On" : "Auto Save Off"}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuLabel>File Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={onSave} disabled={!canSave}>
              <Save className="mr-2 h-4 w-4" /> Save File
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSaveAll} disabled={!hasUnsavedChanges}>
              <Save className="mr-2 h-4 w-4" /> Save All
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onCloseAll}
              disabled={openFilesCount === 0}
              className="text-destructive"
            >
              <X className="mr-2 h-4 w-4" /> Close All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
