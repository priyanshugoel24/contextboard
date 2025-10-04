import axios from 'axios';

export interface StandupData {
  summary?: string;
  [key: string]: unknown;
}

export class StandupService {
  static async getProjectStandup(projectId: string): Promise<StandupData> {
    const response = await axios.get(`/api/standup/${projectId}`);
    return response.data;
  }

  static async getTeamStandup(teamSlug: string): Promise<StandupData> {
    const response = await axios.get(`/api/teams/${teamSlug}/standup`);
    return response.data;
  }
}