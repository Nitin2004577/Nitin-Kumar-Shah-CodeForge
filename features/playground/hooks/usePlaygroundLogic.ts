import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { WebContainer } from "@webcontainer/api";

// Git Imports
import git from "isomorphic-git";
import http from "isomorphic-git/http/web";

// Hooks
import { useFileExplorer } from "./useFileExplorer";
import { useWebContainer } from "@/../features/webcontianers/hooks/useWebContainer";

// Libs & Types
import { findFilePath } from "../lib";
import { TemplateFile, TemplateFolder } from "../types";

export const usePlaygroundLogic = (
  id: string,
  templateData: any,
  saveTemplateData: (data: any) => Promise<any>
) => {
  // --- 1. Local UI State ---
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  // --- 1.1 Git State (NEW) ---
  const [isPushing, setIsPushing] = useState(false);
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [gitSettings, setGitSettings] = useState({ token: "", repoUrl: "" });

  const lastSyncedContent = useRef<Map<string, string>>(new Map());
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

  // Load Git settings from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("codeforge_git_settings");
    if (saved) {
      try {
        setGitSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse git settings");
      }
    }
  }, []);

  // --- 2. WebContainer Initialization ---
  const {
    isLoading: containerLoading,
    error: containerError,
    instance,
  } = useWebContainer();

  // Helper: Write File Wrapper
  const writeFileSync = useCallback(
    async (path: string, content: string) => {
      if (!instance) return;
      try {
        await instance.fs.writeFile(path, content);
      } catch (err) {
        console.error("Failed to write to container:", err);
      }
    },
    [instance]
  );

  // --- 2.5.1 Listener for Server URL ---
  useEffect(() => {
    if (!instance) return;
    const onServerReady = (port: number, url: string) => {
      setServerUrl(url);
    };
    instance.on("server-ready", onServerReady);
  }, [instance]);

  // --- 2.5.2 Manual Mount Effect ---
  useEffect(() => {
    const mountFiles = async () => {
      if (instance && templateData) {
        try {
          await instance.mount(templateData);
        } catch (e) {
          console.error("Failed to mount files", e);
        }
      }
    };
    mountFiles();
  }, [instance, templateData]);

  // --- 3. File Explorer Integration ---
  const explorer = useFileExplorer();

  useEffect(() => {
    explorer.setPlaygroundId(id);
  }, [id, explorer.setPlaygroundId]);

  useEffect(() => {
    if (templateData && !explorer.openFiles.length) {
      explorer.setTemplateData(templateData);
    }
  }, [templateData, explorer.setTemplateData, explorer.openFiles.length]);

  // --- 4. Helper: Confirmation Dialog ---
  const requestConfirmation = useCallback(
    (title: string, description: string, action: () => void) => {
      setDialogState({
        isOpen: true,
        title,
        description,
        onConfirm: () => {
          action();
          setDialogState((prev) => ({ ...prev, isOpen: false }));
        },
        onCancel: () => setDialogState((prev) => ({ ...prev, isOpen: false })),
      });
    },
    []
  );

  // --- 5. Git Logic (NEW) ---
  const handlePushToGithub = useCallback(async () => {
    if (!instance) {
      toast.error("Environment not ready");
      return;
    }

    if (!gitSettings.token || !gitSettings.repoUrl) {
      setIsGitModalOpen(true);
      return;
    }

    setIsPushing(true);
    const toastId = toast.loading("Pushing to GitHub...");

    try {
      const dir = "/";
      const wcFs = instance.fs;

      // The Shim to translate WebContainer FS to Node FS for isomorphic-git
      const fsShim: any = {
        promises: {
          readFile: wcFs.readFile.bind(wcFs),
          writeFile: wcFs.writeFile.bind(wcFs),
          readdir: wcFs.readdir.bind(wcFs),
          mkdir: wcFs.mkdir.bind(wcFs),
          unlink: wcFs.rm.bind(wcFs),
          rmdir: wcFs.rm.bind(wcFs),
          stat: async (path: string) => {
            const pathParts = path.split('/').filter(Boolean);
            const name = pathParts.pop();
            const parentDir = '/' + pathParts.join('/');
            try {
              const entries = await wcFs.readdir(parentDir, { withFileTypes: true });
              const entry = entries.find(e => e.name === name);
              return {
                type: entry?.isDirectory() ? 'dir' : 'file',
                mode: entry?.isDirectory() ? 0o777 : 0o666,
                size: 0,
                ino: 0,
                mtimeMs: Date.now(),
                isDirectory: () => entry?.isDirectory() || false,
                isFile: () => !entry?.isDirectory() || true,
                isSymbolicLink: () => false,
              };
            } catch {
              return { type: 'dir', mode: 0o777, size: 0, isDirectory: () => true, isFile: () => false };
            }
          },
          lstat: async (path: string) => fsShim.promises.stat(path),
        }
      };

      try { await git.init({ fs: fsShim, dir }); } catch (e) {}
      await git.add({ fs: fsShim, dir, filepath: "." });
      await git.commit({
        fs: fsShim,
        dir,
        message: `CodeForge Update: ${new Date().toLocaleString()}`,
        author: { name: "CodeForge User", email: "user@codeforge.dev" },
      });

      await git.push({
        fs: fsShim,
        http,
        dir,
        remote: "origin",
        url: gitSettings.repoUrl,
        onAuth: () => ({ username: gitSettings.token }),
      });

      toast.success("Successfully pushed to GitHub!", { id: toastId });
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("401")) {
        toast.error("GitHub Auth Failed", { id: toastId });
        setIsGitModalOpen(true);
      } else {
        toast.error(`Push failed: ${err.message}`, { id: toastId });
      }
    } finally {
      setIsPushing(false);
    }
  }, [instance, gitSettings]);

  // --- 6. File Operation Wrappers ---
  const handleAddFile = useCallback(
    (newFile: TemplateFile, parentPath: string) => {
      return explorer.handleAddFile(
        newFile,
        parentPath,
        async (path, content) => {
          await writeFileSync(path, content);
        },
        undefined,
        saveTemplateData
      );
    },
    [explorer, writeFileSync, saveTemplateData]
  );

  const handleAddFolder = useCallback(
    (newFolder: TemplateFolder, parentPath: string) => {
      return explorer.handleAddFolder(
        newFolder,
        parentPath,
        instance,
        saveTemplateData
      );
    },
    [explorer, instance, saveTemplateData]
  );

  const handleRenameFile = useCallback(
    (file: TemplateFile, newName: string, newExt: string, parentPath: string) => {
      return explorer.handleRenameFile(file, newName, newExt, parentPath, saveTemplateData);
    },
    [explorer, saveTemplateData]
  );

  const handleRenameFolder = useCallback(
    (folder: TemplateFolder, newName: string, parentPath: string) => {
      return explorer.handleRenameFolder(folder, newName, parentPath, saveTemplateData);
    },
    [explorer, saveTemplateData]
  );

  const handleDeleteFile = useCallback(
    (file: TemplateFile, parentPath: string) => {
      requestConfirmation(
        "Delete File",
        `Are you sure you want to delete ${file.filename}.${file.fileExtension}?`,
        () => explorer.handleDeleteFile(file, parentPath, saveTemplateData)
      );
    },
    [explorer, saveTemplateData, requestConfirmation]
  );

  const handleDeleteFolder = useCallback(
    (folder: TemplateFolder, parentPath: string) => {
      requestConfirmation(
        "Delete Folder",
        `Are you sure you want to delete ${folder.folderName} and all its contents?`,
        () => explorer.handleDeleteFolder(folder, parentPath, saveTemplateData)
      );
    },
    [explorer, saveTemplateData, requestConfirmation]
  );

  // --- 7. Save Logic ---
  const handleSave = useCallback(
    async (fileId?: string) => {
      const targetFileId = fileId || explorer.activeFileId;
      if (!targetFileId) return;

      const fileToSave = explorer.openFiles.find((f) => f.id === targetFileId);
      if (!fileToSave) return;

      const latestData = useFileExplorer.getState().templateData;
      if (!latestData) return;

      try {
        const filePath = findFilePath(fileToSave, latestData);
        if (!filePath) throw new Error("File path not found");

        const updatedData = JSON.parse(JSON.stringify(latestData));
        const lastContent = lastSyncedContent.current.get(fileToSave.id);

        if (lastContent !== fileToSave.content) {
          await writeFileSync(filePath, fileToSave.content);
          lastSyncedContent.current.set(fileToSave.id, fileToSave.content);
        }

        const newData = await saveTemplateData(updatedData);
        if (newData) explorer.setTemplateData(newData);

        explorer.setOpenFiles(
          explorer.openFiles.map((f) =>
            f.id === targetFileId
              ? { ...f, hasUnsavedChanges: false, originalContent: f.content }
              : f
          )
        );

        toast.success(`Saved ${fileToSave.filename}.${fileToSave.fileExtension}`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to save file");
      }
    },
    [explorer, writeFileSync, saveTemplateData]
  );

  const handleSaveAll = useCallback(async () => {
    const unsavedFiles = explorer.openFiles.filter((f) => f.hasUnsavedChanges);
    if (unsavedFiles.length === 0) return;

    const toastId = toast.loading(`Saving ${unsavedFiles.length} files...`);
    try {
      await Promise.all(unsavedFiles.map((f) => handleSave(f.id)));
      toast.dismiss(toastId);
      toast.success("All files saved");
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to save some files");
    }
  }, [explorer.openFiles, handleSave]);

  // --- 8. Shortcuts ---
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  return {
    isPreviewVisible,
    setIsPreviewVisible,
    containerLoading,
    containerError,
    serverUrl,
    instance,
    writeFileSync,
    
    // Git State & Actions
    isPushing,
    isGitModalOpen,
    setIsGitModalOpen,
    gitSettings,
    setGitSettings,
    handlePushToGithub,

    dialog: {
      ...dialogState,
      setIsOpen: (isOpen: boolean) =>
        setDialogState((prev) => ({ ...prev, isOpen })),
    },
    actions: {
      handleAddFile,
      handleAddFolder,
      handleRenameFile,
      handleRenameFolder,
      handleDeleteFile,
      handleDeleteFolder,
      handleSave,
      handleSaveAll,
    },
  };
};