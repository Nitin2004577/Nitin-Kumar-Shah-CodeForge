
"use client";

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";
import "xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Copy, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface TerminalProps {
  webcontainerUrl?: string;
  className?: string;
  theme?: "dark" | "light";
  webContainerInstance?: any;
}

export interface TerminalRef {
  writeToTerminal: (data: string) => void;
  clearTerminal: () => void;
  focusTerminal: () => void;
}

const TerminalComponent = forwardRef<TerminalRef, TerminalProps>(({ 
  webcontainerUrl, 
  className,
  theme = "dark",
  webContainerInstance
}, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  // Refs for logic (to avoid stale closures in event listeners)
  const currentLine = useRef<string>("");
  const cursorPosition = useRef<number>(0);
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);
  const currentProcess = useRef<any>(null);
  
  // Keep track of the latest webContainerInstance without triggering re-renders
  const instanceRef = useRef(webContainerInstance);

  // Update instance ref when prop changes
  useEffect(() => {
    instanceRef.current = webContainerInstance;
    if (webContainerInstance && term.current && !isConnected) {
       setIsConnected(true);
       term.current.writeln("\r\n\x1b[32m✅ Connected to WebContainer Engine\x1b[0m");
       term.current.write("\r\n$ ");
    }
  }, [webContainerInstance, isConnected]);

  const terminalThemes = {
    dark: {
      background: "#09090B", // Zinc-950
      foreground: "#FAFAFA",
      cursor: "#FAFAFA",
      selection: "#27272A", // Zinc-800
      black: "#18181B",
      red: "#EF4444",
      green: "#22C55E",
      yellow: "#EAB308",
      blue: "#3B82F6",
      magenta: "#A855F7",
      cyan: "#06B6D4",
      white: "#F4F4F5",
    },
    light: {
      background: "#FFFFFF",
      foreground: "#18181B",
      cursor: "#18181B",
      selection: "#E4E4E7",
      black: "#000000",
      red: "#DC2626",
      green: "#16A34A",
      yellow: "#CA8A04",
      blue: "#2563EB",
      magenta: "#9333EA",
      cyan: "#0891B2",
      white: "#FFFFFF",
    },
  };

  // --- Core Terminal Logic ---

  const writePrompt = useCallback(() => {
    if (term.current) {
      term.current.write("\r\n$ ");
      currentLine.current = "";
      cursorPosition.current = 0;
    }
  }, []);

  const executeCommand = useCallback(async (command: string) => {
    if (!instanceRef.current || !term.current) return;

    const trimmedCommand = command.trim();

    // 1. Handle Empty Command
    if (!trimmedCommand) {
      writePrompt();
      return;
    }

    // 2. Add to History
    if (commandHistory.current[commandHistory.current.length - 1] !== trimmedCommand) {
      commandHistory.current.push(trimmedCommand);
    }
    historyIndex.current = -1;

    try {
      term.current.writeln(""); // Move to next line

      // 3. Handle Built-in Commands
      if (trimmedCommand === "clear") {
        term.current.clear();
        writePrompt();
        return;
      }

      // 4. Spawn Process in WebContainer
      const parts = trimmedCommand.split(' ');
      const cmd = parts[0];
      const args = parts.slice(1);

      const process = await instanceRef.current.spawn(cmd, args, {
        terminal: {
          cols: term.current.cols,
          rows: term.current.rows,
        },
      });

      currentProcess.current = process;

      // Pipe Output to Terminal
      process.output.pipeTo(new WritableStream({
        write(data) {
          term.current?.write(data);
        },
      }));

      // Wait for exit
      await process.exit;
      currentProcess.current = null;
      writePrompt();

    } catch (error: any) {
      if (term.current) {
        term.current.writeln(`\r\n\x1b[31mError: ${error.message || "Command failed"}\x1b[0m`);
        writePrompt();
      }
      currentProcess.current = null;
    }
  }, [writePrompt]);

  const handleTerminalInput = useCallback((data: string) => {
    if (!term.current) return;
    
    // Allow Ctrl+C to interrupt
    if (data === '\u0003') { // Ctrl+C
        if (currentProcess.current) {
            currentProcess.current.kill();
            currentProcess.current = null;
        }
        term.current.writeln("^C");
        writePrompt();
        return;
    }

    // If a process is running, we send data to it (interactive mode)
    if (currentProcess.current) {
        const writer = currentProcess.current.input.getWriter();
        writer.write(data);
        writer.releaseLock();
        return;
    }

    // Otherwise, handle local shell editing
    switch (data) {
      case '\r': // Enter
        executeCommand(currentLine.current);
        break;
        
      case '\u007F': // Backspace
        if (cursorPosition.current > 0) {
          currentLine.current = 
            currentLine.current.slice(0, cursorPosition.current - 1) + 
            currentLine.current.slice(cursorPosition.current);
          cursorPosition.current--;
          term.current.write('\b \b'); // Destructive backspace visual
        }
        break;
        
      case '\u001b[A': // Up arrow (History Prev)
        if (commandHistory.current.length > 0) {
           const newIndex = historyIndex.current === -1 
             ? commandHistory.current.length - 1 
             : Math.max(0, historyIndex.current - 1);
           
           historyIndex.current = newIndex;
           const cmd = commandHistory.current[newIndex];
           
           // Clear line and write new command
           term.current.write('\r$ \x1b[K' + cmd); 
           currentLine.current = cmd;
           cursorPosition.current = cmd.length;
        }
        break;
        
      case '\u001b[B': // Down arrow (History Next)
        if (historyIndex.current !== -1) {
            const newIndex = historyIndex.current + 1;
            
            if (newIndex < commandHistory.current.length) {
                historyIndex.current = newIndex;
                const cmd = commandHistory.current[newIndex];
                term.current.write('\r$ \x1b[K' + cmd);
                currentLine.current = cmd;
                cursorPosition.current = cmd.length;
            } else {
                historyIndex.current = -1;
                term.current.write('\r$ \x1b[K'); // Clear line
                currentLine.current = "";
                cursorPosition.current = 0;
            }
        }
        break;
        
      default:
        // Regular typing
        if (data >= ' ' || data === '\t') {
          currentLine.current = 
            currentLine.current.slice(0, cursorPosition.current) + 
            data + 
            currentLine.current.slice(cursorPosition.current);
          cursorPosition.current++;
          term.current.write(data);
        }
        break;
    }
  }, [executeCommand, writePrompt]);

  // --- Lifecycle: Initialization ---

  useEffect(() => {
    // Prevent double initialization
    if (term.current || !terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"Fira Code", "JetBrains Mono", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      theme: terminalThemes[theme],
      convertEol: true, // Crucial for proper newlines
    });

    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();
    const search = new SearchAddon();

    terminal.loadAddon(fit);
    terminal.loadAddon(webLinks);
    terminal.loadAddon(search);

    terminal.open(terminalRef.current);
    fit.fit();
    
    // Bind refs
    term.current = terminal;
    fitAddon.current = fit;
    searchAddon.current = search;

    // Attach Input Listener
    terminal.onData(handleTerminalInput);

    terminal.writeln("\x1b[34m🚀 WebContainer Terminal Ready\x1b[0m");
    if (!webContainerInstance) {
        terminal.writeln("Waiting for container...");
    }

    // Handle Resize
    const resizeObserver = new ResizeObserver(() => {
        // Small delay to ensure container has resized
        requestAnimationFrame(() => {
            fit.fit();
        });
    });
    
    resizeObserver.observe(terminalRef.current);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      term.current = null;
    };
  }, []); // Empty dependency array ensures this runs ONCE only

  // --- Exposed Methods ---
  useImperativeHandle(ref, () => ({
    writeToTerminal: (data: string) => {
      term.current?.write(data);
    },
    clearTerminal: () => {
      term.current?.clear();
      writePrompt();
    },
    focusTerminal: () => {
      term.current?.focus();
    },
  }));

  // Helper functions for toolbar
  const copyTerminalContent = () => {
    const selection = term.current?.getSelection();
    if (selection) navigator.clipboard.writeText(selection);
  };
  
  const clearTerminal = () => {
      term.current?.clear();
      writePrompt();
  };

  const downloadTerminalLog = () => {
    // Implementation for downloading log (optional)
  };

  const performSearch = (text: string) => {
      if(searchAddon.current) {
          searchAddon.current.findNext(text);
      }
  };

  return (
    <div className={cn("flex flex-col h-full w-full bg-[#09090B] border border-zinc-800 rounded-md overflow-hidden", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900 border-b border-zinc-800">
         <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500"/>
            <span className="w-2 h-2 rounded-full bg-yellow-500"/>
            <span className="w-2 h-2 rounded-full bg-green-500"/>
            <span className="text-xs text-zinc-400 font-mono ml-2">bash</span>
         </div>
         
         <div className="flex items-center gap-1">
            {showSearch && (
                 <Input 
                    className="h-6 w-32 text-xs bg-zinc-950 border-zinc-700" 
                    placeholder="Find..." 
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        performSearch(e.target.value);
                    }}
                 />
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white" onClick={() => setShowSearch(!showSearch)}>
                <Search className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white" onClick={copyTerminalContent}>
                <Copy className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-white" onClick={clearTerminal}>
                <Trash2 className="h-3 w-3" />
            </Button>
         </div>
      </div>

      <div className="flex-1 relative bg-[#09090B]">
        <div ref={terminalRef} className="absolute inset-0 p-1" />
      </div>
    </div>
  );
});

TerminalComponent.displayName = "TerminalComponent";
export default TerminalComponent;