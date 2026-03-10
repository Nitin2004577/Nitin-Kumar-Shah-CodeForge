"use client";

import { useRef, useEffect } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import {
  configureMonaco,
  defaultEditorOptions,
} from "@/../../features/playground/lib/editor-config";
import type { TemplateFile } from "@/../../features/playground/lib/path-to-json";

interface PlaygroundEditorProps {
  activeFile: (TemplateFile & { id: string }) | undefined;
  content: string;
  onContentChange: (value: string) => void;
  onSave: (content: string) => void;
  suggestion: string | null;
  suggestionLoading: boolean;
  suggestionPosition: { line: number; column: number } | null;
  onAcceptSuggestion: (editor: any, monaco: any) => void;
  onRejectSuggestion: (editor: any) => void;
  onTriggerSuggestion: (type: string, editor: any) => void;
}

export const PlaygroundEditor = ({
  activeFile,
  content,
  onContentChange,
  onSave,
  suggestion,
  suggestionLoading,
  suggestionPosition,
  onAcceptSuggestion,
  onRejectSuggestion,
  onTriggerSuggestion,
}: PlaygroundEditorProps) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const fileUri = activeFile
    ? `file:///${activeFile.id}-${activeFile.filename}.${activeFile.fileExtension}`
    : "file:///no-file-selected.txt";

  const handleEditorWillMount = (monaco: Monaco) => {
    // ✨ 1. EXPLICIT FRAMEWORK TYPES (Bypassing wildcard failures)
    const virtualTypes = `
      declare module '*';
      
      // Explicit Frameworks (Fixes "Cannot find module 'tailwindcss'" and 'react')
      declare module 'react';
      declare module 'react-dom';
      declare module 'tailwindcss';
      declare module 'next/*';
      
      // Asset Imports
      declare module '*.css';
      declare module '*.scss';
      declare module '*.svg';
      declare module '*.png';

      // Node Globals
      declare var process: { env: { [key: string]: string | undefined } };
      declare var require: any;
      declare var module: any;
      declare var window: any;
      declare var document: any;
      declare var console: any;

      // React Globals
      declare namespace React {
        function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
        function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
        type FormEvent<T = any> = any;
        type ReactNode = any;
      }
      
      declare namespace JSX {
        interface IntrinsicElements {
          [elemName: string]: any;
        }
      }
    `;

    if (
      !monaco.languages.typescript.typescriptDefaults.getExtraLibs()[
        "file:///ide-globals.d.ts"
      ]
    ) {
      monaco.languages.typescript.typescriptDefaults.addExtraLib(
        virtualTypes,
        "file:///ide-globals.d.ts"
      );
      monaco.languages.typescript.javascriptDefaults.addExtraLib(
        virtualTypes,
        "file:///ide-globals.d.ts"
      );
    }

    // ✨ 2. DISABLE STRICT MODE (Fixes the implicit 'any' error on 'todo')
    const compilerOptions = {
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.ReactJSX,
      reactNamespace: "React",
      allowJs: true,
      strict: false, // <--- THE FIX
      noImplicitAny: false, // <--- THE FIX
      skipLibCheck: true,
    };

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
      compilerOptions
    );
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
      compilerOptions
    );

    monaco.languages.css.cssDefaults.setDiagnosticsOptions({
      validate: true,
      lint: { unknownAtRules: "ignore" },
    });
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // We run your local config FIRST
    configureMonaco(monaco);

    // ✨ 3. THE DIAGNOSTICS NUKE (Run AFTER configureMonaco to prevent overwrites)
    const diagnosticsOptions = {
      noSemanticValidation: true,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [
        2304, 2307, 2580, 2686, 2792, 7016, 7026, 1192, 1375, 1378, 2874,
      ],
    };

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions(
      diagnosticsOptions
    );
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions(
      diagnosticsOptions
    );

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave(editor.getValue());
    });
  };

  useEffect(() => {
    return () => {
      if (monacoRef.current) {
        const models = monacoRef.current.editor.getModels();
        models.forEach((model: any) => model.dispose());
      }
    };
  }, [activeFile?.id]);

  return (
    <div className="h-full relative">
      {suggestionLoading && (
        <div className="absolute top-2 right-2 z-50 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded text-[10px] text-red-500 flex items-center gap-2 backdrop-blur-md">
          <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping"></div>
          AI GENERATING...
        </div>
      )}

      <Editor
        height="100%"
        path={fileUri}
        value={content}
        onChange={(value) => {
          // 🚨 BULLETPROOF FIX: Check if the editor's current internal model
          // exactly matches the file React is trying to edit right now!
          const currentModelUri = editorRef.current
            ?.getModel()
            ?.uri?.toString();

          if (currentModelUri === fileUri) {
            // Safe to save! The model and the React state are in sync.
            onContentChange(value || "");
          } else {
            // Blocked! Monaco fired an event during a tab switch.
            console.warn(
              "Ghost update blocked: Prevented state bleed between files."
            );
          }
        }}
        beforeMount={handleEditorWillMount}
        onMount={handleEditorDidMount}
        options={
          {
            ...defaultEditorOptions,
            fixedOverflowWidgets: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineHeight: 20,
            padding: { top: 10 },
            scrollbar: {
              vertical: "hidden",
              horizontal: "hidden",
            },
          } as any
        }
      />
    </div>
  );
};
