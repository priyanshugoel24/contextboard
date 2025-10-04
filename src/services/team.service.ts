import axios from 'axios';
import { Team } from '@prisma/client';
import { Activity } from '@/interfaces/activities';

export class TeamService {
  static async getTeam(slug: string) {
    const response = await axios.get(`/api/teams/${slug}`);
    return response.data;
  }

  static async updateTeam(slug: string, data: Partial<Team>) {
    const response = await axios.patch(`/api/teams/${slug}`, data);
    return response.data;
  }

  static async deleteTeam(slug: string) {
    const response = await axios.delete(`/api/teams/${slug}`);
    return response.data;
  }

  static async createTeam(data: Partial<Team>) {
    const response = await axios.post('/api/teams', data);
    return response.data;
  }

  static async getTeamMembers(slug: string) {
    const response = await axios.get(`/api/teams/${slug}/members`);
    return response.data;
  }

  static async inviteMember(teamSlug: string, email: string, role: string) {
    const response = await axios.post(`/api/teams/${teamSlug}/invite`, { email, role });
    return response.data;
  }

  static async removeMember(teamSlug: string, memberId: string) {
    const response = await axios.delete(`/api/teams/${teamSlug}/members/${memberId}`);
    return response.data;
  }

  static async updateMemberRole(teamSlug: string, memberId: string, role: string) {
    const response = await axios.patch(`/api/teams/${teamSlug}/members/${memberId}`, { role });
    return response.data;
  }

  static async getTeamActivities(teamSlug: string): Promise<{ activities: Activity[] }> {
    const response = await axios.get(`/api/teams/${teamSlug}/activities`);
    return response.data;
  }

  // Hackathon methods
  static async updateHackathonSettings(teamSlug: string, data: { hackathonModeEnabled?: boolean; hackathonDeadline?: string }) {
    const response = await axios.patch(`/api/teams/${teamSlug}/hackathon`, data);
    return response.data;
  }

  static async getHackathonCards(teamSlug: string) {
    const response = await axios.get(`/api/teams/${teamSlug}/hackathon-cards`);
    return response.data;
  }

  static async getHackathonUpdates(teamSlug: string) {
    const response = await axios.get(`/api/teams/${teamSlug}/hackathon-updates`);
    return response.data;
  }

  static async createHackathonUpdate(teamSlug: string, data: { title: string; description: string }) {
    const response = await axios.post(`/api/teams/${teamSlug}/hackathon-updates`, data);
    return response.data;
  }

  static async updateHackathonSettings2(teamSlug: string, data: Record<string, unknown>) {
    const response = await axios.patch(`/api/teams/${teamSlug}/hackathon-settings`, data);
    return response.data;
  }

  static async getAllTeams() {
    const response = await axios.get('/api/teams');
    return response.data;
  }
}
