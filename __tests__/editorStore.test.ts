/**
 * Unit Tests: useEditorStore (Zustand)
 * Tests for tab management, content updates, and file tree mutations
 */

import { act } from "@testing-library/react";
import type { TemplateFile, TemplateFolder } from "../features/playground/types";

// Mock localStorage (jsdom provides it but zustand persist needs it)
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Mock sonner toast so closeFile doesn't throw
jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

import { useEditorStore } from "../features/playground/store/useEditorStore";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeFile = (filename: string, ext: string, content = ""): TemplateFile => ({
  id: `${filename}.${ext}`,
  filename,
  fileExtension: ext,
  content,
});

const sampleTree: TemplateFolder = {
  id: "root",
  folderName: "Root",
  items: [
    makeFile("index", "ts", "console.log('hello')"),
    makeFile("App", "tsx", "<App />"),
    {
      id: "src",
      folderName: "src",
      items: [makeFile("utils", "ts", "export const x = 1")],
    },
  ],
};

// Reset store state before each test
beforeEach(() => {
  act(() => {
    useEditorStore.setState({
      playgroundId: "",
      templateData: null,
      openFiles: [],
      activeFileId: null,
      isPreviewVisible: true,
      isTerminalVisible: true,
      terminalHeight: 256,
    });
  });
});

// ─── Initialization ───────────────────────────────────────────────────────────

describe("Initialization", () => {
  test("setPlaygroundId updates the playground ID", () => {
    act(() => useEditorStore.getState().setPlaygroundId("abc-123"));
    expect(useEditorStore.getState().playgroundId).toBe("abc-123");
  });

  test("setTemplateData stores the template tree", () => {
    act(() => useEditorStore.getState().setTemplateData(sampleTree));
    expect(useEditorStore.getState().templateData).toEqual(sampleTree);
  });

  test("setTemplateData accepts null to clear data", () => {
    act(() => {
      useEditorStore.getState().setTemplateData(sampleTree);
      useEditorStore.getState().setTemplateData(null);
    });
    expect(useEditorStore.getState().templateData).toBeNull();
  });
});

// ─── Tab management ───────────────────────────────────────────────────────────

describe("Tab management", () => {
  beforeEach(() => {
    act(() => useEditorStore.getState().setTemplateData(sampleTree));
  });

  test("openFile adds a new tab and sets it as active", () => {
    const file = makeFile("index", "ts", "console.log('hello')");
    act(() => useEditorStore.getState().openFile(file));

    const { openFiles, activeFileId } = useEditorStore.getState();
    expect(openFiles).toHaveLength(1);
    expect(activeFileId).toBeTruthy();
  });

  test("openFile does not duplicate an already open file", () => {
    const file = makeFile("index", "ts", "console.log('hello')");
    act(() => {
      useEditorStore.getState().openFile(file);
      useEditorStore.getState().openFile(file); // open same file again
    });
    expect(useEditorStore.getState().openFiles).toHaveLength(1);
  });

  test("closeAllFiles clears all tabs and active file", () => {
    const file = makeFile("index", "ts");
    act(() => {
      useEditorStore.getState().openFile(file);
      useEditorStore.getState().closeAllFiles();
    });
    const { openFiles, activeFileId } = useEditorStore.getState();
    expect(openFiles).toHaveLength(0);
    expect(activeFileId).toBeNull();
  });

  test("setActiveFileId updates the active tab", () => {
    act(() => useEditorStore.getState().setActiveFileId("some-id"));
    expect(useEditorStore.getState().activeFileId).toBe("some-id");
  });

  test("closeFile does not close a file with unsaved changes", () => {
    const file = makeFile("index", "ts", "original");
    act(() => {
      useEditorStore.getState().openFile(file);
    });
    const { openFiles } = useEditorStore.getState();
    const fileId = openFiles[0].id;

    act(() => {
      useEditorStore.getState().updateFileContent(fileId, "changed content");
      useEditorStore.getState().closeFile(fileId);
    });

    // File should still be open because it has unsaved changes
    expect(useEditorStore.getState().openFiles).toHaveLength(1);
  });
});

// ─── Content updates ──────────────────────────────────────────────────────────

describe("Content updates", () => {
  beforeEach(() => {
    act(() => useEditorStore.getState().setTemplateData(sampleTree));
  });

  test("updateFileContent marks file as having unsaved changes", () => {
    const file = makeFile("App", "tsx", "<App />");
    act(() => useEditorStore.getState().openFile(file));
    const fileId = useEditorStore.getState().openFiles[0].id;

    act(() => useEditorStore.getState().updateFileContent(fileId, "<NewApp />"));

    const updated = useEditorStore.getState().openFiles[0];
    expect(updated.content).toBe("<NewApp />");
    expect(updated.hasUnsavedChanges).toBe(true);
  });

  test("updateFileContent does not mark unsaved if content matches original", () => {
    const file = makeFile("App", "tsx", "<App />");
    act(() => useEditorStore.getState().openFile(file));
    const fileId = useEditorStore.getState().openFiles[0].id;

    act(() => useEditorStore.getState().updateFileContent(fileId, "<App />"));

    expect(useEditorStore.getState().openFiles[0].hasUnsavedChanges).toBe(false);
  });

  test("markFileSaved clears unsaved changes flag", () => {
    const file = makeFile("App", "tsx", "<App />");
    act(() => useEditorStore.getState().openFile(file));
    const fileId = useEditorStore.getState().openFiles[0].id;

    act(() => {
      useEditorStore.getState().updateFileContent(fileId, "changed");
      useEditorStore.getState().markFileSaved(fileId);
    });

    expect(useEditorStore.getState().openFiles[0].hasUnsavedChanges).toBe(false);
  });

  test("markAllSaved clears unsaved changes on all open files", () => {
    const f1 = makeFile("index", "ts", "a");
    const f2 = makeFile("App", "tsx", "b");
    act(() => {
      useEditorStore.getState().openFile(f1);
      useEditorStore.getState().openFile(f2);
    });
    const ids = useEditorStore.getState().openFiles.map((f) => f.id);

    act(() => {
      useEditorStore.getState().updateFileContent(ids[0], "changed a");
      useEditorStore.getState().updateFileContent(ids[1], "changed b");
      useEditorStore.getState().markAllSaved();
    });

    const allSaved = useEditorStore.getState().openFiles.every((f) => !f.hasUnsavedChanges);
    expect(allSaved).toBe(true);
  });
});

// ─── UI state ─────────────────────────────────────────────────────────────────

describe("UI state", () => {
  test("setIsPreviewVisible toggles preview", () => {
    act(() => useEditorStore.getState().setIsPreviewVisible(false));
    expect(useEditorStore.getState().isPreviewVisible).toBe(false);
  });

  test("setIsTerminalVisible toggles terminal", () => {
    act(() => useEditorStore.getState().setIsTerminalVisible(false));
    expect(useEditorStore.getState().isTerminalVisible).toBe(false);
  });

  test("setTerminalHeight updates terminal height", () => {
    act(() => useEditorStore.getState().setTerminalHeight(400));
    expect(useEditorStore.getState().terminalHeight).toBe(400);
  });
});
