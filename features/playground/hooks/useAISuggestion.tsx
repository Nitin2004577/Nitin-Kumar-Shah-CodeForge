import { useState, useCallback } from "react";
import { toast } from "sonner"; // Using your existing sonner toast for explanations!

interface AISuggestionsState {
  suggestion: string | null;
  isLoading: boolean;
  position: { line: number; column: number } | null;
  decoration: string[];
  isEnabled: boolean;
  // ✨ NEW: State to hold our inline explanation data
  explanationData: {
    text: string;
    type: string;
    position: { line: number; column: number };
  } | null;
}

interface UseAISuggestionsReturn extends AISuggestionsState {
  toggleEnabled: () => void;
  // ✨ Updated signature to accept either the editor OR a string payload
  fetchSuggestion: (type: string, payloadOrEditor: any) => Promise<void>;
  acceptSuggestion: (editor: any, monaco: any) => void;
  rejectSuggestion: (editor: any) => void;
  clearSuggestion: (editor: any) => void;
  // ✨ FIX: Add clearExplanation to the return interface
  clearExplanation: () => void;
}

export const useAISuggestions = (): UseAISuggestionsReturn => {
  const [state, setState] = useState<AISuggestionsState>({
    suggestion: null,
    isLoading: false,
    position: null,
    decoration: [],
    isEnabled: true,
    explanationData: null, // Initialize to null
  });

  // ✨ FIX: Add the missing toggleEnabled function
  const toggleEnabled = useCallback(() => {
    setState((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));
  }, []);

  // Add this new function right below your other callbacks
  const clearExplanation = useCallback(() => {
    setState((prev) => ({ ...prev, explanationData: null }));
  }, []);

  const fetchSuggestion = useCallback(
    async (type: string, payloadOrEditor: any) => {
      setState((currentState) => {
        if (!currentState.isEnabled) {
          console.warn("AI suggestions are disabled.");
          return currentState;
        }

        if (!payloadOrEditor) {
          console.warn("No editor or text payload provided.");
          return currentState;
        }

        // ✨ SMART DETECTION: Is this an Editor object or a Text string?
        const isEditor = typeof payloadOrEditor.getModel === "function";

        let fileContent = "";
        let cursorLine = 0;
        let cursorColumn = 0;
        let positionToSave = currentState.position;

        if (isEditor) {
          // Old way: Extract from editor
          const model = payloadOrEditor.getModel();
          const cursorPosition = payloadOrEditor.getPosition();
          if (model && cursorPosition) {
            fileContent = model.getValue();
            cursorLine = cursorPosition.lineNumber - 1;
            cursorColumn = cursorPosition.column - 1;
            positionToSave = {
              line: cursorPosition.lineNumber,
              column: cursorPosition.column,
            };
          }
        } else if (typeof payloadOrEditor === "string") {
          // New way: We were passed a direct string (e.g., highlighted text)
          fileContent = payloadOrEditor;
        }

        // Set loading state
        const newState = { ...currentState, isLoading: true };

        // Perform the async API call
        (async () => {
          try {
            const payload = {
              fileContent,
              cursorLine,
              cursorColumn,
              suggestionType: type, // "suggest", "explain", or "debug"
            };

            const response = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (!response.ok)
              throw new Error(`API responded with status ${response.status}`);

            const data = await response.json();

            if (data.suggestion) {
              const resultText = data.suggestion.trim();

              // ✨ UI ROUTING: Explanations to Inline Widget, Suggestions to Ghost Text
              if (type === "explain" || type === "debug") {
                // Instead of toasting, we save it to state!
                setState((prev) => ({
                  ...prev,
                  isLoading: false,
                  explanationData: {
                    text: resultText,
                    type: type,
                    position: positionToSave || { line: 1, column: 1 },
                  },
                }));
              } else {
                // Standard ghost text suggestion
                setState((prev) => ({
                  ...prev,
                  suggestion: resultText,
                  position: positionToSave,
                  isLoading: false,
                }));
              }
            } else {
              setState((prev) => ({ ...prev, isLoading: false }));
            }
          } catch (error) {
            console.error("Error fetching code suggestion:", error);
            toast.error("AI failed to generate a response.");
            setState((prev) => ({ ...prev, isLoading: false }));
          }
        })();

        return newState;
      });
    },
    []
  );

  const acceptSuggestion = useCallback((editor: any, monaco: any) => {
    setState((currentState) => {
      if (
        !currentState.suggestion ||
        !currentState.position ||
        !editor ||
        !monaco
      ) {
        return currentState;
      }

      const { line, column } = currentState.position;
      const sanitizedSuggestion = currentState.suggestion.replace(
        /^\d+:\s*/gm,
        ""
      );

      editor.executeEdits("", [
        {
          range: new monaco.Range(line, column, line, column),
          text: sanitizedSuggestion,
          forceMoveMarkers: true,
        },
      ]);

      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }

      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  const rejectSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }
      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  const clearSuggestion = useCallback((editor: any) => {
    setState((currentState) => {
      if (editor && currentState.decoration.length > 0) {
        editor.deltaDecorations(currentState.decoration, []);
      }
      return {
        ...currentState,
        suggestion: null,
        position: null,
        decoration: [],
      };
    });
  }, []);

  return {
    ...state,
    toggleEnabled,
    fetchSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestion,
    clearExplanation, // ✨ FIX: Added to the return block!
  };
};
