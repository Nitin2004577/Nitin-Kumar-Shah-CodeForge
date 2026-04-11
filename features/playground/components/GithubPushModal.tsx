"use client";

import React, { useState, useEffect } from "react";
import { Github, Loader2, AlertCircle, GitBranch, Lock, Globe, Search, CheckCircle2 } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Repo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
}

interface GithubPushModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPush: (repoFullName: string, commitMessage: string) => Promise<void>;
}

export const GithubPushModal: React.FC<GithubPushModalProps> = ({
  isOpen,
  onClose,
  onPush,
}) => {
  const { data: session } = useSession();
  const provider = (session?.user as any)?.provider;
  const isGithubUser = provider === "github";

  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [commitMessage, setCommitMessage] = useState("Update from CodeForge IDE");
  const [isPushing, setIsPushing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isOpen && isGithubUser) fetchRepositories();
    if (!isOpen) { setSelectedRepo(null); setSearch(""); }
  }, [isOpen, isGithubUser]);

  const fetchRepositories = async () => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch("/api/github/repos");
      if (!res.ok) return;
      const data = await res.json();
      setRepos(data.repos || []);
    } catch (err) {
      console.error("Failed to fetch repos", err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handlePush = async () => {
    if (!selectedRepo || !commitMessage) return;
    setIsPushing(true);
    try {
      await onPush(selectedRepo.full_name, commitMessage);
      onClose();
    } finally {
      setIsPushing(false);
    }
  };

  const filtered = repos.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b bg-zinc-950/50">
          <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
            <div className="p-1.5 rounded-md bg-zinc-800">
              <Github className="h-4 w-4" />
            </div>
            Push to GitHub
          </DialogTitle>
        </DialogHeader>

        {!isGithubUser ? (
          <div className="flex flex-col items-center gap-4 px-6 py-10 text-center">
            <div className="rounded-full bg-amber-500/10 p-4">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-sm">GitHub login required</p>
              <p className="text-xs text-muted-foreground max-w-[280px]">
                You&apos;re signed in with{" "}
                <span className="font-medium capitalize">{provider ?? "another provider"}</span>.
                Sign in with GitHub to access your repositories.
              </p>
            </div>
            <Button
              className="w-full bg-[#24292F] hover:bg-[#24292F]/90 text-white"
              onClick={() => signIn("github", { callbackUrl: window.location.href })}
            >
              <Github className="mr-2 h-4 w-4" />
              Sign in with GitHub
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Repo picker */}
            <div className="px-6 pt-5 pb-3 space-y-3">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Repository
              </Label>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search repositories..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm bg-zinc-900 border-zinc-800"
                />
              </div>

              {/* Repo list — fixed height, scrollable */}
              <div className="h-[200px] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950">
                {isLoadingRepos ? (
                  <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Fetching repositories…</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                    {search ? "No repositories match your search" : "No repositories found"}
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/60">
                    {filtered.map((repo) => (
                      <button
                        key={repo.id}
                        onClick={() => setSelectedRepo(repo)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-zinc-800/50",
                          selectedRepo?.id === repo.id && "bg-zinc-800"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {repo.private ? (
                            <Lock className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          ) : (
                            <Globe className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                          )}
                          <span className="text-sm font-medium truncate">{repo.name}</span>
                          {repo.private && (
                            <span className="text-[10px] text-zinc-500 shrink-0">Private</span>
                          )}
                        </div>
                        {selectedRepo?.id === repo.id && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedRepo && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <GitBranch className="h-3 w-3" />
                  <span>Pushing to <span className="text-foreground font-medium">{selectedRepo.full_name}</span> → main</span>
                </div>
              )}
            </div>

            {/* Commit message */}
            <div className="px-6 pb-5 space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Commit Message
              </Label>
              <Input
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Describe your changes..."
                className="bg-zinc-900 border-zinc-800 text-sm"
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-950/30 flex items-center justify-between gap-3">
              <Button variant="ghost" size="sm" onClick={onClose} className="text-muted-foreground">
                Cancel
              </Button>
              <Button
                onClick={handlePush}
                disabled={!selectedRepo || !commitMessage.trim() || isPushing}
                className="bg-zinc-100 hover:bg-white text-zinc-900 gap-2"
              >
                {isPushing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Github className="h-4 w-4" />
                )}
                {isPushing ? "Pushing…" : "Push Changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
