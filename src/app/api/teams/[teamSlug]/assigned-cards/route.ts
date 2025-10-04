import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { prisma } from '@/lib/prisma';
import { getUserTeamMembership } from '@/queries/team-queries';
import { CONTEXT_CARD_WITH_RELATIONS } from '@/queries/card-queries';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teamSlug: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);

    const resolvedParams = await params;
    
    // Check if user has access to this team
    const userMembership = await getUserTeamMembership(user.id, resolvedParams.teamSlug);

    if (!userMembership) {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }

    // Get all cards assigned to the current user across all team projects
    const assignedCards = await prisma.contextCard.findMany({
      where: {
        assignedToId: user.id,
        project: {
          teamId: userMembership.team.id,
        },
        isArchived: false,
      },
      include: CONTEXT_CARD_WITH_RELATIONS,
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json(assignedCards);
  } catch (error) {
    console.error('Error fetching assigned cards:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
