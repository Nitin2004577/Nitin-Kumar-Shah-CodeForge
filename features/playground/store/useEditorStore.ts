import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { toast } from "sonner";
import type { TemplateFile, TemplateFolder, OpenFile } from "../types";
import { generateFileId } from "../lib";

// ─── State shape ──────────────────────────────────────────────────────────────
interface EditorState {
  // Per-playground context
  playgroundId: string;

  // File tree (mirrors DB, kept in sync on save)
  templateData: TemplateFolder | null;

  // Open tabs
  openFiles: OpenFile[];
  activeFileId: string | null;

  // UI
  isPreviewVisible: boolean;
  isTerminalVisible: boolean;
  terminalHeight: number;
}

// ─── Actions shape ────────────────────────────────────────────────────────────
interface EditorActions {
  // Initialization
  setPlaygroundId: (id: string) => void;
  setTemplateData: (data: TemplateFolder | null) => void;

  // Tab management
  openFile: (file: TemplateFile) => void;
  closeFile: (fileId: string) => void;
  closeAllFiles: () => void;
  setActiveFileId: (id: string | null) => void;

  // Content
  updateFileContent: (fileId: string, content: string) => void;
  markFileSaved: (fileId: string) => void;
  markAllSaved: () => void;

  // File tree mutations (optimistic — caller must persist to DB)
  addFileToTree: (file: TemplateFile, parentPath: string) => void;
  addFolderToTree: (folder: TemplateFolder, parentPath: string) => void;
  deleteFileFromTree: (file: TemplateFile, parentPath: string) => void;
  deleteFolderFromTree: (folder: TemplateFolder, parentPath: string) => void;
  renameFileInTree: (file: TemplateFile, newName: string, newExt: string, parentPath: string) => void;
  renameFolderInTree: (folder: TemplateFolder, newName: string, parentPath: string) => void;

  // UI
  setIsPreviewVisible: (v: boolean) => void;
  setIsTerminalVisible: (v: boolean) => void;
  setTerminalHeight: (h: number) => void;
}

type EditorStore = EditorState & EditorActions;

// ─── Helper: traverse tree to a folder by path ───────────────────────────────
function getFolderAtPath(root: TemplateFolder, pathParts: string[]): TemplateFolder {
  let current = root;
  for (const part of pathParts) {
    if (!part) continue;
    const next = current.items.find(
      (i) => "folderName" in i && i.folderName === part
    ) as TemplateFolder | undefined;
    if (next) current = next;
  }
  return current;
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useEditorStore = create<EditorStore>()(
  persist(
    immer((set, get) => ({
      // ── Initial state ──
      playgroundId: "",
      templateData: null,
      openFiles: [],
      activeFileId: null,
      isPreviewVisible: true,
      isTerminalVisible: true,
      terminalHeight: 256,

      // ── Initialization ──
      setPlaygroundId: (id) => set({ playgroundId: id }),
      setTemplateData: (data) => set({ templateData: data }),

      // ── Tab management ──
      openFile: (file) => {
        const fileId = generateFileId(file, get().templateData!);
        const existing = get().openFiles.find((f) => f.id === fileId);
        if (existing) {
          set({ activeFileId: fileId });
          return;
        }
        set((state) => {
          state.openFiles.push({
            ...file,
            id: fileId,
            hasUnsavedChanges: false,
            content: file.content ?? "",
            originalContent: file.content ?? "",
          });
          state.activeFileId = fileId;
        });
      },

      closeFile: (fileId) => {
        const file = get().openFiles.find((f) => f.id === fileId);
        if (file?.hasUnsavedChanges) {
          toast.error("Save your changes before closing.");
          return;
        }
        set((state) => {
          state.openFiles = state.openFiles.filter((f) => f.id !== fileId);
          if (state.activeFileId === fileId) {
            state.activeFileId = state.openFiles.at(-1)?.id ?? null;
          }
        });
      },

      closeAllFiles: () =>
        set({ openFiles: [], activeFileId: null }),

      setActiveFileId: (id) => set({ activeFileId: id }),

      // ── Content ──
      updateFileContent: (fileId, content) =>
        set((state) => {
          const file = state.openFiles.find((f) => f.id === fileId);
          if (!file) return;
          file.content = content;
          file.hasUnsavedChanges = content !== file.originalContent;
        }),

      markFileSaved: (fileId) =>
        set((state) => {
          const file = state.openFiles.find((f) => f.id === fileId);
          if (!file) return;
          file.originalContent = file.content;
          file.hasUnsavedChanges = false;
        }),

      markAllSaved: () =>
        set((state) => {
          state.openFiles.forEach((f) => {
            f.originalContent = f.content;
            f.hasUnsavedChanges = false;
          });
        }),

      // ── File tree mutations ──
      addFileToTree: (file, parentPath) =>
        set((state) => {
          if (!state.templateData) return;
          const folder = getFolderAtPath(state.templateData, parentPath.split("/"));
          folder.items.push(file);
        }),

      addFolderToTree: (folder, parentPath) =>
        set((state) => {
          if (!state.templateData) return;
          const parent = getFolderAtPath(state.templateData, parentPath.split("/"));
          parent.items.push(folder);
        }),

      deleteFileFromTree: (file, parentPath) =>
        set((state) => {
          if (!state.templateData) return;
          const folder = getFolderAtPath(state.templateData, parentPath.split("/"));
          folder.items = folder.items.filter(
            (i) =>
              !("filename" in i) ||
              i.filename !== file.filename ||
              i.fileExtension !== file.fileExtension
          );
          // Close tab if open
          const fileId = generateFileId(file, state.templateData!);
          state.openFiles = state.openFiles.filter((f) => f.id !== fileId);
          if (state.activeFileId === fileId) {
            state.activeFileId = state.openFiles.at(-1)?.id ?? null;
          }
        }),

      deleteFolderFromTree: (folder, parentPath) =>
        set((state) => {
          if (!state.templateData) return;
          const parent = getFolderAtPath(state.templateData, parentPath.split("/"));
          parent.items = parent.items.filter(
            (i) => !("folderName" in i) || i.folderName !== folder.folderName
          );
        }),

      renameFileInTree: (file, newName, newExt, parentPath) =>
        set((state) => {
          if (!state.templateData) return;
          const folder = getFolderAtPath(state.templateData, parentPath.split("/"));
          const idx = folder.items.findIndex(
            (i) =>
              "filename" in i &&
              i.filename === file.filename &&
              i.fileExtension === file.fileExtension
          );
          if (idx === -1) return;
          const oldId = generateFileId(file, state.templateData!);
          (folder.items[idx] as TemplateFile).filename = newName;
          (folder.items[idx] as TemplateFile).fileExtension = newExt;
          const newId = generateFileId(folder.items[idx] as TemplateFile, state.templateData!);
          // Update open tab
          const tab = state.openFiles.find((f) => f.id === oldId);
          if (tab) {
            tab.id = newId;
            tab.filename = newName;
            tab.fileExtension = newExt;
          }
          if (state.activeFileId === oldId) state.activeFileId = newId;
        }),

      renameFolderInTree: (folder, newName, parentPath) =>
        set((state) => {
          if (!state.templateData) return;
          const parent = getFolderAtPath(state.templateData, parentPath.split("/"));
          const target = parent.items.find(
            (i) => "folderName" in i && i.folderName === folder.folderName
          ) as TemplateFolder | undefined;
          if (target) target.folderName = newName;
        }),

      // ── UI ──
      setIsPreviewVisible: (v) => set({ isPreviewVisible: v }),
      setIsTerminalVisible: (v) => set({ isTerminalVisible: v }),
      setTerminalHeight: (h) => set({ terminalHeight: h }),
    })),
    {
      name: "codeforge-editor-store",
      storage: createJSONStorage(() => localStorage),
      // Only persist UI preferences and open tabs — NOT templateData (too large, use React Query cache)
      partialize: (state) => ({
        playgroundId: state.playgroundId,
        openFiles: state.openFiles,
        activeFileId: state.activeFileId,
        isPreviewVisible: state.isPreviewVisible,
        isTerminalVisible: state.isTerminalVisible,
        terminalHeight: state.terminalHeight,
      }),
    }
  )
);
