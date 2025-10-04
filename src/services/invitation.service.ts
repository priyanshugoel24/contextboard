import axios from 'axios';

export interface Invitation {
  id: string;
  userId: string;
  teamId: string;
  role: string;
  status: string;
  joinedAt: string;
  team: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    createdAt: string;
    lastActivityAt: string;
  };
  addedBy: {
    id: string;
    name?: string;
    email: string;
    image?: string;
  } | null;
}

export class InvitationService {
  static async getInvitations(): Promise<{ teamInvitations: Invitation[] }> {
    const response = await axios.get('/api/invitations');
    return response.data;
  }

  static async acceptInvitation(teamSlug: string): Promise<void> {
    await axios.post(`/api/teams/${teamSlug}/accept-invite`);
  }

  static async declineInvitation(teamSlug: string): Promise<void> {
    await axios.post(`/api/teams/${teamSlug}/decline-invite`);
  }
}