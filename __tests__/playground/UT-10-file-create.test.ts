/**
 * UT-10: File Create — Adds File to Explorer Tree
 * -----------------------------------------------------------------------------
 * Objective : Verify that creating a new file adds it to the file tree state
 *             and persists it to the database.
 * Input     : User clicks "New File", enters filename and extension.
 * Expected  : File appears in the explorer tree; DB updated.
 */

import { useFileExplorer } from "../../features/playground/hooks/useFileExplorer";

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

const mockSaveTemplateData = jest.fn().mockResolvedValue(undefined);
const mockWriteFileSync = jest.fn().mockResolvedValue(undefined);

const rootTemplate = {
  folderName: "my-app",
  items: [
    { filename: "App", fileExtension: "tsx", content: "export default function App() {}" },
  ],
};

describe("UT-10 — File Create: Add to Explorer Tree", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state
    useFileExplorer.setState({
      templateData: JSON.parse(JSON.stringify(rootTemplate)),
      openFiles: [],
      activeFileId: null,
      playgroundId: "pg-1",
      editorContent: "",
    });
  });

  test("adds new file to root of template tree", async () => {
    const store = useFileExplorer.getState();
    const newFile = { filename: "utils", fileExtension: "ts", content: "" };

    await store.handleAddFile(newFile, "", mockWriteFileSync, null, mockSaveTemplateData);

    const updated = useFileExplorer.getState().templateData;
    const found = updated?.items.find(
      (i: any) => "filename" in i && i.filename === "utils" && i.fileExtension === "ts"
    );
    expect(found).toBeDefined();
  });

  test("new file is automatically opened in editor", async () => {
    const store = useFileExplorer.getState();
    const newFile = { filename: "NewComponent", fileExtension: "tsx", content: "" };

    await store.handleAddFile(newFile, "", mockWriteFileSync, null, mockSaveTemplateData);

    const { openFiles } = useFileExplorer.getState();
    const opened = openFiles.find(
      (f) => f.filename === "NewComponent" && f.fileExtension === "tsx"
    );
    expect(opened).toBeDefined();
  });

  test("new file becomes the active file", async () => {
    const store = useFileExplorer.getState();
    const newFile = { filename: "NewPage", fileExtension: "tsx", content: "" };

    await store.handleAddFile(newFile, "", mockWriteFileSync, null, mockSaveTemplateData);

    const { activeFileId, openFiles } = useFileExplorer.getState();
    const opened = openFiles.find((f) => f.filename === "NewPage");
    expect(activeFileId).toBe(opened?.id);
  });

  test("calls saveTemplateData to persist to DB", async () => {
    const store = useFileExplorer.getState();
    const newFile = { filename: "config", fileExtension: "json", content: "{}" };

    await store.handleAddFile(newFile, "", mockWriteFileSync, null, mockSaveTemplateData);

    expect(mockSaveTemplateData).toHaveBeenCalledTimes(1);
    expect(mockSaveTemplateData).toHaveBeenCalledWith(
      expect.objectContaining({ folderName: "my-app" })
    );
  });

  test("calls writeFileSync to sync to WebContainer", async () => {
    const store = useFileExplorer.getState();
    const newFile = { filename: "helper", fileExtension: "ts", content: "export const x = 1;" };

    await store.handleAddFile(newFile, "", mockWriteFileSync, null, mockSaveTemplateData);

    expect(mockWriteFileSync).toHaveBeenCalledWith("helper.ts", "export const x = 1;");
  });

  test("adds file to nested folder path", async () => {
    const templateWithFolder = {
      folderName: "my-app",
      items: [
        {
          folderName: "src",
          items: [{ filename: "App", fileExtension: "tsx", content: "" }],
        },
      ],
    };
    useFileExplorer.setState({ templateData: templateWithFolder });

    const store = useFileExplorer.getState();
    const newFile = { filename: "Button", fileExtension: "tsx", content: "" };

    await store.handleAddFile(newFile, "src", mockWriteFileSync, null, mockSaveTemplateData);

    const updated = useFileExplorer.getState().templateData;
    const srcFolder = updated?.items.find((i: any) => "folderName" in i && i.folderName === "src") as any;
    const found = srcFolder?.items.find((i: any) => i.filename === "Button");
    expect(found).toBeDefined();
  });

  test("tree item count increases by 1 after adding file", async () => {
    const before = useFileExplorer.getState().templateData?.items.length ?? 0;
    const store = useFileExplorer.getState();

    await store.handleAddFile(
      { filename: "extra", fileExtension: "ts", content: "" },
      "", mockWriteFileSync, null, mockSaveTemplateData
    );

    const after = useFileExplorer.getState().templateData?.items.length ?? 0;
    expect(after).toBe(before + 1);
  });
});
