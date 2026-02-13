import React from "react";
import { 
  Save, 
  PanelRightOpen, 
  PanelRightClose, 
  Bot, 
  X,
  Settings,
  Code2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
  isPreviewVisible,
  aiProps
}) => {
  return (
    <header className="h-12 border-b border-zinc-800 flex items-center px-4 justify-between bg-[#18181B] shrink-0 select-none">
      
      {/* LEFT: Sidebar Trigger & Title */}
      <div className="flex items-center gap-3">
        <SidebarTrigger className="text-zinc-400 hover:text-white" />
        
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-5 h-5 rounded bg-[#007acc]/10 text-[#007acc]">
            <Code2 className="w-3.5 h-3.5" />
          </div>
          <h1 className="text-[13px] font-medium text-zinc-200 tracking-wide">{title}</h1>
          
          {/* Subtle VS Code style unsaved dot */}
          {hasUnsavedChanges && (
            <span className="flex h-2 w-2 rounded-full bg-blue-500 ml-1" title="Unsaved changes" />
          )}
        </div>
      </div>

      {/* RIGHT: Actions */}
      <div className="flex items-center gap-1">
        
        {/* Preview Toggle Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onTogglePreview}
          className={`h-7 px-2.5 gap-2 text-xs transition-colors rounded-sm ${
            isPreviewVisible 
              ? "bg-[#007acc]/10 text-[#007acc] hover:bg-[#007acc]/20" 
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}
          title={isPreviewVisible ? "Hide Preview" : "Show Preview"}
        >
          {isPreviewVisible ? (
            <>
              <PanelRightClose className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Hide Preview</span>
            </>
          ) : (
            <>
              <PanelRightOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Show Preview</span>
            </>
          )}
        </Button>

        {/* AI Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={aiProps.onToggle}
          className={`h-7 px-2.5 gap-2 text-xs transition-colors rounded-sm ml-1 ${
            aiProps.isEnabled 
              ? "bg-purple-500/10 text-purple-400 hover:bg-purple-500/20" 
              : "text-zinc-400 hover:text-white hover:bg-zinc-800"
          }`}
        >
          <Bot className={`h-3.5 w-3.5 ${aiProps.isLoading ? "animate-pulse" : ""}`} />
          <span className="hidden sm:inline">AI {aiProps.isEnabled ? "On" : "Off"}</span>
        </Button>

        <div className="w-[1px] h-4 bg-zinc-700 mx-1.5" /> {/* Divider */}

        {/* Save Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onSave}
          disabled={!canSave}
          className={`h-7 px-2.5 gap-2 text-xs rounded-sm ${
            canSave 
              ? "text-zinc-300 hover:text-white hover:bg-zinc-800" 
              : "text-zinc-600 opacity-50"
          }`}
        >
          <Save className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Save</span>
        </Button>

        {/* Settings / More Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-sm ml-0.5">
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1e1e1e] border-zinc-800 text-zinc-300 w-48 shadow-xl">
            <DropdownMenuLabel className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">File Actions</DropdownMenuLabel>
            
            <DropdownMenuItem 
              onClick={onSave} 
              disabled={!canSave}
              className="text-xs focus:bg-[#007acc] focus:text-white cursor-pointer data-[disabled]:opacity-50"
            >
              <Save className="mr-2 h-3.5 w-3.5" /> Save File
            </DropdownMenuItem>
            
            <DropdownMenuItem 
              onClick={onSaveAll} 
              disabled={!hasUnsavedChanges}
              className="text-xs focus:bg-[#007acc] focus:text-white cursor-pointer data-[disabled]:opacity-50"
            >
              <Save className="mr-2 h-3.5 w-3.5" /> Save All
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-zinc-800" />
            
            <DropdownMenuItem 
              onClick={onCloseAll} 
              disabled={openFilesCount === 0} 
              className="text-xs text-red-400 focus:bg-red-500/20 focus:text-red-400 cursor-pointer data-[disabled]:opacity-50"
            >
              <X className="mr-2 h-3.5 w-3.5" /> Close All
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
      </div>
    </header>
  );
};