// Consolidated API Interfaces

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface NextApiResponseServerIO {
  // Socket.io server instance attached to Next.js API response
  socket?: {
    server?: {
      io?: unknown;
    };
  };
}