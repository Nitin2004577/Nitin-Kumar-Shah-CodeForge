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

  // Only fetch repos if the user is actually signed in with GitHub
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

        {/* ── Not signed in with GitHub ── */}
        {!isGithubUser ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="rounded-full bg-amber-500/10 p-4">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">GitHub login required</p>
              <p className="text-sm text-muted-foreground">
                You&apos;re signed in with{" "}
                <span className="font-medium capitalize">{provider ?? "another provider"}</span>.
                Please sign in with GitHub to access your repositories.
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

export const GithubPushModal: React.FC<GithubPushModalProps> = ({ isOpen, onClose, onPush }) => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isNotConnected, setIsNotConnected] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [commitMessage, setCommitMessage] = useState("Update from CodeForge IDE");
  const [isPushing, setIsPushing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchRepositories();
    }
  }, [isOpen]);

  const fetchRepositories = async () => {
    setIsLoadingRepos(true);
    setIsNotConnected(false);
    setConnectionMessage("");
    try {
      const res = await fetch("/api/github/repos");

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));

        // NOT_CONNECTED = logged in with Google, no GitHub token
        // TOKEN_EXPIRED = GitHub token expired
        if (
          data.error === "NOT_CONNECTED" ||
          data.error === "TOKEN_EXPIRED" ||
          data.error === "NOT_AUTHENTICATED" ||
          res.status === 401
        ) {
          setIsNotConnected(true);
          setConnectionMessage(
            data.message ||
              "Please sign in with GitHub to push code to repositories."
          );
        }
        return;
      }

      const data = await res.json();
      setRepos(data.repos || []);
    } catch (error) {
      console.error("Failed to fetch repos", error);
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
    } catch (error) {
      console.error("Push failed");
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
          <DialogDescription>
            {isNotConnected
              ? connectionMessage || "Your account is not linked to GitHub."
              : "Select a repository to commit your changes."}
          </DialogDescription>
        </DialogHeader>

        {isNotConnected ? (
          <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
            <div className="bg-amber-50 p-4 rounded-full">
              <AlertCircle className="h-10 w-10 text-amber-500" />
            </div>
            <p className="text-sm text-muted-foreground">
              To push code, you need to sign in with GitHub to grant repository access.
            </p>
            <Button 
              className="w-full bg-[#24292F] hover:bg-[#24292F]/90" 
              onClick={() => signIn("github", { callbackUrl: window.location.href })}
            >
              <Github className="mr-2 h-4 w-4" />
              Connect GitHub Account
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Repository</Label>
              <Select value={selectedRepo} onValueChange={setSelectedRepo} disabled={isLoadingRepos}>
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingRepos ? "Fetching repos..." : "Choose repository"} />
                </SelectTrigger>
                <SelectContent>
                  {repos.map((repo) => (
                    <SelectItem key={repo.id} value={repo.full_name}>
                      <span className="font-medium">{repo.name}</span>
                      {repo.private && <span className="ml-2 text-[10px] opacity-60">(Private)</span>}
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
        )}

        {!isNotConnected && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handlePush} disabled={!selectedRepo || isPushing}>
              {isPushing ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : null}
              Push Changes
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};