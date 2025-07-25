import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

// We'll store hackathon updates in the Activity table with a special type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamSlug: string }> }
) {
  try {
    const token = await getToken({ req: request });
    if (!token?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamSlug } = await params;

    // Check if user is a member of the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        team: { slug: teamSlug },
        user: { email: token.email },
        status: 'ACTIVE',
      },
      include: {
        team: true,
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get hackathon updates from all team projects
    const updates = await prisma.activity.findMany({
      where: {
        project: {
          teamId: teamMember.teamId,
        },
        type: 'HACKATHON_UPDATE',
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50, // Limit to last 50 updates
    });

    // Transform to match expected format
    const formattedUpdates = updates.map(update => ({
      id: update.id,
      userId: update.userId!,
      content: update.description,
      createdAt: update.createdAt.toISOString(),
      user: {
        name: update.user?.name || update.user?.email?.split('@')[0] || 'User',
        image: update.user?.image,
      },
    }));

    return NextResponse.json({ updates: formattedUpdates });
  } catch (error) {
    console.error('Error fetching team hackathon updates:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamSlug: string }> }
) {
  try {
    const token = await getToken({ req: request });
    if (!token?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamSlug } = await params;
    const { content } = await request.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Check if user is a member of the team
    const teamMember = await prisma.teamMember.findFirst({
      where: {
        team: { slug: teamSlug },
        user: { email: token.email },
        status: 'ACTIVE',
      },
      include: {
        team: true,
        user: true,
      },
    });

    if (!teamMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the first team project to associate the activity with
    // (since Activity requires a projectId, we'll use any team project)
    const teamProject = await prisma.project.findFirst({
      where: {
        teamId: teamMember.teamId,
        isArchived: false,
      },
    });

    if (!teamProject) {
      return NextResponse.json({ error: 'No active projects found for this team' }, { status: 400 });
    }

    // Create the hackathon update as an activity
    const update = await prisma.activity.create({
      data: {
        type: 'HACKATHON_UPDATE',
        description: content.trim(),
        userId: teamMember.userId,
        projectId: teamProject.id,
        metadata: {
          teamSlug,
          isTeamHackathonUpdate: true,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    const formattedUpdate = {
      id: update.id,
      userId: update.userId!,
      content: update.description,
      createdAt: update.createdAt.toISOString(),
      user: {
        name: update.user?.name || update.user?.email?.split('@')[0] || 'User',
        image: update.user?.image,
      },
    };

    return NextResponse.json({ update: formattedUpdate });
  } catch (error) {
    console.error('Error creating team hackathon update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
