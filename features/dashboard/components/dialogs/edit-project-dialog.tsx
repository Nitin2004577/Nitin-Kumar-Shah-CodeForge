"use client";

import { useState, useEffect } from "react";
import type { Project } from "../../types"; // Adjusted path based on your folder structure

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface EditProjectDialogProps {
  project: Project | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, data: { title: string; description: string }) => Promise<void>;
  isLoading: boolean;
}

export function EditProjectDialog({
  project,
  isOpen,
  onOpenChange,
  onSave,
  isLoading,
}: EditProjectDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Update local state whenever a new project is selected from the table
  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setDescription(project.description || "");
    } else {
      // Reset fields if modal is closed/cleared
      setTitle("");
      setDescription("");
    }
  }, [project, isOpen]);

  const handleSave = () => {
    if (project) {
      onSave(project.id, { title, description });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Project</DialogTitle>
          <DialogDescription>
            Make changes to your project details here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Project Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter project title"
              disabled={isLoading}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description"
              rows={3}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading || !title.trim()}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}