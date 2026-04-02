"use client";

import { useEffect, useMemo } from "react";
import { usePlaygroundQuery, useTemplateQuery, useSaveTemplateMutation } from "./queries/usePlaygroundQuery";
import { useEditorStore } from "../store/useEditorStore";
import type { TemplateFolder } from "../types";

/**
 * Composes React Query data fetching with the Zustand editor store.
 * - Server state (playground data, template) → React Query
 * - Client UI state (open files, active file) → Zustand
 */
export function usePlayground(id: string) {
  const setTemplateData = useEditorStore((s) => s.setTemplateData);
  const setPlaygroundId = useEditorStore((s) => s.setPlaygroundId);
  const storeTemplateData = useEditorStore((s) => s.templateData);

  // 1. Fetch playground metadata from DB
  const playgroundQuery = usePlaygroundQuery(id);

  // Determine if there's already a saved template in the DB response
  const hasSavedTemplate = useMemo(() => {
    const raw = playgroundQuery.data?.templateFiles?.[0]?.content;
    return typeof raw === "string" || (raw != null && typeof raw === "object");
  }, [playgroundQuery.data]);

  // 2. Fetch template JSON from API only if no saved template exists
  const templateQuery = useTemplateQuery(id, hasSavedTemplate);

  // 3. Save mutation
  const saveMutation = useSaveTemplateMutation(id);

  // 4. Sync playground ID into store
  useEffect(() => {
    if (id) setPlaygroundId(id);
  }, [id, setPlaygroundId]);

  // 5. Sync template data into Zustand store when it arrives
  useEffect(() => {
    if (!playgroundQuery.data) return;

    const raw = playgroundQuery.data.templateFiles?.[0]?.content;

    if (raw != null) {
      // Parse saved template from DB
      const parsed: TemplateFolder =
        typeof raw === "string" ? JSON.parse(raw) : (raw as unknown as TemplateFolder);
      setTemplateData(parsed);
      return;
    }

    // Fall back to template API response
    if (templateQuery.data) {
      setTemplateData(templateQuery.data);
    }
  }, [playgroundQuery.data, templateQuery.data, setTemplateData]);

  const saveTemplateData = async (data: TemplateFolder) => {
    setTemplateData(data); // Optimistic update
    await saveMutation.mutateAsync(data);
  };

  const isLoading =
    playgroundQuery.isLoading ||
    (!hasSavedTemplate && templateQuery.isLoading);

  const error =
    playgroundQuery.error?.message ??
    templateQuery.error?.message ??
    null;

  return {
    playgroundData: playgroundQuery.data ?? null,
    templateData: storeTemplateData,
    isLoading,
    error,
    saveTemplateData,
    isSaving: saveMutation.isPending,
    refetch: playgroundQuery.refetch,
  };
}
