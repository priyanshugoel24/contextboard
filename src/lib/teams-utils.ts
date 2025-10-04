import { prisma } from '@/lib/prisma';
import { TeamWithRelations } from '@/interfaces/teams';

/**
 * Fetches all teams for a user by their user ID
 * Returns teams with full relations (members, projects, counts)
 */
export async function fetchUserTeams(userId: string): Promise<TeamWithRelations[]> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        teamMemberships: {
          include: {
            team: {
              include: {
                createdBy: true,
                members: {
                  include: {
                    user: true,
                  },
                  where: { status: 'ACTIVE' },
                },
                projects: {
                  include: {
                    createdBy: true,
                  },
                  where: { isArchived: false },
                },
                _count: {
                  select: {
                    members: true,
                    projects: true,
                  },
                },
              },
            },
          },
          where: { status: 'ACTIVE' },
        },
      },
    });

    if (!user) {
      return [];
    }

    // Transform the data to match TeamWithRelations interface
    const teams = user.teamMemberships?.map((membership) => ({
      ...membership.team,
      role: membership.role,
      joinedAt: membership.joinedAt,
      members: membership.team.members.map(member => ({
        ...member,
        team: membership.team,
      })),
    })) as TeamWithRelations[] || [];

    return teams;
  } catch (error) {
    console.error('Error fetching user teams:', error);
    return [];
  }
}

/**
 * Fetches a single team by slug with standard includes
 * Returns null if team not found
 */
export async function fetchTeamBySlug(teamSlug: string) {
  try {
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      include: {
        createdBy: true,
        members: {
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
          where: { status: 'ACTIVE' },
        },
        projects: {
          include: {
            createdBy: true,
            _count: {
              select: {
                contextCards: true,
              },
            },
          },
          where: { isArchived: false },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            members: true,
            projects: true,
          },
        },
      },
    });

    return team;
  } catch (error) {
    console.error('Error fetching team by slug:', error);
    return null;
  }
}
