import { prisma } from '@/lib/prisma';
import { TeamAnalytics } from '@/interfaces/teams';
import { ProjectAnalytics } from '@/interfaces/projects';
import { CardType } from '@prisma/client';

/**
 * Team analytics query utilities
 */

/**
 * Standard include for team analytics data
 */
export const TEAM_ANALYTICS_INCLUDE = {
  projects: {
    where: { isArchived: false },
    include: {
      contextCards: {
        where: { isArchived: false },
        include: {
          user: { select: { id: true, name: true, email: true } },
          assignedTo: { select: { id: true, name: true, email: true } }
        }
      },
      _count: {
        select: {
          contextCards: { 
            where: { isArchived: false } 
          }
        }
      }
    }
  },
  members: {
    where: { status: 'ACTIVE' },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  },
  _count: {
    select: {
      projects: { where: { isArchived: false } },
      members: { where: { status: 'ACTIVE' } }
    }
  }
} as const;

/**
 * Calculate comprehensive team analytics by team ID
 */
export async function calculateTeamAnalytics(teamId: string): Promise<TeamAnalytics> {
  try {
    // Get team with all necessary relations
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: TEAM_ANALYTICS_INCLUDE
    });

    if (!team) {
      throw new Error('Team not found');
    }

    // Calculate project analytics
    const totalProjects = team.projects.length;
    let completedProjects = 0;
    let totalCards = 0;
    let totalTasks = 0;
    let completedTasks = 0;
    let activeTasks = 0;

    // Card type distribution tracking
    const cardTypeCounts = {
      TASK: 0,
      INSIGHT: 0,
      DECISION: 0
    };

    // Contributor tracking
    const contributorStats = new Map<string, {
      userId: string;
      userName: string;
      cardsCreated: number;
      cardsCompleted: number;
    }>();

    // Weekly velocity tracking (last 8 weeks)
    const weeklyVelocity = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (7 * (8 - i)));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return {
        week: `Week ${i + 1}`,
        completed: 0,
        created: 0,
        _startDate: weekStart,
        _endDate: weekEnd
      };
    });

    // Calculate completion times for average
    const completionTimes: number[] = [];

    // Process each project
    const projectProgress = team.projects.map(project => {
      const projectCards = project.contextCards;
      const projectTotalTasks = projectCards.filter(card => card.type === 'TASK').length;
      const projectCompletedTasks = projectCards.filter(card => 
        card.type === 'TASK' && card.status === 'CLOSED'
      ).length;
      
      // Update totals
      totalCards += projectCards.length;
      totalTasks += projectTotalTasks;
      completedTasks += projectCompletedTasks;
      activeTasks += (projectTotalTasks - projectCompletedTasks);

      // Check if project is "completed" (all tasks done)
      if (projectTotalTasks > 0 && projectCompletedTasks === projectTotalTasks) {
        completedProjects++;
      }

      // Count card types
      projectCards.forEach(card => {
        if (card.type in cardTypeCounts) {
          cardTypeCounts[card.type as CardType]++;
        }

        // Track contributors
        const creatorId = card.user.id;
        const creatorName = card.user.name || card.user.email || 'Unknown';
        
        if (!contributorStats.has(creatorId)) {
          contributorStats.set(creatorId, {
            userId: creatorId,
            userName: creatorName,
            cardsCreated: 0,
            cardsCompleted: 0
          });
        }
        
        const creatorStats = contributorStats.get(creatorId)!;
        creatorStats.cardsCreated++;
        
        if (card.status === 'CLOSED') {
          creatorStats.cardsCompleted++;
        }

        // Calculate completion time if card is closed
        if (card.status === 'CLOSED') {
          const createdAt = new Date(card.createdAt);
          const updatedAt = new Date(card.updatedAt);
          const timeDiff = updatedAt.getTime() - createdAt.getTime();
          const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
          completionTimes.push(daysDiff);

          // Add to weekly velocity
          weeklyVelocity.forEach(week => {
            if (updatedAt >= week._startDate && updatedAt <= week._endDate) {
              week.completed++;
            }
          });
        }

        // Track created cards for weekly velocity
        const createdAt = new Date(card.createdAt);
        weeklyVelocity.forEach(week => {
          if (createdAt >= week._startDate && createdAt <= week._endDate) {
            week.created++;
          }
        });
      });

      const progress = projectTotalTasks > 0 
        ? Math.round((projectCompletedTasks / projectTotalTasks) * 100) 
        : 0;

      return {
        id: project.id,
        name: project.name,
        slug: project.slug,
        progress,
        completedTasks: projectCompletedTasks,
        totalTasks: projectTotalTasks,
      };
    });

    // Calculate metrics
    const activeProjects = totalProjects - completedProjects;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    const activeMembers = team.members.length;
    
    // Calculate average completion time
    const avgTimeToComplete = completionTimes.length > 0 
      ? Math.round((completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length) * 10) / 10
      : 0;

    // Prepare card type distribution
    const totalCardsForDistribution = Object.values(cardTypeCounts).reduce((a, b) => a + b, 0);
    const cardTypeDistribution = Object.entries(cardTypeCounts).map(([type, count]) => ({
      type,
      count,
      percentage: totalCardsForDistribution > 0 
        ? Math.round((count / totalCardsForDistribution) * 100) 
        : 0
    }));

    // Get top contributors (sorted by total activity)
    const topContributors = Array.from(contributorStats.values())
      .sort((a, b) => {
        const aTotal = a.cardsCreated + a.cardsCompleted;
        const bTotal = b.cardsCreated + b.cardsCompleted;
        return bTotal - aTotal;
      })
      .slice(0, 5);

    // Clean up weekly velocity data (remove date fields for client)
    const cleanWeeklyVelocity = weeklyVelocity.map(week => ({
      week: week.week,
      completed: week.completed,
      created: week.created
    }));

    return {
      totalProjects,
      completedProjects,
      activeProjects,
      totalCards,
      totalTasks,
      completedTasks,
      activeTasks,
      taskCompletionRate,
      activeMembers,
      avgTimeToComplete,
      projectProgress,
      weeklyVelocity: cleanWeeklyVelocity,
      cardTypeDistribution,
      topContributors,
    };
  } catch (error) {
    console.error('Error calculating team analytics:', error);
    throw error;
  }
}

/**
 * Get team analytics by team slug
 */
export async function getTeamAnalyticsBySlug(teamSlug: string): Promise<TeamAnalytics | null> {
  try {
    const team = await prisma.team.findUnique({
      where: { slug: teamSlug },
      select: { id: true }
    });

    if (!team) {
      return null;
    }

    return calculateTeamAnalytics(team.id);
  } catch (error) {
    console.error('Error getting team analytics by slug:', error);
    return null;
  }
}

/**
 * Get basic team information for metadata generation
 */
export async function getTeamBasicInfo(teamSlug: string) {
  return prisma.team.findUnique({
    where: { slug: teamSlug },
    select: {
      id: true,
      name: true,
      description: true,
      _count: {
        select: {
          projects: { where: { isArchived: false } }
        }
      }
    }
  });
}

/**
 * Check if user has access to team analytics
 */
export async function canUserAccessTeamAnalytics(userId: string, teamSlug: string): Promise<boolean> {
  try {
    const membership = await prisma.teamMember.findFirst({
      where: {
        userId: userId,
        team: { slug: teamSlug },
        status: 'ACTIVE'
      }
    });

    return !!membership;
  } catch (error) {
    console.error('Error checking team analytics access:', error);
    return false;
  }
}

/**
 * Get team analytics with access control
 */
export async function getTeamAnalyticsWithAccess(
  userId: string, 
  teamSlug: string
): Promise<TeamAnalytics | null> {
  try {
    // Check access first
    const hasAccess = await canUserAccessTeamAnalytics(userId, teamSlug);
    if (!hasAccess) {
      return null;
    }

    // Get analytics
    return getTeamAnalyticsBySlug(teamSlug);
  } catch (error) {
    console.error('Error getting team analytics with access control:', error);
    return null;
  }
}

/**
 * PROJECT ANALYTICS FUNCTIONS
 */

/**
 * Standard include for project analytics data
 */
export const PROJECT_ANALYTICS_INCLUDE = {
  team: {
    include: {
      members: {
        where: { status: 'ACTIVE' },
        include: {
          user: { select: { id: true, name: true, email: true } }
        }
      },
    },
  },
  contextCards: {
    where: { isArchived: false },
    include: {
      user: { select: { id: true, name: true, email: true } }
    }
  }
} as const;

/**
 * Calculate comprehensive project analytics by project ID
 */
export async function calculateProjectAnalytics(projectId: string): Promise<ProjectAnalytics> {
  try {
    // Get project with all necessary relations
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: PROJECT_ANALYTICS_INCLUDE
    });

    if (!project) {
      throw new Error('Project not found');
    }

    const cards = project.contextCards;
    const totalCards = cards.length;
    const totalTasks = cards.filter(c => c.type === 'TASK').length;
    const completedTasks = cards.filter(c => c.type === 'TASK' && c.status === 'CLOSED').length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Card type distribution
    const cardTypeCounts = {
      TASK: 0,
      INSIGHT: 0,
      DECISION: 0
    };

    // Task status overview
    const taskStatusOverview = {
      ACTIVE: 0,
      CLOSED: 0
    };

    // Visibility distribution
    const visibilityDistribution = {
      PRIVATE: 0,
      PUBLIC: 0
    };

    // Contributor tracking
    const contributorStats = new Map<string, {
      userId: string;
      userName: string;
      cardsCreated: number;
      cardsCompleted: number;
    }>();

    // Weekly velocity tracking (last 8 weeks)
    const weeklyVelocity = Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (7 * (8 - i)));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      return {
        week: `Week ${i + 1}`,
        completed: 0,
        created: 0,
        _startDate: weekStart,
        _endDate: weekEnd
      };
    });

    // Process each card
    cards.forEach(card => {
      // Count card types
      if (card.type in cardTypeCounts) {
        cardTypeCounts[card.type as CardType]++;
      }

      // Count task status
      if (card.type === 'TASK') {
        if (card.status === 'CLOSED') {
          taskStatusOverview.CLOSED++;
        } else {
          taskStatusOverview.ACTIVE++;
        }
      }

      // Count visibility
      if (card.visibility === 'PRIVATE') {
        visibilityDistribution.PRIVATE++;
      } else {
        visibilityDistribution.PUBLIC++;
      }

      // Track contributors
      const creatorId = card.user.id;
      const creatorName = card.user.name || card.user.email || 'Unknown';
      
      if (!contributorStats.has(creatorId)) {
        contributorStats.set(creatorId, {
          userId: creatorId,
          userName: creatorName,
          cardsCreated: 0,
          cardsCompleted: 0
        });
      }
      
      const creatorStats = contributorStats.get(creatorId)!;
      creatorStats.cardsCreated++;
      
      if (card.status === 'CLOSED') {
        creatorStats.cardsCompleted++;
      }

      // Track weekly velocity
      const createdAt = new Date(card.createdAt);
      const updatedAt = new Date(card.updatedAt);

      // Track created cards
      weeklyVelocity.forEach(week => {
        if (createdAt >= week._startDate && createdAt <= week._endDate) {
          week.created++;
        }
      });

      // Track completed cards
      if (card.status === 'CLOSED') {
        weeklyVelocity.forEach(week => {
          if (updatedAt >= week._startDate && updatedAt <= week._endDate) {
            week.completed++;
          }
        });
      }
    });

    // Get top contributors (sorted by total activity)
    const topContributors = Array.from(contributorStats.values())
      .sort((a, b) => {
        const aTotal = a.cardsCreated + a.cardsCompleted;
        const bTotal = b.cardsCreated + b.cardsCompleted;
        return bTotal - aTotal;
      })
      .slice(0, 5);

    // Clean up weekly velocity data (remove date fields for client)
    const cleanWeeklyVelocity = weeklyVelocity.map(week => ({
      week: week.week,
      completed: week.completed,
      created: week.created
    }));

    return {
      totalCards,
      totalTasks,
      completedTasks,
      taskCompletionRate,
      cardTypeDistribution: cardTypeCounts,
      taskStatusOverview,
      visibilityDistribution,
      topContributors,
      weeklyVelocity: cleanWeeklyVelocity,
    };
  } catch (error) {
    console.error('Error calculating project analytics:', error);
    throw error;
  }
}

/**
 * Get project analytics by project slug
 */
export async function getProjectAnalyticsBySlug(projectSlug: string): Promise<ProjectAnalytics | null> {
  try {
    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      select: { id: true }
    });

    if (!project) {
      return null;
    }

    return calculateProjectAnalytics(project.id);
  } catch (error) {
    console.error('Error getting project analytics by slug:', error);
    return null;
  }
}

/**
 * Check if user has access to project analytics
 */
export async function canUserAccessProjectAnalytics(
  userId: string, 
  teamSlug: string, 
  projectSlug: string
): Promise<boolean> {
  try {
    const project = await prisma.project.findUnique({
      where: { slug: projectSlug },
      include: {
        team: {
          include: {
            members: {
              where: {
                userId: userId,
                status: 'ACTIVE'
              }
            }
          }
        }
      }
    });

    // Check if project exists and belongs to the correct team
    if (!project || project.team?.slug !== teamSlug) {
      return false;
    }

    // Check if user is a member of the team
    return project.team.members.length > 0;
  } catch (error) {
    console.error('Error checking project analytics access:', error);
    return false;
  }
}

/**
 * Get project analytics with access control
 */
export async function getProjectAnalyticsWithAccess(
  userId: string, 
  teamSlug: string, 
  projectSlug: string
): Promise<ProjectAnalytics | null> {
  try {
    // Check access first
    const hasAccess = await canUserAccessProjectAnalytics(userId, teamSlug, projectSlug);
    if (!hasAccess) {
      return null;
    }

    // Get analytics
    return getProjectAnalyticsBySlug(projectSlug);
  } catch (error) {
    console.error('Error getting project analytics with access control:', error);
    return null;
  }
}