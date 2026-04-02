import { SidebarProvider } from "@/components/ui/sidebar";

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider
      style={{ "--sidebar-width": "240px" } as React.CSSProperties}
      className="overflow-hidden w-screen h-screen"
    >
      {children}
    </SidebarProvider>
  );
}
