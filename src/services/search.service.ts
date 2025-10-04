import axios from 'axios';

export interface SearchResult {
  id: string;
  type: 'project' | 'team' | 'card' | 'member' | 'tag';
  slug?: string;
  title?: string;
  description?: string;
  projectSlug?: string;
  originalId?: string;
  name?: string;
  projectCount?: number;
  projectName?: string;
  email?: string;
  tag?: string;
}

export interface AIResponse {
  answer: string;
  metadata?: Record<string, unknown>;
}

export class SearchService {
  static async search(query: string): Promise<{ results: SearchResult[] }> {
    const response = await axios.get(`/api/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  static async askAI(prompt: string): Promise<AIResponse> {
    const response = await axios.post('/api/assistant', { prompt });
    return {
      answer: response.data.answer || "No response.",
      metadata: response.data.metadata || null
    };
  }
}