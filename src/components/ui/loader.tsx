import React from "react";

export interface TemplateFile {
  filename: string;
  fileExtension: string;
  content: string;
}

export interface PlaygroundData {
  id: string;
  name?: string;
  [key: string]: any;
}

export interface TemplateFolder {
  folderName: string;
  items: (TemplateFile | TemplateFolder)[];
}

export interface LoadingStepProps {
  currentStep: number;
  step: number;
  label: string;
}

export interface OpenFile extends TemplateFile {
  id: string;
  hasUnsavedChanges: boolean;
  content: string;
  originalContent: string;
}

/**
 * LoadingStep Component
 * Renders an individual step in the loading progress sequence.
 */
export const LoadingStep = ({ currentStep, step, label }: LoadingStepProps) => {
  const isCompleted = currentStep > step;
  const isActive = currentStep === step;

  return (
    <div className="flex items-center gap-3 py-2">
      <div 
        className={`flex items-center justify-center w-6 h-6 rounded-full border text-xs font-medium transition-colors
        ${isCompleted ? "bg-green-500 border-green-500 text-white" : 
          isActive ? "bg-red-600 border-red-600 text-white animate-pulse" : 
          "bg-background border-muted text-muted-foreground"}`}
      >
        {isCompleted ? "✓" : step}
      </div>
      <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
};

// Default export to prevent "no default export" errors if someone imports it without braces
export default LoadingStep;