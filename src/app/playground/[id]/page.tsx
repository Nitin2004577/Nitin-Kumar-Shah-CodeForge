"use client";
import React from "react";
import { useParams } from "next/navigation";
import { IdCard, Sidebar } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "../../../../src/components/ui/separator";
import { usePlayground } from "../../../../features/playground/hooks/usePlayground";

const Page = () => {
  const { id } = useParams<{ id: string }>();
  const {playgroundData, templateData, isLoading, error, saveTemplateData} = usePlayground(id);

  console.log("templateData");
  return (
    <TooltipProvider>
      <>
        {/* TODO: TEMPLATEFILE TREE */}
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex flex-1 items-center gap-2">
              <div className="flex flex-col flex-1"></div>
            </div>
          </header>
        </SidebarInset>
      </>
    </TooltipProvider>
  );
};
export default Page;
