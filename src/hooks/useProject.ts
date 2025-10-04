import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { ProjectService } from '@/services';
import { ProjectWithRelations } from '@/interfaces/projects';
import { getAblyClient } from '@/lib/ably/ably';
import { toast } from 'sonner';
import type { InboundMessage } from 'ably';

export function useProject(projectSlug: string) {
  const { data: session } = useSession();
  const [project, setProject] = useState<ProjectWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch project data
  useEffect(() => {
    const fetchProject = async () => {
      try {
        setLoading(true);
        const data = await ProjectService.getProject(projectSlug);
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch project');
      } finally {
        setLoading(false);
      }
    };

    if (projectSlug) {
      fetchProject();
    }
  }, [projectSlug]);

  // Real-time updates
  useEffect(() => {
    if (!session?.user || !project?.id) return;

    const ably = getAblyClient((session.user as { id: string }).id);
    const channel = ably.channels.get(`project:${project.id}`);

    const handleProjectUpdate = (message: InboundMessage) => {
      if (message.data && typeof message.data === 'object') {
        setProject(prev => prev ? { ...prev, ...message.data } : null);
        toast.success('Project updated');
      }
    };

    channel.subscribe('project:updated', handleProjectUpdate);

    return () => {
      channel.unsubscribe('project:updated', handleProjectUpdate);
      
      // Optionally detach the channel if needed
      const cleanupChannel = async () => {
        try {
          if (channel.state === 'attached') {
            await channel.detach();
          }
        } catch (error) {
          console.error('Error detaching Ably channel:', error);
        }
      };
      
      cleanupChannel();
    };
  }, [project?.id, session]);

  const updateProject = async (data: Partial<ProjectWithRelations>) => {
    if (!project) return;
    
    setSaving(true);
    try {
      await ProjectService.updateProject(project.slug, data);
      toast.success('Project updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating project';
      toast.error(errorMessage);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteProject = async () => {
    if (!project) return;
    
    try {
      await ProjectService.deleteProject(project.slug);
      toast.success('Project deleted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error deleting project';
      toast.error(errorMessage);
      throw error;
    }
  };

  const archiveProject = async (isArchived: boolean) => {
    if (!project) return;
    
    try {
      await ProjectService.archiveProject(project.slug, isArchived);
      toast.success(`Project ${isArchived ? 'archived' : 'unarchived'} successfully`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error archiving project';
      toast.error(errorMessage);
      throw error;
    }
  };

  return {
    project,
    loading,
    error,
    saving,
    updateProject,
    deleteProject,
    archiveProject,
    refetch: () => {
      if (projectSlug) {
        setLoading(true);
        ProjectService.getProject(projectSlug)
          .then(setProject)
          .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch project'))
          .finally(() => setLoading(false));
      }
    }
  };
}
