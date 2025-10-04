import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { USER_SELECT_BASIC } from './user-queries';

/**
 * Common activity and comment query utilities
 */

/**
 * Standard activity include with relations
 */
export const ACTIVITY_WITH_RELATIONS = {
  user: {
    select: USER_SELECT_BASIC,
  },
  project: {
    select: {
      id: true,
      name: true,
      slug: true,
      team: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  },
  team: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} as const;

/**
 * Standard comment include with relations
 */
export const COMMENT_WITH_RELATIONS = {
  author: {
    select: USER_SELECT_BASIC,
  },
  card: {
    select: {
      id: true,
      title: true,
      project: {
        select: {
          name: true,
          slug: true,
          team: {
            select: {
              slug: true,
            },
          },
        },
      },
    },
  },
  parent: {
    select: {
      id: true,
      content: true,
      author: {
        select: USER_SELECT_BASIC,
      },
    },
  },
  children: {
    include: {
      author: {
        select: USER_SELECT_BASIC,
      },
    },
    orderBy: {
      createdAt: 'asc' as const,
    },
  },
} as const;

/**
 * Find activities for projects accessible by user
 */
export async function findUserProjectActivities(
  projectIds: string[],
  options?: {
    take?: number;
    skip?: number;
    orderBy?: Prisma.ActivityOrderByWithRelationInput;
  }
) {
  if (projectIds.length === 0) return [];

  return prisma.activity.findMany({
    where: {
      projectId: { in: projectIds },
    },
    include: ACTIVITY_WITH_RELATIONS,
    orderBy: options?.orderBy || { createdAt: "desc" },
    take: options?.take,
    skip: options?.skip,
  });
}

/**
 * Find team activities
 */
export async function findTeamActivities(
  teamIds: string[],
  options?: {
    includeProjects?: boolean;
    take?: number;
    skip?: number;
    orderBy?: Prisma.ActivityOrderByWithRelationInput;
  }
) {
  if (teamIds.length === 0) return [];

  const where: Prisma.ActivityWhereInput = {};

  if (options?.includeProjects) {
    // Include both team activities and project activities for teams
    where.OR = [
      { teamId: { in: teamIds } },
      {
        project: {
          teamId: { in: teamIds },
        },
      },
    ];
  } else {
    where.teamId = { in: teamIds };
  }

  return prisma.activity.findMany({
    where,
    include: ACTIVITY_WITH_RELATIONS,
    orderBy: options?.orderBy || { createdAt: "desc" },
    take: options?.take,
    skip: options?.skip,
  });
}

/**
 * Find comments for cards in projects accessible by user
 */
export async function findUserProjectComments(
  projectIds: string[],
  options?: {
    take?: number;
    skip?: number;
    orderBy?: Prisma.CommentOrderByWithRelationInput;
  }
) {
  if (projectIds.length === 0) return [];

  return prisma.comment.findMany({
    where: {
      card: {
        projectId: { in: projectIds },
        isArchived: false,
      },
    },
    include: COMMENT_WITH_RELATIONS,
    orderBy: options?.orderBy || { createdAt: "desc" },
    take: options?.take,
    skip: options?.skip,
  });
}

/**
 * Find comments for a specific card
 */
export async function findCardComments(
  cardId: string,
  options?: {
    includeChildren?: boolean;
    orderBy?: Prisma.CommentOrderByWithRelationInput;
  }
) {
  const include = options?.includeChildren 
    ? COMMENT_WITH_RELATIONS 
    : {
        author: { select: USER_SELECT_BASIC },
        parent: {
          select: {
            id: true,
            content: true,
            author: { select: USER_SELECT_BASIC },
          },
        },
      };

  return prisma.comment.findMany({
    where: {
      cardId,
      parentId: null, // Only top-level comments, children are included via relation
    },
    include,
    orderBy: options?.orderBy || { createdAt: "asc" },
  });
}

/**
 * Find recent activities across all user-accessible projects
 */
export async function findRecentActivities(
  userId: string,
  options?: {
    take?: number;
    includeTeamActivities?: boolean;
  }
) {
  // Get user's accessible project IDs
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { createdById: userId },
        {
          team: {
            members: {
              some: {
                userId: userId,
                status: "ACTIVE",
              },
            },
          },
        },
      ],
      isArchived: false,
    },
    select: { id: true, teamId: true },
  });

  const projectIds = projects.map(p => p.id);
  const teamIds = [...new Set(projects.map(p => p.teamId).filter(Boolean))] as string[];

  const where: Prisma.ActivityWhereInput = {};

  if (options?.includeTeamActivities && teamIds.length > 0) {
    where.OR = [
      { projectId: { in: projectIds } },
      { teamId: { in: teamIds } },
    ];
  } else {
    where.projectId = { in: projectIds };
  }

  return prisma.activity.findMany({
    where,
    include: ACTIVITY_WITH_RELATIONS,
    orderBy: { createdAt: "desc" },
    take: options?.take || 30,
  });
}

/**
 * Find hackathon updates for a specific team
 */
export async function findTeamHackathonUpdates(
  teamId: string,
  options?: {
    take?: number;
    skip?: number;
    orderBy?: Prisma.ActivityOrderByWithRelationInput;
  }
) {
  return prisma.activity.findMany({
    where: {
      teamId,
      type: 'HACKATHON_UPDATE',
    },
    include: {
      user: {
        select: USER_SELECT_BASIC,
      },
    },
    orderBy: options?.orderBy || { createdAt: 'desc' },
    take: options?.take || 50,
    skip: options?.skip,
  });
}
