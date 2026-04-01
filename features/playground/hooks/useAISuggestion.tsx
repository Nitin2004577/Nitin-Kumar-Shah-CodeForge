import { useState, useCallback, useRef } from "react";
import { toast } from "sonner";

interface AISuggestionsState {
  suggestion: string | null;
  isLoading: boolean;
  position: { line: number; column: number } | null;
  decoration: string[];
  isEnabled: boolean;
  explanationData: {
    text: string;
    type: string;
    position: { line: number; column: number };
  } | null;
}

interface UseAISuggestionsReturn extends AISuggestionsState {
  toggleEnabled: () => void;
  fetchSuggestion: (type: string, payloadOrEditor: any) => Promise<void>;
  acceptSuggestion: (editor: any, monaco: any) => void;
  rejectSuggestion: (editor: any) => void;
  clearSuggestion: (editor: any) => void;
  clearExplanation: () => void;
}

export const useAISuggestions = (): UseAISuggestionsReturn => {
  const [state, setState] = useState<AISuggestionsState>({
    suggestion: null,
    isLoading: false,
    position: null,
    decoration: [],
    isEnabled: true,
    explanationData: null,
  });

  // ✨ DEBOUNCE TIMER REF
  // We use this to keep track of our active setTimeout so we can cancel it
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const toggleEnabled = useCallback(() => {
    setState((prev) => ({ ...prev, isEnabled: !prev.isEnabled }));
  }, []);

  const clearExplanation = useCallback(() => {
    setState((prev) => ({ ...prev, explanationData: null }));
  }, []);

  const fetchSuggestion = useCallback(
    async (type: string, payloadOrEditor: any) => {
      
      // 1. Immediately cancel any pending API calls
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      setState((currentState) => {
        if (!currentState.isEnabled) {
          return currentState;
        }

        if (!payloadOrEditor) {
          return currentState;
        }

        const isEditor = typeof payloadOrEditor.getModel === "function";

        let fileContent = "";
        let cursorLine = 0;
        let cursorColumn = 0;
        let positionToSave = currentState.position;

        if (isEditor) {
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
          fileContent = payloadOrEditor;
        }

        // 2. Set the loading state visually so the user knows it's thinking
        const newState = { ...currentState, isLoading: true };

        // 3. Start the new Debounce Timer (1500 milliseconds = 1.5 seconds)
        debounceTimerRef.current = setTimeout(async () => {
          try {
            const payload = {
              fileContent,
              cursorLine,
              cursorColumn,
              suggestionType: type, 
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

              if (type === "explain" || type === "debug") {
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
            // Only show toast if it's NOT a background suggest, to avoid annoying spam
            if (type !== 'suggest') {
                toast.error("AI failed to generate a response. Please try again in a moment.");
            }
            setState((prev) => ({ ...prev, isLoading: false }));
          }
        }, 3000); // Increased debounce to preserve API quota

        return newState;
      });
    },
    []
  );

  const acceptSuggestion = useCallback((editor: any, monaco: any) => {
    setState((currentState) => {
      if (!currentState.suggestion || !currentState.position || !editor || !monaco) {
        return currentState;
      }

      const { line, column } = currentState.position;
      const sanitizedSuggestion = currentState.suggestion.replace(/^\d+:\s*/gm, "");

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
    clearExplanation,
  };
};