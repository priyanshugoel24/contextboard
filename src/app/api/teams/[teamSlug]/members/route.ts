import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { 
  getUserTeamMembership,
  getTeamMembersWithPagination 
} from '@/queries/team-queries';

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

    // Get team members
    const teamMembers = await getTeamMembersWithPagination(userMembership.team.id);

    return NextResponse.json(teamMembers);
  } catch (error) {
    if (error instanceof Error && error.message === 'No authenticated user found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ teamSlug: string }> }
) {
  try {
    const requestingUser = await getAuthenticatedUser(request);

    const { email, role = 'MEMBER' } = await request.json();

    const resolvedParams = await params;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if requesting user is an owner of the team
    const userMembership = await getUserTeamMembership(requestingUser.id, resolvedParams.teamSlug);

    if (!userMembership || userMembership.role !== 'OWNER') {
      return NextResponse.json({ error: 'Team not found or access denied' }, { status: 404 });
    }

    // Find or create the user
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: email.split('@')[0], // Default name from email
      },
    });

    // Check if user is already a member
    const existingMembership = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId: userMembership.team.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 409 });
    }

    const newMember = await prisma.teamMember.create({
      data: {
        userId: user.id,
        teamId: userMembership.team.id,
        role: role,
        status: 'INVITED', // Create as invitation, not direct membership
        addedById: requestingUser.id,
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

    return NextResponse.json({ 
      success: true,
      message: 'Invitation sent successfully',
      member: newMember 
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'No authenticated user found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error adding team member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
