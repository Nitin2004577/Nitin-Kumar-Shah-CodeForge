/**
 * UT-07: Retrieve User Saved Projects
 * -----------------------------------------------------------------------------
 * Objective : Verify Prisma successfully queries and returns project records
 *             for the active user.
 * Input     : User navigates to the /dashboard route.
 * Expected  : System fetches projects from MongoDB and maps them to dashboard UI.
 * Result    : PASS
 */

jest.mock("@/lib/db", () => ({
  db: {
    playground: {
      findMany:   jest.fn(),
      findUnique: jest.fn(),
      create:     jest.fn(),
      delete:     jest.fn(),
      update:     jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));

jest.mock("../../features/auth/actions", () => ({
  currentUser: jest.fn(),
}));

import { db } from "@/lib/db";
import { currentUser } from "../../features/auth/actions";
import {
  getAllPlaygroundForUser,
  deleteProjectById,
  editProjectById,
  duplicateProjectById,
} from "../../features/playground/actions";

// -- Fixtures ------------------------------------------------------------------

const mockUser = { id: "user-123", name: "Test User", email: "test@example.com" };

const mockProjects = [
  {
    id: "proj-1",
    title: "My React App",
    description: "A React project",
    template: "REACT",
    userId: "user-123",
    user: mockUser,
    Starmark: [{ isMarked: true }],
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "proj-2",
    title: "My Next.js App",
    description: "A Next.js project",
    template: "NEXTJS",
    userId: "user-123",
    user: mockUser,
    Starmark: [],
    createdAt: new Date("2024-02-01"),
  },
  {
    id: "proj-3",
    title: "Express API",
    description: "A backend project",
    template: "EXPRESS",
    userId: "user-123",
    user: mockUser,
    Starmark: [],
    createdAt: new Date("2024-03-01"),
  },
];

// -- Tests ---------------------------------------------------------------------

describe("UT-07 � Dashboard: Fetch Saved Projects", () => {

  beforeEach(() => jest.clearAllMocks());

  // -- 1. getAllPlaygroundForUser � happy path --------------------------------

  test("returns all projects for the authenticated user", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    (db.playground.findMany as jest.Mock).mockResolvedValue(mockProjects);

    const result = await getAllPlaygroundForUser();

    expect(result).toHaveLength(3);
    expect(result).toEqual(mockProjects);
  });

  test("queries DB with the correct userId filter", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    (db.playground.findMany as jest.Mock).mockResolvedValue(mockProjects);

    await getAllPlaygroundForUser();

    expect(db.playground.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-123" },
      })
    );
  });

  test("includes user and Starmark relations in the query", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    (db.playground.findMany as jest.Mock).mockResolvedValue(mockProjects);

    await getAllPlaygroundForUser();

    const callArg = (db.playground.findMany as jest.Mock).mock.calls[0][0];
    expect(callArg.include).toHaveProperty("user", true);
    expect(callArg.include).toHaveProperty("Starmark");
  });

  test("Starmark query is scoped to the current user only", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    (db.playground.findMany as jest.Mock).mockResolvedValue(mockProjects);

    await getAllPlaygroundForUser();

    const callArg = (db.playground.findMany as jest.Mock).mock.calls[0][0];
    expect(callArg.include.Starmark.where.userId).toBe("user-123");
  });

  test("returns empty array when user has no projects", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    (db.playground.findMany as jest.Mock).mockResolvedValue([]);

    const result = await getAllPlaygroundForUser();

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  test("each project contains expected fields for dashboard rendering", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    (db.playground.findMany as jest.Mock).mockResolvedValue(mockProjects);

    const result = await getAllPlaygroundForUser();

    result.forEach((project: any) => {
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("title");
      expect(project).toHaveProperty("template");
      expect(project).toHaveProperty("userId");
      expect(project).toHaveProperty("Starmark");
    });
  });

  // -- 2. Auth guard ---------------------------------------------------------

  test("throws Unauthorized when no user session exists", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    await expect(getAllPlaygroundForUser()).rejects.toThrow("Unauthorized");
  });

  test("throws Unauthorized when user has no ID", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ name: "Ghost" }); // no id

    await expect(getAllPlaygroundForUser()).rejects.toThrow("Unauthorized");
  });

  // -- 3. Dashboard page filtering -------------------------------------------

  test("dashboard filters projects to only show current user projects", async () => {
    // Simulate what DashboardMainPage does after fetching
    const allProjects = [
      ...mockProjects,
      { id: "proj-other", title: "Other User Project", userId: "other-user-999" },
    ];

    const userPlaygrounds = allProjects.filter(
      (project) => project.userId === mockUser.id
    );

    expect(userPlaygrounds).toHaveLength(3);
    expect(userPlaygrounds.every((p) => p.userId === "user-123")).toBe(true);
  });

  test("dashboard shows empty state when filtered projects array is empty", () => {
    const allProjects: any[] = [];
    const userPlaygrounds = allProjects.filter(
      (project) => project.userId === mockUser.id
    );

    expect(userPlaygrounds.length === 0).toBe(true);
  });

  // -- 4. deleteProjectById --------------------------------------------------

  test("deleteProjectById calls db.playground.delete with correct id", async () => {
    (db.playground.delete as jest.Mock).mockResolvedValue({});

    await deleteProjectById("proj-1");

    expect(db.playground.delete).toHaveBeenCalledWith({
      where: { id: "proj-1" },
    });
  });

  // -- 5. editProjectById ----------------------------------------------------

  test("editProjectById calls db.playground.update with correct data", async () => {
    (db.playground.update as jest.Mock).mockResolvedValue({});

    await editProjectById("proj-1", {
      title: "Updated Title",
      description: "Updated description",
    });

    expect(db.playground.update).toHaveBeenCalledWith({
      where: { id: "proj-1" },
      data: { title: "Updated Title", description: "Updated description" },
    });
  });

  // -- 6. duplicateProjectById -----------------------------------------------

  test("duplicateProjectById creates a copy with (Copy) suffix in title", async () => {
    const original = {
      id: "proj-1",
      title: "My React App",
      description: "A React project",
      template: "REACT",
      userId: "user-123",
      templateFiles: [],
    };

    (db.playground.findUnique as jest.Mock).mockResolvedValue(original);
    (db.playground.create as jest.Mock).mockResolvedValue({
      ...original,
      id: "proj-copy-1",
      title: "My React App (Copy)",
    });

    const result = await duplicateProjectById("proj-1");

    expect(db.playground.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "My React App (Copy)",
          userId: "user-123",
        }),
      })
    );
    expect((result as any).title).toBe("My React App (Copy)");
  });

  test("duplicateProjectById returns undefined when original project not found", async () => {
    (db.playground.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await duplicateProjectById("nonexistent");
    expect(result).toBeUndefined();
  });

  // -- 7. DB error handling --------------------------------------------------

  test("getAllPlaygroundForUser throws when DB query fails", async () => {
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
    (db.playground.findMany as jest.Mock).mockRejectedValue(
      new Error("DB connection failed")
    );

    await expect(getAllPlaygroundForUser()).rejects.toThrow("DB connection failed");
  });
});
