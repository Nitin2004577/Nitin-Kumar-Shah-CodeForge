"use client";

import * as React from "react";
import {
  ChevronRight,
  FilePlus,
  FolderPlus,
  RotateCcw,
  ChevronsUpDown,
  MoreHorizontal,
  Trash2,
  Pencil,
  Copy,
  FileCode,
  FileJson,
  FileText,
  FileType,
  Folder,
  FolderOpen,
  File,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarRail,
} from "@/components/ui/sidebar";
import NewFileDialog from "./dialogs/new-file-dialog";
import NewFolderDialog from "./dialogs/new-folder-dialog";
import RenameFileDialog from "./dialogs/rename-file-dialog";
import RenameFolderDialog from "./dialogs/rename-folder-dialog";
import { DeleteDialog } from "./dialogs/delete-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TemplateFile {
  filename: string;
  fileExtension: string;
  content: string;
}
interface TemplateFolder {
  folderName: string;
  items: (TemplateFile | TemplateFolder)[];
}
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

// ─── File icon helper ─────────────────────────────────────────────────────────
function FileIcon({ ext, className }: { ext: string; className?: string }) {
  const e = ext.toLowerCase();
  const base = cn("h-4 w-4 shrink-0", className);
  if (["ts", "tsx"].includes(e)) return <FileCode className={cn(base, "text-blue-400")} />;
  if (["js", "jsx", "mjs"].includes(e)) return <FileCode className={cn(base, "text-yellow-400")} />;
  if (["json"].includes(e)) return <FileJson className={cn(base, "text-yellow-300")} />;
  if (["css", "scss", "sass"].includes(e)) return <FileType className={cn(base, "text-purple-400")} />;
  if (["html"].includes(e)) return <FileCode className={cn(base, "text-orange-400")} />;
  if (["md", "mdx"].includes(e)) return <FileText className={cn(base, "text-gray-400")} />;
  return <File className={cn(base, "text-gray-400")} />;
}

// ─── Root component ───────────────────────────────────────────────────────────
export function TemplateFileTree({
  data,
  onFileSelect,
  selectedFile,
  title = "EXPLORER",
  onAddFile,
  onAddFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onRenameFolder,
}: TemplateFileTreeProps) {
  const isRoot = data && "folderName" in data;
  const [allOpen, setAllOpen] = React.useState(true);
  const [collapseKey, setCollapseKey] = React.useState(0);
  const [newFileOpen, setNewFileOpen] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);

  const handleCollapseAll = () => {
    setAllOpen(false);
    setCollapseKey((k) => k + 1);
  };

  const handleRefresh = () => {
    setAllOpen(true);
    setCollapseKey((k) => k + 1);
  };

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar">
      <SidebarContent className="p-0">
        {/* ── VS Code-style header ── */}
        <div className="flex items-center justify-between px-3 py-2 select-none">
          <span className="text-[11px] font-semibold tracking-widest text-muted-foreground uppercase">
            {title}
          </span>
          <div className="flex items-center gap-0.5">
            <IconBtn label="New File" onClick={() => setNewFileOpen(true)}>
              <FilePlus className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="New Folder" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Refresh" onClick={handleRefresh}>
              <RotateCcw className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Collapse All" onClick={handleCollapseAll}>
              <ChevronsUpDown className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
        </div>

        {/* ── Tree ── */}
        <div className="overflow-y-auto flex-1 text-sm">
          {isRoot
            ? (data as TemplateFolder).items.map((child, i) => (
                <TreeNode
                  key={`${collapseKey}-${i}`}
                  item={child}
                  depth={0}
                  path=""
                  forceOpen={allOpen}
                  selectedFile={selectedFile}
                  onFileSelect={onFileSelect}
                  onAddFile={onAddFile}
                  onAddFolder={onAddFolder}
                  onDeleteFile={onDeleteFile}
                  onDeleteFolder={onDeleteFolder}
                  onRenameFile={onRenameFile}
                  onRenameFolder={onRenameFolder}
                />
              ))
            : (
                <TreeNode
                  key={collapseKey}
                  item={data}
                  depth={0}
                  path=""
                  forceOpen={allOpen}
                  selectedFile={selectedFile}
                  onFileSelect={onFileSelect}
                  onAddFile={onAddFile}
                  onAddFolder={onAddFolder}
                  onDeleteFile={onDeleteFile}
                  onDeleteFolder={onDeleteFolder}
                  onRenameFile={onRenameFile}
                  onRenameFolder={onRenameFolder}
                />
              )}
        </div>
      </SidebarContent>

      <SidebarRail />

      <NewFileDialog
        isOpen={newFileOpen}
        onClose={() => setNewFileOpen(false)}
        onCreateFile={(name, ext) => {
          onAddFile?.({ filename: name, fileExtension: ext, content: "" }, "");
          setNewFileOpen(false);
        }}
      />
      <NewFolderDialog
        isOpen={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onCreateFolder={(name) => {
          onAddFolder?.({ folderName: name, items: [] }, "");
          setNewFolderOpen(false);
        }}
      />
    </Sidebar>
  );
}

// ─── Tree node ────────────────────────────────────────────────────────────────
interface TreeNodeProps {
  item: TemplateItem;
  depth: number;
  path: string;
  forceOpen: boolean;
  selectedFile?: TemplateFile;
  onFileSelect?: (file: TemplateFile) => void;
  onAddFile?: (file: TemplateFile, parentPath: string) => void;
  onAddFolder?: (folder: TemplateFolder, parentPath: string) => void;
  onDeleteFile?: (file: TemplateFile, parentPath: string) => void;
  onDeleteFolder?: (folder: TemplateFolder, parentPath: string) => void;
  onRenameFile?: (file: TemplateFile, newFilename: string, newExtension: string, parentPath: string) => void;
  onRenameFolder?: (folder: TemplateFolder, newFolderName: string, parentPath: string) => void;
}

function TreeNode({ item, depth, path, forceOpen, selectedFile, onFileSelect, onAddFile, onAddFolder, onDeleteFile, onDeleteFolder, onRenameFile, onRenameFolder }: TreeNodeProps) {
  const isFolder = "folderName" in item;
  const [open, setOpen] = React.useState(depth < 2);
  const [hovered, setHovered] = React.useState(false);
  const [newFileOpen, setNewFileOpen] = React.useState(false);
  const [newFolderOpen, setNewFolderOpen] = React.useState(false);
  const [renameOpen, setRenameOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Respond to collapse-all / refresh from parent
  const prevForce = React.useRef(forceOpen);
  React.useEffect(() => {
    if (prevForce.current !== forceOpen) {
      setOpen(forceOpen);
      prevForce.current = forceOpen;
    }
  }, [forceOpen]);

  const indent = depth * 12;

  if (!isFolder) {
    const file = item as TemplateFile;
    const name = `${file.filename}.${file.fileExtension}`;
    const isActive =
      selectedFile?.filename === file.filename &&
      selectedFile?.fileExtension === file.fileExtension;

    return (
      <>
        <div
          className={cn(
            "group flex items-center h-[22px] cursor-pointer select-none pr-1",
            "hover:bg-accent/50",
            isActive && "bg-accent text-accent-foreground"
          )}
          style={{ paddingLeft: indent + 20 }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onClick={() => onFileSelect?.(file)}
        >
          {/* indent guide */}
          <span className="w-4 shrink-0" />
          <FileIcon ext={file.fileExtension} className="mr-1.5" />
          <span className="truncate flex-1 text-[13px]">{name}</span>

          {/* hover actions */}
          {hovered && (
            <div className="flex items-center gap-0.5 ml-1 shrink-0">
              <InlineBtn label="Rename" onClick={(e) => { e.stopPropagation(); setRenameOpen(true); }}>
                <Pencil className="h-3 w-3" />
              </InlineBtn>
              <InlineBtn label="Delete" onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }} danger>
                <Trash2 className="h-3 w-3" />
              </InlineBtn>
            </div>
          )}
        </div>

        <RenameFileDialog
          isOpen={renameOpen}
          onClose={() => setRenameOpen(false)}
          onRename={(n, e) => { onRenameFile?.(file, n, e, path); setRenameOpen(false); }}
          currentFilename={file.filename}
          currentExtension={file.fileExtension}
        />
        <DeleteDialog
          isOpen={deleteOpen}
          setIsOpen={setDeleteOpen}
          onConfirm={() => { onDeleteFile?.(file, path); setDeleteOpen(false); }}
          title="Delete File"
          itemName={name}
          description={`Delete "${name}"? This cannot be undone.`}
        />
      </>
    );
  }

  // Folder
  const folder = item as TemplateFolder;
  const currentPath = path ? `${path}/${folder.folderName}` : folder.folderName;

  return (
    <>
      {/* Folder row */}
      <div
        className="group flex items-center h-[22px] cursor-pointer select-none pr-1 hover:bg-accent/50"
        style={{ paddingLeft: indent }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={() => setOpen((o) => !o)}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-90"
          )}
        />
        {open
          ? <FolderOpen className="h-4 w-4 shrink-0 mr-1.5 text-yellow-400" />
          : <Folder className="h-4 w-4 shrink-0 mr-1.5 text-yellow-400" />
        }
        <span className="truncate flex-1 text-[13px] font-medium">{folder.folderName}</span>

        {/* hover actions */}
        {hovered && (
          <div className="flex items-center gap-0.5 ml-1 shrink-0">
            <InlineBtn label="New File" onClick={(e) => { e.stopPropagation(); setNewFileOpen(true); }}>
              <FilePlus className="h-3 w-3" />
            </InlineBtn>
            <InlineBtn label="New Folder" onClick={(e) => { e.stopPropagation(); setNewFolderOpen(true); }}>
              <FolderPlus className="h-3 w-3" />
            </InlineBtn>
            <InlineBtn label="Rename" onClick={(e) => { e.stopPropagation(); setRenameOpen(true); }}>
              <Pencil className="h-3 w-3" />
            </InlineBtn>
            <InlineBtn label="Delete" onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }} danger>
              <Trash2 className="h-3 w-3" />
            </InlineBtn>
          </div>
        )}
      </div>

      {/* Children */}
      {open && (
        <div className="relative">
          {/* indent guide line */}
          <div
            className="absolute top-0 bottom-0 w-px bg-border/40"
            style={{ left: indent + 7 }}
          />
          {folder.items.map((child, i) => (
            <TreeNode
              key={i}
              item={child}
              depth={depth + 1}
              path={currentPath}
              forceOpen={forceOpen}
              selectedFile={selectedFile}
              onFileSelect={onFileSelect}
              onAddFile={onAddFile}
              onAddFolder={onAddFolder}
              onDeleteFile={onDeleteFile}
              onDeleteFolder={onDeleteFolder}
              onRenameFile={onRenameFile}
              onRenameFolder={onRenameFolder}
            />
          ))}
        </div>
      )}

      <NewFileDialog
        isOpen={newFileOpen}
        onClose={() => setNewFileOpen(false)}
        onCreateFile={(n, e) => { onAddFile?.({ filename: n, fileExtension: e, content: "" }, currentPath); setNewFileOpen(false); }}
      />
      <NewFolderDialog
        isOpen={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        onCreateFolder={(n) => { onAddFolder?.({ folderName: n, items: [] }, currentPath); setNewFolderOpen(false); }}
      />
      <RenameFolderDialog
        isOpen={renameOpen}
        onClose={() => setRenameOpen(false)}
        onRename={(n) => { onRenameFolder?.(folder, n, path); setRenameOpen(false); }}
        currentFilename={folder.folderName}
        currentExtension=""
      />
      <DeleteDialog
        isOpen={deleteOpen}
        setIsOpen={setDeleteOpen}
        onConfirm={() => { onDeleteFolder?.(folder, path); setDeleteOpen(false); }}
        title="Delete Folder"
        itemName={folder.folderName}
        description={`Delete "${folder.folderName}" and all its contents? This cannot be undone.`}
      />
    </>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}

function InlineBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: (e: React.MouseEvent) => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            "p-0.5 rounded transition-colors",
            danger
              ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="text-xs">{label}</TooltipContent>
    </Tooltip>
  );
}
