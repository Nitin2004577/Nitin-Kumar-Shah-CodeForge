"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryKeys } from "@/lib/query-keys";
import {
  getPlaygroundById,
  getAllPlaygroundForUser,
  SaveUpdatedCode,
  createPlayground,
  deleteProjectById,
  editProjectById,
  duplicateProjectById,
} from "../../actions";
import type { TemplateFolder } from "../../types";

// ─── Fetch single playground + its template ──────────────────────────────────
export function usePlaygroundQuery(id: string) {
  return useQuery({
    queryKey: queryKeys.playground.detail(id),
    queryFn: async () => {
      if (!id || id === "undefined") {
        throw new Error("Playground not found. It may have been deleted.");
      }
      const data = await getPlaygroundById(id);
      if (!data) throw new Error("Playground not found.");
      return data;
    },
    enabled: !!id && id !== "undefined",
  });
}

// ─── Fetch template JSON (from /api/template/:id) ────────────────────────────
export function useTemplateQuery(id: string, hasSavedTemplate: boolean) {
  return useQuery({
    queryKey: queryKeys.playground.template(id),
    queryFn: async () => {
      const res = await fetch(`/api/template/${id}`);
      if (res.status === 404) throw new Error("Playground not found.");
      if (!res.ok) throw new Error(`Failed to load template: ${res.status}`);
      const json = await res.json();
      if (json.templateJson && Array.isArray(json.templateJson)) {
        return { folderName: "Root", items: json.templateJson } as TemplateFolder;
      }
      return (json.templateJson ?? { folderName: "Root", items: [] }) as TemplateFolder;
    },
    // Only fetch from API if there's no saved template in the DB
    enabled: !!id && id !== "undefined" && !hasSavedTemplate,
    staleTime: Infinity, // Template JSON never changes unless user saves
  });
}

// ─── Fetch all playgrounds for the current user ───────────────────────────────
export function usePlaygroundsQuery() {
  return useQuery({
    queryKey: queryKeys.playgrounds.lists(),
    queryFn: () => getAllPlaygroundForUser(),
  });
}

// ─── Save template mutation ───────────────────────────────────────────────────
export function useSaveTemplateMutation(playgroundId: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: TemplateFolder) => SaveUpdatedCode(playgroundId, data as any),
    onSuccess: () => {
      // Invalidate so next load gets fresh data
      qc.invalidateQueries({ queryKey: queryKeys.playground.detail(playgroundId) });
    },
    onError: () => {
      toast.error("Failed to save changes");
    },
  });
}

// ─── Create playground mutation ───────────────────────────────────────────────
export function useCreatePlaygroundMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: createPlayground,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.playgrounds.lists() });
      toast.success("Playground created");
    },
    onError: () => {
      toast.error("Failed to create playground");
    },
  });
}

// ─── Delete playground mutation ───────────────────────────────────────────────
export function useDeletePlaygroundMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteProjectById(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.playgrounds.lists() });
      toast.success("Project deleted");
    },
    onError: () => {
      toast.error("Failed to delete project");
    },
  });
}

// ─── Edit playground mutation ─────────────────────────────────────────────────
export function useEditPlaygroundMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title: string; description: string } }) =>
      editProjectById(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.playgrounds.lists() });
      toast.success("Project updated");
    },
    onError: () => {
      toast.error("Failed to update project");
    },
  });
}

// ─── Duplicate playground mutation ───────────────────────────────────────────
export function useDuplicatePlaygroundMutation() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => duplicateProjectById(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.playgrounds.lists() });
      toast.success("Project duplicated");
    },
    onError: () => {
      toast.error("Failed to duplicate project");
    },
  });
}
