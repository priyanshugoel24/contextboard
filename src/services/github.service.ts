import axios from 'axios';

export interface GitHubMetadata {
  title: string;
  body?: string;
  url: string;
}

export class GitHubService {
  static async getMetadata(url: string): Promise<GitHubMetadata> {
    const response = await axios.post('/api/github-metadata', { url });
    return response.data;
  }
}