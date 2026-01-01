import { SidebarProvider } from "@/components/ui/sidebar"
import { DashboardSidebar } from "../../../../features/dashboard/dashboard-sidebar"
import { getAllPlaygroundForUser } from "../../../../features/playground/actions"
import type React from "react"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const playgroundData = await getAllPlaygroundForUser()

  // Store icon names (strings) instead of the components themselves
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
      // Pass the icon name as a string
      icon: technologyIconMap[item.template] || "Code2", // Default to "Code2" if template not found
    })) || []

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden">
        {/* Pass the formatted data with string icon names */}
        <DashboardSidebar initialPlaygroundData={formattedPlaygroundData} />
        <main className="flex-1">{children}</main>
      </div>
    </SidebarProvider>
  )
}