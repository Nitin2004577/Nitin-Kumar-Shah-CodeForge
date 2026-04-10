import AddNewButton from "../../../../features/dashboard/components/add-new-btn";
import ProjectTable from "../../../../features/dashboard/components/project-table";
import {
  getAllPlaygroundForUser,
  deleteProjectById,
  editProjectById,
  duplicateProjectById,
} from "../../../../features/playground/actions";
import { currentUser } from "../../../../features/auth/actions";
import { Code2, Sparkles, FolderOpen } from "lucide-react";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-24 gap-4">
    <div className="p-5 rounded-2xl bg-muted border border-dashed">
      <FolderOpen className="h-10 w-10 text-muted-foreground/50" />
    </div>
    <div className="text-center">
      <h2 className="text-lg font-semibold">No projects yet</h2>
      <p className="text-sm text-muted-foreground mt-1">Create your first playground to get started</p>
    </div>
  </div>
);

const DashboardMainPage = async () => {
  const userData = await currentUser();
  const allPlaygrounds = await getAllPlaygroundForUser();
  const userPlaygrounds = allPlaygrounds?.filter(
    (project: any) => project.userId === userData?.id
  ) || [];

  const firstName = userData?.name?.split(" ")[0] || "there";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome back, {firstName}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {userPlaygrounds.length > 0
                ? `You have ${userPlaygrounds.length} project${userPlaygrounds.length !== 1 ? "s" : ""}`
                : "Start building something great"}
            </p>
          </div>
          <AddNewButton compact />
        </div>

        {/* Stats row */}
        {userPlaygrounds.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Code2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{userPlaygrounds.length}</p>
                <p className="text-xs text-muted-foreground">Total Projects</p>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Sparkles className="h-4 w-4 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {userPlaygrounds.filter((p: any) => p.Starmark?.[0]?.isMarked).length}
                </p>
                <p className="text-xs text-muted-foreground">Starred</p>
              </div>
            </div>
            <div className="rounded-xl border bg-card p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FolderOpen className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Set(userPlaygrounds.map((p: any) => p.template)).size}
                </p>
                <p className="text-xs text-muted-foreground">Templates Used</p>
              </div>
            </div>
          </div>
        )}

        {/* Projects */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Your Projects
          </h2>
          {userPlaygrounds.length === 0 ? (
            <EmptyState />
          ) : (
            // @ts-ignore
            <ProjectTable
              projects={userPlaygrounds as any}
              onDeleteProject={deleteProjectById as any}
              onUpdateProject={editProjectById as any}
              onDuplicateProject={duplicateProjectById as any}
            />
          )}
        </div>

      </div>
    </div>
  );
};

export default DashboardMainPage;
