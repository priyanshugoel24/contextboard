import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSlug, createUniqueSlug } from '@/utils/string';
import { getAuthenticatedUser } from '@/lib/auth-utils';
import { getUserTeamsWithRoles, isTeamSlugAvailable } from '@/queries/db-queries';

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user (will handle upsert automatically)
    const authenticatedUser = await getAuthenticatedUser(req);

    // Get user teams with roles using utility
    const teamsWithRoles = await getUserTeamsWithRoles(authenticatedUser.id);

    // Transform to match the expected format
    const teams = teamsWithRoles.map((membership) => ({
      ...membership.team,
      role: membership.role,
      joinedAt: membership.joinedAt,
    }));

    return NextResponse.json(teams);
  } catch (error) {
    if (error instanceof Error && error.message === 'No authenticated user found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (will handle upsert automatically)
    const user = await getAuthenticatedUser(request);

    const { name, description } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Generate a unique slug for the team
    const baseSlug = createSlug(name);
    const existingTeams = await prisma.team.findMany({
      select: { slug: true }
    });
    const existingSlugs = existingTeams.map(t => t.slug);
    const uniqueSlug = createUniqueSlug(baseSlug, existingSlugs);

    // Check if slug is already taken (additional safety check)
    const slugAvailable = await isTeamSlugAvailable(uniqueSlug);

    if (!slugAvailable) {
      return NextResponse.json({ error: 'Unable to generate unique team slug. Please try again.' }, { status: 409 });
    }

    // Create the team
    const team = await prisma.team.create({
      data: {
        name,
        slug: uniqueSlug,
        description,
        createdById: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
            status: 'ACTIVE',
          },
        },
      },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'No authenticated user found') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
