// Consolidated Team Interfaces

import { User, Team, TeamMember as PrismaTeamMember } from "@prisma/client";
import { ProjectWithRelations, TeamPageProject } from "./projects";
import { ActivityWithRelations } from "./activities";

// Base team member interface
export interface TeamMember {
  userId: string;
  name?: string;
  email?: string;
  image?: string;
}

// Team member with Prisma relations
export interface TeamMemberWithRelations extends PrismaTeamMember {
  user: User;
  team: Team;
  addedBy?: User;
}

// Team with all relations
export interface TeamWithRelations extends Team {
  createdBy: User;
  members: TeamMemberWithRelations[];
  projects: ProjectWithRelations[];
  _count?: {
    members: number;
    projects: number;
  };
  role?: string; // User's role in this team
  joinedAt?: Date;
}

// Team invitation interface
export interface TeamInvitation {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  status: string;
  joinedAt: string;
  team: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    createdAt: string;
    lastActivityAt: string;
  };
  addedBy: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  } | null;
}

// Create team data interface
export interface CreateTeamData {
  name: string;
  description?: string;
}

// Team hackathon interface
export interface TeamHackathon {
  id: string;
  name: string;
  slug: string;
  description?: string;
  hackathonModeEnabled: boolean;
  hackathonDeadline?: string;
  hackathonEndedAt?: string;
  userRole?: string;
  members: TeamMemberWithRelations[];
  projects: ProjectWithRelations[];
}

// Team analytics interface
export interface TeamAnalytics {
  // Overview stats
  totalProjects: number;
  completedProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  activeTasks: number;
  totalCards: number;
  activeMembers: number;
  taskCompletionRate: number;
  avgTimeToComplete: number;
  
  // Chart data
  projectProgress: {
    id: string;
    name: string;
    slug: string;
    totalTasks: number;
    completedTasks: number;
    progress: number;
  }[];
  weeklyVelocity: {
    week: string;
    completed: number;
    created: number;
  }[];
  cardTypeDistribution: {
    type: string;
    count: number;
    percentage: number;
  }[];
  topContributors: {
    userId: string;
    userName: string;
    cardsCreated: number;
    cardsCompleted: number;
  }[];
}

// Page-specific team interfaces
export interface TeamPageTeam {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  lastActivityAt: string;
  hackathonModeEnabled: boolean;
  hackathonDeadline?: string;
  createdBy: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  };
  userRole: string;
  _count: {
    members: number;
    projects: number;
  };
  projects: TeamPageProject[];
  members: TeamPageMember[];
  activities?: ActivityWithRelations[];
}

export interface TeamPageMember {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  status: string;
  joinedAt: string;
  lastSeenAt?: string;
  user: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  };
}

export interface TeamSettingsTeam {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  lastActivityAt: string;
  userRole?: string;
  currentUserId?: string;
  members?: TeamSettingsMember[];
  createdBy: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  };
}

export interface TeamSettingsMember {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  status: string;
  joinedAt: string;
  lastSeenAt?: string;
  user: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  };
}

export interface HackathonTeamMember {
  id: string;
  name?: string;
  email: string;
  image?: string;
  role: string;
  status: string;
  joinedAt: string;
  lastSeenAt?: string;
}

export interface HackathonTeam {
  id: string;
  name: string;
  slug: string;
  description?: string;
  hackathonModeEnabled: boolean;
  hackathonDeadline?: string;
  hackathonEndedAt?: string;
  members: HackathonTeamMember[];
  projects: Array<{
    id: string;
    name: string;
    slug: string;
    contextCards: Array<{
      id: string;
      status: string | null;
    }>;
    _count: {
      contextCards: number;
    };
  }>;
  _count: {
    members: number;
    projects: number;
  };
}

// Assigned cards team interface
export interface AssignedCardsTeam {
  id: string;
  name: string;
  slug: string;
}