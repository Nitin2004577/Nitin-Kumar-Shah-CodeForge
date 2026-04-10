"use client";

import { useRef, useEffect } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import {
  configureMonaco,
  defaultEditorOptions,
} from "../lib/editor-config";
import type { TemplateFile } from "../lib/path-to-json";

interface PlaygroundEditorProps {
  activeFile: (TemplateFile & { id: string }) | undefined;
  content: string;
  onContentChange: (value: string) => void;
  onSave: (content: string) => void;
  onEditorMount?: (editor: any, monaco: any) => void;
  suggestion: string | null;
  suggestionLoading: boolean;
  suggestionPosition: { line: number; column: number } | null;
  onAcceptSuggestion: (editor: any, monaco: any) => void;
  onRejectSuggestion: (editor: any) => void;
  onTriggerSuggestion: (type: string, payload?: any) => void;
  // ✨ NEW: Props for the floating explanation widget
  explanationData: {
    text: string;
    type: string;
    position: { line: number; column: number };
  } | null;
  clearExplanation: () => void;
}

export const PlaygroundEditor = ({
  activeFile,
  content,
  onContentChange,
  onSave,
  onEditorMount,
  suggestion,
  suggestionLoading,
  suggestionPosition,
  onAcceptSuggestion,
  onRejectSuggestion,
  onTriggerSuggestion,
  explanationData,
  clearExplanation,
}: PlaygroundEditorProps) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Ref to hold our inline completion provider so we can clean it up
  const completionProviderRef = useRef<any>(null);

  const fileUri = activeFile
    ? `file:///${activeFile.id}-${activeFile.filename}.${activeFile.fileExtension}`
    : "file:///no-file-selected.txt";

  const handleEditorWillMount = (monaco: Monaco) => {
    // 1. EXPLICIT FRAMEWORK TYPES
    const virtualTypes = `
      declare module '*';
      declare module 'react';
      declare module 'react-dom';
      declare module 'tailwindcss';
      declare module 'next/*';
      declare module '*.css';
      declare module '*.scss';
      declare module '*.svg';
      declare module '*.png';
      declare var process: { env: { [key: string]: string | undefined } };
      declare var require: any;
      declare var module: any;
      declare var window: any;
      declare var document: any;
      declare var console: any;
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

    // 2. DISABLE STRICT MODE
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
      strict: false,
      noImplicitAny: false,
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
    onEditorMount?.(editor, monaco);

    configureMonaco(monaco);

    // 3. THE DIAGNOSTICS NUKE
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

    // Save Command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave(editor.getValue());
    });

    // ==========================================
    // ✨ FYP AI FEATURE 1: RIGHT CLICK EXPLANATION & DEBUGGING
    // ==========================================

    // Action 1: Explain Code
    editor.addAction({
      id: "ai-explain-code",
      label: "✨ AI: Explain this code",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1,
      run: (ed: any) => {
        const selection = ed.getSelection();
        const selectedText = ed.getModel()?.getValueInRange(selection);

        if (!selectedText || selectedText.trim() === "") {
          alert(
            "Please highlight some code first so the AI knows what to explain!"
          );
          return;
        }

        onTriggerSuggestion("explain", ed);
      },
    });

    // Action 2: Debug Code
    editor.addAction({
      id: "ai-debug-code",
      label: "🐛 AI: Debug this code",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 2,
      run: (ed: any) => {
        const selection = ed.getSelection();
        const selectedText = ed.getModel()?.getValueInRange(selection);

        if (!selectedText || selectedText.trim() === "") {
          alert(
            "Please highlight some code first so the AI knows what to debug!"
          );
          return;
        }

        onTriggerSuggestion("debug", ed);
      },
    });

    // ==========================================
    // ✨ FYP AI FEATURE 2: GHOST TEXT (INLINE COMPLETIONS)
    // ==========================================

    if (completionProviderRef.current) {
      completionProviderRef.current.dispose();
    }

    completionProviderRef.current =
      monaco.languages.registerInlineCompletionsProvider("*", {
        provideInlineCompletions: async (
          model: any,
          position: any,
          context: any,
          token: any
        ) => {
          const currentLine = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          onTriggerSuggestion("suggest", currentLine);

          if (suggestion) {
            return {
              items: [
                {
                  insertText: suggestion,
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column
                  ),
                },
              ],
            };
          }
          return { items: [] };
        },
        freeInlineCompletions: () => {},
      });
  };

  // ✨ NEW: Floating Content Widget for Explanations/Debugging
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !explanationData) return;

    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const domNode = document.createElement("div");

    // Tailwind styles for the floating card
    domNode.className =
      "z-[9999] w-[450px] bg-[#0f111a] text-gray-200 border border-gray-700/50 rounded-xl shadow-2xl p-4 flex flex-col gap-3";

    const safeText = explanationData.text
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    domNode.innerHTML = `
      <div class="flex items-center justify-between border-b border-gray-700/50 pb-2">
        <h3 class="font-semibold text-sm flex items-center gap-2 ${
          explanationData.type === "explain"
            ? "text-blue-400"
            : "text-orange-400"
        }">
          ${
            explanationData.type === "explain"
              ? "✨ AI Explanation"
              : "🐛 AI Debugger"
          }
        </h3>
        <button id="close-ai-widget" class="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="text-sm leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto font-mono text-gray-300">
         ${safeText}
      </div>
    `;

    domNode.querySelector("#close-ai-widget")?.addEventListener("click", () => {
      clearExplanation();
    });

    const contentWidget = {
      getId: () => "ai.explanation.widget",
      getDomNode: () => domNode,
      getPosition: () => ({
        position: {
          lineNumber: explanationData.position.line,
          column: explanationData.position.column,
        },
        preference: [
          monaco.editor.ContentWidgetPositionPreference.BELOW,
          monaco.editor.ContentWidgetPositionPreference.ABOVE,
        ],
      }),
    };

    editor.addContentWidget(contentWidget);

    return () => {
      editor.removeContentWidget(contentWidget);
    };
  }, [explanationData, clearExplanation]);

  useEffect(() => {
    return () => {
      if (monacoRef.current) {
        const models = monacoRef.current.editor.getModels();
        models.forEach((model: any) => model.dispose());
      }
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, []);

  return (
    <div className="h-full relative">
      {suggestionLoading && (
        <div className="absolute top-2 right-2 z-50 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-md text-[11px] font-mono text-indigo-400 flex items-center gap-2 backdrop-blur-md shadow-sm">
          <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></div>
          AI IS THINKING...
        </div>
      )}

      <Editor
        height="100%"
        path={fileUri}
        value={content}
        onChange={(value) => {
          const currentModelUri = editorRef.current
            ?.getModel()
            ?.uri?.toString();
          if (currentModelUri === fileUri) {
            onContentChange(value || "");
          } else {
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
