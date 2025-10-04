import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { createSlug, createUniqueSlug } from "@/utils/string";
import { logActivity } from "@/lib/logActivity";
import { getAblyServer } from "@/lib/ably/ably";
import { isActiveTeamMember } from "@/queries/db-queries";

// CREATE new project
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    
    const { name, description, tags, teamId } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    // If teamId is provided, verify user has permission to create projects in this team
    if (teamId) {
      const hasAccess = await isActiveTeamMember(user.id, teamId);

      if (!hasAccess) {
        return NextResponse.json({ error: "Access denied to this team" }, { status: 403 });
      }
    }

    // Generate a unique slug for the project
    const baseSlug = createSlug(name); 
    const existingProjects = await prisma.project.findMany({
      select: { slug: true }
    });
    const existingSlugs = existingProjects.map(p => p.slug);
    const uniqueSlug = createUniqueSlug(baseSlug, existingSlugs);

    const project = await prisma.project.create({
      data: {
        name,
        slug: uniqueSlug,
        description,
        tags: tags || [],
        createdById: user.id,
        teamId: teamId || null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        team: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      }
    });

    // Log activity
    await logActivity({
      type: "PROJECT_CREATED",
      description: `created project "${name}"`,
      userId: user.id,
      projectId: project.id,
      metadata: { projectName: name, projectSlug: uniqueSlug },
    });

    // Publish to Ably
    try {
      const ably = getAblyServer();
      const channel = ably.channels.get(`project:${project.id}`);
      await channel.publish("activity:created", {
        id: Date.now(),
        type: "PROJECT_CREATED",
        description: `created project "${name}"`,
        user: {
          id: user.id,
          name: user.name,
          image: user.image,
        },
        createdAt: new Date().toISOString(),
        projectId: project.id,
        metadata: { projectName: name, projectSlug: uniqueSlug },
      });
    } catch (ablyError) {
      console.error("Ably publish error:", ablyError);
    }

    return NextResponse.json({ project });
  } catch {
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}