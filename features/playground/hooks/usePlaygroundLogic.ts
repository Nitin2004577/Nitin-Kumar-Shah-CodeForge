import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";
import { WebContainer, FileSystemTree } from "@webcontainer/api";

// Hooks
import { useFileExplorer } from "./useFileExplorer";
import { useWebContainer } from "@/../features/webcontianers/hooks/useWebContainer";

// Libs & Types
import { findFilePath } from "../lib";
import { TemplateFile, TemplateFolder } from "../types";

// --- NEW HELPER FUNCTION ---
// Helper to convert your DB structure (items array) to WebContainer structure
const buildFileSystemTree = (folder: TemplateFolder): FileSystemTree => {
  const tree: FileSystemTree = {};

  if (folder.items && Array.isArray(folder.items)) {
    folder.items.forEach((item) => {
      // If the item has a 'folderName', it's a TemplateFolder
      if ('folderName' in item) {
        tree[item.folderName] = {
          directory: buildFileSystemTree(item as TemplateFolder),
        };
      } 
      // Otherwise, it's a TemplateFile
      else if ('filename' in item) {
        const fileItem = item as TemplateFile;
        tree[`${fileItem.filename}.${fileItem.fileExtension}`] = {
          file: {
            contents: fileItem.content || "",
          },
        };
      }
    });
  }

  return tree;
};

export const usePlaygroundLogic = (
  id: string,
  templateData: any,
  saveTemplateData: (data: any) => Promise<any>
) => {
  // --- 1. Local UI State ---
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  const lastSyncedContent = useRef<Map<string, string>>(new Map());
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
    onCancel: () => {},
  });

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
      console.log("Server ready:", url);
      setServerUrl(url);
    };

    instance.on("server-ready", onServerReady);
  }, [instance]);

  // --- 2.5.2 Manual Mount Effect ---
  useEffect(() => {
    const mountFiles = async () => {
      if (instance && templateData) {
        try {
          // Convert the custom TemplateFolder into a FileSystemTree
          const fileSystemTree = buildFileSystemTree(templateData as TemplateFolder);
          
          // Mount the correctly formatted tree
          await instance.mount(fileSystemTree);
          console.log("✅ Files successfully mounted to WebContainer!");
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

  // --- 5. File Operation Wrappers ---
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
    (
      file: TemplateFile,
      newName: string,
      newExt: string,
      parentPath: string
    ) => {
      return explorer.handleRenameFile(
        file,
        newName,
        newExt,
        parentPath,
        saveTemplateData
      );
    },
    [explorer, saveTemplateData]
  );

  const handleRenameFolder = useCallback(
    (folder: TemplateFolder, newName: string, parentPath: string) => {
      return explorer.handleRenameFolder(
        folder,
        newName,
        parentPath,
        saveTemplateData
      );
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

  // --- 6. Save Logic ---
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

        // Sync to WebContainer
        if (lastContent !== fileToSave.content) {
          await writeFileSync(filePath, fileToSave.content);
          lastSyncedContent.current.set(fileToSave.id, fileToSave.content);
        }

        // Save to DB
        const newData = await saveTemplateData(updatedData);
        if (newData) explorer.setTemplateData(newData);

        explorer.setOpenFiles(
          explorer.openFiles.map((f) =>
            f.id === targetFileId
              ? { ...f, hasUnsavedChanges: false, originalContent: f.content }
              : f
          )
        );

        toast.success(
          `Saved ${fileToSave.filename}.${fileToSave.fileExtension}`
        );
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

  // --- 7. Shortcuts ---
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
    serverUrl, // Returning our local state URL
    instance,
    writeFileSync,

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