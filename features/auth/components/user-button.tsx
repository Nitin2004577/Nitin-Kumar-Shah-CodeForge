"use client";
import React from "react";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LogOut, User } from "lucide-react";
import LogoutButton from "./logout-button";
import { useCurrentUser } from "../hooks/use-current-user";

const UserButton = () => {
  const user = useCurrentUser();
  const pathname = usePathname();

  if (pathname === "/") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="outline-none">
        <div className={cn("relative rounded-full w-9 h-9 overflow-hidden border border-border")}>
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt={user.name ?? "User"} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-rose-500 flex items-center justify-center">
              <User className="text-white w-4 h-4" />
            </div>
          )}
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="mr-4 w-48" align="end">
        <DropdownMenuItem className="font-medium">
          <span className="truncate">{user?.email || "User Account"}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <LogoutButton>
          <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </DropdownMenuItem>
        </LogoutButton>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserButton;