'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { Navbar } from '@/components';
import OnlineUsers from '@/components/OnlineUsers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowLeft, 
  Clock, 
  Users, 
  Target, 
  Send,
  Trophy,
  Zap,
  StopCircle,
  Settings
} from 'lucide-react';
import { ContextCardWithRelations } from '@/interfaces/context-cards';
import { TeamHackathon } from '@/interfaces/teams';
import { HackathonUpdate } from '@/interfaces/activities';
import { HackathonPageClientProps } from '@/interfaces/ui-components';
import { toast } from 'sonner';
import { ErrorBoundary } from '@/components';

export default function HackathonPageClient({ 
  initialTeam, 
  initialCards, 
  initialUpdates 
}: HackathonPageClientProps) {
  const { teamSlug } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [team, setTeam] = useState<TeamHackathon | null>(initialTeam);
  const [cards, setCards] = useState<ContextCardWithRelations[]>(initialCards);
  const [updates, setUpdates] = useState<HackathonUpdate[]>(initialUpdates);
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [hackathonEnded, setHackathonEnded] = useState(false);
  const [newUpdate, setNewUpdate] = useState('');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);
  const [endingHackathon, setEndingHackathon] = useState(false);

  useEffect(() => {
    if (team?.hackathonDeadline) {
      const timer = setInterval(() => {
        const deadline = new Date(team.hackathonDeadline!);
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();

        if (diff <= 0) {
          setHackathonEnded(true);
          setTimeLeft(null);
          clearInterval(timer);
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          setTimeLeft({ days, hours, minutes, seconds });
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [team?.hackathonDeadline]);

  const fetchTeamData = async () => {
    try {
      
      // Fetch team details
      const teamResponse = await axios.get(`/api/teams/${teamSlug}`);
      const teamData = teamResponse.data;
      
      if (!teamData.hackathonModeEnabled) {
        // Show placeholder instead of redirecting
        setTeam(teamData);
        return;
      }
      
      setTeam(teamData);

      // Fetch active task cards from all team projects
      try {
        const cardsResponse = await axios.get(`/api/teams/${teamSlug}/hackathon-cards`);
        setCards(cardsResponse.data.cards || []);
      } catch (error) {
        console.error('Error fetching hackathon cards:', error);
      }

      // Fetch hackathon updates
      try {
        const updatesResponse = await axios.get(`/api/teams/${teamSlug}/hackathon-updates`);
        setUpdates(updatesResponse.data.updates || []);
      } catch (error) {
        console.error('Error fetching hackathon updates:', error);
      }

    } catch (error) {
      console.error('Error fetching hackathon data:', error);
      toast.error('Failed to load hackathon room');
    }
  };

  const submitUpdate = async () => {
    if (!newUpdate.trim() || submittingUpdate) return;

    try {
      setSubmittingUpdate(true);
      await axios.post(`/api/teams/${teamSlug}/hackathon-updates`, {
        content: newUpdate.trim(),
      });

      setNewUpdate('');
      fetchTeamData(); // Refresh updates
      toast.success('Update posted!');
    } catch (error: unknown) {
      console.error('Error posting update:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'error' in error.response.data
        ? String(error.response.data.error)
        : "Failed to post update";
      toast.error(errorMessage);
    } finally {
      setSubmittingUpdate(false);
    }
  };

  const endHackathon = async () => {
    if (!team || endingHackathon) return;
    
    if (!confirm('Are you sure you want to end the hackathon? This will disable hackathon mode for the team.')) {
      return;
    }

    try {
      setEndingHackathon(true);
      await axios.patch(`/api/teams/${teamSlug}/hackathon-settings`, {
        hackathonModeEnabled: false,
        hackathonDeadline: null,
        hackathonEndedAt: new Date().toISOString(),
      });

      toast.success('Hackathon ended successfully!');
      setTeam(prev => prev ? { 
        ...prev, 
        hackathonModeEnabled: false,
        hackathonDeadline: undefined,
        hackathonEndedAt: new Date().toISOString()
      } : null);
    } catch (error: unknown) {
      console.error('Error ending hackathon:', error);
      const errorMessage = error instanceof Error && 'response' in error && 
        typeof error.response === 'object' && error.response !== null &&
        'data' in error.response && typeof error.response.data === 'object' &&
        error.response.data !== null && 'error' in error.response.data
        ? String(error.response.data.error)
        : "Failed to end hackathon";
      toast.error(errorMessage);
    } finally {
      setEndingHackathon(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in to access hackathon room</h2>
          <Button onClick={() => router.push('/auth/signin')}>Sign In</Button>
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading hackathon room...</p>
        </div>
      </div>
    );
  }

  if (!team.hackathonModeEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/team/${teamSlug}`)}
              className="mb-6"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Team
            </Button>

            <div className="text-center py-12">
              <div className="mb-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="h-8 w-8 text-muted-foreground" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Hackathon Mode Not Enabled</h1>
                <p className="text-muted-foreground mb-6">
                  This team doesn&apos;t have hackathon mode enabled. Team admins can enable it from team settings.
                </p>
              </div>

              <div className="space-y-4">
                <Button
                  onClick={() => router.push(`/team/${teamSlug}/settings`)}
                  className="mr-4"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Team Settings
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/team/${teamSlug}`)}
                >
                  Back to Team
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main hackathon interface
  const totalCards = cards.length;
  const completedCards = cards.filter(card => card.status === 'CLOSED').length;
  const activeCards = cards.filter(card => card.status === 'ACTIVE').length;
  const progressPercentage = totalCards > 0 ? (completedCards / totalCards) * 100 : 0;

  return (
    <ErrorBoundary
      onError={(error: Error, errorInfo: React.ErrorInfo) => {
        console.error('Hackathon Page Error:', error, errorInfo);
      }}
      fallback={
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-12">
              <h1 className="text-2xl font-bold mb-4">Hackathon Room Unavailable</h1>
              <p className="text-muted-foreground mb-6">
                We&apos;re having trouble loading the hackathon room. Please try refreshing the page.
              </p>
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/team/${teamSlug}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Team
              </Button>
              <div>
                <h1 className="text-3xl font-bold flex items-center">
                  <Trophy className="h-8 w-8 mr-3 text-primary" />
                  {team.name} Hackathon
                </h1>
                <p className="text-muted-foreground">Real-time collaboration space</p>
              </div>
            </div>
            <OnlineUsers />
          </div>

          {/* Countdown Timer */}
          {timeLeft && !hackathonEnded && (
            <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center text-2xl">
                  <Clock className="h-6 w-6 mr-2 text-primary" />
                  Time Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center space-x-8 text-center">
                  <div className="bg-primary/10 rounded-lg p-4">
                    <div className="text-3xl font-bold text-primary">{timeLeft.days}</div>
                    <div className="text-sm text-muted-foreground">Days</div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-4">
                    <div className="text-3xl font-bold text-primary">{timeLeft.hours}</div>
                    <div className="text-sm text-muted-foreground">Hours</div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-4">
                    <div className="text-3xl font-bold text-primary">{timeLeft.minutes}</div>
                    <div className="text-sm text-muted-foreground">Minutes</div>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-4">
                    <div className="text-3xl font-bold text-primary">{timeLeft.seconds}</div>
                    <div className="text-sm text-muted-foreground">Seconds</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hackathon Ended */}
          {hackathonEnded && (
            <Card className="mb-8 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center text-2xl text-amber-800">
                  <StopCircle className="h-6 w-6 mr-2" />
                  Hackathon Ended
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-amber-700">
                  The hackathon deadline has passed. Great work team! 🎉
                </p>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {/* Progress Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Progress Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Overall Progress</span>
                      <span className="text-sm text-muted-foreground">{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{totalCards}</div>
                      <div className="text-sm text-blue-600">Total Tasks</div>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">{activeCards}</div>
                      <div className="text-sm text-yellow-600">Active</div>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">{completedCards}</div>
                      <div className="text-sm text-green-600">Completed</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Team Members */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {team.members?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {member.user.name?.charAt(0) || member.user.email?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{member.user.name || member.user.email}</div>
                          <div className="text-sm text-muted-foreground">{member.role}</div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {cards.filter(card => card.assignedToId === member.user.id).length} tasks
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Active Tasks */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Active Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cards.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No active tasks found. Create some tasks to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cards.map((card) => (
                    <div key={card.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                      <div className="flex-1">
                        <h3 className="font-medium">{card.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1">{card.content}</p>
                        <div className="flex items-center mt-2 space-x-2">
                          <Badge variant={card.status === 'CLOSED' ? 'default' : card.status === 'ACTIVE' ? 'secondary' : 'outline'}>
                            {card.status?.replace('_', ' ') || 'Unknown'}
                          </Badge>
                          {card.assignedTo && (
                            <span className="text-xs text-muted-foreground">
                              Assigned to {card.assignedTo.name || card.assignedTo.email}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/team/${teamSlug}/project/${card.project?.slug}/context-cards/${card.id}`)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Live Updates */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Live Updates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Post Update */}
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={newUpdate}
                      onChange={(e) => setNewUpdate(e.target.value)}
                      placeholder="Share an update with your team..."
                      className="w-full min-h-[80px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <Button
                    onClick={submitUpdate}
                    disabled={!newUpdate.trim() || submittingUpdate}
                    className="self-end"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {submittingUpdate ? 'Posting...' : 'Post'}
                  </Button>
                </div>

                {/* Updates List */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {updates.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No updates yet. Be the first to share!</p>
                  ) : (
                    updates.map((update) => (
                      <div key={update.id} className="p-3 rounded-lg bg-muted/50 border">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="font-medium">{update.user.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(update.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{update.content}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* End Hackathon */}
          {team.userRole === 'OWNER' && (
            <Card className="mt-8 border-red-200">
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">End Hackathon</p>
                    <p className="text-sm text-muted-foreground">
                      This will disable hackathon mode for the team. This action cannot be undone.
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={endHackathon}
                    disabled={endingHackathon}
                  >
                    <StopCircle className="h-4 w-4 mr-2" />
                    {endingHackathon ? 'Ending...' : 'End Hackathon'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
    </ErrorBoundary>
  );
}
