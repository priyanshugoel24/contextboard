import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-utils";
import { getUserTeamMembership } from '@/queries/team-queries';
import { ACTIVITY_WITH_RELATIONS } from '@/queries/activity-queries';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teamSlug: string }> }
) {
  const { teamSlug } = await params;

  try {
    // Check authentication and get user
    const user = await getAuthenticatedUser(req);

    // Check if user has access to this team
    const userMembership = await getUserTeamMembership(user.id, teamSlug);

    if (!userMembership) {
      return NextResponse.json({ error: "Team not found or access denied" }, { status: 404 });
    }

    // Get all activities for this team (both project-level and team-level)
    const activities = await prisma.activity.findMany({
      where: { 
        OR: [
          {
            project: {
              teamId: userMembership.team.id,
              isArchived: false,
            }
          },
          {
            teamId: userMembership.team.id
          }
        ]
      },
      orderBy: { createdAt: "desc" },
      include: ACTIVITY_WITH_RELATIONS,
      take: 100, // Show more activities for team view
    });

    return NextResponse.json({ activities });
  } catch (error) {
    if (error instanceof Error && error.message === 'No authenticated user found') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching team activities:", error);
    return NextResponse.json({ error: "Failed to fetch team activities" }, { status: 500 });
  }
}
