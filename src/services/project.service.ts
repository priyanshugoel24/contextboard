import axios from 'axios';
import { Project } from '@prisma/client';
import { Activity } from '@/interfaces/activities';

export class ProjectService {
  static async getProject(slug: string) {
    const response = await axios.get(`/api/projects/${slug}`);
    return response.data;
  }

  static async updateProject(slug: string, data: Partial<Project>) {
    const response = await axios.patch(`/api/projects/${slug}`, data);
    return response.data;
  }

  static async deleteProject(slug: string) {
    const response = await axios.delete(`/api/projects/${slug}`);
    return response.data;
  }

  static async archiveProject(slug: string, isArchived: boolean) {
    const response = await axios.patch(`/api/projects/${slug}/archive`, { isArchived });
    return response.data;
  }

  static async createProject(data: Partial<Project>) {
    const response = await axios.post('/api/projects', data);
    return response.data;
  }

  static async getProjectMembers(slug: string) {
    const response = await axios.get(`/api/projects/${slug}/members`);
    return response.data;
  }

  static async getProjectActivities(projectIdentifier: string): Promise<{ activities: Activity[] }> {
    const response = await axios.get(`/api/projects/${projectIdentifier}/activities`);
    return response.data;
  }

  static async getAllProjects(includeArchived = false) {
    const response = await axios.get(`/api/projects?includeArchived=${includeArchived}`);
    return response.data;
  }

  static async archiveProjectById(projectId: string, isArchived: boolean) {
    const response = await axios.patch(`/api/projects/${projectId}/archive`, { isArchived });
    return response.data;
  }
}
