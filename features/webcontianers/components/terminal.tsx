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

// ─── Security blocklist ───────────────────────────────────────────────────────
const BLOCKED: RegExp[] = [
  /rm\s+-rf\s+\/(?:\s|$)/,
  /rm\s+-rf\s+~(?:\s|$)/,
  /:\(\)\{.*\};:/,
  /curl\s+.*\|\s*(ba)?sh/,
  /wget\s+.*\|\s*(ba)?sh/,
  /mkfs\./,
  /dd\s+if=.*of=\/dev\//,
  />\s*\/dev\/(sda|hda|nvme)/,
  /\b(shutdown|reboot|halt|poweroff)\b/,
  /chmod\s+-R\s+777\s+\//,
];
function isBlocked(cmd: string) {
  return BLOCKED.some(p => p.test(cmd.toLowerCase()));
}

// ─── VS Code dark theme ───────────────────────────────────────────────────────
const VS_DARK = {
  background: "#1e1e1e", foreground: "#cccccc",
  cursor: "#aeafad", cursorAccent: "#1e1e1e",
  selectionBackground: "#264f78",
  black: "#1e1e1e", red: "#f44747", green: "#6a9955",
  yellow: "#d7ba7d", blue: "#569cd6", magenta: "#c586c0",
  cyan: "#4ec9b0", white: "#d4d4d4",
  brightBlack: "#808080", brightRed: "#f44747", brightGreen: "#b5cea8",
  brightYellow: "#dcdcaa", brightBlue: "#9cdcfe",
  brightMagenta: "#c586c0", brightCyan: "#4ec9b0", brightWhite: "#ffffff",
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
  projectName?: string;
}

// Per-tab runtime data stored in a ref (never in state — avoids re-render loops)
interface TabRuntime {
  id: number;
  term: Terminal | null;
  fit: FitAddon | null;
  search: SearchAddon | null;
  shell: any;
  ro: ResizeObserver | null;
  booted: boolean;
}

const TerminalComponent = forwardRef<TerminalRef, TerminalProps>(
  ({ className, webContainerInstance, onClose, projectName = "codeforge" }, ref) => {
    const instanceRef = useRef(webContainerInstance);
    useEffect(() => { instanceRef.current = webContainerInstance; }, [webContainerInstance]);

    // Only IDs live in state — all xterm objects live in a ref map
    const [tabIds, setTabIds] = useState<number[]>([1]);
    const [activeId, setActiveId] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [showSearch, setShowSearch] = useState(false);
    const counter = useRef(1);

    // Runtime data keyed by tab id — never triggers re-renders
    const runtimes = useRef<Map<number, TabRuntime>>(new Map([[1, { id: 1, term: null, fit: null, search: null, shell: null, ro: null, booted: false }]]));

    // DOM container refs keyed by tab id
    const containerRefs = useRef<Map<number, HTMLDivElement>>(new Map());

    const getRuntime = (id: number) => runtimes.current.get(id)!;
    const getActive = () => getRuntime(activeId);

    // ── Boot a shell into a container div ─────────────────────────────────
    const bootTab = useCallback(async (id: number) => {
      const rt = runtimes.current.get(id);
      const el = containerRefs.current.get(id);
      if (!rt || !el || rt.booted) return;
      rt.booted = true;

      const term = new Terminal({
        cursorBlink: true,
        fontFamily: '"Cascadia Code","Fira Code","JetBrains Mono",Consolas,monospace',
        fontSize: 13,
        lineHeight: 1.5,
        theme: VS_DARK,
        convertEol: true,
        scrollback: 5000,
        allowProposedApi: true,
      });

      const fit = new FitAddon();
      term.loadAddon(fit);
      term.loadAddon(new WebLinksAddon());
      const search = new SearchAddon();
      term.loadAddon(search);
      term.open(el);

      rt.term = term;
      rt.fit = fit;
      rt.search = search;

      requestAnimationFrame(() => { try { fit.fit(); } catch (_) {} });

      const ro = new ResizeObserver(() => {
        requestAnimationFrame(() => { try { fit.fit(); } catch (_) {} });
      });
      ro.observe(el);
      rt.ro = ro;

      if (!instanceRef.current) {
        term.writeln("\x1b[33m⏳ Waiting for WebContainer…\x1b[0m");
        return;
      }

      try {
        // Try bash first (available after npm install in most templates)
        // Fall back to jsh if bash isn't available
        let shellCmd = "bash";
        let shellArgs: string[] = ["--norc", "--noprofile"];

        // Write a minimal .bashrc with a clean prompt
        try {
          await instanceRef.current.fs.writeFile("/root/.bashrc",
            `export PS1="\\[\\033[01;32m\\]➜\\[\\033[00m\\] \\[\\033[01;36m\\]${projectName}\\[\\033[00m\\] \\[\\033[01;34m\\]\\W\\[\\033[00m\\] \\$ "\n` +
            `export TERM=xterm-256color\n` +
            `export PROJECT_NAME="${projectName}"\n` +
            `alias ll='ls -la'\n` +
            `alias la='ls -A'\n` +
            `alias l='ls -CF'\n` +
            `cd /\n`
          );
          shellArgs = ["--rcfile", "/root/.bashrc"];
        } catch (_) {
          // fs write failed, use norc
        }

        let shell: any;
        try {
          shell = await instanceRef.current.spawn(shellCmd, shellArgs, {
            terminal: { cols: term.cols, rows: term.rows },
            env: {
              TERM: "xterm-256color",
              COLORTERM: "truecolor",
              HOME: "/root",
              PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/usr/local/lib/node_modules/.bin:./node_modules/.bin",
              PS1: "\\[\\033[01;32m\\]➜\\[\\033[00m\\] \\[\\033[01;34m\\]\\W\\[\\033[00m\\] \\$ ",
            },
          });
        } catch (_) {
          // bash not found, fall back to jsh
          shell = await instanceRef.current.spawn("jsh", {
            terminal: { cols: term.cols, rows: term.rows },
            env: { TERM: "xterm-256color", COLORTERM: "truecolor", HOME: "/root" },
          });
        }
        rt.shell = shell;

        shell.output.pipeTo(new WritableStream({ write(d: string) { term.write(d); } }));

        // Security: intercept input line-by-line
        let lineBuf = "";
        const writer = shell.input.getWriter();
        term.onData((data) => {
          if (data === "\r") {
            if (isBlocked(lineBuf)) {
              term.writeln(`\r\n\x1b[31m⛔ Blocked: command not allowed in sandbox.\x1b[0m`);
              writer.write("\n"); // send empty line to shell
            } else {
              writer.write(data);
            }
            lineBuf = "";
          } else if (data === "\u007f") {
            lineBuf = lineBuf.slice(0, -1);
            writer.write(data);
          } else if (data === "\u0003") {
            lineBuf = "";
            writer.write(data);
          } else {
            lineBuf += data;
            writer.write(data);
          }
        });

        term.onResize(({ cols, rows }) => { shell.resize?.({ cols, rows }); });
        term.focus();

      } catch (err: any) {
        term.writeln(`\x1b[31m✗ Shell error: ${err.message}\x1b[0m`);
        term.writeln(`\x1b[90mFalling back to manual mode…\x1b[0m\r\n`);
        setupManual(term);
      }
    }, []);

    // ── Manual fallback mode ───────────────────────────────────────────────
    const setupManual = (term: Terminal) => {
      const line = { v: "" }, cur = { v: 0 };
      const hist: string[] = [];
      let hi = -1;
      const prompt = () => { term.write("\r\n\x1b[32m$\x1b[0m "); line.v = ""; cur.v = 0; };

      term.onData(async (data) => {
        if (data === "\r") {
          const cmd = line.v.trim();
          if (!cmd) { prompt(); return; }
          if (hist[hist.length - 1] !== cmd) hist.push(cmd);
          hi = -1;
          if (isBlocked(cmd)) { term.writeln(`\r\n\x1b[31m⛔ Blocked\x1b[0m`); prompt(); return; }
          term.writeln("");
          if (cmd === "clear") { term.clear(); prompt(); return; }
          if (!instanceRef.current) { term.writeln("\x1b[31mNo container\x1b[0m"); prompt(); return; }
          try {
            const [bin, ...args] = cmd.split(/\s+/);
            const proc = await instanceRef.current.spawn(bin, args, { terminal: { cols: term.cols, rows: term.rows } });
            proc.output.pipeTo(new WritableStream({ write(d: string) { term.write(d); } }));
            await proc.exit;
          } catch (e: any) { term.writeln(`\x1b[31m${e.message}\x1b[0m`); }
          prompt();
        } else if (data === "\u0003") { term.writeln("^C"); prompt(); }
        else if (data === "\u007f") { if (cur.v > 0) { line.v = line.v.slice(0, cur.v - 1) + line.v.slice(cur.v); cur.v--; term.write("\b \b"); } }
        else if (data === "\u001b[A") { if (!hist.length) return; hi = hi === -1 ? hist.length - 1 : Math.max(0, hi - 1); const c = hist[hi]; term.write(`\r\x1b[2K\x1b[32m$\x1b[0m ${c}`); line.v = c; cur.v = c.length; }
        else if (data === "\u001b[B") { if (hi === -1) return; hi++; if (hi >= hist.length) { hi = -1; term.write(`\r\x1b[2K\x1b[32m$\x1b[0m `); line.v = ""; cur.v = 0; return; } const c = hist[hi]; term.write(`\r\x1b[2K\x1b[32m$\x1b[0m ${c}`); line.v = c; cur.v = c.length; }
        else if (data >= " " || data === "\t") { line.v = line.v.slice(0, cur.v) + data + line.v.slice(cur.v); cur.v++; term.write(data); }
      });
      prompt();
    };

    // ── When container is ready, boot ─────────────────────────────────────
    const attachContainer = useCallback((id: number, el: HTMLDivElement | null) => {
      if (!el) return;
      containerRefs.current.set(id, el);
      // Boot immediately if container is available, else wait
      if (instanceRef.current) {
        bootTab(id);
      }
    }, [bootTab]);

    // ── When WebContainer becomes available, boot any pending tabs ─────────
    useEffect(() => {
      if (!webContainerInstance) return;
      instanceRef.current = webContainerInstance;
      tabIds.forEach(id => {
        const rt = runtimes.current.get(id);
        if (rt && !rt.booted && containerRefs.current.has(id)) {
          bootTab(id);
        }
      });
    }, [webContainerInstance, tabIds, bootTab]);

    // ── Create tab ─────────────────────────────────────────────────────────
    const createTab = useCallback(() => {
      const id = ++counter.current;
      runtimes.current.set(id, { id, term: null, fit: null, search: null, shell: null, ro: null, booted: false });
      setTabIds(prev => [...prev, id]);
      setActiveId(id);
    }, []);

    // ── Close tab ──────────────────────────────────────────────────────────
    const closeTab = useCallback((id: number) => {
      const rt = runtimes.current.get(id);
      rt?.ro?.disconnect();
      rt?.term?.dispose();
      rt?.shell?.kill?.();
      runtimes.current.delete(id);
      containerRefs.current.delete(id);
      setTabIds(prev => {
        const next = prev.filter(i => i !== id);
        if (next.length === 0) { onClose?.(); return prev; }
        return next;
      });
      setActiveId(prev => prev === id ? (tabIds.find(i => i !== id) ?? tabIds[0]) : prev);
    }, [tabIds, onClose]);

    // ── Search ─────────────────────────────────────────────────────────────
    const doSearch = (text: string) => {
      getActive()?.search?.findNext(text, { caseSensitive: false, regex: false });
    };

    useImperativeHandle(ref, () => ({
      writeToTerminal: (d) => getActive()?.term?.write(d),
      clearTerminal: () => getActive()?.term?.clear(),
      focusTerminal: () => getActive()?.term?.focus(),
    }));

    return (
      <div className={cn("flex flex-col h-full w-full bg-[#1e1e1e] overflow-hidden", className)}>
        {/* Header */}
        <div className="flex items-center h-9 bg-[#252526] border-b border-[#3c3c3c] shrink-0 select-none">
          <div className="flex items-center flex-1 overflow-x-auto h-full">
            {tabIds.map(id => (
              <div key={id} onClick={() => { setActiveId(id); setTimeout(() => getRuntime(id)?.term?.focus(), 30); }}
                className={cn("flex items-center gap-1.5 px-3 h-full text-[12px] cursor-pointer border-r border-[#3c3c3c] shrink-0 group/tab transition-colors",
                  id === activeId ? "bg-[#1e1e1e] text-[#cccccc] border-t-2 border-t-[#0078d4]" : "text-[#8c8c8c] hover:bg-[#2a2d2e]")}>
                <span className="w-2 h-2 rounded-full bg-[#4ec9b0] shrink-0" />
                <span>bash</span>
                {tabIds.length > 1 && (
                  <button onClick={e => { e.stopPropagation(); closeTab(id); }}
                    className="opacity-0 group-hover/tab:opacity-100 hover:text-white ml-0.5 transition-opacity">
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
            <button onClick={createTab} title="New Terminal"
              className="px-2 h-full text-[#8c8c8c] hover:text-[#cccccc] hover:bg-[#2a2d2e] transition-colors shrink-0">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-0.5 px-2 shrink-0">
            {showSearch && (
              <input autoFocus value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); doSearch(e.target.value); }}
                onKeyDown={e => { if (e.key === "Escape") setShowSearch(false); if (e.key === "Enter") doSearch(searchTerm); }}
                placeholder="Find…"
                className="h-6 w-32 text-xs bg-[#3c3c3c] border border-[#555] text-[#cccccc] rounded px-2 outline-none focus:border-[#0078d4]" />
            )}
            <HBtn title="Search" onClick={() => setShowSearch(s => !s)}><Search className="w-3.5 h-3.5" /></HBtn>
            <HBtn title="Copy selection" onClick={() => { const s = getActive()?.term?.getSelection(); if (s) navigator.clipboard.writeText(s); }}><Copy className="w-3.5 h-3.5" /></HBtn>
            <HBtn title="Clear" onClick={() => getActive()?.term?.clear()}><Trash2 className="w-3.5 h-3.5" /></HBtn>
            <HBtn title="Close" onClick={() => onClose?.()}><X className="w-3.5 h-3.5" /></HBtn>
          </div>
        </div>

        {/* Panes */}
        <div className="flex-1 relative overflow-hidden">
          {tabIds.map(id => (
            <div key={id}
              ref={el => attachContainer(id, el)}
              className={cn("absolute inset-0 px-1 py-1", id === activeId ? "block" : "hidden")} />
          ))}
          {!webContainerInstance && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-[#8c8c8c] text-sm pointer-events-none">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              Waiting for WebContainer…
            </div>
          )}
        </div>
      </div>
    );
  }
);

TerminalComponent.displayName = "TerminalComponent";
export default TerminalComponent;

function HBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick}
      className="p-1 rounded text-[#8c8c8c] hover:text-[#cccccc] hover:bg-[#3c3c3c] transition-colors">
      {children}
    </button>
  );
}
