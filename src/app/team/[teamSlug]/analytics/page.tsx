import { getServerSession } from 'next-auth/next';
import dynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components';
import BackButton from '@/components/ui/BackButton';
import { Metadata } from 'next';
import { ComponentLoadingSpinner } from '@/components/LoadingSpinner';
import { Suspense } from 'react';
import { getTeamAnalyticsWithAccess, getTeamBasicInfo } from '@/queries/analytics-queries';

// Lazy load chart components with better loading states
const AnalyticsCharts = dynamic(() => import('@/components/charts/AnalyticsCharts'), {
  loading: () => <ComponentLoadingSpinner text="Loading analytics..." />
});

const WeeklyVelocityChart = dynamic(() => import('@/components/charts/WeeklyVelocityChart'), {
  loading: () => <ComponentLoadingSpinner text="Loading velocity chart..." />
});

const CardTypeDistributionChart = dynamic(() => import('@/components/charts/CardTypeDistributionChart'), {
  loading: () => <ComponentLoadingSpinner text="Loading distribution chart..." />
});

const TopContributorsChart = dynamic(() => import('@/components/charts/TopContributorsChart'), {
  loading: () => <ComponentLoadingSpinner text="Loading contributors chart..." />
});
import { 
  Target, 
  CheckCircle, 
  Users, 
  Clock,
  BarChart3,
  TrendingUp,
  Activity,
  Calendar,
  Award,
  Timer,
} from 'lucide-react';
import { TeamAnalytics } from '@/interfaces/teams';
import { TeamAnalyticsPageProps } from '@/interfaces/ui-components';
import { analyticsConfig } from '@/config/analytics';
import { Session } from 'next-auth';
import { getAuthenticatedUserFromSession } from '@/lib/auth-utils';

export async function generateMetadata({ params }: TeamAnalyticsPageProps): Promise<Metadata> {
  const { teamSlug } = await params;
  
  try {
    const session = await getServerSession(authOptions) as Session | null;
    if (!session?.user?.email) {
      return {
        title: 'Team Analytics',
        description: 'View team analytics and performance metrics.',
      };
    }

    // Get team data for metadata 
    const team = await getTeamBasicInfo(teamSlug);

    if (!team) {
      return {
        title: 'Team Analytics',
        description: 'Team analytics not found.',
      };
    }

    const title = `${team.name} Analytics - Team Performance`;
    const description = `Analyze ${team.name} team performance with detailed analytics, project progress tracking, task completion rates, and productivity insights across ${team._count.projects} projects.`;

    return {
      title,
      description,
      keywords: ['team analytics', 'performance metrics', 'project analytics', 'team productivity', team.name],
      openGraph: {
        title: `${team.name} Analytics - Team Performance | Context Board`,
        description,
        type: 'website',
        locale: 'en_US',
        siteName: 'Context Board',
      },
      twitter: {
        card: 'summary',
        title: `${team.name} Analytics - Team Performance | Context Board`,
        description,
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch (error) {
    console.error('Error generating metadata for team analytics page:', error);
    return {
      title: 'Team Analytics',
      description: 'View team analytics and performance metrics.',
    };
  }
}

// Server-side data fetching
async function fetchTeamAnalytics(teamSlug: string): Promise<TeamAnalytics | null> {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    // Get authenticated user
    const user = await getAuthenticatedUserFromSession(session);
    if (!user) {
      return null;
    }

    const analytics = await getTeamAnalyticsWithAccess(user.id, teamSlug);
    
    return analytics;
  } catch (error) {
    console.error('Error fetching team analytics:', error);
    return null;
  }
}

export default async function TeamAnalyticsPage({ 
  params 
}: TeamAnalyticsPageProps) {
  const { teamSlug } = await params;
  
  // Fetch data server-side
  const analytics = await fetchTeamAnalytics(teamSlug);

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Analytics not available</h1>
            <p className="text-muted-foreground">Unable to load team analytics data.</p>
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
          <BackButton label="Back to Team" className="mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Team Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive insights into team performance and project progress
          </p>
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Data refreshed in real-time</span>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.completedProjects} completed, {analytics.activeProjects} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Task Completion</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.taskCompletionRate}%</div>
              <p className="text-xs text-muted-foreground">
                {analytics.completedTasks} of {analytics.totalTasks} tasks
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeMembers}</div>
              <p className="text-xs text-muted-foreground">active members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Completion Time</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.avgTimeToComplete}</div>
              <p className="text-xs text-muted-foreground">days per task</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Charts */}
        <Suspense fallback={<ComponentLoadingSpinner text="Loading team analytics overview..." />}>
          <AnalyticsCharts analytics={analytics} />
        </Suspense>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Project Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Project Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.projectProgress.map((project) => (
                  <div key={project.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium truncate flex-1 mr-2">
                        {project.name}
                      </span>
                      <span className="text-sm text-muted-foreground whitespace-nowrap">
                        {project.completedTasks}/{project.totalTasks}
                      </span>
                    </div>
                    <Progress value={project.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{project.progress}% complete</span>
                      <span>{project.totalTasks} tasks</span>
                    </div>
                  </div>
                ))}
                {analytics.projectProgress.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No projects with tasks</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Velocity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Weekly Velocity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<ComponentLoadingSpinner text="Loading velocity data..." />}>
                <WeeklyVelocityChart data={analytics.weeklyVelocity} />
              </Suspense>
              {analytics.weeklyVelocity.every(week => week.completed === 0 && week.created === 0) ? (
                <div className="text-center text-muted-foreground mt-4">
                  <p className="text-sm">No activity in the last 8 weeks</p>
                </div>
              ) : (
                <div className="flex justify-center mt-4 gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-blue-500"></div>
                    <span>Created</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-green-500"></div>
                    <span>Completed</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Card Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.cardTypeDistribution.length > 0 ? (
                <div className="flex flex-col lg:flex-row items-center">
                  <div className="w-full lg:w-1/2 h-64">
                    <Suspense fallback={<ComponentLoadingSpinner text="Loading card distribution..." />}>
                      <CardTypeDistributionChart data={analytics.cardTypeDistribution} />
                    </Suspense>
                  </div>
                  <div className="w-full lg:w-1/2 space-y-3">
                    {analytics.cardTypeDistribution.map((item, index) => (
                      <div key={item.type} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: analyticsConfig.chartColors[index % analyticsConfig.chartColors.length] }}
                          />
                          <span className="text-sm font-medium">{item.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{item.count}</Badge>
                          <span className="text-xs text-muted-foreground">{item.percentage}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No cards created yet</p>
                  <p className="text-sm text-muted-foreground">Start creating tasks, insights, and decisions to see distribution</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Contributors */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Contributors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.topContributors.length > 0 ? (
                <div className="h-64">
                  <Suspense fallback={<ComponentLoadingSpinner text="Loading contributors data..." />}>
                    <TopContributorsChart data={analytics.topContributors} />
                  </Suspense>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Award className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No contributions yet</p>
                  <p className="text-sm text-muted-foreground">Team members will appear here as they create and complete cards</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cards</p>
                  <p className="text-2xl font-bold">{analytics.totalCards}</p>
                </div>
                <Calendar className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Tasks</p>
                  <p className="text-2xl font-bold">{analytics.activeTasks}</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
                  <p className="text-2xl font-bold">{analytics.taskCompletionRate}%</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
