"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, CheckCircle, X, Loader2, Code, MapPin, Zap, Copy, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface AISuggestionOverlayProps {
  suggestion: string | null
  isLoading: boolean
  suggestionType: string
  suggestionPosition: { line: number; column: number } | null
  onAccept: () => void
  onReject: () => void
  className?: string
  mode?: "overlay" | "inline" // Add this new prop
}

export const AISuggestionOverlay: React.FC<AISuggestionOverlayProps> = ({
  suggestion,
  isLoading,
  suggestionType,
  suggestionPosition,
  onAccept,
  onReject,
  className,
  mode = "overlay", // Default to overlay mode
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [copied, setCopied] = React.useState(false)

  const handleCopy = async () => {
    if (suggestion) {
      await navigator.clipboard.writeText(suggestion)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const getSuggestionTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "completion":
        return <Code className="h-3 w-3" />
      case "function":
        return <Zap className="h-3 w-3" />
      case "variable":
        return <MapPin className="h-3 w-3" />
      default:
        return <Sparkles className="h-3 w-3" />
    }
  }

  const getSuggestionTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case "completion":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      case "function":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
      case "variable":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  // Don't render overlay if in inline mode
  if (mode === "inline" || (!suggestion && !isLoading)) return null

  return (
    <div className={cn("absolute top-4 right-4 z-50 animate-in slide-in-from-top-2 fade-in-0 duration-300", className)}>
      <Card className="w-80 border-2 shadow-xl backdrop-blur-sm bg-white/95 dark:bg-gray-900/95 border-blue-200 dark:border-blue-800 transition-all duration-200 hover:shadow-2xl">
        <CardContent className="p-0">
          {isLoading ? (
            // Loading State
            <div className="p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                  <Loader2 className="h-5 w-5 text-blue-500 animate-spin relative z-10" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">AI Assistant</span>
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-100" />
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Generating intelligent code suggestion...</p>
                </div>
              </div>
            </div>
          ) : (
            // Suggestion State
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 animate-pulse" />
                    <Sparkles className="h-5 w-5 text-blue-500 relative z-10" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
                        AI Suggestion
                      </span>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-xs font-medium flex items-center gap-1 transition-colors",
                          getSuggestionTypeColor(suggestionType),
                        )}
                      >
                        {getSuggestionTypeIcon(suggestionType)}
                        {suggestionType}
                      </Badge>
                    </div>
                    {suggestionPosition && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                        <MapPin className="h-3 w-3" />
                        Line {suggestionPosition.line}, Col {suggestionPosition.column}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Eye className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopy}
                    className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <Copy className={cn("h-3 w-3 transition-colors", copied ? "text-green-500" : "text-gray-500")} />
                  </Button>
                </div>
              </div>

              {/* Code Preview */}
              <div className="mb-4">
                <div className="relative group">
                  <pre
                    className={cn(
                      "text-xs font-mono bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border overflow-x-auto transition-all duration-200",
                      "border-gray-200 dark:border-gray-700",
                      "group-hover:border-blue-300 dark:group-hover:border-blue-600",
                      isExpanded ? "max-h-48" : "max-h-20",
                      "scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600",
                    )}
                  >
                    <code className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{suggestion}</code>
                  </pre>
                  {!isExpanded && suggestion && suggestion.length > 100 && (
                    <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-50 dark:from-gray-800/50 to-transparent rounded-b-lg" />
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={onAccept}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
                >
                  <CheckCircle className="h-3 w-3 mr-1.5" />
                  Accept
                  <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-white/20 rounded">⌘↵</kbd>
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onReject}
                  className="flex-1 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                >
                  <X className="h-3 w-3 mr-1.5" />
                  Reject
                  <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded">Esc</kbd>
                </Button>
              </div>

              {/* Footer */}
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Powered by AI
                  </span>
                  {copied && <span className="text-green-500 animate-in fade-in-0 duration-200">Copied!</span>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
