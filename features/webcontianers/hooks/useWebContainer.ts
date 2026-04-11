import { useState, useEffect, useCallback } from "react";
import { WebContainer } from "@webcontainer/api";

// 🚨 THE MEMORY FIX: Global variable outside of React!
// This guarantees we only ever boot ONE WebContainer per browser tab,
// even if React unmounts and remounts the IDE component multiple times.
let globalBootPromise: Promise<WebContainer> | null = null;

interface UseWebContainerReturn {
  instance: WebContainer | null;
  isLoading: boolean;
  error: string | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
  restartInstance: () => void;
}

export const useWebContainer = (): UseWebContainerReturn => {
  const [instance, setInstance] = useState<WebContainer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function boot() {
      try {
        // If it hasn't started booting yet, start it and save the Promise globally
        if (!globalBootPromise) {
          console.log("📦 Booting WebContainer...");
          globalBootPromise = WebContainer.boot();
        }

        // Wait for the global promise to resolve
        const webContainer = await globalBootPromise;
        setInstance(webContainer);
        setIsLoading(false);
        console.log("✅ WebContainer ready");
      } catch (err: any) {
        console.error("❌ Failed to boot WebContainer:", err);
        globalBootPromise = null; // Reset on failure so we can try again
        
        if (err.message?.includes("SharedArrayBuffer")) {
          setError("Security Headers Missing: COOP/COEP are required in next.config.js");
        } else {
          setError(err instanceof Error ? err.message : "Failed to initialize WebContainer");
        }
        setIsLoading(false);
      }
    }

    if (!instance) {
      boot();
    }
  }, [instance]);

  // --- IMPROVED FILE SYSTEM HELPERS ---

  const writeFileSync = useCallback(async (path: string, content: string) => {
    if (!instance) return;

    try {
      // Use the path exactly as given — no src/ prepending
      // The caller (playground-workspace) already knows the correct path
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;

      // Ensure parent directories exist
      const parts = cleanPath.split("/");
      if (parts.length > 1) {
        const folder = parts.slice(0, -1).join("/");
        await instance.fs.mkdir(folder, { recursive: true });
      }

      await instance.fs.writeFile(cleanPath, content);
    } catch (err) {
      console.error(`❌ Failed to write file: ${path}`, err);
      throw err;
    }
  }, [instance]);

  const readFile = useCallback(async (path: string) => {
    if (!instance) return "";
    try {
      return await instance.fs.readFile(path, "utf-8");
    } catch (err) {
      console.error(`Failed to read file: ${path}`, err);
      return "";
    }
  }, [instance]);

  const restartInstance = useCallback(() => {
    globalBootPromise = null; // Wipe the global promise
    setInstance(null);
    setIsLoading(true);
    setError(null);
    window.location.reload(); 
  }, []);

  return { instance, isLoading, error, writeFileSync, readFile, restartInstance };
};