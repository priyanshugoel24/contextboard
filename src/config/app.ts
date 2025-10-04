// Core application configuration
export const appConfig = {
  // App metadata
  name: 'HackFlow',
  description: 'Your personal context management dashboard',
  version: '1.0.0',
  
  // URLs
  urls: {
    base: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    github: 'https://github.com/priyanshugoel24/HackFlow',
    support: 'mailto:support@hackflow.com',
  },
  
  // API endpoints
  endpoints: {
    projects: '/api/projects',
    teams: '/api/teams',
    contextCards: '/api/context-cards',
    auth: '/api/auth',
    users: '/api/users',
  },
  
  // App colors (semantic colors)
  colors: {
    primary: '#3b82f6',
    secondary: '#64748b',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
  },
  
  // Status enums
  taskStatus: {
    TODO: 'todo',
    IN_PROGRESS: 'in_progress',
    DONE: 'done',
    ARCHIVED: 'archived',
  },
  
  // Priority levels
  priorityLevels: {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    URGENT: 'urgent',
  },
  
  // User roles
  userRoles: {
    ADMIN: 'admin',
    MEMBER: 'member',
    VIEWER: 'viewer',
  },
  
  // Local storage keys
  storageKeys: {
    THEME: 'hackflow-theme',
    SIDEBAR_COLLAPSED: 'hackflow-sidebar-collapsed',
    RECENT_PROJECTS: 'hackflow-recent-projects',
    USER_PREFERENCES: 'hackflow-user-preferences',
  },
  
  // Standard messages
  messages: {
    error: {
      GENERIC: 'An unexpected error occurred. Please try again.',
      NETWORK: 'Network error. Please check your connection.',
      UNAUTHORIZED: 'You are not authorized to perform this action.',
      NOT_FOUND: 'The requested resource was not found.',
      VALIDATION: 'Please check your input and try again.',
      SERVER: 'Server error. Please try again later.',
    },
    success: {
      CREATED: 'Created successfully',
      UPDATED: 'Updated successfully',
      DELETED: 'Deleted successfully',
      SAVED: 'Saved successfully',
      INVITED: 'Invitation sent successfully',
    },
  },
  
  // Realtime configuration
  realtime: {
    channels: {
      PROJECT: (id: string) => `project:${id}`,
      TEAM: (id: string) => `team:${id}`,
      USER: (id: string) => `user:${id}`,
      GLOBAL: 'global',
    },
    events: {
      PROJECT_UPDATED: 'project:updated',
      PROJECT_DELETED: 'project:deleted',
      TEAM_UPDATED: 'team:updated',
      TEAM_DELETED: 'team:deleted',
      CARD_CREATED: 'card:created',
      CARD_UPDATED: 'card:updated',
      CARD_DELETED: 'card:deleted',
      COMMENT_ADDED: 'comment:added',
      MEMBER_JOINED: 'member:joined',
      MEMBER_LEFT: 'member:left',
    },
  },
} as const;