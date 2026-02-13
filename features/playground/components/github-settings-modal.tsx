"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Github, Key, Link2 } from "lucide-react";

interface GithubSettings {
  token: string;
  repoUrl: string;
}

interface GithubSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: GithubSettings) => void;
  initialSettings?: GithubSettings;
}

export const GithubSettingsModal: React.FC<GithubSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSettings,
}) => {
  const [token, setToken] = useState("");
  const [repoUrl, setRepoUrl] = useState("");

  useEffect(() => {
    if (initialSettings) {
      setToken(initialSettings.token || "");
      setRepoUrl(initialSettings.repoUrl || "");
    }
  }, [initialSettings, isOpen]);

  const handleSave = () => {
    onSave({ token, repoUrl });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-[#1e1e1e] border-zinc-800 text-zinc-200">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="w-5 h-5" />
            GitHub Settings
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Configure your repository details and Personal Access Token to push changes.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="repo" className="flex items-center gap-2">
              <Link2 className="w-3.5 h-3.5 text-zinc-500" /> Repository URL
            </Label>
            <Input
              id="repo"
              placeholder="https://github.com/username/repo.git"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="bg-zinc-900 border-zinc-700 focus:ring-blue-500"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="token" className="flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-zinc-500" /> Access Token
            </Label>
            <Input
              id="token"
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="bg-zinc-900 border-zinc-700 focus:ring-blue-500"
            />
            <p className="text-[10px] text-zinc-500">
              Tokens are stored locally in your browser.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-zinc-400 hover:text-white">
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white">
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};