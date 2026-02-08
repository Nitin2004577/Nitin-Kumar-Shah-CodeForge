"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { PlaygroundData, TemplateFolder, OpenFile } from "@/components/ui/loader";

interface PlaygroundContextType {
  // Data & State
  playgroundData: PlaygroundData | null;
  templateData: TemplateFolder | null;
  activeFileId: string | null;
  openFiles: OpenFile[];
  
  // Status Flags (Fixes your errors)
  loadingStep: number;
  error: string | null;
  
  // UI State
  isPreviewVisible: boolean;
  isTerminalVisible: boolean;
  isAISuggestionsEnabled: boolean;

  // Actions
  fetchPlaygroundData: () => Promise<void>;
  handleSave: () => void;
  handleSaveAll: () => void;
  setIsPreviewVisible: (visible: boolean) => void;
  setIsTerminalVisible: (visible: boolean) => void;
  setIsAISuggestionsEnabled: (enabled: boolean) => void;
  setActiveFileId: (id: string | null) => void;
}

const PlaygroundContext = createContext<PlaygroundContextType | undefined>(undefined);

export function PlaygroundProvider({ children }: { children: ReactNode }) {
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(null);
  const [templateData, setTemplateData] = useState<TemplateFolder | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([]);
  
  const [loadingStep, setLoadingStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [isTerminalVisible, setIsTerminalVisible] = useState(true);
  const [isAISuggestionsEnabled, setIsAISuggestionsEnabled] = useState(true);

  // Logic to handle the loading sequence
  const fetchPlaygroundData = async () => {
    try {
      setError(null);
      setLoadingStep(1);
      
      // Simulate loading metadata
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLoadingStep(2);
      
      // Simulate loading file structure
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock some template data so the layout moves past the loading screen
      setTemplateData({ folderName: "root", items: [] });
      setLoadingStep(3);
      
    } catch (err) {
      setError("Failed to load playground environment.");
    }
  };

  useEffect(() => {
    fetchPlaygroundData();
  }, []);

  const handleSave = () => console.log("Save triggered");
  const handleSaveAll = () => console.log("Save All triggered");

  return (
    <PlaygroundContext.Provider
      value={{
        playgroundData,
        templateData,
        activeFileId,
        openFiles,
        loadingStep,
        error,
        isPreviewVisible,
        isTerminalVisible,
        isAISuggestionsEnabled,
        fetchPlaygroundData,
        handleSave,
        handleSaveAll,
        setIsPreviewVisible,
        setIsTerminalVisible,
        setIsAISuggestionsEnabled,
        setActiveFileId,
      }}
    >
      {children}
    </PlaygroundContext.Provider>
  );
}

export function usePlayground() {
  const context = useContext(PlaygroundContext);
  if (context === undefined) {
    throw new Error("usePlayground must be used within a PlaygroundProvider");
  }
  return context;
}