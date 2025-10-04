// Consolidated Project Interfaces

import { User, Project as PrismaProject, ContextCard, Team } from "@prisma/client";

// Base Project interface
export interface Project {
  id: string;
  name: string;
  createdById: string;
}

// Detailed project data interface
export interface ProjectData {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isArchived: boolean;
  hackathonModeEnabled?: boolean;
  tags?: string[];
  createdById?: string;
  createdAt: string;
  updatedAt: string;
  lastActivityAt?: string;
  teamId: string;
  team?: {
    id: string;
    name: string;
    slug: string;
  };
  members?: Array<{
    id: string;
    userId: string;
    role: string;
    user: {
      id: string;
      name?: string;
      email: string;
      image?: string;
    };
  }>;
  stats?: {
    totalTasks: number;
    completedTasks: number;
    progress: number;
  };
  contextCards?: ContextCard[];
  activities?: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
  }>;
}

// Project with Prisma relations
export interface ProjectWithRelations extends PrismaProject {
  createdBy: User;
  contextCards?: ContextCard[];
  team?: Team;
}

// Project card display data
export interface ProjectCardData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tags?: string[];
  isArchived: boolean;
  createdAt: string;
  lastActivityAt: string;
  teamId?: string;
  team?: {
    name: string;
    slug: string;
  };
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  contextCards?: Array<{
    id: string;
    status: string;
  }>;
  _count?: {
    contextCards: number;
  };
}

// Project invitation interface
export interface ProjectInvitation {
  id: string;
  userId: string;
  projectId: string;
  role: string;
  status: string;
  joinedAt: string;
  project: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    tags: string[];
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

// Project settings data interface
export interface ProjectSettingsData {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isArchived: boolean;
  createdAt: string;
  lastActivityAt: string;
  team: {
    slug: string;
    members: Array<{
      user: {
        id: string;
        name?: string;
        email: string;
        image?: string;
      };
      status: string;
    }>;
  };
  createdBy: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  };
  contextCards: Array<{
    id: string;
    title: string;
    content?: string | null;
    type: string;
    status: string | null;
    isArchived: boolean;
    createdAt: string;
    updatedAt: string;
    user: {
      id: string;
      name?: string | null;
      email: string | null;
    };
    assignedTo?: {
      id: string;
      name?: string | null;
      email: string | null;
    } | null;
  }>;
}

// Project analytics interface
export interface ProjectAnalytics {
  // Overview stats
  totalCards: number;
  totalTasks: number;
  completedTasks: number;
  taskCompletionRate: number;
  
  // Card type distribution
  cardTypeDistribution: {
    [key: string]: number;
  };
  
  // Task status overview
  taskStatusOverview: {
    ACTIVE: number;
    CLOSED: number;
  };
  
  // Visibility distribution
  visibilityDistribution: {
    PRIVATE: number;
    PUBLIC: number;
  };
  
  // Top contributors
  topContributors: {
    userId: string;
    userName: string;
    cardsCreated: number;
    cardsCompleted: number;
  }[];
  
  // Weekly velocity
  weeklyVelocity: {
    week: string;
    completed: number;
    created: number;
  }[];
}

// Create project data interface
export interface CreateProjectData {
  name: string;
  description?: string;
  teamId: string;
  isArchived?: boolean;
  hackathonModeEnabled?: boolean;
  tags?: string[];
}

// Project page specific interfaces
export interface ProjectPageProject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isArchived: boolean;
  createdAt: string;
  lastActivityAt: string;
  team: {
    id: string;
    name: string;
    slug: string;
  };
  createdBy: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  };
}

export interface ProjectSettingsProject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isArchived: boolean;
  createdAt: string;
  lastActivityAt: string;
  createdBy: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  };
}

// Hackathon project interface
export interface HackathonProject {
  id: string;
  name: string;
  description?: string;
  slug: string;
  team: {
    id: string;
    name: string;
    slug: string;
  };
  contextCards: Array<{
    id: string;
    title: string;
    status: string | null;
    type: string;
  }>;
  _count: {
    contextCards: number;
  };
}

// Team page project interface
export interface TeamPageProject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  lastActivityAt: string;
  tags: string[];
  isArchived: boolean;
  _count: {
    contextCards: number;
  };
  stats?: {
    totalTasks: number;
    completedTasks: number;
    progress: number;
  };
}