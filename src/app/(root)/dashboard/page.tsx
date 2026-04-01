import Image from "next/image";
import AddNewButton from "../../../../features/dashboard/components/add-new-btn";
import AddRepo from "../../../../features/dashboard/components/add-repo-btn";

import ProjectTable from "../../../../features/dashboard/components/project-table";
import {
  getAllPlaygroundForUser,
  deleteProjectById,
  editProjectById,
  duplicateProjectById,
} from "../../../../features/playground/actions";
import { currentUser } from "../../../../features/auth/actions";

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16">
    <Image
      src="/empty-state.svg"
      alt="No projects"
      width={192}
      height={192}
      className="mb-4"
    />
    <h2 className="text-xl font-semibold text-gray-500">No projects found</h2>
    <p className="text-gray-400">Create a new project to get started!</p>
  </div>
);

const DashboardMainPage = async () => {
  const userData = await currentUser();
  const allPlaygrounds = await getAllPlaygroundForUser();
  const userPlaygrounds = allPlaygrounds?.filter(
    (project: any) => project.userId === userData?.id
  ) || [];

  return (
    <div className="flex flex-col justify-start items-center min-h-screen mx-auto max-w-7xl px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
        <AddNewButton />
        <AddRepo />
      </div>
      <div className="mt-10 flex flex-col justify-center items-center w-full">
        {/* Check our newly filtered array instead of the raw database dump */}
        {userPlaygrounds.length === 0 ? (
          <EmptyState />
        ) : (
          // @ts-ignore
          <ProjectTable
            // Pass the filtered array down to the table
            projects={userPlaygrounds as any}
            onDeleteProject={deleteProjectById as any}
            onUpdateProject={editProjectById as any}
            onDuplicateProject={duplicateProjectById as any}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardMainPage;