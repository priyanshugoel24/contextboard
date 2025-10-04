import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import dynamic from 'next/dynamic';
import { authOptions } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Navbar } from '@/components';
import BackButton from '@/components/ui/BackButton';
import { Suspense } from 'react';
import { ComponentLoadingSpinner } from '@/components/LoadingSpinner';

// Lazy load chart components
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
  TrendingUp,
  Activity,
  Calendar,
  Award,
  Timer,
} from 'lucide-react';
import { Session } from 'next-auth';
import { AnalyticsPageProps } from '@/interfaces/ui-components';
import { analyticsConfig } from '@/config/analytics';
import { getAuthenticatedUserFromSession } from '@/lib/auth-utils';
import { findUserAccessibleProject } from '@/queries/project-queries';
import { getProjectAnalyticsWithAccess } from '@/queries/analytics-queries';

// Server-side data fetching for project analytics
async function fetchProjectAnalytics(teamSlug: string, projectSlug: string) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    // Get authenticated user
    const user = await getAuthenticatedUserFromSession(session);
    if (!user) {
      return null;
    }

    // Use the analytics query with built-in access control
    const analytics = await getProjectAnalyticsWithAccess(user.id, teamSlug, projectSlug);
    
    return analytics;
  } catch (error) {
    console.error('Error fetching project analytics:', error);
    return null;
  }
}

// Server-side data fetching for project details
async function fetchProject(teamSlug: string, projectSlug: string) {
  try {
    const session = await getServerSession(authOptions) as Session | null;
    
    // Get authenticated user
    const user = await getAuthenticatedUserFromSession(session);
    if (!user) {
      return null;
    }

    //get project with relations
    const project = await findUserAccessibleProject(projectSlug, user.id, {
      include: {
        team: {
          include: {
            members: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
    });

    if (!project || !project.team || project.team.slug !== teamSlug) {
      return null;
    }

    // Check if user is a member of this team
    const userMembership = project.team.members.find(
      (member) => member.userId === user.id
    );

    if (!userMembership) {
      return null;
    }

    return {
      ...project,
      createdAt: project.createdAt.toISOString(),
      lastActivityAt: project.lastActivityAt.toISOString(),
    };
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

export default async function ProjectAnalyticsPage({ params }: AnalyticsPageProps) {
  const session = await getServerSession(authOptions) as Session | null;
  
  if (!session) {
    redirect('/');
  }

  const { teamSlug, projectSlug } = await params;
  
  // Fetch project and analytics data
  const [project, analytics] = await Promise.all([
    fetchProject(teamSlug, projectSlug),
    fetchProjectAnalytics(teamSlug, projectSlug)
  ]);

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Project not found</h1>
            <p className="text-muted-foreground">The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-2">Analytics not available</h1>
            <p className="text-muted-foreground">Unable to load project analytics data.</p>
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
          <BackButton label="Back to Project" className="mb-4" />
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Project Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive insights for {project.name}
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
              <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalCards}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.totalTasks} tasks
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
              <CardTitle className="text-sm font-medium">Contributors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.topContributors.length}</div>
              <p className="text-xs text-muted-foreground">active contributors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.taskStatusOverview.ACTIVE}</div>
              <p className="text-xs text-muted-foreground">remaining</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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
            </CardContent>
          </Card>

          {/* Card Type Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Card Type Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(analytics.cardTypeDistribution).length > 0 ? (
                <div className="flex flex-col lg:flex-row items-center">
                  <div className="w-full lg:w-1/2 h-64">
                    <Suspense fallback={<ComponentLoadingSpinner text="Loading card distribution..." />}>
                      <CardTypeDistributionChart data={Object.entries(analytics.cardTypeDistribution).map(([type, count]) => ({
                        type,
                        count: count as number,
                        percentage: analytics.totalCards > 0 ? Math.round((count as number / analytics.totalCards) * 100) : 0,
                      }))} />
                    </Suspense>
                  </div>
                  <div className="w-full lg:w-1/2 space-y-3">
                    {Object.entries(analytics.cardTypeDistribution).map(([type, count], index) => (
                      <div key={type} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: analyticsConfig.chartColors[index % analyticsConfig.chartColors.length] }}
                          />
                          <span className="text-sm font-medium">{type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{count as number}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {analytics.totalCards > 0 ? Math.round((count as number / analytics.totalCards) * 100) : 0}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No cards created yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

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
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
