  import React from "react";
  import { 
    Save, 
    PanelRightOpen, 
    PanelRightClose,
    Bot, 
    X,
    Settings,
    Github // 1. Added Github icon
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
    DropdownMenuLabel
  } from "@/components/ui/dropdown-menu";

  interface PlaygroundHeaderProps {
    title: string;
    openFilesCount: number;
    hasUnsavedChanges: boolean;
    canSave: boolean;
    
    // Actions
    onSave: () => void;
    onSaveAll: () => void;
    onTogglePreview: () => void;
    onCloseAll: () => void;
    
    // 2. Added Git Actions
    onGitPush?: () => void;
    isPushing?: boolean;
    
    // State
    isPreviewVisible: boolean;
    
    // AI Props Group
    aiProps: {
      isEnabled: boolean;
      onToggle: () => void;
      isLoading: boolean;
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
    aiProps
  }) => {
    return (
      <header className="h-14 border-b flex items-center px-4 justify-between bg-background shrink-0">
        {/* LEFT: Sidebar Trigger & Title */}
        <div className="flex items-center gap-2">
          <SidebarTrigger className="mr-2" />
          <h1 className="text-lg font-semibold">{title}</h1>
          {hasUnsavedChanges && (
            <Badge variant="secondary" className="ml-2 text-xs bg-orange-100 text-orange-700 hover:bg-orange-200">
              Unsaved
            </Badge>
          )}
        </div>

        {/* RIGHT: Actions */}
        <div className="flex items-center gap-2">
          {/* AI Toggle */}
          <Button
            variant={aiProps.isEnabled ? "secondary" : "ghost"}
            size="sm"
            onClick={aiProps.onToggle}
            className={`h-8 gap-2 ${aiProps.isEnabled ? "text-purple-600 bg-purple-50 hover:bg-purple-100" : "text-muted-foreground"}`}
          >
            <Bot className={`h-4 w-4 ${aiProps.isLoading ? "animate-pulse" : ""}`} />
            <span className="hidden sm:inline">AI {aiProps.isEnabled ? "On" : "Off"}</span>
          </Button>

          {/* 3. New Git Push Button */}
          {onGitPush && (
            <Button
              size="sm"
              variant="outline"
              onClick={onGitPush}
              disabled={isPushing}
              className="h-8 gap-2 bg-slate-900 text-white hover:bg-slate-800 hover:text-white dark:bg-slate-50 dark:text-slate-900"
            >
              <Github className={`h-4 w-4 ${isPushing ? "animate-bounce" : ""}`} />
              <span className="hidden sm:inline">{isPushing ? "Pushing..." : "Commit & Push"}</span>
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

          {/* Settings / More Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>View Options</DropdownMenuLabel>
              <DropdownMenuItem onClick={onTogglePreview}>
                {isPreviewVisible ? <PanelRightClose className="mr-2 h-4 w-4"/> : <PanelRightOpen className="mr-2 h-4 w-4"/>}
                {isPreviewVisible ? "Hide Preview" : "Show Preview"}
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    );
  };