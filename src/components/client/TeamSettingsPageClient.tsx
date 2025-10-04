"use client";
import { useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components';
import BackButton from '@/components/ui/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Users, Plus, Crown, Shield, User, Trash2 } from 'lucide-react';
import { InviteMemberModal } from '@/components/modals';
import { toast } from 'sonner';
import { TeamSettingsTeam } from '@/interfaces/teams';
import { TeamSettingsPageClientProps } from '@/interfaces/ui-components';

export default function TeamSettingsPageClient({ team: initialTeam, teamSlug }: TeamSettingsPageClientProps) {
  const [team, setTeam] = useState<TeamSettingsTeam>(initialTeam as unknown as TeamSettingsTeam);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const router = useRouter();
  
  // Form states
  const [teamName, setTeamName] = useState(initialTeam.name);
  const [teamDescription, setTeamDescription] = useState(initialTeam.description || '');

  const fetchTeam = async () => {
    try {
      const response = await axios.get(`/api/teams/${teamSlug}`);
      setTeam(response.data);
    } catch (error) {
      console.error('Error fetching team:', error);
    }
  };

  const handleUpdateTeam = async () => {
    if (!team || !canManageTeam()) return;

    setSaving(true);
    try {
      const response = await axios.patch(`/api/teams/${teamSlug}`, {
        name: teamName,
        description: teamDescription,
      });
      setTeam(response.data);
      toast.success('Team updated successfully');
    } catch (error: unknown) {
      console.error('Error updating team:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'error' in error.response.data
        ? String(error.response.data.error)
        : 'Failed to update team';
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the team?`)) {
      return;
    }

    try {
      await axios.delete(`/api/teams/${teamSlug}/members/${userId}`);
      toast.success('Member removed successfully');
      fetchTeam(); // Refresh team data
    } catch (error: unknown) {
      console.error('Error removing member:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'error' in error.response.data
        ? String(error.response.data.error)
        : 'Failed to remove member';
      toast.error(errorMessage);
    }
  };

  const handleDeleteTeam = async () => {
    if (!team || !canManageTeam()) return;

    setDeleting(true);
    try {
      await axios.delete(`/api/teams/${teamSlug}`);
      toast.success('Team deleted successfully');
      router.push('/'); // Redirect to home after deletion
    } catch (error: unknown) {
      console.error('Error deleting team:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'error' in error.response.data
        ? String(error.response.data.error)
        : 'Failed to delete team';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const canManageTeam = () => {
    return team?.userRole === 'OWNER';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-blue-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'default';
      case 'ADMIN':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!canManageTeam()) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground">You don&apos;t have permission to manage this team.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackButton label="Back to Team" />
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2 mt-4">
            <Settings className="h-8 w-8" />
            Team Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your team configuration and members
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team Information */}
          <Card>
            <CardHeader>
              <CardTitle>Team Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="team-name">Team Name</Label>
                <Input
                  id="team-name"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="team-description">Description</Label>
                <Textarea
                  id="team-description"
                  value={teamDescription}
                  onChange={(e) => setTeamDescription(e.target.value)}
                  placeholder="Describe your team's purpose and goals"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Team Slug</Label>
                <Input value={team.slug} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">
                  Team URL: /team/{team.slug}
                </p>
              </div>

              <Button 
                onClick={handleUpdateTeam} 
                disabled={saving}
                className="w-full"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
                <Button size="sm" onClick={() => setShowInviteModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {team.members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Image
                        src={member.user.image || '/default-avatar.svg'}
                        alt={member.user.name || member.user.email || 'User'}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.user.name || member.user.email?.split('@')[0] || 'User'}</span>
                          {getRoleIcon(member.role)}
                        </div>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {member.role}
                      </Badge>
                      
                      {/* Show remove button if user can manage and member is not owner and not themselves */}
                      {canManageTeam() && member.role !== 'OWNER' && member.user.id !== team.currentUserId && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveMember(member.user.id, member.user.name || member.user.email?.split('@')[0] || 'User')}
                          className="text-white"
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invite Member Modal */}
        <InviteMemberModal
          open={showInviteModal}
          setOpen={setShowInviteModal}
          teamSlug={teamSlug}
          onInviteSent={fetchTeam}
          triggerButton={false}
        />

        {/* Danger Zone */}
        <Card className="mt-8 border-destructive/20">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Permanently delete this team and all of its data. This action cannot be undone.
              </p>
              
              <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="text-destructive">Delete Team</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to delete <strong>{team.name}</strong>? 
                      This action cannot be undone and will permanently delete:
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 pl-4">
                      <li>• All team data and settings</li>
                      <li>• All team members will be removed</li>
                      <li>• All projects and their data</li>
                      <li>• All context cards and comments</li>
                    </ul>
                    <p className="text-sm font-medium text-destructive">
                      This action is irreversible!
                    </p>
                    <div className="flex gap-2 justify-end">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowDeleteModal(false)}
                        disabled={deleting}
                      >
                        Cancel
                      </Button>
                      <Button 
                        variant="destructive" 
                        onClick={handleDeleteTeam}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting...' : 'Delete Team'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
