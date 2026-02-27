"use server"
import { currentUser } from "../../../features/auth/actions";
import { db } from "@/lib/db"
// import { TemplateFolder } from "../../../../libs/path-to-json";
import { TemplateFolder } from "../../../src/libs/types/template-folder.types";
import { revalidatePath } from "next/cache";

// Toggle marked status for a problem
export const toggleStarMarked = async (playgroundId: string, isChecked: boolean) => {
  const user = await currentUser();
  const userId = user?.id;
    
  if (!userId) {
    throw new Error("User ID is required");
  }

  try {
    if (isChecked) {
      await db.starMark.create({
        data: {
          userId: userId,
          playgroundId,
          isMarked: isChecked,
        },
      });
    } else {
      await db.starMark.delete({
        where: {
          userId_playgroundId: {
            userId,
            playgroundId: playgroundId,
          },
        },
      });
    }

    revalidatePath("/dashboard");
    return { success: true, isMarked: isChecked };
  } catch (error) {
    console.error("Error updating problem:", error);
    return { success: false, error: "Failed to update problem" };
  }
};

export const createPlayground = async (data:{
    title: string;
    template: "REACT" | "NEXTJS" | "EXPRESS" | "VUE" | "HONO" | "ANGULAR";
    description?: string;
  })=>{
    const {template , title , description} = data;

    const user = await currentUser();
    
    // Stop immediately if there's no user ID
    if (!user || !user.id) {
        throw new Error("Unauthorized: User ID is missing.");
    }

    try {
        const playground = await db.playground.create({
            data:{
                title:title,
                description:description,
                template:template,
                userId: user.id 
            }
        })

        return playground;
    } catch (error) {
        console.error("Error creating playground:", error)
        throw error;
    }
}

export const getAllPlaygroundForUser = async ()=>{
    const user = await currentUser();
    
    // 🚨 DEBUG LOG: Let's see exactly what we are dealing with!
    console.log("🚨 DEBUG - CURRENT USER RESULT IN ACTION:", user); 
    
    // Stop immediately if there's no user ID
    if (!user || !user.id) {
        throw new Error("Unauthorized: User ID is missing.");
    }

    try {
        const playground = await db.playground.findMany({
            where:{
                userId: user.id 
            },
            include:{
                user:true,
                Starmark:{
                    where:{
                        userId: user.id 
                    },
                    select:{
                        isMarked:true
                    }
                }
            }
        })
      
        return playground;
    } catch (error) {
        console.error("Error fetching playgrounds:", error)
        throw error;
    }
}

export const getPlaygroundById = async (id:string)=>{
    try {
        const playground = await db.playground.findUnique({
            where:{id},
            select:{
                title:true,
                description:true,
              templateFiles:{
                select:{
                  content:true
                }
              }
            }
        })
        return playground;
    } catch (error) {
        console.error("Error fetching playground by ID:", error)
    }
}

export const SaveUpdatedCode = async (playgroundId: string, data: TemplateFolder) => {
  const user = await currentUser();
  if (!user || !user.id) return null;

  try {
    const updatedPlayground = await db.templateFile.upsert({
      where: {
        playgroundId, 
      },
      update: {
        content: JSON.stringify(data),
      },
      create: {
        playgroundId,
        content: JSON.stringify(data),
      },
    });

    return updatedPlayground;
  } catch (error) {
    console.error("SaveUpdatedCode error:", error);
    return null;
  }
};

export const deleteProjectById = async (id:string)=>{
    try {
        await db.playground.delete({
            where:{id}
        })
        revalidatePath("/dashboard")
    } catch (error) {
        console.error("Error deleting project:", error)
    }
}

export const editProjectById = async (id:string,data:{title:string , description:string})=>{
    try {
        await db.playground.update({
            where:{id},
            data:data
        })
        revalidatePath("/dashboard")
    } catch (error) {
        console.error("Error editing project:", error)
    }
}

export const duplicateProjectById = async (id: string) => {
    try {
        // Fetch the original playground data
        const originalPlayground = await db.playground.findUnique({
            where: { id },
            include: {
                templateFiles: true, 
            },
        });

        if (!originalPlayground) {
            throw new Error("Original playground not found");
        }

        // Create a new playground with the same data but a new ID
        const duplicatedPlayground = await db.playground.create({
            data: {
                title: `${originalPlayground.title} (Copy)`,
                description: originalPlayground.description,
                template: originalPlayground.template,
                userId: originalPlayground.userId,
                templateFiles: {
                  // @ts-ignore
                    create: originalPlayground.templateFiles.map((file) => ({
                        content: file.content,
                    })),
                },
            },
        });

        // Revalidate the dashboard path to reflect the changes
        revalidatePath("/dashboard");

        return duplicatedPlayground;
    } catch (error) {
        console.error("Error duplicating project:", error);
    }
};