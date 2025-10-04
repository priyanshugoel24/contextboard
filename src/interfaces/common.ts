// Consolidated Types and Enums

// User status type
export type UserStatus = "Available" | "Busy" | "Focused" | "Away";

// Task status enum matching the Prisma schema
export enum TaskStatus {
  ACTIVE = "ACTIVE",
  CLOSED = "CLOSED"
}

export type TaskStatusType = keyof typeof TaskStatus;

// File upload result
export interface FileUploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  fileSize?: number;
  error?: string;
}

// Editor state
export interface EditorState {
  isPreview: boolean;
  isFocused: boolean;
  content: string;
  cursorPosition?: number;
}

// Form submission event
export interface FormSubmissionEvent {
  type: 'submit' | 'draft' | 'cancel';
  data?: unknown;
  timestamp: Date;
}

// Invitation interface
export interface Invitation {
  id: string;
  type: 'team' | 'project';
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  };
  invitedTo: {
    id: string;
    name: string;
    slug?: string;
  };
  createdAt: string;
  expiresAt?: string;
}

// User info interface
export interface UserInfo {
  id: string;
  name?: string;
  email: string;
  image?: string;
  emailVerified?: Date | null;
  lastSeenAt?: Date | null;
}

// User with relations interface
export interface UserWithRelations {
  id: string;
  name?: string | null;
  email: string | null;
  image?: string | null;
  emailVerified?: Date | null;
  lastSeenAt?: Date | null;
  teamMemberships?: Array<{
    team: {
      id: string;
      name: string;
      slug: string;
    };
    role: string;
    status: string;
  }>;
}

// Notification data
export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId: string;
  metadata?: {
    [key: string]: unknown;
  };
}