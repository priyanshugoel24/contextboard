/**
 * Index file for all query utilities
 * This file exports all the common query utilities for easy importing
 */

// Project queries
export {
  PROJECT_WITH_RELATIONS,
  createUserProjectAccessWhere,
  findUserAccessibleProjects,
  findUserAccessibleProject,
  createProjectOwnerAccessWhere,
  findProjectWithOwnerAccess,
  getUserAccessibleProjectIds,
} from './project-queries';

// User queries
export {
  USER_SELECT_BASIC,
  USER_SELECT_MINIMAL,
  findUserByEmail,
  findUserById,
  findUsersByIds,
  isActiveTeamMember,
  isTeamOwner,
  getUserActiveTeamIds,
  findUserWithTeamMemberships,
  getActiveTeamMembers,
  hasTeamAccess,
} from './user-queries';

// Card queries
export {
  CONTEXT_CARD_WITH_RELATIONS,
  createUserCardAccessWhere,
  findUserAccessibleCards,
  findUserAccessibleCard,
  createCardModifyAccessWhere,
  findCardWithModifyAccess,
  findTeamAssignedCards,
} from './card-queries';

// Activity and comment queries
export {
  ACTIVITY_WITH_RELATIONS,
  COMMENT_WITH_RELATIONS,
  findUserProjectActivities,
  findTeamActivities,
  findUserProjectComments,
  findCardComments,
  findRecentActivities,
} from './activity-queries';

// Team queries
export {
  TEAM_MEMBER_WITH_USER,
  TEAM_WITH_FULL_RELATIONS,
  findUserAccessibleTeams,
  findTeamBySlugWithRelations,
  getUserTeamMembership,
  getTeamMembersWithPagination,
  findUserCreatedTeams,
  getTeamActivitySummary,
  isTeamSlugAvailable,
  getUserTeamsWithRoles,
} from './team-queries';
