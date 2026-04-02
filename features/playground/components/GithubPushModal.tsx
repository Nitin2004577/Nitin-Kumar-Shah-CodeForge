"use client";

import React, { useState, useEffect } from "react";
import { Github, Loader2, AlertCircle } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [selectedRepo, setSelectedRepo] = useState("");
  const [commitMessage, setCommitMessage] = useState("Update from CodeForge IDE");
  const [isPushing, setIsPushing] = useState(false);

  useEffect(() => {
    if (isOpen && isGithubUser) {
      fetchRepositories();
    }
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
      await onPush(selectedRepo, commitMessage);
      onClose();
    } finally {
      setIsPushing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Github className="h-6 w-6" />
            Push to GitHub
          </DialogTitle>
        </DialogHeader>

        {!isGithubUser ? (
          /* ── Not signed in with GitHub ── */
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="rounded-full bg-amber-500/10 p-4">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">GitHub login required</p>
              <p className="text-sm text-muted-foreground">
                You&apos;re signed in with{" "}
                <span className="font-medium capitalize">
                  {provider ?? "another provider"}
                </span>
                . Please sign in with GitHub to access your repositories.
              </p>
            </div>
            <Button
              className="w-full bg-[#24292F] hover:bg-[#24292F]/90 text-white"
              onClick={() =>
                signIn("github", { callbackUrl: window.location.href })
              }
            >
              <Github className="mr-2 h-4 w-4" />
              Sign in with GitHub
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          </div>
        ) : (
          /* ── Signed in with GitHub ── */
          <>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Repository</Label>
                <Select
                  value={selectedRepo}
                  onValueChange={setSelectedRepo}
                  disabled={isLoadingRepos}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingRepos ? "Fetching repos…" : "Choose repository"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {repos.map((repo) => (
                      <SelectItem key={repo.id} value={repo.full_name}>
                        <span className="font-medium">{repo.name}</span>
                        {repo.private && (
                          <span className="ml-2 text-[10px] opacity-60">
                            (Private)
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Commit Message</Label>
                <Input
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  placeholder="Initial commit"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handlePush}
                disabled={!selectedRepo || !commitMessage || isPushing}
              >
                {isPushing && (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                )}
                Push Changes
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
