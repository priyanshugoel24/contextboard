import axios from 'axios';

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

export interface CommentResponse {
  comments: Comment[];
  hasNext: boolean;
  nextCursor?: string;
}

export interface CreateCommentData {
  content: string;
}

export class CommentService {
  static async getComments(cardId: string, limit: number, cursor?: string): Promise<CommentResponse> {
    const response = await axios.get(
      `/api/context-cards/${cardId}/comments?limit=${limit}${cursor ? `&cursor=${cursor}` : ""}`
    );
    return response.data;
  }

  static async createComment(cardId: string, data: CreateCommentData): Promise<Comment> {
    const response = await axios.post(`/api/context-cards/${cardId}/comments`, data);
    return response.data;
  }
}