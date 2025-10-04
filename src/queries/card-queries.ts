import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { USER_SELECT_BASIC } from './user-queries';

/**
 * Common context card query utilities
 */

/**
 * Standard context card include with relations
 */
export const CONTEXT_CARD_WITH_RELATIONS = {
  user: {
    select: USER_SELECT_BASIC,
  },
  assignedTo: {
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
  linkedCard: {
    select: {
      id: true,
      title: true,
      type: true,
    },
  },
  linkedFrom: {
    select: {
      id: true,
      title: true,
      type: true,
    },
  },
  _count: {
    select: {
      comments: true,
    },
  },
} as const;

/**
 * Creates WHERE clause for context cards accessible by a user
 */
export function createUserCardAccessWhere(userId: string, projectIds?: string[]): Prisma.ContextCardWhereInput {
  const baseWhere: Prisma.ContextCardWhereInput = {
    isArchived: false,
    OR: [
      { visibility: "PUBLIC" },
      { userId: userId },
      { assignedToId: userId },
    ],
  };

  if (projectIds && projectIds.length > 0) {
    baseWhere.projectId = { in: projectIds };
  } else {
    // Default: include cards from projects user has access to
    baseWhere.project = {
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
    };
  }

  return baseWhere;
}

/**
 * Find context cards accessible by user
 */
export async function findUserAccessibleCards(
  userId: string,
  options?: {
    projectIds?: string[];
    assignedToId?: string;
    status?: string;
    orderBy?: Prisma.ContextCardOrderByWithRelationInput;
    take?: number;
    skip?: number;
    include?: Prisma.ContextCardInclude;
  }
) {
  let where = createUserCardAccessWhere(userId, options?.projectIds);

  if (options?.assignedToId) {
    where = {
      ...where,
      assignedToId: options.assignedToId,
    };
  }

  if (options?.status) {
    where = {
      ...where,
      status: options.status as 'ACTIVE' | 'CLOSED',
    };
  }

  return prisma.contextCard.findMany({
    where,
    include: options?.include || CONTEXT_CARD_WITH_RELATIONS,
    orderBy: options?.orderBy || { updatedAt: "desc" },
    take: options?.take,
    skip: options?.skip,
  });
}

/**
 * Find a specific context card with user access check
 */
export async function findUserAccessibleCard(
  cardId: string,
  userId: string,
  options?: {
    include?: Prisma.ContextCardInclude;
  }
) {
  return prisma.contextCard.findFirst({
    where: {
      id: cardId,
      ...createUserCardAccessWhere(userId),
    },
    include: options?.include || CONTEXT_CARD_WITH_RELATIONS,
  });
}

/**
 * Check if user can edit/modify a card
 */
export function createCardModifyAccessWhere(userId: string): Prisma.ContextCardWhereInput {
  return {
    OR: [
      { userId: userId }, // Card creator
      { assignedToId: userId }, // Assigned user
      {
        project: {
          OR: [
            { createdById: userId }, // Project creator
            {
              team: {
                members: {
                  some: {
                    userId: userId,
                    role: "OWNER",
                    status: "ACTIVE",
                  },
                },
              },
            },
          ],
        },
      },
    ],
    isArchived: false,
  };
}

/**
 * Find a card with modify access check
 */
export async function findCardWithModifyAccess<T extends Prisma.ContextCardInclude>(
  cardId: string,
  userId: string,
  options?: {
    include?: T;
  }
): Promise<(Prisma.ContextCardGetPayload<{ include: T }>) | null>;
export async function findCardWithModifyAccess(
  cardId: string,
  userId: string
): Promise<Prisma.ContextCardGetPayload<Record<string, never>> | null>;
export async function findCardWithModifyAccess(
  cardId: string,
  userId: string,
  options?: {
    include?: Prisma.ContextCardInclude;
  }
) {
  return prisma.contextCard.findFirst({
    where: {
      id: cardId,
      ...createCardModifyAccessWhere(userId),
    },
    include: options?.include,
  });
}

/**
 * Get cards assigned to specific users in a team
 */
export async function findTeamAssignedCards(
  teamId: string,
  userIds?: string[],
  options?: {
    status?: string;
    take?: number;
    skip?: number;
  }
) {
  const where: Prisma.ContextCardWhereInput = {
    isArchived: false,
    project: {
      teamId: teamId,
      isArchived: false,
    },
  };

  if (userIds && userIds.length > 0) {
    where.assignedToId = { in: userIds };
  } else {
    // Get all team members first
    const teamMembers = await prisma.teamMember.findMany({
      where: { 
        teamId: teamId,
        status: 'ACTIVE'
      },
      select: { userId: true }
    });
    
    const memberUserIds = teamMembers.map(member => member.userId);
    if (memberUserIds.length > 0) {
      where.assignedToId = { in: memberUserIds };
    }
  }

  if (options?.status) {
    where.status = options.status as 'ACTIVE' | 'CLOSED';
  }

  return prisma.contextCard.findMany({
    where,
    include: CONTEXT_CARD_WITH_RELATIONS,
    orderBy: { updatedAt: "desc" },
    take: options?.take,
    skip: options?.skip,
  });
}
