import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface ExplanationData {
  text: string;
  type: "explain" | "debug";
  position: { line: number; column: number };
}

interface AIState {
  isEnabled: boolean;
  suggestion: string | null;
  isLoading: boolean;
  position: { line: number; column: number } | null;
  decorations: string[];
  explanationData: ExplanationData | null;
}

interface AIActions {
  setEnabled: (v: boolean) => void;
  toggleEnabled: () => void;
  setSuggestion: (text: string | null, position?: { line: number; column: number } | null) => void;
  setLoading: (v: boolean) => void;
  setDecorations: (d: string[]) => void;
  setExplanationData: (data: ExplanationData | null) => void;
  clearSuggestion: () => void;
  clearExplanation: () => void;
  reset: () => void;
}

const initialState: AIState = {
  isEnabled: true,
  suggestion: null,
  isLoading: false,
  position: null,
  decorations: [],
  explanationData: null,
};

export const useAIStore = create<AIState & AIActions>()(
  persist(
    (set) => ({
      ...initialState,

      setEnabled: (v) => set({ isEnabled: v }),
      toggleEnabled: () => set((s) => ({ isEnabled: !s.isEnabled })),

      setSuggestion: (text, position = null) =>
        set({ suggestion: text, position, isLoading: false }),

      setLoading: (v) => set({ isLoading: v }),
      setDecorations: (d) => set({ decorations: d }),

      setExplanationData: (data) =>
        set({ explanationData: data, isLoading: false }),

      clearSuggestion: () =>
        set({ suggestion: null, position: null, decorations: [] }),

      clearExplanation: () => set({ explanationData: null }),

      reset: () => set(initialState),
    }),
    {
      name: "codeforge-ai-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist the toggle preference
      partialize: (state) => ({ isEnabled: state.isEnabled }),
    }
  )
);
