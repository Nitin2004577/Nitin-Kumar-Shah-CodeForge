"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OpenFile } from "../types";
import { Sparkles } from "lucide-react";

interface AISettingsDropdownProps {
  activeFile: OpenFile | null;
  isAISuggestionsEnabled: boolean;
  isCodeCompletionAllFilesEnabled: boolean;
  isCodeCompletionTSXEnabled: boolean;
  isNextEditSuggestionsEnabled: boolean;
  onToggleAISuggestions: (value: boolean) => void;
  onToggleCodeCompletionAllFiles: (value: boolean) => void;
  onToggleCodeCompletionTSX: (value: boolean) => void;
  onToggleNextEditSuggestions: (value: boolean) => void;
  onTriggerAISuggestion: (type: string) => void;
  suggestionLoading: boolean;
}

export function AISettingsDropdown({
  activeFile,
  isAISuggestionsEnabled,
  isCodeCompletionAllFilesEnabled,
  isCodeCompletionTSXEnabled,
  isNextEditSuggestionsEnabled,
  onToggleAISuggestions,
  onToggleCodeCompletionAllFiles,
  onToggleCodeCompletionTSX,
  onToggleNextEditSuggestions,
  onTriggerAISuggestion,
  suggestionLoading,
}: AISettingsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sparkles className={isAISuggestionsEnabled ? "text-primary" : "text-muted-foreground"} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>AI Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onToggleAISuggestions(!isAISuggestionsEnabled)}>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isAISuggestionsEnabled}
              onChange={() => onToggleAISuggestions(!isAISuggestionsEnabled)}
              className="form-checkbox h-4 w-4"
            />
            Enable AI Suggestions
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleCodeCompletionAllFiles(!isCodeCompletionAllFilesEnabled)}>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isCodeCompletionAllFilesEnabled}
              onChange={() => onToggleCodeCompletionAllFiles(!isCodeCompletionAllFilesEnabled)}
              className="form-checkbox h-4 w-4"
            />
            Enable Code Completion (All Files)
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleCodeCompletionTSX(!isCodeCompletionTSXEnabled)}>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isCodeCompletionTSXEnabled}
              onChange={() => onToggleCodeCompletionTSX(!isCodeCompletionTSXEnabled)}
              className="form-checkbox h-4 w-4"
            />
            Enable Code Completion (TSX)
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggleNextEditSuggestions(!isNextEditSuggestionsEnabled)}>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isNextEditSuggestionsEnabled}
              onChange={() => onToggleNextEditSuggestions(!isNextEditSuggestionsEnabled)}
              className="form-checkbox h-4 w-4"
            />
            Enable Next Edit Suggestions
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onTriggerAISuggestion("completion")}
          disabled={!isAISuggestionsEnabled || !activeFile || suggestionLoading}
        >
          Get Code Suggestion (Ctrl+Space)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}