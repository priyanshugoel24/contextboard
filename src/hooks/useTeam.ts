import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { TeamService } from '@/services';
import { TeamWithRelations } from '@/interfaces/teams';
import { getAblyClient } from '@/lib/ably/ably';
import { toast } from 'sonner';
import type { InboundMessage } from 'ably';

export function useTeam(teamSlug: string) {
  const { data: session } = useSession();
  const [team, setTeam] = useState<TeamWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch team data
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        setLoading(true);
        const data = await TeamService.getTeam(teamSlug);
        setTeam(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch team');
      } finally {
        setLoading(false);
      }
    };

    if (teamSlug) {
      fetchTeam();
    }
  }, [teamSlug]);

  // Real-time updates
  useEffect(() => {
    if (!session?.user || !team?.id) return;

    const ably = getAblyClient((session.user as { id: string }).id);
    const channel = ably.channels.get(`team:${team.id}`);

    const handleTeamUpdate = (message: InboundMessage) => {
      if (message.data && typeof message.data === 'object') {
        setTeam((prev) => prev ? { ...prev, ...message.data } : null);
      }
    };

    channel.subscribe('team:updated', handleTeamUpdate);

    return () => {
      channel.unsubscribe('team:updated', handleTeamUpdate);
    };
  }, [team?.id, session]);

  const updateTeam = async (data: Partial<TeamWithRelations>) => {
    if (!team) return;
    
    setSaving(true);
    try {
      await TeamService.updateTeam(team.slug, data);
      toast.success('Team updated successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error updating team';
      toast.error(errorMessage);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const deleteTeam = async () => {
    if (!team) return;
    
    try {
      await TeamService.deleteTeam(team.slug);
      toast.success('Team deleted successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error deleting team';
      toast.error(errorMessage);
      throw error;
    }
  };

  const inviteMember = async (email: string, role: string) => {
    if (!team) return;
    
    try {
      await TeamService.inviteMember(team.slug, email, role);
      toast.success('Member invited successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error inviting member';
      toast.error(errorMessage);
      throw error;
    }
  };

  const removeMember = async (memberId: string) => {
    if (!team) return;
    
    try {
      await TeamService.removeMember(team.slug, memberId);
      toast.success('Member removed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error removing member';
      toast.error(errorMessage);
      throw error;
    }
  };

  return {
    team,
    loading,
    error,
    saving,
    updateTeam,
    deleteTeam,
    inviteMember,
    removeMember,
    refetch: () => {
      if (teamSlug) {
        setLoading(true);
        TeamService.getTeam(teamSlug)
          .then(setTeam)
          .catch(err => setError(err instanceof Error ? err.message : 'Failed to fetch team'))
          .finally(() => setLoading(false));
      }
    }
  };
}
