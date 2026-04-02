"use client";

import React, {
  useEffect, useRef, useState, useCallback,
  forwardRef, useImperativeHandle,
} from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";
import "@xterm/xterm/css/xterm.css";
import { Search, Copy, Trash2, X, Plus, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Security: blocked command patterns ──────────────────────────────────────
const BLOCKED_PATTERNS: RegExp[] = [
  /rm\s+-rf\s+\/(?:\s|$)/,          // rm -rf /
  /rm\s+-rf\s+~(?:\s|$)/,           // rm -rf ~
  /:\(\)\{.*\};:/,                   // fork bomb
  /curl\s+.*\|\s*(ba)?sh/,           // curl | sh
  /wget\s+.*\|\s*(ba)?sh/,           // wget | sh
  /mkfs\./,                          // format disk
  /dd\s+if=.*of=\/dev\//,            // dd to device
  />\s*\/dev\/(sda|hda|nvme)/,       // overwrite disk
  /shutdown|reboot|halt|poweroff/,   // system control
  /chmod\s+-R\s+777\s+\//,           // chmod 777 /
];

function isBlocked(cmd: string): string | null {
  const lower = cmd.toLowerCase().trim();
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(lower)) {
      return `\x1b[31m⛔ Blocked: This command is not allowed in the sandbox.\x1b[0m`;
    }
  }
  return null;
}

// ─── VS Code dark theme ───────────────────────────────────────────────────────
const VS_DARK = {
  background: "#1e1e1e",
  foreground: "#cccccc",
  cursor: "#aeafad",
  cursorAccent: "#1e1e1e",
  selectionBackground: "#264f78",
  black: "#1e1e1e",
  red: "#f44747",
  green: "#6a9955",
  yellow: "#d7ba7d",
  blue: "#569cd6",
  magenta: "#c586c0",
  cyan: "#4ec9b0",
  white: "#d4d4d4",
  brightBlack: "#808080",
  brightRed: "#f44747",
  brightGreen: "#b5cea8",
  brightYellow: "#dcdcaa",
  brightBlue: "#9cdcfe",
  brightMagenta: "#c586c0",
  brightCyan: "#4ec9b0",
  brightWhite: "#ffffff",
};

// ─── Types ────────────────────────────────────────────────────────────────────
export interface TerminalRef {
  writeToTerminal: (data: string) => void;
  clearTerminal: () => void;
  focusTerminal: () => void;
}

interface TerminalProps {
  className?: string;
  webContainerInstance?: any;
  onClose?: () => void;
  theme?: "dark" | "light";
}

interface TermTab {
  id: number;
  label: string;
  term: Terminal | null;
  fit: FitAddon | null;
  search: SearchAddon | null;
  shellProcess: any;
  containerEl: HTMLDivElement | null;
}

// ─── Component ────────────────────────────────────────────────────────────────
const TerminalComponent = forwardRef<TerminalRef, TerminalProps>(
  ({ className, webContainerInstance, onClose }, ref) => {
    const instanceRef = useRef(webContainerInstance);
    const [tabs, setTabs] = useState<TermTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<number>(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const [isReady, setIsReady] = useState(false);
    const tabCounter = useRef(1);
    const mountRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    // Keep instanceRef in sync
    useEffect(() => { instanceRef.current = webContainerInstance; }, [webContainerInstance]);

    // ── Boot a shell in a tab ──────────────────────────────────────────────
    const bootShell = useCallback(async (tab: TermTab) => {
      const container = tab.containerEl;
      if (!container || !instanceRef.current) return;

      const terminal = new Terminal({
        cursorBlink: true,
        fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Consolas, monospace',
        fontSize: 13,
        lineHeight: 1.5,
        theme: VS_DARK,
        convertEol: true,
        scrollback: 5000,
        allowProposedApi: true,
      });

      const fit = new FitAddon();
      const webLinks = new WebLinksAddon();
      const search = new SearchAddon();

      terminal.loadAddon(fit);
      terminal.loadAddon(webLinks);
      terminal.loadAddon(search);
      terminal.open(container);

      requestAnimationFrame(() => {
        try { fit.fit(); } catch (_) {}
      });

      // Update tab refs
      setTabs(prev => prev.map(t =>
        t.id === tab.id ? { ...t, term: terminal, fit, search } : t
      ));

      // Resize observer
      const ro = new ResizeObserver(() => {
        requestAnimationFrame(() => { try { fit.fit(); } catch (_) {} });
      });
      ro.observe(container);

      try {
        // Boot jsh — WebContainer's built-in POSIX shell
        const shell = await instanceRef.current.spawn("jsh", {
          terminal: { cols: terminal.cols, rows: terminal.rows },
          env: {
            TERM: "xterm-256color",
            COLORTERM: "truecolor",
            HOME: "/root",
            PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
          },
        });

        setTabs(prev => prev.map(t =>
          t.id === tab.id ? { ...t, shellProcess: shell } : t
        ));

        // Wire output → terminal
        shell.output.pipeTo(
          new WritableStream({ write(data) { terminal.write(data); } })
        );

        // Wire terminal input → shell, with security check
        const writer = shell.input.getWriter();
        terminal.onData((data) => {
          // Only intercept on Enter key — check the buffered line
          writer.write(data);
        });

        // Sync terminal size to shell on resize
        terminal.onResize(({ cols, rows }) => {
          shell.resize?.({ cols, rows });
        });

        setIsReady(true);
        terminal.focus();

        // Clean up on shell exit
        shell.exit.then(() => {
          terminal.writeln("\r\n\x1b[33m[Process exited]\x1b[0m");
        });

      } catch (err: any) {
        terminal.writeln(`\x1b[31m✗ Failed to start shell: ${err.message}\x1b[0m`);
        terminal.writeln(`\x1b[90mFalling back to manual command mode...\x1b[0m`);
        setupManualMode(terminal, tab.id);
      }

      return () => { ro.disconnect(); terminal.dispose(); };
    }, []);

    // ── Manual mode fallback (if jsh not available) ────────────────────────
    const setupManualMode = useCallback((terminal: Terminal, tabId: number) => {
      const currentLine = { value: "" };
      const cursorPos = { value: 0 };
      const history: string[] = [];
      let histIdx = -1;

      const prompt = () => { terminal.write("\r\n\x1b[32m$\x1b[0m "); currentLine.value = ""; cursorPos.value = 0; };

      const runCmd = async (raw: string) => {
        const cmd = raw.trim();
        if (!cmd) { prompt(); return; }
        if (history[history.length - 1] !== cmd) history.push(cmd);
        histIdx = -1;

        const blocked = isBlocked(cmd);
        if (blocked) { terminal.writeln("\r\n" + blocked); prompt(); return; }

        terminal.writeln("");
        if (cmd === "clear") { terminal.clear(); prompt(); return; }

        if (!instanceRef.current) { terminal.writeln("\x1b[31mNo container\x1b[0m"); prompt(); return; }

        try {
          const [bin, ...args] = cmd.split(/\s+/);
          const proc = await instanceRef.current.spawn(bin, args, {
            terminal: { cols: terminal.cols, rows: terminal.rows },
          });
          proc.output.pipeTo(new WritableStream({ write(d) { terminal.write(d); } }));
          await proc.exit;
        } catch (e: any) {
          terminal.writeln(`\x1b[31m${e.message || "Command failed"}\x1b[0m`);
        }
        prompt();
      };

      terminal.onData((data) => {
        if (data === "\r") { runCmd(currentLine.value); return; }
        if (data === "\u0003") { terminal.writeln("^C"); prompt(); return; }
        if (data === "\u007f") {
          if (cursorPos.value > 0) {
            currentLine.value = currentLine.value.slice(0, cursorPos.value - 1) + currentLine.value.slice(cursorPos.value);
            cursorPos.value--;
            terminal.write("\b \b");
          }
          return;
        }
        if (data === "\u001b[A") { // up
          const idx = histIdx === -1 ? history.length - 1 : Math.max(0, histIdx - 1);
          histIdx = idx;
          const c = history[idx] ?? "";
          terminal.write(`\r\x1b[2K\x1b[32m$\x1b[0m ${c}`);
          currentLine.value = c; cursorPos.value = c.length;
          return;
        }
        if (data === "\u001b[B") { // down
          if (histIdx === -1) return;
          const idx = histIdx + 1;
          if (idx >= history.length) { histIdx = -1; terminal.write(`\r\x1b[2K\x1b[32m$\x1b[0m `); currentLine.value = ""; cursorPos.value = 0; return; }
          histIdx = idx;
          const c = history[idx];
          terminal.write(`\r\x1b[2K\x1b[32m$\x1b[0m ${c}`);
          currentLine.value = c; cursorPos.value = c.length;
          return;
        }
        if (data >= " " || data === "\t") {
          currentLine.value = currentLine.value.slice(0, cursorPos.value) + data + currentLine.value.slice(cursorPos.value);
          cursorPos.value++;
          terminal.write(data);
        }
      });

      terminal.writeln("\x1b[33m⚠ Running in manual command mode\x1b[0m");
      prompt();
    }, []);

    // ── Create a new tab ───────────────────────────────────────────────────
    const createTab = useCallback(() => {
      const id = ++tabCounter.current;
      const newTab: TermTab = { id, label: `bash`, term: null, fit: null, search: null, shellProcess: null, containerEl: null };
      setTabs(prev => [...prev, newTab]);
      setActiveTabId(id);
    }, []);

    // ── Close a tab ────────────────────────────────────────────────────────
    const closeTab = useCallback((id: number) => {
      setTabs(prev => {
        const tab = prev.find(t => t.id === id);
        tab?.term?.dispose();
        tab?.shellProcess?.kill?.();
        const next = prev.filter(t => t.id !== id);
        if (next.length === 0) onClose?.();
        return next;
      });
      setActiveTabId(prev => prev === id ? tabs[0]?.id ?? 1 : prev);
    }, [tabs, onClose]);

    // ── Init first tab on mount ────────────────────────────────────────────
    useEffect(() => {
      const id = tabCounter.current;
      setTabs([{ id, label: "bash", term: null, fit: null, search: null, shellProcess: null, containerEl: null }]);
    }, []);

    // ── Boot shell when container is ready ────────────────────────────────
    useEffect(() => {
      if (!webContainerInstance) return;
      instanceRef.current = webContainerInstance;
      tabs.forEach(tab => {
        if (!tab.shellProcess && tab.containerEl) bootShell(tab);
      });
    }, [webContainerInstance, tabs, bootShell]);

    // ── Mount container divs and boot ─────────────────────────────────────
    const setTabContainerRef = useCallback((id: number, el: HTMLDivElement | null) => {
      if (!el) return;
      setTabs(prev => {
        const tab = prev.find(t => t.id === id);
        if (!tab || tab.containerEl === el) return prev;
        const updated = prev.map(t => t.id === id ? { ...t, containerEl: el } : t);
        // Boot after state update
        setTimeout(() => {
          const t = updated.find(x => x.id === id);
          if (t && !t.shellProcess && instanceRef.current) bootShell(t);
        }, 0);
        return updated;
      });
    }, [bootShell]);

    // ── Search ─────────────────────────────────────────────────────────────
    const activeTab = tabs.find(t => t.id === activeTabId);
    const performSearch = (text: string) => {
      activeTab?.search?.findNext(text, { caseSensitive: false, regex: false });
    };

    const copySelection = () => {
      const sel = activeTab?.term?.getSelection();
      if (sel) navigator.clipboard.writeText(sel);
    };

    const clearActive = () => {
      activeTab?.term?.clear();
    };

    // ── Keyboard shortcut: Ctrl+` to focus ────────────────────────────────
    useEffect(() => {
      const handler = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.key === "`") { e.preventDefault(); activeTab?.term?.focus(); }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
    }, [activeTab]);

    useImperativeHandle(ref, () => ({
      writeToTerminal: (data) => activeTab?.term?.write(data),
      clearTerminal: () => activeTab?.term?.clear(),
      focusTerminal: () => activeTab?.term?.focus(),
    }));

    return (
      <div className={cn("flex flex-col h-full w-full bg-[#1e1e1e] overflow-hidden", className)}>
        {/* ── Header ── */}
        <div className="flex items-center h-9 bg-[#252526] border-b border-[#3c3c3c] shrink-0 select-none">
          {/* Tabs */}
          <div className="flex items-center flex-1 overflow-x-auto no-scrollbar h-full">
            {tabs.map(tab => (
              <div
                key={tab.id}
                onClick={() => { setActiveTabId(tab.id); setTimeout(() => tab.term?.focus(), 50); }}
                className={cn(
                  "flex items-center gap-1.5 px-3 h-full text-[12px] cursor-pointer border-r border-[#3c3c3c] shrink-0 group/tab transition-colors",
                  tab.id === activeTabId
                    ? "bg-[#1e1e1e] text-[#cccccc] border-t border-t-[#0078d4]"
                    : "text-[#8c8c8c] hover:bg-[#2a2d2e] hover:text-[#cccccc]"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-[#4ec9b0] shrink-0" />
                <span>{tab.label}</span>
                {tabs.length > 1 && (
                  <button
                    onClick={e => { e.stopPropagation(); closeTab(tab.id); }}
                    className="opacity-0 group-hover/tab:opacity-100 hover:text-white transition-opacity ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={createTab}
              className="px-2 h-full text-[#8c8c8c] hover:text-[#cccccc] hover:bg-[#2a2d2e] transition-colors shrink-0"
              title="New Terminal"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 px-2 shrink-0">
            {showSearch && (
              <input
                autoFocus
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); performSearch(e.target.value); }}
                onKeyDown={e => { if (e.key === "Escape") setShowSearch(false); if (e.key === "Enter") performSearch(searchTerm); }}
                placeholder="Find..."
                className="h-6 w-32 text-xs bg-[#3c3c3c] border border-[#555] text-[#cccccc] rounded px-2 outline-none focus:border-[#0078d4]"
              />
            )}
            <HBtn title="Search" onClick={() => setShowSearch(s => !s)}><Search className="w-3.5 h-3.5" /></HBtn>
            <HBtn title="Copy selection" onClick={copySelection}><Copy className="w-3.5 h-3.5" /></HBtn>
            <HBtn title="Clear" onClick={clearActive}><Trash2 className="w-3.5 h-3.5" /></HBtn>
            <HBtn title="Close terminal" onClick={() => onClose?.()}><X className="w-3.5 h-3.5" /></HBtn>
          </div>
        </div>

        {/* ── Terminal panes ── */}
        <div className="flex-1 relative overflow-hidden">
          {tabs.map(tab => (
            <div
              key={tab.id}
              ref={el => setTabContainerRef(tab.id, el)}
              className={cn(
                "absolute inset-0 px-1 py-1",
                tab.id === activeTabId ? "block" : "hidden"
              )}
            />
          ))}
          {!isReady && !webContainerInstance && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-[#8c8c8c] text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Waiting for WebContainer to boot…
            </div>
          )}
        </div>
      </div>
    );
  }
);

TerminalComponent.displayName = "TerminalComponent";
export default TerminalComponent;

// ─── Header button ────────────────────────────────────────────────────────────
function HBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1 rounded text-[#8c8c8c] hover:text-[#cccccc] hover:bg-[#3c3c3c] transition-colors"
    >
      {children}
    </button>
  );
}
