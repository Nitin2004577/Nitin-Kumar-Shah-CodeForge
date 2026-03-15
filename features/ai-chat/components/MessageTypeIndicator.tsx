import React from "react";
import { Code, Sparkles, RefreshCw, Zap, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageTypeIndicatorProps {
  type?: string;
  model?: string;
  tokens?: number;
}

export const MessageTypeIndicator: React.FC<MessageTypeIndicatorProps> = ({ 
  type, 
  model, 
  tokens 
}) => {
  const getTypeConfig = (type?: string) => {
    switch (type) {
      case "code_review":
        return { icon: Code, color: "text-blue-400", label: "Code Review" };
      case "suggestion":
        return { icon: Sparkles, color: "text-purple-400", label: "Suggestion" };
      case "error_fix":
        return { icon: RefreshCw, color: "text-red-400", label: "Error Fix" };
      case "optimization":
        return { icon: Zap, color: "text-yellow-400", label: "Optimization" };
      default:
        return { icon: MessageSquare, color: "text-zinc-400", label: "Chat" };
    }
  };

  const config = getTypeConfig(type);
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-1">
        <Icon className={cn("h-3 w-3", config.color)} />
        <span className={cn("text-xs font-medium", config.color)}>
          {config.label}
        </span>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {model && <span>{model}</span>}
        {tokens && <span>{tokens} tokens</span>}
      </div>
    </div>
  );
};