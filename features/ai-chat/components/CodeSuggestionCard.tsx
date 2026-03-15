import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Copy, Terminal, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EnhancedCodeBlock } from "./ai-chat-code-blocks"; 
import { CodeSuggestion } from "../lib/chat-types"; 

interface CodeSuggestionCardProps {
  suggestion: CodeSuggestion;
  onInsert: () => void;
  onCopy: () => void;
  onRun?: (code: string, language: string) => void;
  activeFileName?: string;
}

export const CodeSuggestionCard: React.FC<CodeSuggestionCardProps> = ({
  suggestion,
  onInsert,
  onCopy,
  onRun,
  activeFileName,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case "optimization":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      case "bug_fix":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "feature":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "refactor":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "security":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    }
  };

  return (
    <div className="border border-zinc-700/50 rounded-lg overflow-hidden bg-zinc-900/30 my-3 group hover:bg-zinc-900/50 transition-colors">
      <div className="p-3 bg-zinc-800/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="text-sm font-medium text-zinc-200">
                {suggestion.title}
              </h4>
              {suggestion.category && (
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    getCategoryColor(suggestion.category)
                  )}
                >
                  {suggestion.category}
                </Badge>
              )}
              {suggestion.confidence && (
                <Badge variant="outline" className="text-xs">
                  {Math.round(suggestion.confidence * 100)}% match
                </Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400 mb-2">
              {suggestion.description}
            </p>
            {suggestion.fileName && (
              <div className="text-xs text-zinc-500">
                Target: {suggestion.fileName}
                {suggestion.insertPosition && (
                  <span className="ml-2">
                    Line {suggestion.insertPosition.line}:
                    {suggestion.insertPosition.column}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Action Buttons */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopy}
                    className="h-7 px-2 text-zinc-400 hover:text-zinc-200"
                  >
                    {copied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span className="ml-1 text-xs">Copy</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy code to clipboard</TooltipContent>
              </Tooltip>

              {onRun &&
                ["javascript", "python", "bash"].includes(
                  suggestion.language
                ) && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          onRun(suggestion.code, suggestion.language)
                        }
                        className="h-7 px-2 text-green-400 hover:text-green-300 hover:bg-green-500/10"
                      >
                        <Terminal className="h-3 w-3" />
                        <span className="ml-1 text-xs">Run</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Run code</TooltipContent>
                  </Tooltip>
                )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onInsert}
                    className="h-7 px-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                    disabled={!activeFileName}
                  >
                    <Plus className="h-3 w-3" />
                    <span className="ml-1 text-xs">Insert</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {activeFileName
                    ? `Insert into ${activeFileName}`
                    : "No active file"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div className="border-t border-zinc-700/50">
        <EnhancedCodeBlock
          className={`language-${suggestion.language}`}
          onInsert={() => onInsert()}
          onRun={onRun}
          fileName={suggestion.fileName}
        >
          {suggestion.code}
        </EnhancedCodeBlock>
      </div>
    </div>
  );
};
