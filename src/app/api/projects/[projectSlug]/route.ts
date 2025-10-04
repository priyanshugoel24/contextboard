import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getAblyServer } from "@/lib/ably/ably";
import { findProjectWithOwnerAccess, PROJECT_WITH_RELATIONS } from "@/queries/db-queries";

// PATCH: Update a project
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ projectSlug: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    
    const { projectSlug } = await params;
    const { name, link, description, tags, isArchived } = await req.json();

    // Ensure the user is the creator of the project (only creators can edit projects)
    const project = await findProjectWithOwnerAccess(projectSlug, user.id, {
      include: PROJECT_WITH_RELATIONS
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found or permission denied" }, { status: 404 });
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id: project.id }, // Always use the actual ID for updates
      data: {
        ...(name && { name }),
        ...(link && { link }),
        ...(description !== undefined && { description }),
        ...(tags && { tags }),
        ...(isArchived !== undefined && { isArchived }),
        lastActivityAt: new Date(),
      },
      include: PROJECT_WITH_RELATIONS,
    });

    // Publish real-time update to Ably
    try {
      const ably = getAblyServer();
      const channel = ably.channels.get(`project:${project.id}`);
      
      await channel.publish("project:updated", {
        project: {
          ...updatedProject,
          createdAt: updatedProject.createdAt.toISOString(),
          lastActivityAt: updatedProject.lastActivityAt.toISOString(),
        },
        updatedBy: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        },
      });
    } catch (ablyError) {
      console.error("❌ Failed to publish to Ably:", ablyError);
      // Don't fail the entire request if Ably publish fails
    }

    return NextResponse.json({ 
      success: true, 
      project: {
        ...updatedProject,
        createdAt: updatedProject.createdAt.toISOString(),
        lastActivityAt: updatedProject.lastActivityAt.toISOString(),
      } 
    });
  } catch (error) {
    console.error("Error updating project:", error);
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// DELETE: Delete a project
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ projectSlug: string }> }) {
  try {
    const user = await getAuthenticatedUser(req);
    
    const { projectSlug } = await params;

    // First check if the project exists and user is the creator (only creators can delete)
    const existingProject = await findProjectWithOwnerAccess(projectSlug, user.id);

    if (!existingProject) {
      return NextResponse.json({ error: "Project not found or access denied" }, { status: 404 });
    }

    // Delete the project (this will cascade delete all related data)
    await prisma.project.delete({
      where: { id: existingProject.id }, // Always use the actual ID for deletes
    });

    // Notify other users via real-time channels
    try {
      const ably = getAblyServer();
      
      // Notify project channel about deletion
      await ably.channels.get(`project:${existingProject.id}`).publish("project:deleted", {
        projectId: existingProject.id,
        projectSlug: existingProject.slug,
        deletedBy: user.id,
        deletedAt: new Date().toISOString()
      });

      // Notify team channel about project deletion
      if (existingProject.teamId) {
        await ably.channels.get(`team:${existingProject.teamId}`).publish("project:deleted", {
          projectId: existingProject.id,
          projectSlug: existingProject.slug,
          teamId: existingProject.teamId,
          deletedBy: user.id,
          deletedAt: new Date().toISOString()
        });
      }
    } catch (ablyError) {
      console.error("Error publishing delete event:", ablyError);
      // Don't fail the deletion if Ably fails
    }

    return NextResponse.json({ 
      success: true, 
      message: "Project deleted successfully",
      deletedProject: existingProject 
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
