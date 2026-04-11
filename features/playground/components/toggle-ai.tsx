"use client";

import { Button } from "@/components/ui/button";
import { Bot, Loader2 } from "lucide-react";
import React from "react";
import { cn } from "@/lib/utils";

interface ToggleAIProps {
  isEnabled: boolean;
  onToggle: (value: boolean) => void;
  suggestionLoading: boolean;
  isChatOpen?: boolean;
  onToggleChat?: () => void;
}

const ToggleAI: React.FC<ToggleAIProps> = ({
  isEnabled,
  suggestionLoading,
  isChatOpen,
  onToggleChat,
}) => {
  return (
    <Button
      size="sm"
      variant={isChatOpen ? "default" : "outline"}
      className={cn(
        "relative gap-2 h-8 px-3 text-sm font-medium transition-all duration-200",
        isChatOpen
          ? "bg-purple-600 hover:bg-purple-500 text-white border-purple-600"
          : "bg-background hover:bg-accent text-foreground border-border"
      )}
      onClick={onToggleChat}
    >
      {suggestionLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Bot className="h-4 w-4" />
      )}
      <span>AI</span>
      <div
        className={cn(
          "w-2 h-2 rounded-full",
          isEnabled ? "bg-green-400 animate-pulse" : "bg-zinc-500"
        )}
      />
    </Button>
  );
};

export default ToggleAI;
