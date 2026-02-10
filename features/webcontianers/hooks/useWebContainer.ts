import { useState, useEffect, useCallback, useRef } from "react";
import { WebContainer } from "@webcontainer/api";

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
  
  // Guard against React Strict Mode double-invocation
  const isBooting = useRef(false);

  useEffect(() => {
    async function boot() {
      // 1. Prevent double booting
      if (isBooting.current) return;
      isBooting.current = true;

      try {
        console.log("📦 Booting WebContainer...");
        const webContainer = await WebContainer.boot();
        
        setInstance(webContainer);
        setIsLoading(false);
        console.log("✅ WebContainer ready");
      } catch (err: any) {
        console.error("❌ Failed to boot WebContainer:", err);
        
        // Check for the specific header error
        if (err.message?.includes("SharedArrayBuffer")) {
           setError("Security Headers Missing: COOP/COEP are required in next.config.js");
        } else {
           setError(err instanceof Error ? err.message : "Failed to initialize WebContainer");
        }
        setIsLoading(false);
      }
    }

    // Only boot if we haven't already (and no instance exists)
    if (!instance) {
      boot();
    }

    // Cleanup: We generally DO NOT teardown WebContainer on unmount in dev
    // because re-booting it is expensive and flaky in hot-reload scenarios.
    return () => {
       // Optional: instance.teardown() if you strictly want to clean up
    };
  }, []); // Empty dependency array = run once on mount

  // --- File System Helpers ---

  const writeFileSync = useCallback(async (path: string, content: string) => {
    if (!instance) return;

    try {
      // Ensure the folder structure exists
      const parts = path.split('/');
      if (parts.length > 1) {
          const folder = parts.slice(0, -1).join('/');
          await instance.fs.mkdir(folder, { recursive: true });
      }

      await instance.fs.writeFile(path, content);
    } catch (err) {
      console.error(`Failed to write file: ${path}`, err);
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

  // Helper to force a reset (useful for debugging)
  const restartInstance = useCallback(() => {
      isBooting.current = false;
      setInstance(null);
      setIsLoading(true);
      setError(null);
      // The useEffect will trigger again if we manipulate state right, 
      // but usually a full page reload is safer for WebContainers.
      window.location.reload(); 
  }, []);

  return { 
    instance, 
    isLoading, 
    error, 
    writeFileSync, 
    readFile,
    restartInstance 
  };
};