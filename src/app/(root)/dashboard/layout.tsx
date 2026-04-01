import { SidebarProvider } from "@/components/ui/sidebar"
import { DashboardSidebar } from "../../../../features/dashboard/components/dashboard-sidebar"
import { getAllPlaygroundForUser } from "../../../../features/playground/actions"
import { currentUser } from "../../../../features/auth/actions"
import type React from "react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [playgroundData, user] = await Promise.all([
    getAllPlaygroundForUser(),
    currentUser(),
  ])

  const technologyIconMap: Record<string, string> = {
    REACT: "Zap",
    NEXTJS: "Lightbulb",
    EXPRESS: "Database",
    VUE: "Compass",
    HONO: "FlameIcon",
    ANGULAR: "Terminal",
  }

  interface FormattedPlaygroundItem {
    id: string
    name: string
    starred: boolean
    icon: string
  }

  const formattedPlaygroundData: FormattedPlaygroundItem[] =
    playgroundData?.map((item: typeof playgroundData[number]) => ({
      id: item.id,
      name: item.title,
      starred: item.Starmark?.[0]?.isMarked || false,
      icon: technologyIconMap[item.template] || "Code2",
    })) || []

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        <DashboardSidebar
          initialPlaygroundData={formattedPlaygroundData}
          user={{
            name: user?.name ?? "",
            email: user?.email ?? "",
            image: user?.image ?? "",
          }}
        />
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  )
}