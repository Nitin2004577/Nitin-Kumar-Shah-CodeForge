import React from "react";
import { useState } from "react";
import {
  ChevronRight,
  File,
  Folder,
  Plus,
  FilePlus,
  FolderPlus,
  MoreHorizontal,
  Trash2,
  Edit3,
} from "lucide-react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarRail,
} from "@/components/ui/sidebar";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { string } from "zod";

// Using the provided interfaces
interface TemplateFile {
  filename: string;
  fileExtension: string;
  content: string;
}
/**
 * Represents a folder in the template structure which can contain files and subfolders
 */
interface TemplateFolder {
  folderName: string;
  items: (TemplateFile | TemplateFolder)[];
}

// Union type for items in the file system
type TemplateItem = TemplateFile | TemplateFolder;

interface TemplateNodeProps {
  item: TemplateItem;
  onFileSelect?: (file: TemplateFile) => void;
  selectedFile?: TemplateFile;
  level: number;
  path?: string;
  onAddFile?: (file: TemplateFile, parentPath: string[]) => void;
  onAddFolder?: (folder: TemplateFolder, parentPath: string[]) => void;
  onDeleteFile?: (file: TemplateItem, parentPath: string[]) => void;
  onDeleteFolder?: (folder: TemplateFolder, parentPath: string[]) => void;
  onRenameFile?: (
    file: TemplateItem,
    newName: string,
    parentPath: string[]
  ) => void;
  onRenameFolder?: (
    folder: TemplateFolder,
    newName: string,
    parentPath: string[]
  ) => void;
}

const TemplateNode = ({
  item,
  onFileSelect,
  selectedFile,
  level,
  path = "",
  onAddFile,
  onAddFolder,
  onDeleteFile,
  onDeleteFolder,
  onRenameFile,
  onRenameFolder,
}: TemplateNodeProps) => {
  const isValidItem = item && typeof item === "object";
  const isFolder = isValidItem && "folderName" in item;

  const [isOpen, setIsOpen] = useState(level < 2);

  if (!isValidItem) return null;

  if (!isFolder) {
    const file = item as TemplateFile;
    const fileName = `${file.filename}.${file.fileExtension}`;

    return (
      <SidebarMenuItem>
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="group/collapsible    [&[data-state=open]>div>button>svg:first-child]:rotate-90"
          >
        <div className="flex items-center group">
          <SidebarMenuButton className="flex-1">
            <File className="mr-2 h-4 w-4 shrink-0" />
            <span>{fileName}</span>
          </SidebarMenuButton>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={"ghost"}
                size={"icon"}
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {}}>
                <Edit3 className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {}} className="text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        </Collapsible>
      </SidebarMenuItem>
    );
  } else {
    const folder = item as TemplateFolder;
    const folderName = folder.folderName;
    const currentPath = path ? `${path}/${folderName}` : folderName;

    return (
      <SidebarMenuItem>
        <Collapsible
          open={isOpen}
          onOpenChange={setIsOpen}
          className="group/collapsible    [&[data-state=open]>div>button>svg:first-child]:rotate-90"
        >
          {" "}
          {/* // rotate the chevron when open */}
          <div className="flex items-center group">
            <CollapsibleTrigger asChild>
              <SidebarMenuButton className="flex-1">
                <ChevronRight className="transition-transform" />
                <Folder className="mr-2 h-4 w-4 shrink-0" />
                <span>{folderName}</span>
              </SidebarMenuButton>
            </CollapsibleTrigger>
          </div>
        </Collapsible>
      </SidebarMenuItem>
    );
  }
};

export default TemplateNode;
