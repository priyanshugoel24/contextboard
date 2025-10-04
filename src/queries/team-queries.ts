import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { USER_SELECT_BASIC } from './user-queries';

/**
 * Common team query utilities
 */

/**
 * Standard team member include with user
 */
export const TEAM_MEMBER_WITH_USER = {
  user: {
    select: USER_SELECT_BASIC,
  },
  addedBy: {
    select: USER_SELECT_BASIC,
  },
} as const;

/**
 * Standard team include with all relations
 */
export const TEAM_WITH_FULL_RELATIONS = {
  createdBy: {
    select: USER_SELECT_BASIC,
  },
  members: {
    include: TEAM_MEMBER_WITH_USER,
    where: { status: 'ACTIVE' },
    orderBy: { joinedAt: 'asc' as const },
  },
  projects: {
    include: {
      createdBy: {
        select: USER_SELECT_BASIC,
      },
      _count: {
        select: {
          contextCards: { where: { isArchived: false } },
        },
      },
    },
    where: { isArchived: false },
    orderBy: { lastActivityAt: 'desc' as const },
  },
  _count: {
    select: {
      members: { where: { status: 'ACTIVE' } },
      projects: { where: { isArchived: false } },
    },
  },
} as const;

/**
 * Find teams accessible by user (where user is an active member)
 */
export async function findUserAccessibleTeams(userId: string) {
  return prisma.team.findMany({
    where: {
      members: {
        some: {
          userId: userId,
          status: 'ACTIVE',
        },
      },
      isArchived: false,
    },
    include: {
      createdBy: {
        select: USER_SELECT_BASIC,
      },
      _count: {
        select: {
          members: { where: { status: 'ACTIVE' } },
          projects: { where: { isArchived: false } },
        },
      },
    },
    orderBy: { lastActivityAt: 'desc' },
  });
}

/**
 * Find a team by slug with full relations
 */
export async function findTeamBySlugWithRelations(
  teamSlug: string,
  options?: {
    includeArchived?: boolean;
  }
) {
  return prisma.team.findUnique({
    where: { slug: teamSlug },
    include: {
      ...TEAM_WITH_FULL_RELATIONS,
      projects: {
        include: TEAM_WITH_FULL_RELATIONS.projects.include,
        where: options?.includeArchived 
          ? {} 
          : { isArchived: false },
        orderBy: TEAM_WITH_FULL_RELATIONS.projects.orderBy,
      },
    },
  });
}

/**
 * Check if user has access to a team and get their role
 */
export async function getUserTeamMembership(userId: string, teamSlug: string) {
  return prisma.teamMember.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      team: {
        slug: teamSlug,
      },
    },
    include: {
      team: {
        select: {
          id: true,
          name: true,
          slug: true,
          hackathonModeEnabled: true,
          hackathonDeadline: true,
        },
      },
    },
  });
}

/**
 * Get team members with pagination
 */
export async function getTeamMembersWithPagination(
  teamId: string,
  options?: {
    take?: number;
    skip?: number;
    includeInvited?: boolean;
  }
) {
  const where: Prisma.TeamMemberWhereInput = {
    teamId,
  };

  if (!options?.includeInvited) {
    where.status = 'ACTIVE';
  }

  return prisma.teamMember.findMany({
    where,
    include: TEAM_MEMBER_WITH_USER,
    orderBy: [
      { status: 'desc' }, // ACTIVE first
      { joinedAt: 'asc' },
    ],
    take: options?.take,
    skip: options?.skip,
  });
}

/**
 * Find teams created by a user
 */
export async function findUserCreatedTeams(userId: string) {
  return prisma.team.findMany({
    where: {
      createdById: userId,
      isArchived: false,
    },
    include: {
      _count: {
        select: {
          members: { where: { status: 'ACTIVE' } },
          projects: { where: { isArchived: false } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get team activity summary (projects, members, recent activity)
 */
export async function getTeamActivitySummary(teamId: string) {
  const [projectsCount, membersCount, recentActivity] = await Promise.all([
    prisma.project.count({
      where: { teamId, isArchived: false },
    }),
    prisma.teamMember.count({
      where: { teamId, status: 'ACTIVE' },
    }),
    prisma.activity.findFirst({
      where: { teamId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
  ]);

  return {
    projectsCount,
    membersCount,
    lastActivityAt: recentActivity?.createdAt,
  };
}

/**
 * Check if team slug is available
 */
export async function isTeamSlugAvailable(slug: string): Promise<boolean> {
  const existingTeam = await prisma.team.findUnique({
    where: { slug },
    select: { id: true },
  });

  return !existingTeam;
}

/**
 * Get teams with member role for a user
 */
export async function getUserTeamsWithRoles(userId: string) {
  return prisma.teamMember.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    include: {
      team: {
        include: {
          _count: {
            select: {
              members: { where: { status: 'ACTIVE' } },
              projects: { where: { isArchived: false } },
            },
          },
        },
      },
    },
    orderBy: {
      team: {
        lastActivityAt: 'desc',
      },
    },
  });
}
