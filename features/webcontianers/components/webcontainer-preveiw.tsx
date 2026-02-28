"use client";

import React, { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import type { TemplateFolder } from "@/../../features/playground/lib/path-to-json";
import { transformToWebContainerFormat } from "../hooks/transformer";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WebContainer } from "@webcontainer/api";

// Dynamic import to prevent SSR issues with xterm.js
const TerminalComponent = dynamic(() => import("./terminal"), { 
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#1e1e1e]" />
});

interface WebContainerPreviewProps {
  templateData: TemplateFolder;
  serverUrl: string;
  isLoading: boolean;
  error: string | null;
  instance: WebContainer | null;
  writeFileSync: (path: string, content: string) => Promise<void>;
  forceResetup?: boolean;
}

const WebContainerPreview: React.FC<WebContainerPreviewProps> = ({
  templateData,
  error,
  instance,
  isLoading,
  serverUrl,
  writeFileSync,
  forceResetup = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loadingState, setLoadingState] = useState({
    transforming: false,
    mounting: false,
    installing: false,
    starting: false,
    ready: false,
  });
  
  const [isTerminalReady, setIsTerminalReady] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 4;
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);
  
  const terminalRef = useRef<any>(null);
  // Track the running server process so we can kill it later
  const serverProcessRef = useRef<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsTerminalReady(true), 1500);
    return () => clearTimeout(timer);
  }, []);

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
    async function setupContainer() {
      if (!instance || !isTerminalReady || isSetupComplete || isSetupInProgress) return;

      const getStartCommand = async () => {
        try {
          const pkgStr = await instance.fs.readFile('package.json', 'utf8');
          const pkg = JSON.parse(pkgStr);
          if (pkg.scripts?.dev) return "dev";
          if (pkg.scripts?.start) return "start";
        } catch (e) {
          console.warn("Could not parse package.json for scripts. Defaulting to 'start'.");
        }
        return "start"; 
      };

      // Helper to kill existing node processes before starting a new one
      const killExistingServers = async () => {
        try {
          const killProcess = await instance.spawn("killall", ["node"]);
          await killProcess.exit;
        } catch (e) {
          // Ignore if nothing is running
        }
      };

      // ✨ NEW: Helper to clear corrupted Webpack/TS caches
      const clearCache = async () => {
        try {
          const rmProcess = await instance.spawn("rm", ["-rf", "node_modules/.cache"]);
          await rmProcess.exit;
        } catch (e) {
          // Ignore if folder doesn't exist
        }
      };

      try {
        setIsSetupInProgress(true);
        setSetupError(null);
        
        let hasPackageJson = false;
        let hasNodeModules = false;

        try {
          await instance.fs.readFile('package.json', 'utf8');
          hasPackageJson = true;
        } catch (e) {}

        try {
          await instance.fs.readdir('node_modules');
          hasNodeModules = true;
        } catch (e) {}

        // --- RECONNECT LOGIC ---
        if (hasPackageJson && hasNodeModules) {
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal("🔄 Existing setup found. Cleaning up old processes and cache...\r\n");
          }
          
          await clearCache(); // Clear the TS/Webpack cache
          await killExistingServers(); // Automatically fix port collisions
          
          setCurrentStep(4);
          setLoadingState((prev) => ({ ...prev, starting: true }));

          instance.on("server-ready", (port: number, url: string) => {
            console.log(`Reconnected to server on port ${port} at ${url}`);
            if (terminalRef.current?.writeToTerminal) {
              terminalRef.current.writeToTerminal(`🌐 Server ready at ${url}\r\n`);
            }
            setPreviewUrl(url);
            setLoadingState((prev) => ({ ...prev, starting: false, ready: true }));
            setIsSetupComplete(true);
            setIsSetupInProgress(false);
          });
          
          const cmd = await getStartCommand();
          // Pass cross-env CI=true to prevent interactive prompts from tools like CRA
          const startProcess = await instance.spawn("npm", ["run", cmd], {
            env: { CI: "true" }
          });
          serverProcessRef.current = startProcess; // Save reference to kill later
          
          startProcess.output.pipeTo(
            new WritableStream({
              write(data) {
                if (terminalRef.current?.writeToTerminal) {
                  terminalRef.current.writeToTerminal(data);
                }
              },
            })
          );

          return; 
        }
        
        // --- Step 1: Transform data ---
        setLoadingState((prev) => ({ ...prev, transforming: true }));
        setCurrentStep(1);
        
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("🔄 Transforming template data...\r\n");
        }

        // @ts-ignore
        const files = transformToWebContainerFormat(templateData);

        setLoadingState((prev) => ({ ...prev, transforming: false, mounting: true }));
        setCurrentStep(2);

        // --- Step 2: Mount files ---
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("📁 Mounting files to WebContainer...\r\n");
        }
        
        await instance.mount(files);
        
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("✅ Files mounted successfully\r\n");
        }

        setLoadingState((prev) => ({ ...prev, mounting: false, installing: true }));
        setCurrentStep(3);

        // --- Step 3: Install dependencies ---
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("📦 Installing dependencies (this may take a minute)...\r\n");
        }
        
        const installProcess = await instance.spawn("npm", ["install"]);

        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              if (terminalRef.current?.writeToTerminal) {
                terminalRef.current.writeToTerminal(data);
              }
            },
          })
        );

        const installExitCode = await installProcess.exit;

        if (installExitCode !== 0) {
          throw new Error(`Failed to install dependencies. Exit code: ${installExitCode}`);
        }

        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("✅ Dependencies installed successfully\r\n");
        }

        setLoadingState((prev) => ({ ...prev, installing: false, starting: true }));
        setCurrentStep(4);

        // --- Step 4: Start the server ---
        await clearCache(); // Clear the TS/Webpack cache
        await killExistingServers(); // Make absolutely sure port is clear
        
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal("🚀 Starting development server...\r\n");
        }
        
        const cmd = await getStartCommand();
        const startProcess = await instance.spawn("npm", ["run", cmd], {
            env: { CI: "true" }
        }); 
        serverProcessRef.current = startProcess; // Save reference to kill later

        instance.on("server-ready", (port: number, url: string) => {
          console.log(`Server ready on port ${port} at ${url}`);
          if (terminalRef.current?.writeToTerminal) {
            terminalRef.current.writeToTerminal(`🌐 Server ready at ${url}\r\n`);
          }
          setPreviewUrl(url);
          setLoadingState((prev) => ({ ...prev, starting: false, ready: true }));
          setIsSetupComplete(true);
          setIsSetupInProgress(false);
        });

        startProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              if (terminalRef.current?.writeToTerminal) {
                terminalRef.current.writeToTerminal(data);
              }
            },
          })
        );

      } catch (err) {
        console.error("Error setting up container:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        
        if (terminalRef.current?.writeToTerminal) {
          terminalRef.current.writeToTerminal(`❌ Error: ${errorMessage}\r\n`);
        }
        
        setSetupError(errorMessage);
        setIsSetupInProgress(false);
        setLoadingState({
          transforming: false,
          mounting: false,
          installing: false,
          starting: false,
          ready: false,
        });
      }
    }

    setupContainer();
  }, [instance, templateData, isSetupComplete, isSetupInProgress, isTerminalReady]);

  // Cleanup hook when component unmounts
  useEffect(() => {
    return () => {
      if (serverProcessRef.current) {
        serverProcessRef.current.kill();
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md p-6 rounded-lg bg-gray-50 dark:bg-gray-900">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <h3 className="text-lg font-medium">Initializing WebContainer</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Setting up the environment for your project...
          </p>
        </div>
      </div>
    );
  }

  if (error || setupError) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-6 rounded-lg max-w-md">
          <div className="flex items-center gap-2 mb-3">
            <XCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error</h3>
          </div>
          <p className="text-sm">{error || setupError}</p>
        </div>
      </div>
    );
  }

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (stepIndex === currentStep) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />;
    }
  };

  const getStepText = (stepIndex: number, label: string) => {
    const isActive = stepIndex === currentStep;
    const isComplete = stepIndex < currentStep;
    
    return (
      <span className={`text-sm font-medium ${
        isComplete ? 'text-green-600' : 
        isActive ? 'text-blue-600' : 
        'text-gray-500'
      }`}>
        {label}
      </span>
    );
  };

  return (
    <div className="h-full w-full flex flex-col">
      {!previewUrl ? (
        <div className="h-full flex flex-col">
          <div className="w-full max-w-md p-6 m-5 rounded-lg bg-white dark:bg-zinc-800 shadow-sm mx-auto">
            <Progress
              value={(currentStep / totalSteps) * 100}
              className="h-2 mb-6"
            />
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                {getStepIcon(1)}
                {getStepText(1, "Transforming template data")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(2)}
                {getStepText(2, "Mounting files")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(3)}
                {getStepText(3, "Installing dependencies")}
              </div>
              <div className="flex items-center gap-3">
                {getStepIcon(4)}
                {getStepText(4, "Starting development server")}
              </div>
            </div>
          </div>

          {/* Terminal */}
          <div className="flex-1 p-4">
            <TerminalComponent 
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            />
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
          {/* Preview */}
          <div className="flex-1">
            <iframe
              src={previewUrl}
              className="w-full h-full border-none"
              title="WebContainer Preview"
            />
          </div>
          
          {/* Terminal at bottom when preview is ready */}
          <div className="h-64 border-t">
            <TerminalComponent 
              ref={terminalRef}
              webContainerInstance={instance}
              theme="dark"
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WebContainerPreview;