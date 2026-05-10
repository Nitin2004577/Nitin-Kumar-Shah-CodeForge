/**
 * UT-11: File Delete — Removes from Tree and DB
 * -----------------------------------------------------------------------------
 * Objective : Verify that deleting a file removes it from the explorer tree,
 *             closes its editor tab, and persists the change to the database.
 * Input     : User clicks delete on a file in the explorer.
 * Expected  : File removed from tree; tab closed; DB updated.
 */

import { useFileExplorer } from "../../features/playground/hooks/useFileExplorer";

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const mockSave = jest.fn().mockResolvedValue(undefined);

const appFile = { filename: "App", fileExtension: "tsx", content: "export default function App() {}" };
const utilsFile = { filename: "utils", fileExtension: "ts", content: "export const x = 1;" };

const rootTemplate = {
  folderName: "my-app",
  items: [appFile, utilsFile],
};

describe("UT-11 — File Delete: Remove from Tree and DB", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFileExplorer.setState({
      templateData: JSON.parse(JSON.stringify(rootTemplate)),
      openFiles: [],
      activeFileId: null,
      playgroundId: "pg-1",
      editorContent: "",
    });
  });

  test("removes file from template tree", async () => {
    const store = useFileExplorer.getState();
    await store.handleDeleteFile(appFile, "", mockSave);

    const updated = useFileExplorer.getState().templateData;
    const found = updated?.items.find(
      (i: any) => "filename" in i && i.filename === "App"
    );
    expect(found).toBeUndefined();
  });

  test("other files remain in tree after deletion", async () => {
    const store = useFileExplorer.getState();
    await store.handleDeleteFile(appFile, "", mockSave);

    const updated = useFileExplorer.getState().templateData;
    const utils = updated?.items.find(
      (i: any) => "filename" in i && i.filename === "utils"
    );
    expect(utils).toBeDefined();
  });

  test("tree item count decreases by 1 after deletion", async () => {
    const before = useFileExplorer.getState().templateData?.items.length ?? 0;
    const store = useFileExplorer.getState();

    await store.handleDeleteFile(appFile, "", mockSave);

    const after = useFileExplorer.getState().templateData?.items.length ?? 0;
    expect(after).toBe(before - 1);
  });

  test("calls saveTemplateData to persist deletion to DB", async () => {
    const store = useFileExplorer.getState();
    await store.handleDeleteFile(appFile, "", mockSave);

    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  test("closes open tab when deleted file is open", async () => {
    // Open the file first
    useFileExplorer.getState().openFile(appFile);
    const { openFiles } = useFileExplorer.getState();
    expect(openFiles.some((f) => f.filename === "App")).toBe(true);

    await useFileExplorer.getState().handleDeleteFile(appFile, "", mockSave);

    const afterDelete = useFileExplorer.getState().openFiles;
    expect(afterDelete.some((f) => f.filename === "App")).toBe(false);
  });

  test("activeFileId is cleared when active file is deleted", async () => {
    useFileExplorer.getState().openFile(appFile);
    const { activeFileId } = useFileExplorer.getState();
    expect(activeFileId).toBeTruthy();

    await useFileExplorer.getState().handleDeleteFile(appFile, "", mockSave);

    const { activeFileId: afterId, openFiles } = useFileExplorer.getState();
    // Either null (no files left) or switched to another file
    if (openFiles.length === 0) {
      expect(afterId).toBeNull();
    } else {
      expect(openFiles.some((f) => f.id === afterId)).toBe(true);
    }
  });

  test("does not affect other open tabs when deleting a non-active file", async () => {
    useFileExplorer.getState().openFile(appFile);
    useFileExplorer.getState().openFile(utilsFile);
    useFileExplorer.getState().setActiveFileId(
      useFileExplorer.getState().openFiles.find((f) => f.filename === "utils")?.id ?? null
    );

    await useFileExplorer.getState().handleDeleteFile(appFile, "", mockSave);

    const { openFiles, activeFileId } = useFileExplorer.getState();
    expect(openFiles.some((f) => f.filename === "utils")).toBe(true);
    expect(openFiles.find((f) => f.id === activeFileId)?.filename).toBe("utils");
  });
});
