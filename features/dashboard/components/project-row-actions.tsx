"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  MoreHorizontal,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  Download,
  Eye,
} from "lucide-react";

import type { Project } from "../types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectRowActionsProps {
  project: Project;
  onEditClick: (project: Project) => void;
  onDeleteClick: (project: Project) => void;
  onDuplicate: (id: string) => Promise<void>;
}

export function ProjectRowActions({
  project,
  onEditClick,
  onDeleteClick,
  onDuplicate,
}: ProjectRowActionsProps) {
  
  const copyProjectUrl = (projectId: string) => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/playground/${projectId}`;
      navigator.clipboard.writeText(url);
      toast.success("Project URL copied to clipboard");
    }
  };

  const handleDuplicate = async () => {
    try {
      await onDuplicate(project.id);
    } catch (error) {
      toast.error("Failed to duplicate project");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        
        <DropdownMenuItem asChild>
          <Link href={`/playground/${project.id}`} className="flex items-center">
            <Eye className="h-4 w-4 mr-2" />
            Open Project
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <Link
            href={`/playground/${project.id}`}
            target="_blank"
            className="flex items-center"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Open in New Tab
          </Link>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => onEditClick(project)}>
          <Edit3 className="h-4 w-4 mr-2" />
          Edit Project
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={() => copyProjectUrl(project.id)}>
          <Download className="h-4 w-4 mr-2" />
          Copy URL
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem
          onClick={() => onDeleteClick(project)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Project
        </DropdownMenuItem>
        
      </DropdownMenuContent>
    </DropdownMenu>
  );
}