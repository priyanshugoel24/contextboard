import axios from "axios";
import { toast } from "sonner";
import { TOAST_DURATION, TOAST_POSITION } from "@/config/contextCard";
import { extractErrorMessage } from "@/utils/contextCard";
import { TeamMember } from "@/interfaces/teams";
import { CreateContextCardData } from "@/interfaces/context-cards";
import { UpdateContextCardData } from "@/interfaces/context-cards";
import { ContextCardWithRelations } from "@/interfaces/context-cards";
import { paginationConfig } from '@/config/pagination';

export class ContextCardService {
  /**
   * Upload file to Supabase via API route
   */
  static async uploadFileToSupabase(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const res = await axios.post("/api/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return res.data;
    } catch (error: unknown) {
      console.error("Upload API error:", error);
      const errorMessage = extractErrorMessage(error, "Unknown error");
      toast.error(`Upload failed: ${errorMessage}`, {
        description: `Failed to upload ${file.name}`,
        duration: TOAST_DURATION,
        position: TOAST_POSITION,
      });
      return null;
    }
  }

  /**
   * Fetch team members for a project
   */
  static async fetchTeamMembers(projectSlug: string): Promise<TeamMember[]> {
    const response = await axios.get(`/api/projects/${projectSlug}/team-members`);
    return response.data.map((member: {
      user: {
        id: string;
        name?: string;
        email?: string;
        image?: string;
      };
    }) => ({
      userId: member.user.id,
      name: member.user.name,
      email: member.user.email,
      image: member.user.image,
    }));
  }

  /**
   * Create a new context card
   */
  static async createContextCard(data: CreateContextCardData) {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("content", data.content);
    formData.append("projectId", data.projectId);
    formData.append("type", data.type);
    formData.append("visibility", data.visibility);
    formData.append("status", data.status);
    
    if (data.why) formData.append("why", data.why);
    if (data.issues) formData.append("issues", data.issues);
    if (data.notifyUserId) formData.append("notifyUserId", data.notifyUserId);
    
    if (data.attachments) {
      for (const file of data.attachments) {
        formData.append("attachments", file);
      }
    }
    
    if (data.existingAttachments) {
      data.existingAttachments.forEach((url: string) => {
        formData.append("existingAttachments", url);
      });
    }

    return await axios.post("/api/context-cards", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  /**
   * Update an existing context card
   */
  static async updateContextCard(cardId: string, data: UpdateContextCardData) {
    return await axios.patch(`/api/context-cards/${cardId}`, data);
  }

  /**
   * Delete a context card
   */
  static async deleteContextCard(cardId: string) {
    return await axios.delete(`/api/context-cards/${cardId}`);
  }

  /**
   * Archive/unarchive a context card
   */
  static async archiveContextCard(cardId: string, isArchived: boolean) {
    return await axios.patch(`/api/context-cards/${cardId}/archive`, {
      isArchived,
    });
  }

  /**
   * Generate summary for a context card
   */
  static async summarizeCard(cardId: string, projectId: string) {
    return await axios.post(`/api/context-cards/${cardId}/summarize`, {
      projectId,
      cardId,
    });
  }

  /**
   * Fetch assigned context cards with pagination and filtering
   */
  static async fetchAssignedCards({
    pageNum,
    userEmail,
    teamId,
    currentUserOnly = true,
  }: {
    pageNum: number;
    userEmail: string;
    teamId?: string;
    currentUserOnly?: boolean;
  }): Promise<{
    cards: ContextCardWithRelations[];
    hasMore: boolean;
  }> {
    let params = `status=ACTIVE&offset=${pageNum * paginationConfig.pageSize}&limit=${paginationConfig.pageSize}`;
    
    if (currentUserOnly) {
      params += `&assignedTo=${encodeURIComponent(userEmail)}`;
      if (teamId) {
        params += `&teamId=${teamId}`;
      }
    } else if (teamId) {
      params += `&teamId=${teamId}`;
    } else {
      params += `&assignedTo=${encodeURIComponent(userEmail)}`;
    }

    const res = await axios.get(`/api/context-cards?${params}`);
    const data = res.data;
    
    if (Array.isArray(data.cards)) {
      return {
        cards: data.cards,
        hasMore: data.cards.length === paginationConfig.pageSize,
      };
    } else {
      return {
        cards: [],
        hasMore: false,
      };
    }
  }

  /**
   * Get context cards by project ID
   */
  static async getContextCardsByProject(projectId: string, limit = 100) {
    const response = await axios.get(`/api/context-cards?projectId=${projectId}&limit=${limit}`);
    return response.data;
  }
}
