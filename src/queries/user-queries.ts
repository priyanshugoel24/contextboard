import { prisma } from '@/lib/prisma';

/**
 * Common user query utilities and standard selectors
 */

/**
 * Standard user selection fields (basic info)
 */
export const USER_SELECT_BASIC = {
  id: true,
  name: true,
  email: true,
  image: true,
} as const;

/**
 * Standard user selection fields (minimal)
 */
export const USER_SELECT_MINIMAL = {
  id: true,
  name: true,
  email: true,
} as const;

/**
 * Find user by email with basic selection
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: USER_SELECT_BASIC,
  });
}

/**
 * Find user by ID with basic selection
 */
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: USER_SELECT_BASIC,
  });
}

/**
 * Find users by IDs with basic selection
 */
export async function findUsersByIds(ids: string[]) {
  if (ids.length === 0) return [];
  
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: USER_SELECT_BASIC,
  });
}

/**
 * Check if user is an active team member
 */
export async function isActiveTeamMember(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
    select: { status: true },
  });
  
  return membership?.status === 'ACTIVE';
}

/**
 * Check if user is a team owner
 */
export async function isTeamOwner(userId: string, teamId: string): Promise<boolean> {
  const membership = await prisma.teamMember.findUnique({
    where: {
      userId_teamId: {
        userId,
        teamId,
      },
    },
    select: { role: true, status: true },
  });
  
  return membership?.role === 'OWNER' && membership?.status === 'ACTIVE';
}

/**
 * Get user's active team memberships
 */
export async function getUserActiveTeamIds(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMember.findMany({
    where: {
      userId,
      status: 'ACTIVE',
    },
    select: { teamId: true },
  });
  
  return memberships.map(m => m.teamId);
}

/**
 * Find user with team memberships
 */
export async function findUserWithTeamMemberships(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      teamMemberships: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        where: { status: 'ACTIVE' },
      },
    },
  });
}

/**
 * Get team members with user info
 */
export async function getActiveTeamMembers(teamId: string) {
  return prisma.teamMember.findMany({
    where: {
      teamId,
      status: 'ACTIVE',
    },
    include: {
      user: {
        select: USER_SELECT_BASIC,
      },
    },
    orderBy: {
      joinedAt: 'asc',
    },
  });
}

/**
 * Check if user has access to a team (is an active member)
 */
export async function hasTeamAccess(userId: string, teamSlug: string): Promise<boolean> {
  const membership = await prisma.teamMember.findFirst({
    where: {
      userId,
      status: 'ACTIVE',
      team: {
        slug: teamSlug,
      },
    },
  });
  
  return !!membership;
}
