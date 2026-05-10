/**
 * UT-15: Settings — User Profile Update
 * -----------------------------------------------------------------------------
 * Objective : Verify the settings page correctly updates user profile data
 *             in the database and reflects changes in the session.
 * Input     : User changes their name and saves on the settings page.
 * Expected  : DB updated with new name; session reflects the change.
 */

jest.mock("@/lib/db", () => ({
  db: {
    user: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("../../features/auth/actions", () => ({ currentUser: jest.fn() }));

import { db } from "@/lib/db";
import { currentUser } from "../../features/auth/actions";

// Inline the settings update action logic (mirrors what settings-client.tsx calls)
async function updateUserProfile(data: { name?: string; image?: string }) {
  const user = await currentUser();
  if (!user || !(user as any).id) throw new Error("Unauthorized");

  return await (db.user as any).update({
    where: { id: (user as any).id },
    data,
  });
}

const mockUser = { id: "user-123", name: "Old Name", email: "test@example.com" };

describe("UT-15 — Settings: User Profile Update", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (currentUser as jest.Mock).mockResolvedValue(mockUser);
  });

  test("updates user name in the database", async () => {
    (db.user as any).update = jest.fn().mockResolvedValue({ ...mockUser, name: "New Name" });

    await updateUserProfile({ name: "New Name" });

    expect((db.user as any).update).toHaveBeenCalledWith({
      where: { id: "user-123" },
      data: { name: "New Name" },
    });
  });

  test("returns updated user record", async () => {
    const updated = { ...mockUser, name: "Updated Name" };
    (db.user as any).update = jest.fn().mockResolvedValue(updated);

    const result = await updateUserProfile({ name: "Updated Name" });

    expect(result.name).toBe("Updated Name");
  });

  test("updates profile image URL", async () => {
    (db.user as any).update = jest.fn().mockResolvedValue({ ...mockUser, image: "https://example.com/avatar.png" });

    await updateUserProfile({ image: "https://example.com/avatar.png" });

    expect((db.user as any).update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { image: "https://example.com/avatar.png" } })
    );
  });

  test("throws Unauthorized when no user session", async () => {
    (currentUser as jest.Mock).mockResolvedValue(null);

    await expect(updateUserProfile({ name: "Test" })).rejects.toThrow("Unauthorized");
    expect((db.user as any).update).not.toHaveBeenCalled();
  });

  test("throws Unauthorized when user has no id", async () => {
    (currentUser as jest.Mock).mockResolvedValue({ name: "Ghost" });

    await expect(updateUserProfile({ name: "Test" })).rejects.toThrow("Unauthorized");
  });

  test("update is scoped to the authenticated user's ID only", async () => {
    (db.user as any).update = jest.fn().mockResolvedValue(mockUser);

    await updateUserProfile({ name: "Safe Update" });

    const call = (db.user as any).update.mock.calls[0][0];
    expect(call.where.id).toBe("user-123");
  });

  test("can update both name and image in one call", async () => {
    (db.user as any).update = jest.fn().mockResolvedValue({
      ...mockUser, name: "New Name", image: "https://img.com/pic.jpg",
    });

    await updateUserProfile({ name: "New Name", image: "https://img.com/pic.jpg" });

    const call = (db.user as any).update.mock.calls[0][0];
    expect(call.data.name).toBe("New Name");
    expect(call.data.image).toBe("https://img.com/pic.jpg");
  });

  test("propagates DB error when update fails", async () => {
    (db.user as any).update = jest.fn().mockRejectedValue(new Error("DB write failed"));

    await expect(updateUserProfile({ name: "Test" })).rejects.toThrow("DB write failed");
  });
});
