"use client";

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";
import "xterm/css/xterm.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Copy, Trash2, X, ChevronUp } from "lucide-react"; 
import { cn } from "@/lib/utils";

interface TerminalProps {
  webcontainerUrl?: string;
  className?: string;
  theme?: "dark" | "light";
  webContainerInstance?: any;
  onClose?: () => void;
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
  webContainerInstance,
  onClose
}, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const term = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const searchAddon = useRef<SearchAddon | null>(null);
  
  // State
  const [isConnected, setIsConnected] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  
  // Refs for logic
  const currentLine = useRef<string>("");
  const cursorPosition = useRef<number>(0);
  const commandHistory = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);
  const currentProcess = useRef<any>(null);
  
  const instanceRef = useRef(webContainerInstance);

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
      background: "#1e1e1e",
      foreground: "#CCCCCC",
      cursor: "#CCCCCC",
      selection: "#264F78",
      black: "#000000",
      red: "#CD3131",
      green: "#0DBC79",
      yellow: "#E5E510",
      blue: "#2472C8",
      magenta: "#BC3FBC",
      cyan: "#11A8CD",
      white: "#E5E5E5",
    },
    light: {
      background: "#FFFFFF",
      foreground: "#333333",
      cursor: "#333333",
      selection: "#ADD6FF",
      black: "#000000",
      red: "#CD3131",
      green: "#00BC00",
      yellow: "#949800",
      blue: "#0451A5",
      magenta: "#BC05BC",
      cyan: "#0598BC",
      white: "#555555",
    },
  };

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
    if (!trimmedCommand) {
      writePrompt();
      return;
    }
    if (commandHistory.current[commandHistory.current.length - 1] !== trimmedCommand) {
      commandHistory.current.push(trimmedCommand);
    }
    historyIndex.current = -1;

    try {
      term.current.writeln("");
      if (trimmedCommand === "clear") {
        term.current.clear();
        writePrompt();
        return;
      }

      const parts = trimmedCommand.split(' ');
      const cmd = parts[0];
      const args = parts.slice(1);

      const process = await instanceRef.current.spawn(cmd, args, {
        terminal: { cols: term.current.cols, rows: term.current.rows },
      });

      currentProcess.current = process;
      process.output.pipeTo(new WritableStream({
        write(data) { term.current?.write(data); },
      }));

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
    
    if (data === '\u0003') { 
        if (currentProcess.current) {
            currentProcess.current.kill();
            currentProcess.current = null;
        }
        term.current.writeln("^C");
        writePrompt();
        return;
    }

    if (currentProcess.current) {
        const writer = currentProcess.current.input.getWriter();
        writer.write(data);
        writer.releaseLock();
        return;
    }

    switch (data) {
      case '\r':
        executeCommand(currentLine.current);
        break;
      case '\u007F':
        if (cursorPosition.current > 0) {
          currentLine.current = currentLine.current.slice(0, cursorPosition.current - 1) + currentLine.current.slice(cursorPosition.current);
          cursorPosition.current--;
          term.current.write('\b \b');
        }
        break;
      case '\u001b[A':
        if (commandHistory.current.length > 0) {
           const newIndex = historyIndex.current === -1 ? commandHistory.current.length - 1 : Math.max(0, historyIndex.current - 1);
           historyIndex.current = newIndex;
           const cmd = commandHistory.current[newIndex];
           term.current.write('\r$ \x1b[K' + cmd); 
           currentLine.current = cmd;
           cursorPosition.current = cmd.length;
        }
        break;
      case '\u001b[B':
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
                term.current.write('\r$ \x1b[K');
                currentLine.current = "";
                cursorPosition.current = 0;
            }
        }
        break;
      default:
        if (data >= ' ' || data === '\t') {
          currentLine.current = currentLine.current.slice(0, cursorPosition.current) + data + currentLine.current.slice(cursorPosition.current);
          cursorPosition.current++;
          term.current.write(data);
        }
        break;
    }
  }, [executeCommand, writePrompt]);

  useEffect(() => {
    if (term.current || !terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontFamily: '"Fira Code", "JetBrains Mono", Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.4,
      theme: terminalThemes[theme],
      convertEol: true,
    });

    const fit = new FitAddon();
    const webLinks = new WebLinksAddon();
    const search = new SearchAddon();

    terminal.loadAddon(fit);
    terminal.loadAddon(webLinks);
    terminal.loadAddon(search);

    terminal.open(terminalRef.current);
    fit.fit();
    
    term.current = terminal;
    fitAddon.current = fit;
    searchAddon.current = search;

    terminal.onData(handleTerminalInput);

    terminal.writeln("\x1b[34m🚀 WebContainer Terminal Ready\x1b[0m");
    if (!webContainerInstance) {
        terminal.writeln("Waiting for container...");
    }

    const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
            fit.fit();
        });
    });
    
    resizeObserver.observe(terminalRef.current);

    return () => {
      resizeObserver.disconnect();
      terminal.dispose();
      term.current = null;
    };
  }, []); 

  useImperativeHandle(ref, () => ({
    writeToTerminal: (data: string) => { term.current?.write(data); },
    clearTerminal: () => { term.current?.clear(); writePrompt(); },
    focusTerminal: () => { term.current?.focus(); },
  }));

  const copyTerminalContent = () => {
    const selection = term.current?.getSelection();
    if (selection) navigator.clipboard.writeText(selection);
  };
  
  const clearTerminal = () => {
      term.current?.clear();
      writePrompt();
  };

  const performSearch = (text: string) => {
      if(searchAddon.current) searchAddon.current.findNext(text);
  };

  return (
    <div className={cn("flex flex-col h-full w-full bg-[#1e1e1e] border-t border-zinc-800 overflow-hidden", className)}>
      {/* VS Code Style Header */}
      <div className="flex items-center justify-between px-4 h-9 bg-[#1e1e1e] border-b border-zinc-800 shrink-0 select-none">
         
         {/* LEFT: ONLY Problems and Terminal */}
         <div className="flex items-center gap-6 h-full text-[11px] font-medium tracking-wide">
            <span className="text-zinc-500 hover:text-zinc-300 cursor-pointer uppercase">Problems</span>
            <span className="text-zinc-100 uppercase border-b border-blue-500 h-full flex items-center pt-[1px] cursor-default">Terminal</span>
         </div>
         
         {/* RIGHT: Bash & VS Code Actions */}
         <div className="flex items-center gap-1 text-zinc-400">
            {showSearch && (
                 <Input 
                    className="h-6 w-32 text-xs bg-zinc-900 border-zinc-700 text-zinc-300" 
                    placeholder="Find..." 
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        performSearch(e.target.value);
                    }}
                 />
            )}
            
            <div className="flex items-center mr-2 px-2 hover:bg-zinc-800 rounded cursor-pointer text-xs h-6 transition-colors">
               <span className="mr-1">bash</span>
            </div>

            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded" onClick={() => setShowSearch(!showSearch)}>
                <Search className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded" onClick={copyTerminalContent}>
                <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded" onClick={clearTerminal}>
                <Trash2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded">
                <ChevronUp className="h-4 w-4" />
            </Button>
            
            {/* The X button */}
            <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded ml-1" 
                onClick={() => onClose?.()}
            >
                <X className="h-4 w-4" />
            </Button>
         </div>
      </div>

      <div className="flex-1 relative bg-[#1e1e1e]">
        <div ref={terminalRef} className="absolute inset-0 pl-4 py-2" />
      </div>
    </div>
  );
});

TerminalComponent.displayName = "TerminalComponent";
export default TerminalComponent;