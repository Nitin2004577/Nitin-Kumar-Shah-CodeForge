/**
 * UT-09: File Save — Persists Content to DB via SaveUpdatedCode
 * -----------------------------------------------------------------------------
 * Objective : Verify that saving a file persists the updated template tree to
 *             the database using the SaveUpdatedCode server action.
 * Input     : User edits a file and presses Ctrl+S.
 * Expected  : Template content upserted in DB; updated record returned.
 */

jest.mock("@/lib/db", () => ({
  db: {
    templateFile: { upsert: jest.fn() },
  },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("../../features/auth/actions", () => ({ currentUser: jest.fn() }));

import { db } from "@/lib/db";
import { currentUser } from "../../features/auth/actions";
import { SaveUpdatedCode } from "../../features/playground/actions";

const mockUser = { id: "user-123", email: "test@example.com" };

const mockTemplateData = {
  folderName: "my-react-app",
  items: [
    { filename: "App", fileExtension: "tsx", content: "export default function App() { return <div>Updated</div>; }" },
    { filename: "index", fileExtension: "css", content: "body { margin: 0; }" },
  ],
};

describe("UT-09 — File Save: Persist Updated Code to Database", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
  });

  test("calls db.templateFile.upsert with correct playgroundId", async () => {
    (db.templateFile as any).upsert = jest.fn().mockResolvedValue({ id: "tf-1" });

    await SaveUpdatedCode("playground-1", mockTemplateData as any);

    expect((db.templateFile as any).upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { playgroundId: "playground-1" } })
    );
  });

  test("serializes template data as JSON string in DB", async () => {
    (db.templateFile as any).upsert = jest.fn().mockResolvedValue({ id: "tf-1" });

    await SaveUpdatedCode("playground-1", mockTemplateData as any);

    const call = (db.templateFile as any).upsert.mock.calls[0][0];
    expect(call.update.content).toBe(JSON.stringify(mockTemplateData));
    expect(call.create.content).toBe(JSON.stringify(mockTemplateData));
  });

  test("returns the saved record on success", async () => {
    const mockResult = { id: "tf-1", playgroundId: "playground-1", content: JSON.stringify(mockTemplateData) };
    (db.templateFile as any).upsert = jest.fn().mockResolvedValue(mockResult);

    const result = await SaveUpdatedCode("playground-1", mockTemplateData as any);

    expect(result).toEqual(mockResult);
  });

  test("returns null when user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    const result = await SaveUpdatedCode("playground-1", mockTemplateData as any);

    expect(result).toBeNull();
    expect((db.templateFile as any).upsert).not.toHaveBeenCalled();
  });

  test("returns null when user has no id", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ name: "Ghost" });

    const result = await SaveUpdatedCode("playground-1", mockTemplateData as any);

    expect(result).toBeNull();
  });

  test("returns null when DB upsert throws", async () => {
    (db.templateFile as any).upsert = jest.fn().mockRejectedValue(new Error("DB error"));

    const result = await SaveUpdatedCode("playground-1", mockTemplateData as any);

    expect(result).toBeNull();
  });

  test("upsert uses create path when record does not exist yet", async () => {
    (db.templateFile as any).upsert = jest.fn().mockResolvedValue({ id: "new-tf" });

    await SaveUpdatedCode("new-playground", mockTemplateData as any);

    const call = (db.templateFile as any).upsert.mock.calls[0][0];
    expect(call.create.playgroundId).toBe("new-playground");
  });

  test("upsert uses update path when record already exists", async () => {
    (db.templateFile as any).upsert = jest.fn().mockResolvedValue({ id: "existing-tf" });

    await SaveUpdatedCode("existing-playground", mockTemplateData as any);

    const call = (db.templateFile as any).upsert.mock.calls[0][0];
    expect(call.update.content).toBe(JSON.stringify(mockTemplateData));
  });
});
