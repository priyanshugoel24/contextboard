'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import axios from 'axios';
import { Navbar } from '@/components';
import OnlineUsers from '@/components/OnlineUsers';
import ActivityFeed from '@/components/ActivityFeed';
import AssignedCards from '@/components/AssignedCards';
import BackButton from '@/components/ui/BackButton';

// Lazy load heavy modal components
const ProjectModal = dynamic(() => import('@/components/modals/ProjectModal'), {
  loading: () => <div>Loading...</div>
});

const TeamStandupDigest = dynamic(() => import('@/components/TeamStandupDigest'), {
  loading: () => <div>Loading digest...</div>
});

const InviteMemberModal = dynamic(() => import('@/components/modals/InviteMemberModal'), {
  loading: () => <div>Loading...</div>
});

const FocusMode = dynamic(() => import('@/components/FocusMode'), {
  ssr: false,
  loading: () => <div>Loading Focus Mode...</div>
});
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Calendar, Settings, UserPlus, BarChart3, Target, Archive, ArchiveRestore } from 'lucide-react';
import { ContextCardWithRelations } from '@/interfaces/context-cards';
import { TeamPageTeam } from '@/interfaces/teams';
import { TeamPageProject } from '@/interfaces/projects';
import { ActivityWithRelations } from '@/interfaces/activities';
import { TeamPageClientProps } from '@/interfaces/ui-components';
import { ErrorBoundary } from '@/components';

export default function TeamPageClient({ initialTeam, teamSlug }: TeamPageClientProps) {
  const router = useRouter();
  const [team, setTeam] = useState<TeamPageTeam | null>(initialTeam as unknown as TeamPageTeam);
  const [loading, setLoading] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showHackathonModal, setShowHackathonModal] = useState(false);
  
  // Focus Mode state
  const [selectedCards, setSelectedCards] = useState<ContextCardWithRelations[]>([]);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [showArchivedProjects, setShowArchivedProjects] = useState(false);

  // Hackathon state
  const [hackathonDeadline, setHackathonDeadline] = useState('');

  // Prefetch important project and team routes when team loads
  useEffect(() => {
    if (team && teamSlug) {
      // Prefetch key team routes
      router.prefetch(`/team/${teamSlug}/analytics`);
      router.prefetch(`/team/${teamSlug}/settings`);
      router.prefetch(`/team/${teamSlug}/assigned-cards`);
      
      // Prefetch project pages for active projects only (limit to most important ones)
      if (team.projects) {
        team.projects
          .filter(project => !project.isArchived)
          .slice(0, 3) // Limit to first 3 active projects to avoid over-prefetching
          .forEach(project => {
            router.prefetch(`/team/${teamSlug}/project/${project.slug}`);
            router.prefetch(`/team/${teamSlug}/project/${project.slug}/analytics`);
          });
      }

      // Prefetch hackathon room if hackathon mode is enabled
      if (team.hackathonModeEnabled) {
        router.prefetch(`/team/${teamSlug}/hackathon`);
      }
    }
  }, [team, teamSlug, router]);

  const fetchTeam = async () => {
    try {
      const response = await axios.get(`/api/teams/${teamSlug}`);
      const teamData = response.data;
      setTeam(teamData);
    } catch (error) {
      console.error('Error fetching team:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectClick = (project: TeamPageProject) => {
    router.push(`/team/${teamSlug}/project/${project.slug}`);
  };

  // Handle project card hover - prefetch project routes
  const handleProjectHover = useCallback((project: TeamPageProject) => {
    router.prefetch(`/team/${teamSlug}/project/${project.slug}`);
    router.prefetch(`/team/${teamSlug}/project/${project.slug}/analytics`);
    router.prefetch(`/team/${teamSlug}/project/${project.slug}/settings`);
  }, [teamSlug, router]);

  const handleToggleFocusCard = (card: ContextCardWithRelations) => {
    setSelectedCards(prev => {
      const isSelected = prev.some(c => c.id === card.id);
      if (isSelected) {
        return prev.filter(c => c.id !== card.id);
      } else {
        return [...prev, card];
      }
    });
  };

  const handleEnterFocusMode = () => {
    if (selectedCards.length > 0) {
      setShowFocusMode(true);
    }
  };

  const handleFocusModeClose = () => {
    setShowFocusMode(false);
    // Optionally clear selected cards after focus session
    setSelectedCards([]);
  };

  const handleStartHackathon = async () => {
    if (!hackathonDeadline) {
      alert('Please select a deadline for the hackathon');
      return;
    }

    try {
      await axios.patch(`/api/teams/${teamSlug}/hackathon`, {
        hackathonModeEnabled: true,
        hackathonDeadline: hackathonDeadline,
      });

      setShowHackathonModal(false);
      setHackathonDeadline('');
      fetchTeam(); // Refresh team data
      // Navigate to hackathon room
      router.push(`/team/${teamSlug}/hackathon`);
    } catch (error: unknown) {
      console.error('Error starting hackathon:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'error' in error.response.data
        ? String(error.response.data.error)
        : 'Failed to start hackathon';
      alert(errorMessage);
    }
  };

  const handleToggleArchiveProject = async (projectId: string, isArchived: boolean) => {
    try {
      await axios.patch(`/api/projects/${projectId}/archive`, {
        isArchived: !isArchived,
      });

      // Refresh team data to update the project list
      fetchTeam();
    } catch (error: unknown) {
      console.error('Error archiving/unarchiving project:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'error' in error.response.data
        ? String(error.response.data.error)
        : 'Failed to update project';
      alert(errorMessage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Team not found</h1>
            <p className="text-muted-foreground">The team you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
            <Button onClick={() => router.push('/')} className="mt-4">
              Go Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Team Page Error:', error, errorInfo);
      }}
      fallback={
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
              <p className="text-muted-foreground mb-4">We&apos;re having trouble loading the team page.</p>
              <Button onClick={() => window.location.reload()}>
                Refresh Page
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <BackButton />
          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{team.name}</h1>
              {team.description && (
                <p className="text-muted-foreground mt-2">{team.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {team._count.members} members • {team._count.projects} projects
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/team/${teamSlug}/analytics`)}
                  onMouseEnter={() => router.prefetch(`/team/${teamSlug}/analytics`)}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Button>
                {(team.userRole === 'OWNER') && (
                  <>
                    {!team.hackathonModeEnabled && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHackathonModal(true)}
                        className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-950"
                      >
                        <Target className="h-4 w-4 mr-2" />
                        Start Hackathon
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowInviteModal(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/team/${teamSlug}/settings`)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Team Hackathon Section */}
        {team.hackathonModeEnabled && (
          <div className="mb-8">
            <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-950 dark:to-yellow-950 dark:border-orange-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-6 w-6 text-orange-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100">
                          Hackathon Mode Active
                        </h3>
                        <p className="text-sm text-orange-700 dark:text-orange-300">
                          {team.hackathonDeadline && (
                            <>Deadline: {new Date(team.hackathonDeadline).toLocaleDateString()}</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => router.push(`/team/${teamSlug}/hackathon`)}
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Join Hackathon Room
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Assigned Cards Section - Moved to Top */}
        <div className="mb-8">
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-semibold text-foreground">My Assigned Cards</h2>
              <div className="flex items-center gap-3">
                {selectedCards.length > 0 && (
                  <Button 
                    onClick={handleEnterFocusMode}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Enter Focus Mode ({selectedCards.length})
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => router.push(`/team/${teamSlug}/assigned-cards`)}
                >
                  View All
                </Button>
              </div>
            </div>
            <AssignedCards 
              teamId={team.id} 
              currentUserOnly={true}
              onToggleFocusCard={handleToggleFocusCard}
              selectedCardIds={selectedCards.map(c => c.id)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Projects Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <h2 className="text-2xl font-semibold text-foreground">Projects</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowArchivedProjects(!showArchivedProjects)}
                  >
                    {showArchivedProjects ? 'Hide Archived' : 'Show Archived'}
                  </Button>
                </div>
                <Button onClick={() => setShowProjectModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Project
                </Button>
              </div>
              
              {team.projects.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                  <p className="text-muted-foreground mb-4">No projects yet</p>
                  <Button onClick={() => setShowProjectModal(true)}>
                    Create your first project
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {team.projects
                    .filter(project => showArchivedProjects || !project.isArchived)
                    .map((project) => {
                    // Use server-side calculated stats instead of client-side calculation
                    const stats = project.stats || { totalTasks: 0, completedTasks: 0, progress: 0 };
                    const progressPercentage = stats.progress || 0;
                    
                    return (
                      <Card 
                        key={project.id} 
                        className={`cursor-pointer hover:shadow-lg transition-shadow ${
                          project.isArchived ? 'opacity-60 bg-muted/50' : ''
                        }`}
                        onMouseEnter={() => handleProjectHover(project)}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <CardTitle 
                              className="text-lg font-semibold truncate cursor-pointer"
                              onClick={() => handleProjectClick(project)}
                            >
                              <div className="flex items-center gap-2">
                                {project.name}
                                {project.isArchived && (
                                  <Badge variant="secondary" className="text-xs">
                                    Archived
                                  </Badge>
                                )}
                              </div>
                            </CardTitle>

                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {project.description}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Task Progress */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Tasks</span>
                              <span className="text-muted-foreground">
                                {stats.completedTasks}/{stats.totalTasks}
                              </span>
                            </div>
                            <Progress value={progressPercentage} className="h-2" />
                          </div>

                          {/* Tags */}
                          {project.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {project.tags.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                              {project.tags.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{project.tags.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Archive / Unarchive Button - New Feature */}
                          <div className="flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleArchiveProject(project.id, project.isArchived);
                              }}
                              className={project.isArchived ? 'text-green-600 border-green-600' : 'text-red-600 border-red-600'}
                            >
                              {project.isArchived ? <ArchiveRestore className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
                              {project.isArchived ? 'Unarchive' : 'Archive'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
              <ActivityFeed 
                teamSlug={teamSlug as string} 
                initialActivities={(team?.activities as unknown as ActivityWithRelations[]) || []} 
              />
            </div>

            {/* Team Standup Digest */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Daily Standup</h3>
              <TeamStandupDigest teamSlug={teamSlug as string} />
            </div>

            {/* Online Users */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Online Now</h3>
              <OnlineUsers />
            </div>
            
            {/* Team Members */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Team Members</h3>
              <div className="space-y-3">
                {team.members.slice(0, 5).map((member) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="relative h-8 w-8">
                      <Image
                        src={member.user.image || '/default-avatar.svg'}
                        alt={member.user.name || member.user.email || 'User'}
                        fill
                        className="rounded-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {member.user.name || member.user.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                ))}
                {team.members.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    +{team.members.length - 5} more members
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

        <ProjectModal
          open={showProjectModal}
          setOpen={setShowProjectModal}
          teamId={team?.id}
          onSuccess={fetchTeam}
        />        <InviteMemberModal
          open={showInviteModal}
          setOpen={setShowInviteModal}
          teamSlug={teamSlug}
          onInviteSent={fetchTeam}
          triggerButton={false}
        />

      <Dialog open={showHackathonModal} onOpenChange={setShowHackathonModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Hackathon Mode</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="deadline">Hackathon Deadline</Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={hackathonDeadline}
                onChange={(e) => setHackathonDeadline(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button onClick={handleStartHackathon} className="w-full">
              Start Hackathon
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <FocusMode
        cards={selectedCards}
        open={showFocusMode}
        onClose={handleFocusModeClose}
      />
      </div>
    </ErrorBoundary>
  );
}
