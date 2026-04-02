"use client";

import { useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAIStore } from "../store/useAIStore";

const DEBOUNCE_MS = 3000;

export function useAISuggestions() {
  const store = useAIStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestion = useCallback(
    async (type: string, payloadOrEditor: any) => {
      if (!store.isEnabled || !payloadOrEditor) return;

      // Cancel any pending debounced call
      if (debounceRef.current) clearTimeout(debounceRef.current);

      let fileContent = "";
      let cursorLine = 0;
      let cursorColumn = 0;
      let position: { line: number; column: number } | null = null;

      const isEditor = typeof payloadOrEditor?.getModel === "function";

      if (isEditor) {
        const model = payloadOrEditor.getModel();
        const cursor = payloadOrEditor.getPosition();
        if (model && cursor) {
          fileContent = model.getValue();
          cursorLine = cursor.lineNumber - 1;
          cursorColumn = cursor.column - 1;
          position = { line: cursor.lineNumber, column: cursor.column };
        }
      } else if (typeof payloadOrEditor === "string") {
        fileContent = payloadOrEditor;
      }

      store.setLoading(true);

      debounceRef.current = setTimeout(async () => {
        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileContent, cursorLine, cursorColumn, suggestionType: type }),
          });

          if (!res.ok) throw new Error(`API error ${res.status}`);

          const data = await res.json();
          const text = data.suggestion?.trim();
          if (!text) { store.setLoading(false); return; }

          if (type === "explain" || type === "debug") {
            store.setExplanationData({
              text,
              type: type as "explain" | "debug",
              position: position ?? { line: 1, column: 1 },
            });
          } else {
            store.setSuggestion(text, position);
          }
        } catch (err) {
          store.setLoading(false);
          if (type !== "suggest") {
            toast.error("AI failed to respond. Please try again.");
          }
        }
      }, DEBOUNCE_MS);
    },
    [store]
  );

  const acceptSuggestion = useCallback(
    (editor: any, monaco: any) => {
      if (!store.suggestion || !store.position || !editor || !monaco) return;
      const { line, column } = store.position;
      const sanitized = store.suggestion.replace(/^\d+:\s*/gm, "");
      editor.executeEdits("ai", [
        {
          range: new monaco.Range(line, column, line, column),
          text: sanitized,
          forceMoveMarkers: true,
        },
      ]);
      if (store.decorations.length > 0) {
        editor.deltaDecorations(store.decorations, []);
      }
      store.clearSuggestion();
    },
    [store]
  );

  const rejectSuggestion = useCallback(
    (editor: any) => {
      if (editor && store.decorations.length > 0) {
        editor.deltaDecorations(store.decorations, []);
      }
      store.clearSuggestion();
    },
    [store]
  );

  return {
    // State
    suggestion: store.suggestion,
    isLoading: store.isLoading,
    position: store.position,
    decoration: store.decorations,
    isEnabled: store.isEnabled,
    explanationData: store.explanationData,
    // Actions
    toggleEnabled: store.toggleEnabled,
    fetchSuggestion,
    acceptSuggestion,
    rejectSuggestion,
    clearSuggestion: store.clearSuggestion,
    clearExplanation: store.clearExplanation,
  };
}
