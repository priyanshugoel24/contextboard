// Consolidated Comment Interfaces

import { User, Comment as PrismaComment } from "@prisma/client";

// Base comment interface
export interface Comment {
  id: string;
  content: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image?: string;
  };
}

// Comment with Prisma relations
export interface CommentWithRelations extends PrismaComment {
  author: User;
  parent?: PrismaComment;
  children?: PrismaComment[];
}

// Create comment data
export interface CreateCommentData {
  content: string;
  cardId: string;
  parentId?: string;
}

// Comment thread props
export interface CommentThreadProps {
  cardId: string;
  comments: CommentWithRelations[];
  onCommentAdded?: (comment: CommentWithRelations) => void;
}