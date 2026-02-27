import React, { useState, useEffect } from "react";
import { Github, Loader2, AlertCircle } from "lucide-react";
import { signIn } from "next-auth/react"; // Import for connecting
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

export const GithubPushModal: React.FC<GithubPushModalProps> = ({ isOpen, onClose, onPush }) => {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [isNotConnected, setIsNotConnected] = useState(false);
  
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
  try {
    const res = await fetch("/api/github/repos");
    
    // Check if the response is actually OK before parsing JSON
    if (!res.ok) {
      const errorText = await res.text(); // Read as text first to avoid crash
      console.error("Server Error:", errorText);
      
      if (res.status === 405) {
        console.error("Is your API route missing 'export async function GET'?");
      }
      
      if (errorText.includes("NOT_CONNECTED")) {
        setIsNotConnected(true);
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
              ? "Your account is not linked to GitHub." 
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