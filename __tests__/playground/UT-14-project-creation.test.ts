/**
 * UT-14: Project Creation — Create Playground with Template
 * -----------------------------------------------------------------------------
 * Objective : Verify the createPlayground server action creates a new project
 *             in the DB with the correct template and user association.
 * Input     : User selects React template and clicks "Create Project".
 * Expected  : Playground record created in DB; redirected to /playground/[id].
 */

jest.mock("@/lib/db", () => ({
  db: {
    playground: { create: jest.fn(), findUnique: jest.fn() },
  },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("../../features/auth/actions", () => ({ currentUser: jest.fn() }));

import { db } from "@/lib/db";
import { currentUser } from "../../features/auth/actions";
import { createPlayground } from "../../features/playground/actions";

const mockUser = { id: "user-123", email: "dev@example.com", name: "Dev User" };

describe("UT-14 — Project Creation: Create Playground with Template", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
  });

  test("creates playground with REACT template", async () => {
    const mockPlayground = { id: "pg-react-1", title: "My React App", template: "REACT", userId: "user-123" };
    (db.playground.create as jest.Mock).mockResolvedValue(mockPlayground);

    const result = await createPlayground({ title: "My React App", template: "REACT" });

    expect(db.playground.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ template: "REACT", userId: "user-123" }),
      })
    );
    expect((result as any).id).toBe("pg-react-1");
  });

  test("creates playground with NEXTJS template", async () => {
    (db.playground.create as jest.Mock).mockResolvedValue({ id: "pg-next-1", template: "NEXTJS" });

    await createPlayground({ title: "My Next App", template: "NEXTJS" });

    expect(db.playground.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ template: "NEXTJS" }),
      })
    );
  });

  test("creates playground with EXPRESS template", async () => {
    (db.playground.create as jest.Mock).mockResolvedValue({ id: "pg-exp-1", template: "EXPRESS" });

    await createPlayground({ title: "My API", template: "EXPRESS" });

    const call = (db.playground.create as jest.Mock).mock.calls[0][0];
    expect(call.data.template).toBe("EXPRESS");
  });

  test("associates playground with the authenticated user", async () => {
    (db.playground.create as jest.Mock).mockResolvedValue({ id: "pg-1", userId: "user-123" });

    await createPlayground({ title: "Test", template: "REACT" });

    const call = (db.playground.create as jest.Mock).mock.calls[0][0];
    expect(call.data.userId).toBe("user-123");
  });

  test("saves the provided title to the DB", async () => {
    (db.playground.create as jest.Mock).mockResolvedValue({ id: "pg-1", title: "Awesome Project" });

    await createPlayground({ title: "Awesome Project", template: "REACT" });

    const call = (db.playground.create as jest.Mock).mock.calls[0][0];
    expect(call.data.title).toBe("Awesome Project");
  });

  test("saves optional description when provided", async () => {
    (db.playground.create as jest.Mock).mockResolvedValue({ id: "pg-1" });

    await createPlayground({ title: "Test", template: "REACT", description: "A test project" });

    const call = (db.playground.create as jest.Mock).mock.calls[0][0];
    expect(call.data.description).toBe("A test project");
  });

  test("returns null when user is not authenticated", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    await expect(createPlayground({ title: "Test", template: "REACT" }))
      .rejects.toThrow(/Unauthorized/i);
    expect(db.playground.create).not.toHaveBeenCalled();
  });

  test("throws when DB create fails", async () => {
    (db.playground.create as jest.Mock).mockRejectedValue(new Error("DB error"));

    await expect(createPlayground({ title: "Test", template: "REACT" }))
      .rejects.toThrow("DB error");
  });

  test("all supported templates can be created", async () => {
    const templates = ["REACT", "NEXTJS", "EXPRESS", "VUE", "HONO", "ANGULAR"] as const;

    for (const template of templates) {
      (db.playground.create as jest.Mock).mockResolvedValue({ id: `pg-${template}`, template });
      const result = await createPlayground({ title: `${template} App`, template });
      expect((result as any).template).toBe(template);
    }
  });
});
