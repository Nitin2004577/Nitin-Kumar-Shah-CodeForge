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
  const isBooting = useRef(false);

  useEffect(() => {
    async function boot() {
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
      // 1. SMART PATH RESOLUTION
      // Redirects App.tsx to src/App.tsx so Webpack actually sees the change.
      const targetPath = (path.endsWith('.tsx') || path.endsWith('.css') || path.endsWith('.ts')) 
        && !path.startsWith('src/') 
        ? `src/${path}` 
        : path;

      // 2. CREATE FOLDERS
      const parts = targetPath.split('/');
      if (parts.length > 1) {
        const folder = parts.slice(0, -1).join('/');
        await instance.fs.mkdir(folder, { recursive: true });
      }

      // 3. WRITE TO WEBCONTAINER
      await instance.fs.writeFile(targetPath, content);
      
      // 4. PERSIST TO LOCAL STORAGE
      // This ensures your Todo app is still there when you refresh the browser.
      const filename = path.split('/').pop() || path;
      localStorage.setItem(`file-storage-${filename}`, content);
      
      console.log(`💾 Saved & Persisted: ${targetPath}`);
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
    isBooting.current = false;
    setInstance(null);
    setIsLoading(true);
    setError(null);
    window.location.reload(); 
  }, []);

  return { instance, isLoading, error, writeFileSync, readFile, restartInstance };
};