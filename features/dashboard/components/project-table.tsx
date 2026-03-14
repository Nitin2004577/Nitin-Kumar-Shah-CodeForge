"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import type { Project } from "../types";

// UI Components
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Feature Components
import { ProjectRowActions } from "./project-row-actions";
import { EditProjectDialog } from "./dialogs/edit-project-dialog";
import { DeleteDialog } from "@/../features/playground/components/dialogs/delete-dialog"; 

interface ProjectTableProps {
  projects: Project[];
  onUpdateProject?: (id: string, data: { title: string; description: string }) => Promise<void>;
  onDeleteProject?: (id: string) => Promise<void>;
  onDuplicateProject?: (id: string) => Promise<void>;
  onMarkasFavorite?: (id: string) => Promise<void>; // Kept so we don't break your parent page
}

export default function ProjectTable({
  projects,
  onUpdateProject,
  onDeleteProject,
  onDuplicateProject,
}: ProjectTableProps) {
  // Global table state to track which project is actively being edited or deleted
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Handlers for Modals
  const handleUpdate = async (id: string, data: { title: string; description: string }) => {
    if (!onUpdateProject) return;
    setIsLoading(true);
    try {
      await onUpdateProject(id, data);
      setEditDialogOpen(false);
      setSelectedProject(null);
      toast.success("Project updated successfully");
    } catch (error) {
      toast.error("Failed to update project");
      console.error("Error updating project:", error);
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
      toast.success("Project deleted successfully");
    } catch (error) {
      toast.error("Failed to delete project");
      console.error("Error deleting project:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Template</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((project) => (
              <TableRow key={project.id}>
                
                {/* Project Title & Description */}
                <TableCell className="font-medium">
                  <div className="flex flex-col">
                    <Link
                      href={`/playground/${project.id}`}
                      className="hover:underline"
                    >
                      <span className="font-semibold">{project.title}</span>
                    </Link>
                    <span className="text-sm text-gray-500 line-clamp-1">
                      {project.description}
                    </span>
                  </div>
                </TableCell>
                
                {/* Template Badge */}
                <TableCell>
                  <Badge
                    variant="outline"
                    className="bg-[#E93F3F15] text-[#E93F3F] border-[#E93F3F]"
                  >
                    {project.template}
                  </Badge>
                </TableCell>
                
                {/* Created Date */}
                <TableCell>
                  {format(new Date(project.createdAt), "MMM d, yyyy")}
                </TableCell>
                
                {/* User Info */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden">
                      <img
                        src={project.user.image || "/placeholder.svg"}
                        alt={project.user.name}
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <span className="text-sm">{project.user.name}</span>
                  </div>
                </TableCell>
                
                {/* Actions Menu */}
                <TableCell>
                  <ProjectRowActions
                    project={project}
                    onEditClick={(p) => {
                      setSelectedProject(p);
                      setEditDialogOpen(true);
                    }}
                    onDeleteClick={(p) => {
                      setSelectedProject(p);
                      setDeleteDialogOpen(true);
                    }}
                    onDuplicate={async (id) => {
                      if (onDuplicateProject) await onDuplicateProject(id);
                    }}
                  />
                </TableCell>
                
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <EditProjectDialog
        project={selectedProject}
        isOpen={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleUpdate}
        isLoading={isLoading}
      />

      {/* Delete Dialog */}
      <DeleteDialog
        isOpen={deleteDialogOpen}
        setIsOpen={setDeleteDialogOpen} 
        onConfirm={handleDelete}
        title="Delete Project"
        itemName={selectedProject?.title} // Using your component's built-in {item} replacement feature!
        description="Are you sure you want to delete {item}? This action cannot be undone. All files and data associated with this project will be permanently removed."
      />
    </>
  );
}