"use client";

import * as React from "react";
import {
  ChevronRight, FilePlus, FolderPlus, RotateCcw,
  ChevronsUpDown, Trash2, Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sidebar, SidebarContent, SidebarRail } from "@/components/ui/sidebar";
import NewFileDialog from "./dialogs/new-file-dialog";
import NewFolderDialog from "./dialogs/new-folder-dialog";
import RenameFileDialog from "./dialogs/rename-file-dialog";
import RenameFolderDialog from "./dialogs/rename-folder-dialog";
import { DeleteDialog } from "./dialogs/delete-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TemplateFile { filename: string; fileExtension: string; content: string; }
interface TemplateFolder { folderName: string; items: (TemplateFile | TemplateFolder)[]; }
type TemplateItem = TemplateFile | TemplateFolder;

interface TemplateFileTreeProps {
  data: TemplateItem;
  onFileSelect?: (file: TemplateFile) => void;
  selectedFile?: TemplateFile;
  title?: string;
  onAddFile?: (file: TemplateFile, parentPath: string) => void;
  onAddFolder?: (folder: TemplateFolder, parentPath: string) => void;
  onDeleteFile?: (file: TemplateFile, parentPath: string) => void;
  onDeleteFolder?: (folder: TemplateFolder, parentPath: string) => void;
  onRenameFile?: (file: TemplateFile, newFilename: string, newExtension: string, parentPath: string) => void;
  onRenameFolder?: (folder: TemplateFolder, newFolderName: string, parentPath: string) => void;
}

// ─── File icon SVGs (VS Code style, small & precise) ─────────────────────────
function FileIcon({ ext }: { ext: string }) {
  const e = ext.toLowerCase();
  if (["ts"].includes(e)) return <span className="text-[10px] font-bold text-blue-400 w-4 shrink-0 text-center">TS</span>;
  if (["tsx"].includes(e)) return <span className="text-[10px] font-bold text-blue-300 w-4 shrink-0 text-center">TX</span>;
  if (["js", "mjs"].includes(e)) return <span className="text-[10px] font-bold text-yellow-400 w-4 shrink-0 text-center">JS</span>;
  if (["jsx"].includes(e)) return <span className="text-[10px] font-bold text-yellow-300 w-4 shrink-0 text-center">JX</span>;
  if (["json"].includes(e)) return <span className="text-[10px] font-bold text-yellow-200 w-4 shrink-0 text-center">{"{}"}</span>;
  if (["css", "scss"].includes(e)) return <span className="text-[10px] font-bold text-purple-400 w-4 shrink-0 text-center">CS</span>;
  if (["html"].includes(e)) return <span className="text-[10px] font-bold text-orange-400 w-4 shrink-0 text-center">HT</span>;
  if (["md", "mdx"].includes(e)) return <span className="text-[10px] font-bold text-gray-400 w-4 shrink-0 text-center">MD</span>;
  if (["svg"].includes(e)) return <span className="text-[10px] font-bold text-green-400 w-4 shrink-0 text-center">SV</span>;
  if (["ico"].includes(e)) return <span className="text-[10px] font-bold text-gray-300 w-4 shrink-0 text-center">IC</span>;
  return (
    <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0 text-[#c5c5c5]" fill="currentColor">
      <path d="M9 1.5v3.5h3.5L9 1.5zM3 1h5.5L13 5.5V15H3V1z" opacity=".6"/>
    </svg>
  );
}

function FolderIcon({ open }: { open: boolean }) {
  return open ? (
    <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0 text-[#dcb67a]" fill="currentColor">
      <path d="M1.5 14h13l1-8H1l.5 8zM1 5h4l1-2h4l1 2H1z"/>
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0 text-[#dcb67a]" fill="currentColor">
      <path d="M14.5 3H7.207L6.5 2H1.5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3z" opacity=".85"/>
    </svg>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function TemplateFileTree({
  data, onFileSelect, selectedFile, title = "EXPLORER",
  onAddFile, onAddFolder, onDeleteFile, onDeleteFolder, onRenameFile, onRenameFolder,
}: TemplateFileTreeProps) {
  const isRoot = data && "folderName" in data;
  const [collapseKey, setCollapseKey] = React.useState(0);
  const [forceOpen, setForceOpen] = React.useState(true);
  const [newFileOpen, setNewFileOpen] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);

  return (
    <Sidebar className="border-r border-[#3c3c3c] bg-[#252526] select-none">
      <SidebarContent className="p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between h-9 px-3 shrink-0">
          <span className="text-[11px] font-semibold tracking-[0.1em] text-[#bbbcbd] uppercase">
            {title}
          </span>
          <div className="flex items-center gap-0.5 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity [.group:hover_&]:opacity-100">
            <TBtn tip="New File" onClick={() => setNewFileOpen(true)}><FilePlus className="w-[15px] h-[15px]" /></TBtn>
            <TBtn tip="New Folder" onClick={() => setNewFolderOpen(true)}><FolderPlus className="w-[15px] h-[15px]" /></TBtn>
            <TBtn tip="Refresh" onClick={() => { setForceOpen(true); setCollapseKey(k => k + 1); }}><RotateCcw className="w-[14px] h-[14px]" /></TBtn>
            <TBtn tip="Collapse All" onClick={() => { setForceOpen(false); setCollapseKey(k => k + 1); }}><ChevronsUpDown className="w-[14px] h-[14px]" /></TBtn>
          </div>
        </div>

        {/* Tree */}
        <div className="overflow-y-auto overflow-x-hidden flex-1 pb-4">
          {isRoot
            ? (data as TemplateFolder).items.map((child, i) => (
                <TreeNode key={`${collapseKey}-${i}`} item={child} depth={0} path=""
                  forceOpen={forceOpen} selectedFile={selectedFile}
                  onFileSelect={onFileSelect} onAddFile={onAddFile} onAddFolder={onAddFolder}
                  onDeleteFile={onDeleteFile} onDeleteFolder={onDeleteFolder}
                  onRenameFile={onRenameFile} onRenameFolder={onRenameFolder} />
              ))
            : <TreeNode key={collapseKey} item={data} depth={0} path=""
                forceOpen={forceOpen} selectedFile={selectedFile}
                onFileSelect={onFileSelect} onAddFile={onAddFile} onAddFolder={onAddFolder}
                onDeleteFile={onDeleteFile} onDeleteFolder={onDeleteFolder}
                onRenameFile={onRenameFile} onRenameFolder={onRenameFolder} />
          }
        </div>
      </SidebarContent>
      <SidebarRail />

      <NewFileDialog isOpen={newFileOpen} onClose={() => setNewFileOpen(false)}
        onCreateFile={(n, e) => { onAddFile?.({ filename: n, fileExtension: e, content: "" }, ""); setNewFileOpen(false); }} />
      <NewFolderDialog isOpen={newFolderOpen} onClose={() => setNewFolderOpen(false)}
        onCreateFolder={(n) => { onAddFolder?.({ folderName: n, items: [] }, ""); setNewFolderOpen(false); }} />
    </Sidebar>
  );
}

// ─── Tree node ────────────────────────────────────────────────────────────────
interface TreeNodeProps {
  item: TemplateItem; depth: number; path: string; forceOpen: boolean;
  selectedFile?: TemplateFile; onFileSelect?: (f: TemplateFile) => void;
  onAddFile?: (f: TemplateFile, p: string) => void;
  onAddFolder?: (f: TemplateFolder, p: string) => void;
  onDeleteFile?: (f: TemplateFile, p: string) => void;
  onDeleteFolder?: (f: TemplateFolder, p: string) => void;
  onRenameFile?: (f: TemplateFile, n: string, e: string, p: string) => void;
  onRenameFolder?: (f: TemplateFolder, n: string, p: string) => void;
}

function TreeNode({ item, depth, path, forceOpen, selectedFile, onFileSelect,
  onAddFile, onAddFolder, onDeleteFile, onDeleteFolder, onRenameFile, onRenameFolder }: TreeNodeProps) {
  const isFolder = "folderName" in item;
  const [open, setOpen] = React.useState(depth < 2);
  const [hovered, setHovered] = React.useState(false);
  const [newFileOpen, setNewFileOpen] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const prevForce = React.useRef(forceOpen);

  React.useEffect(() => {
    if (prevForce.current !== forceOpen) { setOpen(forceOpen); prevForce.current = forceOpen; }
  }, [forceOpen]);

  // Row height & indent — tight like VS Code
  const ROW_H = "h-[22px]";
  const paddingLeft = depth * 8 + 8;

  if (!isFolder) {
    const file = item as TemplateFile;
    const name = `${file.filename}.${file.fileExtension}`;
    const isActive = selectedFile?.filename === file.filename && selectedFile?.fileExtension === file.fileExtension;

    return (
      <>
        <div
          className={cn("flex items-center cursor-pointer group/row", ROW_H,
            isActive ? "bg-[#094771] text-white" : "text-[#cccccc] hover:bg-[#2a2d2e]")}
          style={{ paddingLeft }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => onFileSelect?.(file)}
        >
          {/* spacer for chevron alignment */}
          <span className="w-4 shrink-0" />
          <FileIcon ext={file.fileExtension} />
          <span className="ml-1.5 text-[13px] truncate flex-1 leading-none">{name}</span>
          {hovered && (
            <span className="flex items-center gap-0.5 pr-1 shrink-0">
              <RowBtn tip="Rename" onClick={e => { e.stopPropagation(); setRenameOpen(true); }}><Pencil className="w-3 h-3" /></RowBtn>
              <RowBtn tip="Delete" danger onClick={e => { e.stopPropagation(); setDeleteOpen(true); }}><Trash2 className="w-3 h-3" /></RowBtn>
            </span>
          )}
        </div>
        <RenameFileDialog isOpen={renameOpen} onClose={() => setRenameOpen(false)}
          onRename={(n, e) => { onRenameFile?.(file, n, e, path); setRenameOpen(false); }}
          currentFilename={file.filename} currentExtension={file.fileExtension} />
        <DeleteDialog isOpen={deleteOpen} setIsOpen={setDeleteOpen}
          onConfirm={() => { onDeleteFile?.(file, path); setDeleteOpen(false); }}
          title="Delete File" itemName={name} description={`Delete "${name}"?`} />
      </>
    );
  }

  const folder = item as TemplateFolder;
  const currentPath = path ? `${path}/${folder.folderName}` : folder.folderName;

  return (
    <>
      <div
        className={cn("flex items-center cursor-pointer", ROW_H, "text-[#cccccc] hover:bg-[#2a2d2e]")}
        style={{ paddingLeft }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setOpen(o => !o)}
      >
        <ChevronRight className={cn("w-4 h-4 shrink-0 text-[#c5c5c5] transition-transform duration-100", open && "rotate-90")} />
        <FolderIcon open={open} />
        <span className="ml-1.5 text-[13px] truncate flex-1 leading-none font-normal">{folder.folderName}</span>
        {hovered && (
          <span className="flex items-center gap-0.5 pr-1 shrink-0">
            <RowBtn tip="New File" onClick={e => { e.stopPropagation(); setNewFileOpen(true); }}><FilePlus className="w-3 h-3" /></RowBtn>
            <RowBtn tip="New Folder" onClick={e => { e.stopPropagation(); setNewFolderOpen(true); }}><FolderPlus className="w-3 h-3" /></RowBtn>
            <RowBtn tip="Rename" onClick={e => { e.stopPropagation(); setRenameOpen(true); }}><Pencil className="w-3 h-3" /></RowBtn>
            <RowBtn tip="Delete" danger onClick={e => { e.stopPropagation(); setDeleteOpen(true); }}><Trash2 className="w-3 h-3" /></RowBtn>
          </span>
        )}
      </div>

      {open && (
        <div className="relative">
          <span className="absolute top-0 bottom-0 w-px bg-[#3c3c3c]" style={{ left: paddingLeft + 8 }} />
          {folder.items.map((child, i) => (
            <TreeNode key={i} item={child} depth={depth + 1} path={currentPath}
              forceOpen={forceOpen} selectedFile={selectedFile}
              onFileSelect={onFileSelect} onAddFile={onAddFile} onAddFolder={onAddFolder}
              onDeleteFile={onDeleteFile} onDeleteFolder={onDeleteFolder}
              onRenameFile={onRenameFile} onRenameFolder={onRenameFolder} />
          ))}
        </div>
      )}

      <NewFileDialog isOpen={newFileOpen} onClose={() => setNewFileOpen(false)}
        onCreateFile={(n, e) => { onAddFile?.({ filename: n, fileExtension: e, content: "" }, currentPath); setNewFileOpen(false); }} />
      <NewFolderDialog isOpen={newFolderOpen} onClose={() => setNewFolderOpen(false)}
        onCreateFolder={(n) => { onAddFolder?.({ folderName: n, items: [] }, currentPath); setNewFolderOpen(false); }} />
      <RenameFolderDialog isOpen={renameOpen} onClose={() => setRenameOpen(false)}
        onRename={(n) => { onRenameFolder?.(folder, n, path); setRenameOpen(false); }}
        currentFilename={folder.folderName} currentExtension="" />
      <DeleteDialog isOpen={deleteOpen} setIsOpen={setDeleteOpen}
        onConfirm={() => { onDeleteFolder?.(folder, path); setDeleteOpen(false); }}
        title="Delete Folder" itemName={folder.folderName} description={`Delete "${folder.folderName}" and all contents?`} />
    </>
  );
}

// ─── Micro buttons ────────────────────────────────────────────────────────────
function TBtn({ tip, onClick, children }: { tip: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={onClick}
          className="p-1 rounded text-[#858585] hover:text-[#cccccc] hover:bg-[#3c3c3c] transition-colors">
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs py-0.5 px-1.5">{tip}</TooltipContent>
    </Tooltip>
  );
}

function RowBtn({ tip, onClick, danger, children }: {
  tip: string; onClick: (e: React.MouseEvent) => void; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button onClick={onClick}
          className={cn("p-0.5 rounded transition-colors",
            danger ? "text-[#858585] hover:text-red-400" : "text-[#858585] hover:text-[#cccccc]")}>
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs py-0.5 px-1.5">{tip}</TooltipContent>
    </Tooltip>
  );
}
