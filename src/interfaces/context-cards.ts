// Consolidated Context Card Interfaces

import { User, Project, ContextCard as PrismaContextCard, Comment } from "@prisma/client";

// Context card with Prisma relations
export interface ContextCardWithRelations extends PrismaContextCard {
  user: User;
  project: Project;
  assignedTo?: User;
  linkedCard?: PrismaContextCard;
  linkedFrom?: PrismaContextCard[];
  comments?: Comment[];
}

// Existing card interface
export interface ExistingCard {
  id: string;
  title: string;
  content: string;
  type: "TASK" | "INSIGHT" | "DECISION";
  visibility: "PRIVATE" | "PUBLIC";
  why?: string | null;
  issues?: string | null;
  attachments?: string[] | null;
  status: "ACTIVE" | "CLOSED" | null;
  isArchived?: boolean;
  userId?: string;
  summary?: string | null;
  assignedTo?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    emailVerified: Date | null;
    lastSeenat: Date | null;
  } | null;
}

// Create context card data
export interface CreateContextCardData {
  title: string;
  content: string;
  projectId: string;
  type: string;
  visibility: string;
  status: string;
  why?: string;
  issues?: string;
  attachments?: File[];
  existingAttachments?: string[];
  notifyUserId?: string;
}

// Update context card data
export interface UpdateContextCardData {
  title?: string;
  content?: string;
  type?: string;
  visibility?: string;
  status?: string;
  why?: string;
  issues?: string;
  attachments?: string[];
  assignedToId?: string | null;
  notifyUserId?: string;
}

// Card update interface
export interface CardUpdate {
  id: string;
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
}