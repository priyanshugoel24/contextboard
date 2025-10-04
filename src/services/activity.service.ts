import axios from 'axios';
import { Activity } from '@/interfaces/activities';

export class ActivityService {
  static async getProjectActivities(projectIdentifier: string): Promise<{ activities: Activity[] }> {
    const response = await axios.get(`/api/projects/${projectIdentifier}/activities`);
    return response.data;
  }

  static async getTeamActivities(teamSlug: string): Promise<{ activities: Activity[] }> {
    const response = await axios.get(`/api/teams/${teamSlug}/activities`);
    return response.data;
  }
}