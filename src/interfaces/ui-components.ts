// Consolidated UI Component Interfaces

import { ContextCardWithRelations } from "./context-cards";
import { TeamWithRelations, TeamHackathon, TeamAnalytics } from "./teams";
import { ProjectData, ProjectAnalytics } from "./projects";
import { ActivityWithRelations, HackathonUpdate } from "./activities";

// Basic UI Component Props
export interface BackButtonProps {
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
}

export interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export interface SafeMarkdownProps {
  content: string;
  className?: string;
}

export interface FallbackBackgroundProps {
  className?: string;
}

// Editor and Form Props
export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
  initialPreview?: boolean;
}

export interface GitHubCardAutoFillProps {
  onAutoFill: (data: { title: string; content: string }) => void;
  className?: string;
}

// Note: SmartComposeModalProps and CreateTeamModalProps are also defined in ModalInterfaces.ts
// These are newer versions with different prop signatures
export interface NewSmartComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (content: string) => void;
  placeholder?: string;
}

// Modal Props
export interface NewCreateTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTeamCreated?: (team: TeamWithRelations) => void;
}

export interface ContextCardModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  projectId?: string;
  teamSlug?: string;
  card?: ContextCardWithRelations;
  mode?: 'create' | 'edit' | 'view';
  open: boolean;
  setOpen: (open: boolean) => void;
  projectSlug?: string;
  existingCard?: ContextCardWithRelations;
  onSuccess?: () => void;
}

// Page Component Props
export interface ProjectPageProps {
  params: Promise<{
    teamSlug: string;
    projectSlug: string;
  }>;
}

export interface ProjectPageClientProps {
  project: ProjectData;
  team: TeamWithRelations;
  userRole?: string;
  teamSlug?: string;
  projectSlug?: string;
}

export interface TeamPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export interface TeamPageClientProps {
  initialTeam: TeamWithRelations;
  teamSlug: string;
}

export interface HackathonPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export interface HackathonPageClientProps {
  initialTeam: TeamHackathon | null;
  initialCards: ContextCardWithRelations[];
  initialUpdates: HackathonUpdate[];
}

// Settings Page Props
export interface ProjectSettingsPageProps {
  params: Promise<{
    teamSlug: string;
    projectSlug: string;
  }>;
}

export interface ProjectSettingsPageClientProps {
  project: ProjectData;
  team?: TeamWithRelations;
  userRole?: string;
  projectSlug?: string;
}

export interface TeamSettingsPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

export interface TeamSettingsPageClientProps {
  team: TeamWithRelations;
  teamSlug: string;
}

// Analytics Page Props
export interface AnalyticsPageProps {
  params: Promise<{
    teamSlug: string;
    projectSlug: string;
  }>;
}

export interface ProjectAnalyticsPageClientProps {
  project: ProjectData;
  analytics: ProjectAnalytics;
  userRole: string;
}

export interface TeamAnalyticsPageProps {
  params: Promise<{
    teamSlug: string;
  }>;
}

// Assigned Cards Props
export interface AssignedCardsPageProps {
  params: Promise<{ teamSlug: string }>;
}

export interface AssignedCardsPageClientProps {
  team: {
    id: string;
    name: string;
  };
}

// Chart Component Props
export interface WeeklyVelocityChartProps {
  data: Array<{
    week: string;
    completed: number;
    created: number;
  }>;
}

export interface CardTypeDistributionChartProps {
  data: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;
}

export interface TopContributorsChartProps {
  data: Array<{
    userId: string;
    userName: string;
    cardsCreated: number;
    cardsCompleted: number;
  }>;
}

export interface AnalyticsChartsProps {
  analytics: ProjectAnalytics | TeamAnalytics;
}

// List and Display Props
export interface ContextCardListProps {
  cards?: ContextCardWithRelations[];
  isLoading?: boolean;
  onCardUpdate?: () => void;
  projectSlug?: string;
  initialCards?: ContextCardWithRelations[];
  project?: ProjectData;
}

export interface TeamsDisplayProps {
  teams?: TeamWithRelations[];
  isLoading?: boolean;
  initialTeams?: TeamWithRelations[];
}

export interface ActivityFeedProps {
  activities?: ActivityWithRelations[];
  isLoading?: boolean;
  showProject?: boolean;
  projectId?: string;
  slug?: string;
  teamSlug?: string;
  initialActivities?: ActivityWithRelations[];
}

// Focus Mode Props
export interface FocusModeProps {
  cards: ContextCardWithRelations[];
  open: boolean;
  onClose: () => void;
  workDuration?: number;
  breakDuration?: number;
}

// Error Boundary Props
export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: React.Key[];
  resetOnPropsChange?: boolean;
  className?: string;
}