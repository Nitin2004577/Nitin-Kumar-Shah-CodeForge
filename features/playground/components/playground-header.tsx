"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Save, PanelRightOpen, PanelRightClose, X, Settings,
  Github, ArrowLeft, Play, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import ToggleAI from "../components/toggle-ai";

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
  onRun: () => void;
  isRunning: boolean;
  hasRun: boolean;
  isAutoSaveEnabled: boolean;
  onToggleAutoSave: () => void;
  aiProps: {
    isEnabled: boolean;
    onToggle: (value: boolean) => void;
    isLoading: boolean;
    isChatOpen?: boolean;
    onToggleChat?: () => void;
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
  title, openFilesCount, hasUnsavedChanges, canSave,
  onSave, onSaveAll, onTogglePreview, onCloseAll,
  onGitPush, isPushing, isPreviewVisible,
  onRun, isRunning, hasRun, isAutoSaveEnabled, onToggleAutoSave, aiProps,
}) => {
  const router = useRouter();

  return (
    <header className="h-12 sm:h-14 border-b flex items-center px-2 sm:px-4 justify-between bg-background shrink-0 gap-1">
      {/* LEFT */}
      <div className="flex items-center gap-1 sm:gap-2 min-w-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => router.push("/dashboard")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Back to Dashboard</TooltipContent>
        </Tooltip>

        <SidebarTrigger className="shrink-0" />

        <h1 className="text-sm sm:text-base font-semibold truncate max-w-[80px] sm:max-w-[160px] md:max-w-xs">
          {title}
        </h1>
        {hasUnsavedChanges && (
          <Badge variant="secondary" className="hidden sm:flex text-xs bg-orange-100 text-orange-700 shrink-0">
            Unsaved
          </Badge>
        )}
        {/* Mobile unsaved dot */}
        {hasUnsavedChanges && (
          <span className="sm:hidden h-2 w-2 rounded-full bg-orange-500 shrink-0" />
        )}
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* AI toggle — always visible */}
        <ToggleAI
          isEnabled={aiProps.isEnabled}
          onToggle={aiProps.onToggle}
          suggestionLoading={aiProps.isLoading}
          isChatOpen={aiProps.isChatOpen}
          onToggleChat={aiProps.onToggleChat}
        />

        {/* Run — always visible, label hidden on xs */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" onClick={onRun} disabled={isRunning}
              className="h-8 gap-1 sm:gap-1.5 bg-green-600 hover:bg-green-500 text-white border-0 px-2 sm:px-3">
              {isRunning
                ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                : <Play className="h-3.5 w-3.5 fill-white" />}
              <span className="hidden sm:inline text-xs font-medium">
                {isRunning ? "Running..." : hasRun ? "Restart" : "Run"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{hasRun ? "Restart" : "Run"}</TooltipContent>
        </Tooltip>

        {/* Git push — hidden on mobile, shown sm+ */}
        {onGitPush && (
          <Button size="sm" variant="outline" onClick={onGitPush} disabled={isPushing}
            className="hidden sm:flex h-8 gap-2 bg-slate-900 text-white hover:bg-slate-800 hover:text-white dark:bg-slate-50 dark:text-slate-900">
            <Github className={`h-4 w-4 ${isPushing ? "animate-bounce" : ""}`} />
            <span className="hidden md:inline">{isPushing ? "Pushing..." : "Commit & Push"}</span>
          </Button>
        )}

        {/* Save — icon only on mobile */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" variant="outline" onClick={onSave} disabled={!canSave} className="h-8 gap-2 px-2 sm:px-3">
              <Save className="h-4 w-4" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">Save</TooltipContent>
        </Tooltip>

        {/* Settings — overflow menu for everything else */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Settings className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>View</DropdownMenuLabel>
            <DropdownMenuItem onClick={onTogglePreview}>
              {isPreviewVisible
                ? <PanelRightClose className="mr-2 h-4 w-4" />
                : <PanelRightOpen className="mr-2 h-4 w-4" />}
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
            <DropdownMenuItem onClick={onCloseAll} disabled={openFilesCount === 0} className="text-destructive">
              <X className="mr-2 h-4 w-4" /> Close All
            </DropdownMenuItem>

            {/* Mobile-only: git push */}
            {onGitPush && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onGitPush} disabled={isPushing} className="sm:hidden">
                  <Github className="mr-2 h-4 w-4" />
                  {isPushing ? "Pushing..." : "Commit & Push"}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
