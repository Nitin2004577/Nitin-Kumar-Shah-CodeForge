"use client";

import React, { useEffect, useState } from "react";
import type { TemplateFolder } from "@/../../features/playground/lib/path-to-json";
import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WebContainer } from "@webcontainer/api";

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  serverUrl: string;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  forceResetup?: boolean;
  showPreview?: boolean;
  terminalRef: React.MutableRefObject<any>;
}

const WebContainerPreview: React.FC<WebContainerPreviewProps> = ({
  templateData,
  error,
  instance,
  isLoading,
  serverUrl,
  writeFileSync,
  forceResetup = false,
  showPreview = true,
  terminalRef,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loadingState, setLoadingState] = useState({
    transforming: false,
    mounting: false,
    installing: false,
    starting: false,
    ready: false,
  });

  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);

  // Reset setup state when forceResetup changes
  useEffect(() => {
    if (forceResetup) {
      setIsSetupComplete(false);
      setIsSetupInProgress(false);
      setPreviewUrl("");
      setCurrentStep(0);
      setLoadingState({
        transforming: false,
        mounting: false,
        installing: false,
        starting: false,
        ready: false,
      });
    }
  }, [forceResetup]);

  useEffect(() => {
    let isMounted = true;

    async function setupContainer() {
      // Prevent running if instance is missing or setup is already done/in-progress
      if (!instance || isSetupComplete || isSetupInProgress) return;

      // Wait for the terminal ref to be ready (passed from parent)
      if (!terminalRef.current) {
        setTimeout(setupContainer, 100);
        return;
      }

      try {
        setIsSetupInProgress(true);
        setSetupError(null);

        // --- INTELLIGENT SETUP LOGIC ---
        let shouldMount = true;
        let shouldInstall = true;

        // 1. Check if files already exist (e.g. page reload or reconnect)
        try {
          const packageJson = await instance.fs.readFile('package.json', 'utf8').catch(() => null);
          if (packageJson) {
            shouldMount = false;
            terminalRef.current.writeToTerminal("🔄 Files detected. Skipping mount step.\r\n");
            
            // If package.json exists, check for node_modules to see if we can skip install
            const nodeModules = await instance.fs.readdir('node_modules').catch(() => null);
            if (nodeModules && nodeModules.length > 0) {
              shouldInstall = false;
              terminalRef.current.writeToTerminal("📦 'node_modules' detected. Skipping install step.\r\n");
            }
          }
        } catch (e) {
          console.log("File check failed, proceeding with full setup");
        }

        // --- Step 1 & 2: Transform & Mount (Run only if needed) ---
        if (shouldMount) {
          setLoadingState((prev) => ({ ...prev, transforming: true }));
          setCurrentStep(1);
          terminalRef.current.writeToTerminal("🔄 Transforming template data...\r\n");

          // @ts-ignore
          const files = transformToWebContainerFormat(templateData);

          setLoadingState((prev) => ({ ...prev, transforming: false, mounting: true }));
          setCurrentStep(2);

          terminalRef.current.writeToTerminal("📁 Mounting files...\r\n");
          await instance.mount(files);
          terminalRef.current.writeToTerminal("✅ Files mounted.\r\n");
        } else {
            // Update UI to show these steps as done
            setCurrentStep(3); 
        }

        // --- Step 3: Install Dependencies (Run only if needed) ---
        if (shouldInstall) {
            setLoadingState((prev) => ({ ...prev, mounting: false, installing: true }));
            setCurrentStep(3);
            terminalRef.current.writeToTerminal("📦 Installing dependencies...\r\n");
            
            const installProcess = await instance.spawn("npm", ["install"]);
            
            // Pipe output to terminal so user sees progress
            installProcess.output.pipeTo(new WritableStream({
                write(data) { if(terminalRef.current) terminalRef.current.writeToTerminal(data); }
            }));

            const installExitCode = await installProcess.exit;
            if (installExitCode !== 0) throw new Error(`Install failed with code ${installExitCode}`);
            
            terminalRef.current.writeToTerminal("✅ Dependencies installed.\r\n");
        } else {
             // Update UI to show this step as done
             setCurrentStep(4);
        }

        // --- Step 4: Start Server (ALWAYS RUN THIS) ---
        // We do NOT return early here. We always run the start command.
        setLoadingState((prev) => ({ ...prev, installing: false, starting: true }));
        setCurrentStep(4);
        terminalRef.current.writeToTerminal("🚀 Starting development server...\r\n");

        // Spawn the dev server (Next.js/Vite/etc)
        const startProcess = await instance.spawn("npm", ["run", "dev"]);

        // Listen for the server to be ready
        instance.on("server-ready", (port: number, url: string) => {
          if (!isMounted) return;
          terminalRef.current.writeToTerminal(`🌐 Server ready at ${url}\r\n`);
          setPreviewUrl(url);
          setLoadingState((prev) => ({ ...prev, starting: false, ready: true }));
          setIsSetupComplete(true);
          setIsSetupInProgress(false);
        });

        // IMPORTANT: Pipe the server output to the terminal immediately!
        // This lets the user see "Ready in 2.5s" or "Compiling..." so they know it's not stuck.
        startProcess.output.pipeTo(new WritableStream({
            write(data) { if(terminalRef.current) terminalRef.current.writeToTerminal(data); }
        }));

      } catch (err) {
        if (!isMounted) return;
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (terminalRef.current) terminalRef.current.writeToTerminal(`❌ Error: ${errorMessage}\r\n`);
        setSetupError(errorMessage);
        setIsSetupInProgress(false);
      }
    }

    setupContainer();
    return () => { isMounted = false; };
  }, [instance, templateData, isSetupComplete, isSetupInProgress, terminalRef]);

  // --- UI RENDER ---

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (stepIndex === currentStep) return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
  };

  const getStepText = (stepIndex: number, label: string) => {
    const isActive = stepIndex === currentStep;
    const isComplete = stepIndex < currentStep;
    return (
      <span className={`text-sm font-medium ${isComplete ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-500'}`}>
        {label}
      </span>
    );
  };

  if (isLoading) return <div className="h-full flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  if (error || setupError) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-md flex items-center gap-3">
           <XCircle className="h-6 w-6 shrink-0" />
           <p className="text-sm font-medium">{error || setupError}</p>
        </div>
      </div>
    );
  }

  // 1. Loading View (Visible if we don't have a URL yet)
  if (!previewUrl) {
    if (!showPreview) return null;
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <div className="w-full max-w-md p-6 rounded-lg bg-white dark:bg-zinc-800 shadow-sm border dark:border-zinc-700">
            <h3 className="text-lg font-semibold mb-4 text-center">Setting up Environment</h3>
            <Progress value={(currentStep / totalSteps) * 100} className="h-2 mb-6" />
            <div className="space-y-4">
               <div className="flex items-center gap-3">{getStepIcon(1)}{getStepText(1, "Transforming template")}</div>
               <div className="flex items-center gap-3">{getStepIcon(2)}{getStepText(2, "Mounting files")}</div>
               <div className="flex items-center gap-3">{getStepIcon(3)}{getStepText(3, "Installing dependencies")}</div>
               <div className="flex items-center gap-3">{getStepIcon(4)}{getStepText(4, "Starting server")}</div>
            </div>
        </div>
      </div>
    );
  }

  // 2. Iframe View (Visible once URL is ready)
  return (
    <div className={`h-full w-full bg-white relative ${!showPreview ? 'hidden' : 'block'}`}>
      <iframe src={previewUrl} className="w-full h-full border-none" title="WebContainer Preview" />
    </div>
  );
};

export default WebContainerPreview;