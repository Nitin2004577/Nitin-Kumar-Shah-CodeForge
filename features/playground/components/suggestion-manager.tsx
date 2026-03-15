import type { Monaco } from "@monaco-editor/react"
import type { editor as MonacoEditor, IDisposable } from "monaco-editor"

interface SuggestionCallbacks {
  onAccept: (editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco) => void
  onReject: (editor: MonacoEditor.IStandaloneCodeEditor) => void
  onTrigger: (type: string, editor: MonacoEditor.IStandaloneCodeEditor) => void
}

interface ActiveSuggestion {
  text: string
  position: { line: number; column: number }
  id: string
}

export class SuggestionManager {
  private editor: MonacoEditor.IStandaloneCodeEditor
  private monaco: Monaco
  private callbacks: SuggestionCallbacks
  private activeSuggestion: ActiveSuggestion | null = null
  private inlineProvider: IDisposable | null = null
  private isAccepting = false

  constructor(editor: MonacoEditor.IStandaloneCodeEditor, monaco: Monaco, callbacks: SuggestionCallbacks) {
    this.editor = editor
    this.monaco = monaco
    this.callbacks = callbacks
  }

  /**
   * Show a suggestion at the specified position
   */
  showSuggestion(text: string, position: { line: number; column: number }): void {
    // Clear any existing suggestion
    this.clearSuggestion()

    // Create new suggestion
    this.activeSuggestion = {
      text: text.replace(/\r/g, ""), // Clean text
      position,
      id: this.generateId(),
    }

    // Register inline completion provider
    this.registerInlineProvider()

    // Trigger inline suggestions
    setTimeout(() => {
      if (this.editor && this.activeSuggestion) {
        this.editor.trigger("ai", "editor.action.inlineSuggest.trigger", null)
      }
    }, 50)
  }

  /**
   * Clear the current suggestion
   */
  clearSuggestion(): void {
    if (this.inlineProvider) {
      this.inlineProvider.dispose()
      this.inlineProvider = null
    }

    this.activeSuggestion = null

    if (this.editor) {
      this.editor.trigger("ai", "editor.action.inlineSuggest.hide", null)
    }
  }

  /**
   * Accept the current suggestion
   */
  acceptSuggestion(): boolean {
    if (!this.activeSuggestion || this.isAccepting) {
      console.log("Cannot accept suggestion:", {
        hasActiveSuggestion: !!this.activeSuggestion,
        isAccepting: this.isAccepting,
      })
      return false
    }

    this.isAccepting = true

    try {
      const suggestion = this.activeSuggestion
      const currentPosition = this.editor.getPosition()

      console.log("Accepting suggestion:", {
        suggestionText: suggestion.text.substring(0, 50) + "...",
        suggestionPosition: suggestion.position,
        currentPosition: currentPosition,
      })

      if (!currentPosition) {
        console.error("Current editor position is null")
        return false
      }

      // Create range from suggestion position to current position
      const range = new this.monaco.Range(
        suggestion.position.line,
        suggestion.position.column,
        currentPosition.lineNumber,
        currentPosition.column,
      )

      // Execute the edit
      const success = this.editor.executeEdits("ai-suggestion-accept", [
        {
          range,
          text: suggestion.text,
          forceMoveMarkers: true,
        },
      ])

      if (!success) {
        console.error("Failed to execute edit")
        return false
      }

      // Calculate new cursor position after insertion
      const lines = suggestion.text.split("\n")
      let newLine: number
      let newColumn: number

      if (lines.length === 1) {
        // Single line suggestion
        newLine = suggestion.position.line
        newColumn = suggestion.position.column + suggestion.text.length
      } else {
        // Multi-line suggestion
        newLine = suggestion.position.line + lines.length - 1
        newColumn = lines[lines.length - 1].length + 1
      }

      // Set cursor to end of inserted text
      this.editor.setPosition({
        lineNumber: newLine,
        column: newColumn,
      })

      console.log("Suggestion accepted successfully, new position:", { newLine, newColumn })

      // Clear suggestion and call callback
      this.clearSuggestion()
      this.callbacks.onAccept(this.editor, this.monaco)

      return true
    } catch (error) {
      console.error("Error accepting suggestion:", error)
      return false
    } finally {
      this.isAccepting = false
    }
  }

  /**
   * Reject the current suggestion
   */
  rejectSuggestion(): void {
    if (this.activeSuggestion) {
      this.clearSuggestion()
      this.callbacks.onReject(this.editor)
    }
  }

  /**
   * Check if there's an active suggestion
   */
  hasActiveSuggestion(): boolean {
    return this.activeSuggestion !== null
  }

  /**
   * Check if the current position is valid for the active suggestion
   */
  isPositionValid(position: any): boolean {
    if (!this.activeSuggestion) return false

    const suggestion = this.activeSuggestion
    const isLineMatch = position.lineNumber === suggestion.position.line
    const isColumnInRange =
      position.column >= suggestion.position.column && position.column <= suggestion.position.column + 10 // More lenient

    console.log("Position validation:", {
      currentPos: `${position.lineNumber}:${position.column}`,
      suggestionPos: `${suggestion.position.line}:${suggestion.position.column}`,
      isLineMatch,
      isColumnInRange,
      isValid: isLineMatch && isColumnInRange,
    })

    return isLineMatch && isColumnInRange
  }

  /**
   * Check if a content change is from our suggestion
   */
  isChangeFromSuggestion(change: any): boolean {
    if (!this.activeSuggestion) return false

    const cleanText = change.text.replace(/\r/g, "")
    return cleanText === this.activeSuggestion.text || this.activeSuggestion.text.startsWith(cleanText)
  }

  /**
   * Register inline completion provider
   */
  private registerInlineProvider(): void {
    if (!this.activeSuggestion) return

    const language = this.getEditorLanguage()

    this.inlineProvider = this.monaco.languages.registerInlineCompletionsProvider(language, {
      provideInlineCompletions: async (model: any, position: any) => {
        if (!this.activeSuggestion || this.isAccepting) {
          return { items: [] }
        }

        console.log("Providing inline completions:", {
          modelPosition: `${position.lineNumber}:${position.column}`,
          suggestionPosition: `${this.activeSuggestion.position.line}:${this.activeSuggestion.position.column}`,
          suggestionText: this.activeSuggestion.text.substring(0, 30) + "...",
        })

        // More lenient position matching
        const isMatch =
          position.lineNumber === this.activeSuggestion.position.line &&
          position.column >= this.activeSuggestion.position.column &&
          position.column <= this.activeSuggestion.position.column + 5

        if (!isMatch) {
          console.log("Position mismatch, not providing completion")
          return { items: [] }
        }

        return {
          items: [
            {
              insertText: this.activeSuggestion.text,
              range: new this.monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
              kind: this.monaco.languages.CompletionItemKind.Snippet,
              label: "AI Suggestion",
              detail: "AI-generated code suggestion",
              documentation: "Press Tab to accept",
              sortText: "0000", // High priority
              filterText: "",
            },
          ],
        }
      },
      freeInlineCompletions: () => {},
    })
  }

  /**
   * Get the current editor language
   */
  private getEditorLanguage(): string {
    const model = this.editor.getModel()
    return model ? model.getLanguageId() : "javascript"
  }

  /**
   * Generate a unique ID for suggestions
   */
  private generateId(): string {
    return `suggestion-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}