import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * Common project query utilities to avoid code duplication
 */

/**
 * Standard project select fields with relations
 */
export const PROJECT_WITH_RELATIONS = {
  id: true,
  name: true,
  slug: true,
  description: true,
  tags: true,
  createdAt: true,
  lastActivityAt: true,
  isArchived: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
    },
  },
  team: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
  },
  _count: {
    select: {
      contextCards: { where: { isArchived: false } },
    },
  },
} as const;

/**
 * Creates WHERE clause for projects accessible by a user
 * User has access if they are:
 * 1. The creator of the project
 * 2. An active member of the team that owns the project
 */
export function createUserProjectAccessWhere(userId: string): Prisma.ProjectWhereInput {
  return {
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

/**
 * Find projects accessible by a user
 */
export async function findUserAccessibleProjects(userId: string, options?: {
  include?: Prisma.ProjectInclude;
  orderBy?: Prisma.ProjectOrderByWithRelationInput;
  take?: number;
  skip?: number;
}) {
  return prisma.project.findMany({
    where: createUserProjectAccessWhere(userId),
    include: options?.include,
    orderBy: options?.orderBy || { lastActivityAt: "desc" },
    take: options?.take,
    skip: options?.skip,
  });
}

/**
 * Find a specific project by slug/id with user access check
 */
export async function findUserAccessibleProject<T extends Prisma.ProjectInclude>(
  projectIdentifier: string,
  userId: string,
  options?: {
    include?: T;
  }
): Promise<(Prisma.ProjectGetPayload<{ include: T }>) | null>;
export async function findUserAccessibleProject(
  projectIdentifier: string,
  userId: string
): Promise<Prisma.ProjectGetPayload<Record<string, never>> | null>;
export async function findUserAccessibleProject(
  projectIdentifier: string,
  userId: string,
  options?: {
    include?: Prisma.ProjectInclude;
  }
) {
  const isCUID = /^c[a-z0-9]{24}$/i.test(projectIdentifier);
  
  return prisma.project.findFirst({
    where: {
      ...(isCUID ? { id: projectIdentifier } : { slug: projectIdentifier }),
      ...createUserProjectAccessWhere(userId),
    },
    include: options?.include,
  });
}

/**
 * Check if user has owner/admin access to a project
 * (either created the project or is owner of the team)
 */
export function createProjectOwnerAccessWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { createdById: userId },
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
    isArchived: false,
  };
}

/**
 * Find a project with owner access check
 */
export async function findProjectWithOwnerAccess<T extends Prisma.ProjectInclude>(
  projectIdentifier: string,
  userId: string,
  options?: {
    include?: T;
  }
): Promise<(Prisma.ProjectGetPayload<{ include: T }>) | null>;
export async function findProjectWithOwnerAccess(
  projectIdentifier: string,
  userId: string
): Promise<Prisma.ProjectGetPayload<Record<string, never>> | null>;
export async function findProjectWithOwnerAccess(
  projectIdentifier: string,
  userId: string,
  options?: {
    include?: Prisma.ProjectInclude;
  }
) {
  const isCUID = /^c[a-z0-9]{24}$/i.test(projectIdentifier);
  
  return prisma.project.findFirst({
    where: {
      ...(isCUID ? { id: projectIdentifier } : { slug: projectIdentifier }),
      ...createProjectOwnerAccessWhere(userId),
    },
    include: options?.include,
  });
}

/**
 * Get all project IDs accessible by a user (useful for filtering other resources)
 */
export async function getUserAccessibleProjectIds(userId: string): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: createUserProjectAccessWhere(userId),
    select: { id: true },
  });
  
  return projects.map(p => p.id);
}

/**
 * Get project statistics including task completion rates
 */
export async function getProjectStatistics(projectId: string) {
  const stats = await prisma.contextCard.aggregate({
    where: {
      projectId,
      type: 'TASK',
      isArchived: false,
    },
    _count: {
      id: true,
    },
  });

  const completedStats = await prisma.contextCard.aggregate({
    where: {
      projectId,
      type: 'TASK',
      status: 'CLOSED',
      isArchived: false,
    },
    _count: {
      id: true,
    },
  });

  const totalTasks = stats._count.id;
  const completedTasks = completedStats._count.id;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return {
    totalTasks,
    completedTasks,
    progress: Math.round(progress),
  };
}
