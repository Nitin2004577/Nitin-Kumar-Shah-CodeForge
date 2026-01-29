import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { TemplateFolder } from "../lib/path-to-json";
import { getPlaygroundById } from "../actions/index";

interface PlaygroundData {
  id: string;
  name?: string;
  [key: string]: any;
}

interface UsePlaygroundReturn {
  playgroundData: PlaygroundData | null;
  templateData: TemplateFolder | null;
  isLoading: boolean;
  error: string | null;
  loadPlayground: () => Promise<void>;
  saveTemplate: (data: TemplateFolder) => Promise<void>;
}

export const usePlayground = (id: string): UsePlaygroundReturn => {
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(
    null
  );
  const [templateData, setTemplateData] = useState<TemplateFolder | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadPlayground = useCallback(async () => {
    if (!id) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await getPlaygroundById(id);

      //@ts-ignore
      setPlaygroundData(data);
      const rawContent = data?.templateFiles?.[0]?.content;
      if (typeof rawContent === "string") {
        const parsedContent = JSON.parse(rawContent) as TemplateFolder;
        setTemplateData(parsedContent);
        toast.success("Playground loaded successfully");
        return;
      }
    } catch (error) {
    } finally {
    }
  }, [id]);
};
