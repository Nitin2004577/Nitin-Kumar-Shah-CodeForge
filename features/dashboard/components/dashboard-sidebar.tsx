"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { ProxyAvatar } from "@/components/ui/proxy-avatar"
import {
  Code2,
  Compass,
  FolderPlus,
  History,
  Home,
  LayoutDashboard,
  Lightbulb,
  type LucideIcon,
  Plus,
  Settings,
  Star,
  Terminal,
  Zap,
  Database,
  FlameIcon,
  LogOut,
  User,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarGroupAction,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import TemplateSelectionModal from "../../../components/modal/template-selector-modal"
import { createPlayground } from "../../playground/actions"
import { toast } from "sonner"

interface PlaygroundData {
  id: string
  name: string
  icon: string
  starred: boolean
}

interface SidebarUser {
  name: string
  email: string
  image: string
}

const lucideIconMap: Record<string, LucideIcon> = {
  Zap, Lightbulb, Database, Compass, FlameIcon, Terminal, Code2,
}

export function DashboardSidebar({
  initialPlaygroundData,
  user,
}: {
  initialPlaygroundData: PlaygroundData[]
  user: SidebarUser
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [starredPlaygrounds] = useState(initialPlaygroundData.filter((p) => p.starred))
  const [recentPlaygrounds] = useState(initialPlaygroundData)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handleCreatePlayground = async (data: {
    title: string
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR"
    description?: string
  }) => {
    const res = await createPlayground(data)
    toast.success("Playground created")
    setIsModalOpen(false)
    router.push(`/playground/${res?.id}`)
  }

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r">
      <SidebarHeader>
        <div className="flex items-center justify-center px-2 py-2">
          <img src="/logo.png" alt="logo" height={40} width={40} className="shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/"} tooltip="Home">
                <Link href="/"><Home className="h-4 w-4" /><span>Home</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/dashboard"} tooltip="Dashboard">
                <Link href="/dashboard"><LayoutDashboard className="h-4 w-4" /><span>Dashboard</span></Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel><Star className="h-4 w-4 mr-2" />Starred</SidebarGroupLabel>
          <SidebarGroupAction title="New playground" onClick={() => setIsModalOpen(true)}>
            <Plus className="h-4 w-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {starredPlaygrounds.length === 0 && recentPlaygrounds.length === 0 ? (
                <div className="text-center text-muted-foreground py-4 w-full text-xs">Create your playground</div>
              ) : (
                starredPlaygrounds.map((playground) => {
                  const Icon = lucideIconMap[playground.icon] || Code2
                  return (
                    <SidebarMenuItem key={playground.id}>
                      <SidebarMenuButton asChild isActive={pathname === `/playground/${playground.id}`} tooltip={playground.name}>
                        <Link href={`/playground/${playground.id}`}><Icon className="h-4 w-4" /><span>{playground.name}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel><History className="h-4 w-4 mr-2" />Recent</SidebarGroupLabel>
          <SidebarGroupAction title="New playground" onClick={() => setIsModalOpen(true)}>
            <FolderPlus className="h-4 w-4" />
          </SidebarGroupAction>
          <SidebarGroupContent>
            <SidebarMenu>
              {recentPlaygrounds.map((playground) => {
                const Icon = lucideIconMap[playground.icon] || Code2
                return (
                  <SidebarMenuItem key={playground.id}>
                    <SidebarMenuButton asChild isActive={pathname === `/playground/${playground.id}`} tooltip={playground.name}>
                      <Link href={`/playground/${playground.id}`}><Icon className="h-4 w-4" /><span>{playground.name}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="View all">
                  <Link href="/dashboard"><span className="text-sm text-muted-foreground">View all playgrounds</span></Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Settings">
              <Link href="/settings"><Settings className="h-4 w-4" /><span>Settings</span></Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {/* User profile card */}
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={user.name || "Profile"}
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  {/* Avatar */}
                  <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 border border-border">
                    <ProxyAvatar src={user.image} alt={user.name} size={32} fallback={user.name?.[0]?.toUpperCase()} />
                  </div>
                  {/* Name + email — hidden when sidebar is collapsed */}
                  <div className="flex flex-col min-w-0 text-left">
                    <span className="text-sm font-medium truncate">{user.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>

              <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
                {/* Profile header */}
                <div className="flex items-center gap-3 px-3 py-2">
                    <div className="h-9 w-9 rounded-full overflow-hidden shrink-0 border border-border">
                    <ProxyAvatar src={user.image} alt={user.name} size={36} fallback={user.name?.[0]?.toUpperCase()} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer">
                    <User className="h-4 w-4 mr-2" />
                    Profile &amp; Settings
                  </Link>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={() => signOut({ callbackUrl: "/auth/sign-in" })}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
      <TemplateSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreatePlayground}
      />
    </Sidebar>
  )
}