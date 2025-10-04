// Consolidated Activity Interfaces

import { Activity as PrismaActivity } from "@prisma/client";

// Base activity interface
export interface Activity {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    image?: string;
  };
  project?: {
    id: string;
    name: string;
    slug: string;
  };
}

// Activity with Prisma relations
export interface ActivityWithRelations extends PrismaActivity {
  user: {
    id: string;
    name?: string | null;
    image?: string | null;
  };
  project?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

// Activity metadata interface
export interface ActivityMetadata {
  cardId?: string;
  commentId?: string;
  memberId?: string;
  oldValue?: string;
  newValue?: string;
  fieldName?: string;
  [key: string]: string | number | boolean | null | undefined;
}

// Activity types
export type ActivityType = 
  | "CARD_CREATED" 
  | "COMMENT_CREATED" 
  | "CARD_EDITED" 
  | "CARD_UPDATED" 
  | "PROJECT_CREATED" 
  | "MEMBER_JOINED" 
  | "MEMBER_REMOVED"
  | "HACKATHON_STARTED"
  | "HACKATHON_ENDED"
  | "HACKATHON_UPDATE"
  | string;

// Activity update interface
export interface ActivityUpdate {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  userId: string;
  projectId: string;
  user: {
    id: string;
    name: string;
    image: string;
  };
}

// Hackathon update interface
export interface HackathonUpdate {
  id: string;
  userId: string;
  content: string;
  createdAt: string;
  user: {
    name: string;
    image?: string;
  };
}