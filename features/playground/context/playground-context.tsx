"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useParams } from "next/navigation";

// --- Real Feature Hooks ---
import { usePlayground } from "@/../features/playground/hooks/usePlayground";
import { useFileExplorer } from "@/../features/playground/hooks/useFileExplorer";
import { useAISuggestions } from "@/../features/playground/hooks/useAISuggestion";
import { usePlaygroundLogic } from "@/../features/playground/hooks/usePlaygroundLogic";

interface PlaygroundContextType {
  playgroundData: any;
  templateData: any;
  loadingStep: number;
  error: string | null;
  explorer: any;
  ai: any;
  logic: any;
  isTerminalVisible: boolean;
  setIsTerminalVisible: (visible: boolean) => void;
}

const PlaygroundContext = createContext<PlaygroundContextType | undefined>(undefined);

export function PlaygroundProvider({ children }: { children: ReactNode }) {
  const { id } = useParams<{ id: string }>();

  // Initialize all IDE engines
  const { playgroundData, templateData, isLoading, error } = usePlayground(id);
  const explorer = useFileExplorer();
  const ai = useAISuggestions();
  
  // Use a dummy save function if one isn't provided by usePlayground
  const saveTemplateData = async (data: any) => console.log("Saving...", data);
  const logic = usePlaygroundLogic(id, templateData, saveTemplateData);

  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [loadingStep, setLoadingStep] = useState(1);

  useEffect(() => {
    if (isLoading) setLoadingStep(2);
    else if (templateData) setLoadingStep(3);
    if (error) setLoadingStep(0);
  }, [isLoading, templateData, error]);

  const value: PlaygroundContextType = {
    playgroundData,
    templateData,
    loadingStep,
    error,
    explorer: explorer as any,
    ai: ai as any,
    logic: logic as any,
    isTerminalVisible,
    setIsTerminalVisible,
  };

  return (
    <PlaygroundContext.Provider value={value}>
      {children}
    </PlaygroundContext.Provider>
  );
}

export function usePlaygroundContext() {
  const context = useContext(PlaygroundContext);
  if (context === undefined) {
    throw new Error("usePlaygroundContext must be used within a PlaygroundProvider");
  }
  return context;
}