"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Project } from "../types";
import { Badge } from "@/components/ui/badge";
import { Star, Code2, Zap, Database, Compass, Terminal, Lightbulb, FlameIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectRowActions } from "./project-row-actions";
import { EditProjectDialog } from "./dialogs/edit-project-dialog";
import { DeleteDialog } from "@/../features/playground/components/dialogs/delete-dialog";

const templateConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  REACT:   { icon: Zap,        color: "text-cyan-400",   bg: "bg-cyan-400/10" },
  NEXTJS:  { icon: Lightbulb,  color: "text-zinc-300",   bg: "bg-zinc-300/10" },
  EXPRESS: { icon: Database,   color: "text-green-400",  bg: "bg-green-400/10" },
  VUE:     { icon: Compass,    color: "text-emerald-400",bg: "bg-emerald-400/10" },
  HONO:    { icon: FlameIcon,  color: "text-orange-400", bg: "bg-orange-400/10" },
  ANGULAR: { icon: Terminal,   color: "text-red-400",    bg: "bg-red-400/10" },
};

interface ProjectTableProps {
  projects: Project[];
  onUpdateProject?: (id: string, data: { title: string; description: string }) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
  onDuplicateProject?: (id: string) => Promise<void>;
}

export default function ProjectTable({
  projects,
  onUpdateProject,
  onDeleteProject,
  onDuplicateProject,
}: ProjectTableProps) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdate = async (id: string, data: { title: string; description: string }) => {
    if (!onUpdateProject) return;
    setIsLoading(true);
    try {
      await onUpdateProject(id, data);
      setEditDialogOpen(false);
      setSelectedProject(null);
      toast.success("Project updated");
    } catch {
      toast.error("Failed to update project");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onDeleteProject || !selectedProject) return;
    setIsLoading(true);
    try {
      await onDeleteProject(selectedProject.id);
      setDeleteDialogOpen(false);
      setSelectedProject(null);
      toast.success("Project deleted");
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-xl border overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-2.5 bg-muted/50 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Project</span>
          <span className="w-24 text-center">Template</span>
          <span className="w-28">Created</span>
          <span className="w-8" />
        </div>

        {/* Rows */}
        <div className="divide-y">
          {projects.map((project) => {
            const config = templateConfig[project.template] || { icon: Code2, color: "text-primary", bg: "bg-primary/10" };
            const Icon = config.icon;
            const isStarred = project.Starmark?.[0]?.isMarked;

            return (
              <div
                key={project.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-4 py-3.5 items-center hover:bg-muted/30 transition-colors group"
              >
                {/* Project info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn("p-2 rounded-lg shrink-0", config.bg)}>
                    <Icon className={cn("h-4 w-4", config.color)} />
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/playground/${project.id}`}
                      className="font-medium text-sm hover:text-primary transition-colors truncate block"
                    >
                      {project.title}
                      {isStarred && <Star className="inline h-3 w-3 ml-1.5 text-yellow-400 fill-yellow-400" />}
                    </Link>
                    {project.description && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {project.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* Template */}
                <div className="w-24 flex justify-center">
                  <Badge
                    variant="outline"
                    className={cn("text-[10px] font-medium border-0", config.bg, config.color)}
                  >
                    {project.template}
                  </Badge>
                </div>

                {/* Date */}
                <div className="w-28 text-xs text-muted-foreground">
                  {format(new Date(project.createdAt), "MMM d, yyyy")}
                </div>

                {/* Actions */}
                <div className="w-8">
                  <ProjectRowActions
                    project={project}
                    onEditClick={(p) => { setSelectedProject(p); setEditDialogOpen(true); }}
                    onDeleteClick={(p) => { setSelectedProject(p); setDeleteDialogOpen(true); }}
                    onDuplicate={async (id) => { if (onDuplicateProject) await onDuplicateProject(id); }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <EditProjectDialog
        project={selectedProject}
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleUpdate}
        isLoading={isLoading}
      />

      <DeleteDialog
        isOpen={deleteDialogOpen}
        setIsOpen={setDeleteDialogOpen}
        onConfirm={handleDelete}
        title="Delete Project"
        itemName={selectedProject?.title}
        description="Are you sure you want to delete {item}? This action cannot be undone."
      />
    </>
  );
}
